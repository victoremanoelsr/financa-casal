import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CARD_IMAGES_BUCKET = "card-backgrounds";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function cardContext(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return { supabase, userId: null, card: null };
  const { data: card } = await supabase
    .from("cards")
    .select(
      "id,family_id,name,institution,card_type,credit_limit,closing_day,due_day,last_four,visual_key,holder_member_id,family_members!cards_holder_member_id_fkey(display_name)",
    )
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  return { supabase, userId, card };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  if (demoMode) {
    const requestedMonth = new URL(request.url).searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    if (id === "demo-c1" || id === "default" || id.includes("nubank")) {
      return NextResponse.json({
        card: {
          id: "demo-c1",
          name: "Nubank",
          institution: "Nubank",
          type: "credit_debit",
          limit: 2500,
          closingDay: 3,
          dueDay: 10,
          lastFour: "4892",
          visualKey: "purple",
          backgroundImage: "",
          holder: "Victor Emanuel",
          paid: 0,
          used: 1250,
        },
        purchases: [
          {
            id: "dp1",
            description: "Supermercado Compre Bem",
            amount: 350.00,
            date: `${requestedMonth}-05`,
            originalDate: `${requestedMonth}-05`,
            installmentNumber: 1,
            installments: 1,
            paymentType: "credit",
            categoryId: "cat1",
            category: "Supermercado",
          },
          {
            id: "dp2",
            description: "Posto Shell Combustível",
            amount: 200.00,
            date: `${requestedMonth}-12`,
            originalDate: `${requestedMonth}-12`,
            installmentNumber: 1,
            installments: 1,
            paymentType: "credit",
            categoryId: "cat2",
            category: "Transporte",
          },
          {
            id: "dp3",
            description: "Magazine Luiza - Airfryer",
            amount: 100.00,
            date: `${requestedMonth}-15`,
            originalDate: `${requestedMonth}-15`,
            installmentNumber: 2,
            installments: 4,
            paymentType: "credit",
            categoryId: "cat3",
            category: "Casa & Eletro",
          },
          {
            id: "dp4",
            description: "Farmácia Pague Menos",
            amount: 75.50,
            date: `${requestedMonth}-18`,
            originalDate: `${requestedMonth}-18`,
            installmentNumber: 1,
            installments: 1,
            paymentType: "credit",
            categoryId: "cat4",
            category: "Saúde & Farmácia",
          },
        ],
      });
    }
  }
  const { supabase, userId, card } = await cardContext(id);
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!card)
    return NextResponse.json(
      { message: "Cartão não encontrado." },
      { status: 404 },
    );
  const { data: purchases, error } = await supabase
    .from("card_purchases")
    .select(
      "id,description,total_amount,purchase_date,installment_count,category_id,payment_type,categories(name),card_installments(amount,competence_date,installment_number,installment_count)",
    )
    .eq("card_id", card.id)
    .eq("status", "active")
    .order("purchase_date", { ascending: false });
  if (error)
    return NextResponse.json(
      { message: "Não foi possível carregar as compras." },
      { status: 500 },
    );
  const { data: paymentEvents } = await supabase
    .from("audit_events")
    .select("id,event_type,metadata")
    .eq("family_id", card.family_id)
    .in("event_type", ["bill_payment_recorded", "bill_payment_reversed"]);
  const reversedPaymentIds = new Set(
    (paymentEvents ?? [])
      .filter((event) => event.event_type === "bill_payment_reversed")
      .map((event) =>
        Number((event.metadata as { paymentEventId?: number }).paymentEventId),
      ),
  );
  const paid = (paymentEvents ?? [])
    .filter(
      (event) =>
        event.event_type === "bill_payment_recorded" &&
        !reversedPaymentIds.has(Number(event.id)) &&
        (event.metadata as { billKey?: string }).billKey?.startsWith(
          `card-${card.id}-`,
        ),
    )
    .reduce(
      (sum, event) =>
        sum + Number((event.metadata as { amount?: number }).amount ?? 0),
      0,
    );
  const requestedMonth = new URL(request.url).searchParams.get("month");
  const month = /^\d{4}-\d{2}$/.test(requestedMonth ?? "")
    ? requestedMonth!
    : new Date().toISOString().slice(0, 7);
  const creditPurchases = (purchases ?? []).filter(
    (purchase) => purchase.payment_type !== "debit",
  );
  const used = Math.max(
    0,
    creditPurchases.reduce(
      (sum, purchase) => sum + Number(purchase.total_amount),
      0,
    ) - paid,
  );
  const holder = card.family_members as unknown as
    | { display_name: string }
    | { display_name: string }[]
    | null;
  let visual: { mode?: string; image?: string } = {};
  try {
    visual = JSON.parse(card.visual_key ?? "{}");
  } catch {
    visual = {};
  }
  return NextResponse.json({
    card: {
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
      holder: Array.isArray(holder)
        ? holder[0]?.display_name
        : holder?.display_name,
      paid,
      used,
    },
    purchases: (purchases ?? []).flatMap((purchase) => {
      if (purchase.payment_type === "debit")
        return purchase.purchase_date.startsWith(month)
          ? [{
              id: purchase.id,
              description: purchase.description,
              amount: Number(purchase.total_amount),
              date: purchase.purchase_date,
              originalDate: purchase.purchase_date,
              installmentNumber: 1,
              installments: 1,
              paymentType: "debit",
              categoryId: purchase.category_id,
              category: "Cartões",
            }]
          : [];
      const installment = (purchase.card_installments ?? []).find((item) =>
        item.competence_date.startsWith(month),
      );
      return installment
        ? [{
            id: purchase.id,
            description: purchase.description,
            amount: Number(installment.amount),
            date: installment.competence_date,
            originalDate: purchase.purchase_date,
            installmentNumber: installment.installment_number,
            installments: installment.installment_count,
            paymentType: "credit",
            categoryId: purchase.category_id,
            category: "Cartões",
          }]
        : [];
    }),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, userId, card } = await cardContext(id);
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!card)
    return NextResponse.json(
      { message: "Cartão não encontrado." },
      { status: 404 },
    );
  const input = await request.formData().catch(() => null);
  if (!input)
    return NextResponse.json(
      { message: "Não foi possível ler os dados." },
      { status: 400 },
    );
  const name = String(input.get("name") ?? "").trim();
  const institution = String(input.get("institution") ?? "").trim();
  const holderMemberId = String(input.get("holderMemberId") ?? "");
  const requestedType = String(input.get("type") ?? "");
  const mode = ["credit", "debit", "credit_debit"].includes(requestedType)
    ? requestedType
    : "credit";
  const cardType = mode === "debit" ? "debit" : "credit";
  const creditLimit = Number(input.get("limit"));
  const closingDay = Number(input.get("closingDay"));
  const dueDay = Number(input.get("dueDay"));
  const lastFour = String(input.get("lastFour") ?? "").replace(/\D/g, "");
  const imageValue = input.get("backgroundImage");
  const imageFile =
    imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  if (
    !name ||
    !institution ||
    lastFour.length !== 4 ||
    (cardType === "credit" &&
      (!(creditLimit > 0) ||
        closingDay < 1 ||
        closingDay > 31 ||
        dueDay < 1 ||
        dueDay > 31))
  )
    return NextResponse.json(
      { message: "Revise os dados do cartão." },
      { status: 400 },
    );
  const { data: holder } = await supabase
    .from("family_members")
    .select("id")
    .eq("id", holderMemberId)
    .eq("family_id", card.family_id)
    .eq("status", "active")
    .maybeSingle();
  if (!holder)
    return NextResponse.json(
      { message: "Selecione um titular válido." },
      { status: 400 },
    );
  let visual: { image?: string } = {};
  try {
    visual = JSON.parse(card.visual_key ?? "{}");
  } catch {
    visual = {};
  }
  let nextImage = visual.image ?? "";
  let newImagePath: string | null = null;
  if (imageFile) {
    if (
      !ALLOWED_IMAGE_TYPES.has(imageFile.type) ||
      imageFile.size > 10 * 1024 * 1024
    )
      return NextResponse.json(
        { message: "Escolha uma imagem PNG, JPG, JPEG ou WEBP de até 10 MB." },
        { status: 400 },
      );
    const extension =
      imageFile.type === "image/png"
        ? "png"
        : imageFile.type === "image/webp"
          ? "webp"
          : "jpg";
    newImagePath = `${card.family_id}/${randomUUID()}.${extension}`;
    const admin = createAdminSupabaseClient();
    const { data: existingBucket, error: bucketLookupError } =
      await admin.storage.getBucket(CARD_IMAGES_BUCKET);
    if (bucketLookupError && !existingBucket) {
      const { error: bucketCreationError } = await admin.storage.createBucket(
        CARD_IMAGES_BUCKET,
        {
          public: true,
          allowedMimeTypes: [...ALLOWED_IMAGE_TYPES],
          fileSizeLimit: "10MB",
        },
      );
      if (bucketCreationError)
        return NextResponse.json(
          { message: "Não foi possível preparar o armazenamento da imagem." },
          { status: 500 },
        );
    }
    const { error: uploadError } = await admin.storage
      .from(CARD_IMAGES_BUCKET)
      .upload(newImagePath, await imageFile.arrayBuffer(), {
        contentType: imageFile.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError)
      return NextResponse.json(
        { message: "Não foi possível atualizar a imagem do cartão." },
        { status: 500 },
      );
    nextImage = admin.storage
      .from(CARD_IMAGES_BUCKET)
      .getPublicUrl(newImagePath).data.publicUrl;
  }
  const { error } = await supabase
    .from("cards")
    .update({
      name,
      institution,
      holder_member_id: holder.id,
      card_type: cardType,
      credit_limit: cardType === "credit" ? creditLimit : null,
      closing_day: cardType === "credit" ? closingDay : null,
      due_day: cardType === "credit" ? dueDay : null,
      last_four: lastFour,
      visual_key: JSON.stringify({ mode, image: nextImage }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", card.id)
    .eq("family_id", card.family_id);
  if (error && newImagePath)
    await createAdminSupabaseClient()
      .storage.from(CARD_IMAGES_BUCKET)
      .remove([newImagePath]);
  if (error)
    return NextResponse.json(
      { message: "Não foi possível editar o cartão." },
      { status: 400 },
    );
  if (imageFile && visual.image) {
    const marker = `/object/public/${CARD_IMAGES_BUCKET}/`;
    const oldPath = visual.image.includes(marker)
      ? decodeURIComponent(visual.image.split(marker)[1].split("?")[0])
      : "";
    if (oldPath)
      await createAdminSupabaseClient()
        .storage.from(CARD_IMAGES_BUCKET)
        .remove([oldPath]);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, userId, card } = await cardContext(id);
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!card)
    return NextResponse.json(
      { message: "Cartão não encontrado." },
      { status: 404 },
    );
  const input = await request.json().catch(() => null);
  const description = String(input?.description ?? "").trim();
  const amount = Number(input?.amount);
  const installments = Number(input?.installments);
  const purchaseDate = String(input?.purchaseDate ?? "");
  const categoryId = String(input?.categoryId ?? "") || null;
  if (
    !description ||
    !(amount > 0) ||
    installments < 1 ||
    installments > 48 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)
  )
    return NextResponse.json(
      { message: "Revise os dados da compra." },
      { status: 400 },
    );
  if (categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();
    if (!category)
      return NextResponse.json(
        { message: "Categoria inválida." },
        { status: 400 },
      );
  }
  const { data: purchase, error } = await supabase
    .from("card_purchases")
    .insert({
      family_id: card.family_id,
      card_id: card.id,
      description,
      total_amount: amount,
      purchase_date: purchaseDate,
      category_id: categoryId,
      installment_count: installments,
      payment_type: "credit",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !purchase)
    return NextResponse.json(
      { message: "Não foi possível salvar a compra." },
      { status: 400 },
    );
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / installments);
  const start = new Date(`${purchaseDate}T12:00:00`);
  if (card.closing_day && Number(purchaseDate.slice(-2)) > card.closing_day)
    start.setMonth(start.getMonth() + 1);
  for (let index = 0; index < installments; index++) {
    const competence = new Date(start);
    competence.setMonth(competence.getMonth() + index);
    const installmentAmount =
      (base + (index < cents % installments ? 1 : 0)) / 100;
    const { data: entry, error: entryError } = await supabase
      .from("financial_entries")
      .insert({
        family_id: card.family_id,
        kind: "expense",
        description:
          installments > 1
            ? `${description} (${index + 1}/${installments})`
            : description,
        amount: installmentAmount,
        competence_date: competence.toISOString().slice(0, 10),
        category_id: categoryId,
        responsible_member_id: card.holder_member_id,
        created_by: userId,
      })
      .select("id")
      .single();
    if (entryError || !entry)
      return NextResponse.json(
        {
          message:
            "A compra foi salva, mas não foi possível gerar todas as parcelas.",
        },
        { status: 400 },
      );
    await supabase
      .from("card_installments")
      .insert({
        family_id: card.family_id,
        purchase_id: purchase.id,
        entry_id: entry.id,
        installment_number: index + 1,
        installment_count: installments,
        amount: installmentAmount,
        competence_date: competence.toISOString().slice(0, 10),
      });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
