import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function purchaseContext(cardId: string, purchaseId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return { supabase, userId: null, purchase: null };
  const { data: purchase } = await supabase.from("card_purchases").select("id,family_id,installment_count").eq("id", purchaseId).eq("card_id", cardId).eq("status", "active").maybeSingle();
  return { supabase, userId, purchase };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; purchaseId: string }> }) {
  const { id, purchaseId } = await params;
  const { supabase, userId, purchase } = await purchaseContext(id, purchaseId);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!purchase) return NextResponse.json({ message: "Compra não encontrada." }, { status: 404 });
  const input = await request.json().catch(() => null);
  const description = String(input?.description ?? "").trim();
  const amount = Number(input?.amount);
  const date = String(input?.date ?? "");
  const categoryId = String(input?.categoryId ?? "") || null;
  if (!description || !(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ message: "Revise os dados da compra." }, { status: 400 });
  const { error } = await supabase.from("card_purchases").update({ description, total_amount: amount, purchase_date: date, category_id: categoryId, updated_at: new Date().toISOString() }).eq("id", purchase.id);
  if (error) return NextResponse.json({ message: "Não foi possível editar a compra." }, { status: 400 });
  const { data: links } = await supabase.from("card_installments").select("id,entry_id,installment_number,installment_count").eq("purchase_id", purchase.id).order("installment_number");
  const count = Math.max(1, links?.length ?? purchase.installment_count);
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / count);
  for (const link of links ?? []) {
    const installmentAmount = (base + (link.installment_number <= cents % count ? 1 : 0)) / 100;
    const competence = new Date(`${date}T12:00:00`);
    competence.setMonth(competence.getMonth() + link.installment_number - 1);
    const competenceDate = competence.toISOString().slice(0, 10);
    await supabase.from("card_installments").update({ amount: installmentAmount, competence_date: competenceDate }).eq("id", link.id);
    await supabase.from("financial_entries").update({ description: count > 1 ? `${description} (${link.installment_number}/${count})` : description, amount: installmentAmount, competence_date: competenceDate, category_id: categoryId, updated_at: new Date().toISOString() }).eq("id", link.entry_id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; purchaseId: string }> }) {
  const { id, purchaseId } = await params;
  const { supabase, userId, purchase } = await purchaseContext(id, purchaseId);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!purchase) return NextResponse.json({ message: "Compra não encontrada." }, { status: 404 });
  const { data: links } = await supabase.from("card_installments").select("entry_id").eq("purchase_id", purchase.id);
  const entryIds = (links ?? []).map((link) => link.entry_id);
  if (entryIds.length) await supabase.from("financial_entries").update({ status: "void", archived_at: new Date().toISOString() }).in("id", entryIds);
  await supabase.from("card_purchases").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", purchase.id);
  return NextResponse.json({ ok: true });
}
