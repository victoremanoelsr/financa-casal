import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BUCKET = "store-backgrounds";

async function storeContext(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return { supabase, userId: null, store: null };
  const { data: store } = await supabase.from("stores").select("id,family_id,name,credit_limit,holder_member_id,family_members!stores_holder_member_id_fkey(display_name)").eq("id", id).eq("status", "active").maybeSingle();
  return { supabase, userId, store };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, store } = await storeContext(id);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!store) return NextResponse.json({ message: "Comércio não encontrado." }, { status: 404 });
  const { data: purchases, error } = await supabase.from("store_purchases").select("id,purchase_date,total_amount,purchase_items(id,name,quantity,unit_price,total_amount)").eq("store_id", store.id).eq("status", "active").order("purchase_date", { ascending: false });
  if (error) return NextResponse.json({ message: "Não foi possível carregar as compras." }, { status: 500 });
  const purchaseIds = (purchases ?? []).map((purchase) => purchase.id);
  const { data: installments } = purchaseIds.length ? await supabase.from("store_installments").select("id,purchase_id").in("purchase_id", purchaseIds) : { data: [] };
  const installmentIds = new Set((installments ?? []).map((installment) => installment.id));
  const { data: paymentEvents } = await supabase.from("audit_events").select("id,event_type,metadata").eq("family_id", store.family_id).in("event_type", ["bill_payment_recorded", "bill_payment_reversed"]);
  const reversedPaymentIds = new Set((paymentEvents ?? []).filter((event) => event.event_type === "bill_payment_reversed").map((event) => Number((event.metadata as { paymentEventId?: number }).paymentEventId)));
  const paid = (paymentEvents ?? []).filter((event) => { const metadata = event.metadata as { billKey?: string }; return event.event_type === "bill_payment_recorded" && !reversedPaymentIds.has(Number(event.id)) && metadata.billKey?.startsWith("store-") && installmentIds.has(metadata.billKey.slice(6)); }).reduce((sum, event) => sum + Number((event.metadata as { amount?: number }).amount ?? 0), 0);
  const holder = store.family_members as unknown as { display_name?: string } | { display_name?: string }[] | null;
  const admin = createAdminSupabaseClient();
  const { data: files } = await admin.storage.from(BUCKET).list(store.family_id, { limit: 1000 });
  const imageFile = (files ?? []).find((file) => file.name === store.id);
  const backgroundImage = imageFile ? `${admin.storage.from(BUCKET).getPublicUrl(`${store.family_id}/${store.id}`).data.publicUrl}?v=${encodeURIComponent(imageFile.updated_at ?? "")}` : "";
  const used = Math.max(0, (purchases ?? []).reduce((sum, purchase) => sum + Number(purchase.total_amount), 0) - paid);
  return NextResponse.json({
    store: { id: store.id, name: store.name, holder: Array.isArray(holder) ? holder[0]?.display_name : holder?.display_name, limit: Number(store.credit_limit), used, backgroundImage },
    purchases: (purchases ?? []).map((purchase) => ({ id: purchase.id, date: purchase.purchase_date, total: Number(purchase.total_amount), items: (purchase.purchase_items ?? []).map((item) => ({ id: item.id, name: item.name, quantity: Number(item.quantity), unitPrice: Number(item.unit_price), total: Number(item.total_amount) })) })),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, store } = await storeContext(id);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!store) return NextResponse.json({ message: "Comércio não encontrado." }, { status: 404 });
  const input = await request.formData().catch(() => null);
  if (!input) return NextResponse.json({ message: "Não foi possível ler os dados." }, { status: 400 });
  const name = String(input.get("name") ?? "").trim();
  const holderId = String(input.get("holderId") ?? "");
  const limit = Number(input.get("limit"));
  const imageValue = input.get("backgroundImage");
  const imageFile = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  const { data: holder } = await supabase.from("family_members").select("id").eq("id", holderId).eq("family_id", store.family_id).eq("status", "active").maybeSingle();
  if (!name || !holder || !(limit > 0)) return NextResponse.json({ message: "Revise os dados do comércio." }, { status: 400 });
  if (imageFile) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type) || imageFile.size > 10 * 1024 * 1024) return NextResponse.json({ message: "Escolha uma imagem PNG, JPG, JPEG ou WEBP de até 10 MB." }, { status: 400 });
    const admin = createAdminSupabaseClient();
    const { data: existingBucket, error: bucketLookupError } = await admin.storage.getBucket(BUCKET);
    if (bucketLookupError && !existingBucket) {
      const { error: bucketCreationError } = await admin.storage.createBucket(BUCKET, {
        public: true,
        allowedMimeTypes: allowedTypes,
        fileSizeLimit: "10MB",
      });
      if (bucketCreationError) return NextResponse.json({ message: "Não foi possível preparar o armazenamento da imagem." }, { status: 500 });
    }
    const path = `${store.family_id}/${store.id}`;
    const { data: files } = await admin.storage.from(BUCKET).list(store.family_id, { limit: 1000 });
    const exists = (files ?? []).some((file) => file.name === store.id);
    const operation = exists ? admin.storage.from(BUCKET).update(path, await imageFile.arrayBuffer(), { contentType: imageFile.type, cacheControl: "0" }) : admin.storage.from(BUCKET).upload(path, await imageFile.arrayBuffer(), { contentType: imageFile.type, cacheControl: "0", upsert: false });
    const { error: imageError } = await operation;
    if (imageError) return NextResponse.json({ message: "Não foi possível atualizar a imagem do comércio." }, { status: 500 });
  }
  const { error } = await supabase.from("stores").update({ name, holder_member_id: holder.id, credit_limit: limit, updated_at: new Date().toISOString() }).eq("id", store.id).eq("family_id", store.family_id);
  if (error) return NextResponse.json({ message: "Não foi possível editar o comércio." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, store } = await storeContext(id);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!store) return NextResponse.json({ message: "Comércio não encontrado." }, { status: 404 });
  const input = await request.json().catch(() => null);
  const date = String(input?.date ?? "");
  const items = Array.isArray(input?.items) ? input.items.map((item: unknown) => { const row = item as Record<string, unknown>; return { name: String(row.name ?? "").trim(), quantity: Number(row.quantity), unitPrice: Number(row.unitPrice) }; }).filter((item: { name: string; quantity: number; unitPrice: number }) => item.name && item.quantity > 0 && item.unitPrice >= 0) : [];
  const total = Math.round(items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0) * 100) / 100;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !items.length || !(total > 0)) return NextResponse.json({ message: "Adicione produtos válidos e informe a data." }, { status: 400 });
  const { data: purchase, error } = await supabase.from("store_purchases").insert({ family_id: store.family_id, store_id: store.id, purchase_date: date, total_amount: total, created_by: userId }).select("id").single();
  if (error || !purchase) return NextResponse.json({ message: "Não foi possível salvar a compra." }, { status: 400 });
  const { error: itemError } = await supabase.from("purchase_items").insert(items.map((item: { name: string; quantity: number; unitPrice: number }) => ({ family_id: store.family_id, purchase_id: purchase.id, name: item.name, quantity: item.quantity, unit_price: item.unitPrice })));
  if (itemError) return NextResponse.json({ message: "A compra foi criada, mas os produtos não foram salvos." }, { status: 400 });
  const { data: category } = await supabase.from("categories").select("id").eq("name", "Compras").is("family_id", null).eq("status", "active").maybeSingle();
  const { data: entry, error: entryError } = await supabase.from("financial_entries").insert({ family_id: store.family_id, kind: "expense", description: `Compra em ${store.name}`, amount: total, competence_date: date, category_id: category?.id ?? null, responsible_member_id: store.holder_member_id, created_by: userId }).select("id").single();
  if (entryError || !entry) return NextResponse.json({ message: "A compra foi criada, mas o lançamento financeiro não foi salvo." }, { status: 400 });
  await supabase.from("store_installments").insert({ family_id: store.family_id, purchase_id: purchase.id, entry_id: entry.id, installment_number: 1, installment_count: 1, amount: total, due_date: date });
  return NextResponse.json({ ok: true }, { status: 201 });
}
