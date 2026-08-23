import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CARD_IMAGES_BUCKET = "card-backgrounds";
const MAX_CARD_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CARD_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function context() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ? String(data.claims.sub) : null;
  if (!userId) return { supabase, userId: null, membership: null };
  const { data: membership } = await supabase
    .from("family_members")
    .select("id,family_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return { supabase, userId, membership };
}

export async function GET() {
  const { supabase, userId, membership } = await context();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!membership) return NextResponse.json({ cards: [] });
  const { data, error } = await supabase
    .from("cards")
    .select(
      "id,name,institution,card_type,credit_limit,closing_day,due_day,last_four,visual_key,holder_member_id,family_members!cards_holder_member_id_fkey(display_name)",
    )
    .eq("family_id", membership.family_id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json(
      { message: "Não foi possível carregar os cartões." },
      { status: 500 },
    );
  const [{ data: purchases }, { data: paymentEvents }] = await Promise.all([
    supabase.from("card_purchases").select("card_id,total_amount").eq("family_id", membership.family_id).eq("status", "active"),
    supabase.from("audit_events").select("id,event_type,metadata").eq("family_id", membership.family_id).in("event_type", ["bill_payment_recorded", "bill_payment_reversed"]),
  ]);
  const usedByCard = (purchases ?? []).reduce<Record<string, number>>((totals, purchase) => ({ ...totals, [purchase.card_id]: (totals[purchase.card_id] ?? 0) + Number(purchase.total_amount) }), {});
  const reversedPaymentIds = new Set((paymentEvents ?? []).filter((event) => event.event_type === "bill_payment_reversed").map((event) => Number((event.metadata as { paymentEventId?: number }).paymentEventId)));
  for (const event of paymentEvents ?? []) {
    const metadata = event.metadata as { billKey?: string; amount?: number };
    if (event.event_type !== "bill_payment_recorded" || reversedPaymentIds.has(Number(event.id)) || !metadata.billKey?.startsWith("card-")) continue;
    const cardId = metadata.billKey.slice(5, 41); usedByCard[cardId] = Math.max(0, (usedByCard[cardId] ?? 0) - Number(metadata.amount ?? 0));
  }
  return NextResponse.json({
    cards: (data ?? []).map((card) => {
      const holderRelation = card.family_members as unknown as
        | { display_name: string }
        | { display_name: string }[]
        | null;
      let visual: { mode?: string; image?: string } = {};
      try { visual = JSON.parse(card.visual_key ?? "{}"); } catch { visual = {}; }
      return {
        id: card.id,
        name: card.name,
        institution: card.institution,
        type: visual.mode ?? card.card_type,
        limit: Number(card.credit_limit ?? 0),
        closingDay: card.closing_day,
        dueDay: card.due_day,
        lastFour: card.last_four ?? "0000",
        visualKey: "blue",
        backgroundImage: visual.image ?? "",
        used: usedByCard[card.id] ?? 0,
        holder: Array.isArray(holderRelation)
          ? holderRelation[0]?.display_name
          : holderRelation?.display_name,
        holderMemberId: card.holder_member_id,
      };
    }),
  });
}

export async function POST(request: Request) {
  const { supabase, userId, membership } = await context();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!membership)
    return NextResponse.json(
      { message: "Família não encontrada." },
      { status: 404 },
    );
  const input = await request.formData().catch(() => null);
  if (!input)
    return NextResponse.json(
      { message: "Não foi possível ler os dados do cartão." },
      { status: 400 },
    );
  const name = String(input.get("name") ?? "").trim();
  const institution = String(input.get("institution") ?? "").trim();
  const holderMemberId = String(input.get("holderMemberId") ?? "");
  const requestedType = String(input.get("type") ?? "");
  const mode = ["credit", "debit", "credit_debit"].includes(requestedType) ? requestedType : "credit";
  const cardType = mode === "debit" ? "debit" : "credit";
  const creditLimit = Number(input.get("limit"));
  const closingDay = Number(input.get("closingDay"));
  const dueDay = Number(input.get("dueDay"));
  const lastFour = String(input.get("lastFour") ?? "").replace(/\D/g, "");
  const imageValue = input.get("backgroundImage");
  const imageFile = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  if (!name || !institution || lastFour.length !== 4)
    return NextResponse.json(
      { message: "Revise os dados do cartão." },
      { status: 400 },
    );
  if (
    cardType === "credit" &&
    (!(creditLimit > 0) ||
      closingDay < 1 ||
      closingDay > 31 ||
      dueDay < 1 ||
      dueDay > 31)
  )
    return NextResponse.json(
      { message: "Informe limite, fechamento e vencimento válidos." },
      { status: 400 },
    );
  const { data: holder } = await supabase
    .from("family_members")
    .select("id")
    .eq("id", holderMemberId)
    .eq("family_id", membership.family_id)
    .eq("status", "active")
    .maybeSingle();
  if (!holder)
    return NextResponse.json(
      { message: "Selecione um titular da família." },
      { status: 400 },
    );

  let uploadedImagePath: string | null = null;
  let backgroundImage = "";
  if (imageFile) {
    if (!ALLOWED_CARD_IMAGE_TYPES.has(imageFile.type))
      return NextResponse.json(
        { message: "Escolha uma imagem PNG, JPG, JPEG ou WEBP." },
        { status: 400 },
      );
    if (imageFile.size > MAX_CARD_IMAGE_SIZE)
      return NextResponse.json(
        { message: "A imagem deve ter no máximo 10 MB." },
        { status: 400 },
      );

    const admin = createAdminSupabaseClient();
    const { data: existingBucket, error: bucketLookupError } =
      await admin.storage.getBucket(CARD_IMAGES_BUCKET);
    if (bucketLookupError && !existingBucket) {
      const { error: bucketCreationError } = await admin.storage.createBucket(
        CARD_IMAGES_BUCKET,
        {
          public: true,
          allowedMimeTypes: [...ALLOWED_CARD_IMAGE_TYPES],
          fileSizeLimit: "10MB",
        },
      );
      if (bucketCreationError)
        return NextResponse.json(
          { message: "Não foi possível preparar o armazenamento da imagem." },
          { status: 500 },
        );
    }

    const extension = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
    uploadedImagePath = `${membership.family_id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from(CARD_IMAGES_BUCKET)
      .upload(uploadedImagePath, await imageFile.arrayBuffer(), {
        cacheControl: "3600",
        contentType: imageFile.type,
        upsert: false,
      });
    if (uploadError)
      return NextResponse.json(
        { message: "Não foi possível enviar a imagem do cartão." },
        { status: 500 },
      );
    backgroundImage = admin.storage
      .from(CARD_IMAGES_BUCKET)
      .getPublicUrl(uploadedImagePath).data.publicUrl;
  }

  const { error } = await supabase
    .from("cards")
    .insert({
      family_id: membership.family_id,
      name,
      institution,
      holder_member_id: holder.id,
      card_type: cardType,
      credit_limit: cardType === "credit" ? creditLimit : null,
      closing_day: cardType === "credit" ? closingDay : null,
      due_day: cardType === "credit" ? dueDay : null,
      last_four: lastFour,
      visual_key: JSON.stringify({ mode, image: backgroundImage }),
      created_by: userId,
    });
  if (error) {
    if (uploadedImagePath) {
      const admin = createAdminSupabaseClient();
      await admin.storage.from(CARD_IMAGES_BUCKET).remove([uploadedImagePath]);
    }
    return NextResponse.json(
      { message: "Não foi possível salvar o cartão." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
