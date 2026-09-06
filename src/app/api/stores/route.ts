import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BUCKET = "store-backgrounds";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function context() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ? String(data.claims.sub) : null;
  if (!userId) return { supabase, userId: null, membership: null };
  const { data: membership } = await supabase.from("family_members").select("family_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
  return { supabase, userId, membership };
}

export async function GET(request: Request) {
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  if (demoMode) {
    return NextResponse.json({
      stores: [
        {
          id: "demo-s1",
          name: "Capitinha",
          credit_limit: 2000,
          used: 0,
          available: 2000,
          holder: "Victor Emanuel",
          holderId: "demo-m1",
          backgroundImage: "",
        },
        {
          id: "demo-s2",
          name: "Farmácia São João",
          credit_limit: 2000,
          used: 0,
          available: 2000,
          holder: "Emilly Andrade",
          holderId: "demo-m2",
          backgroundImage: "",
        },
        {
          id: "demo-s3",
          name: "Loja Center",
          credit_limit: 1500,
          used: 0,
          available: 1500,
          holder: "Victor Emanuel",
          holderId: "demo-m1",
          backgroundImage: "",
        },
      ],
    });
  }
  const { supabase, userId, membership } = await context();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!membership) return NextResponse.json({ stores: [] });
  const [storesResult, purchasesResult, installmentsResult, paymentEventsResult] = await Promise.all([
    supabase.from("stores").select("id,name,credit_limit,holder_member_id,family_members!stores_holder_member_id_fkey(display_name)").eq("family_id", membership.family_id).eq("status", "active").order("name"),
    supabase.from("store_purchases").select("id,store_id,total_amount").eq("family_id", membership.family_id).eq("status", "active"),
    supabase.from("store_installments").select("id,purchase_id").eq("family_id", membership.family_id),
    supabase.from("audit_events").select("id,event_type,metadata").eq("family_id", membership.family_id).in("event_type", ["bill_payment_recorded", "bill_payment_reversed"]),
  ]);
  if (storesResult.error || purchasesResult.error || installmentsResult.error || paymentEventsResult.error) return NextResponse.json({ message: "Não foi possível carregar os comércios." }, { status: 500 });
  const usedByStore = (purchasesResult.data ?? []).reduce<Record<string, number>>((totals, purchase) => {
    totals[purchase.store_id] = (totals[purchase.store_id] ?? 0) + Number(purchase.total_amount);
    return totals;
  }, {});
  const purchaseStore = new Map((purchasesResult.data ?? []).map((purchase) => [purchase.id, purchase.store_id]));
  const installmentStore = new Map((installmentsResult.data ?? []).map((installment) => [installment.id, purchaseStore.get(installment.purchase_id)]));
  const reversedPaymentIds = new Set((paymentEventsResult.data ?? []).filter((event) => event.event_type === "bill_payment_reversed").map((event) => Number((event.metadata as { paymentEventId?: number }).paymentEventId)));
  for (const event of paymentEventsResult.data ?? []) {
    const metadata = event.metadata as { billKey?: string; amount?: number };
    if (event.event_type !== "bill_payment_recorded" || reversedPaymentIds.has(Number(event.id)) || !metadata.billKey?.startsWith("store-")) continue;
    const storeId = installmentStore.get(metadata.billKey.slice(6)); if (storeId) usedByStore[storeId] = Math.max(0, (usedByStore[storeId] ?? 0) - Number(metadata.amount ?? 0));
  }
  const admin = createAdminSupabaseClient();
  const { data: files } = await admin.storage.from(BUCKET).list(membership.family_id, { limit: 1000 });
  const imageFiles = new Map((files ?? []).map((file) => [file.name, file]));
  return NextResponse.json({ stores: (storesResult.data ?? []).map((store) => {
    const holder = store.family_members as unknown as { display_name?: string } | { display_name?: string }[] | null;
    const used = usedByStore[store.id] ?? 0;
    const imageFile = imageFiles.get(store.id);
    const image = imageFile ? `${admin.storage.from(BUCKET).getPublicUrl(`${membership.family_id}/${store.id}`).data.publicUrl}?v=${encodeURIComponent(imageFile.updated_at ?? "")}` : "";
    return { id: store.id, name: store.name, credit_limit: Number(store.credit_limit), used, available: Math.max(0, Number(store.credit_limit) - used), holder: Array.isArray(holder) ? holder[0]?.display_name : holder?.display_name, holderId: store.holder_member_id, backgroundImage: image };
  }) });
}

export async function POST(request: Request) {
  const { supabase, userId, membership } = await context();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!membership) return NextResponse.json({ message: "Família não encontrada." }, { status: 404 });
  const input = await request.formData().catch(() => null);
  if (!input) return NextResponse.json({ message: "Não foi possível ler os dados." }, { status: 400 });
  const name = String(input.get("name") ?? "").trim();
  const holderId = String(input.get("holderId") ?? "");
  const limit = Number(input.get("limit"));
  const imageValue = input.get("backgroundImage");
  const imageFile = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  const { data: holder } = await supabase.from("family_members").select("id").eq("id", holderId).eq("family_id", membership.family_id).eq("status", "active").maybeSingle();
  if (!name || !holder || !(limit > 0)) return NextResponse.json({ message: "Revise os dados do comércio." }, { status: 400 });
  if (imageFile && (!ALLOWED_TYPES.has(imageFile.type) || imageFile.size > MAX_IMAGE_SIZE)) return NextResponse.json({ message: "Escolha uma imagem PNG, JPG, JPEG ou WEBP de até 10 MB." }, { status: 400 });
  const { data: store, error } = await supabase.from("stores").insert({ family_id: membership.family_id, name, holder_member_id: holder.id, credit_limit: limit, created_by: userId }).select("id").single();
  if (error || !store) return NextResponse.json({ message: "Não foi possível salvar o comércio." }, { status: 400 });
  if (imageFile) {
    const admin = createAdminSupabaseClient();
    const { data: existingBucket, error: lookupError } = await admin.storage.getBucket(BUCKET);
    if (lookupError && !existingBucket) {
      const { error: creationError } = await admin.storage.createBucket(BUCKET, { public: true, allowedMimeTypes: [...ALLOWED_TYPES], fileSizeLimit: "10MB" });
      if (creationError) {
        await supabase.from("stores").update({ status: "archived" }).eq("id", store.id);
        return NextResponse.json({ message: "Não foi possível preparar o armazenamento da imagem." }, { status: 500 });
      }
    }
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(`${membership.family_id}/${store.id}`, await imageFile.arrayBuffer(), { contentType: imageFile.type, cacheControl: "3600", upsert: false });
    if (uploadError) {
      await supabase.from("stores").update({ status: "archived" }).eq("id", store.id);
      return NextResponse.json({ message: "Não foi possível enviar a imagem do comércio." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
