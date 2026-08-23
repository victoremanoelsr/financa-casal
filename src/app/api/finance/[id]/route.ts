import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function entryContext(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return { supabase, userId: null, entry: null };
  const { data: entry } = await supabase.from("financial_entries").select("id,family_id").eq("id", id).eq("status", "posted").maybeSingle();
  return { supabase, userId, entry };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, entry } = await entryContext(id);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!entry) return NextResponse.json({ message: "Lançamento não encontrado." }, { status: 404 });
  const input = await request.json().catch(() => null);
  const description = String(input?.description ?? "").trim();
  const amount = Number(input?.amount);
  const date = String(input?.date ?? "");
  const categoryId = String(input?.categoryId ?? "") || null;
  if (!description || !(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ message: "Revise os dados do lançamento." }, { status: 400 });
  const { error } = await supabase.from("financial_entries").update({ description, amount, competence_date: date, category_id: categoryId, updated_at: new Date().toISOString() }).eq("id", id).eq("family_id", entry.family_id);
  if (error) return NextResponse.json({ message: "Não foi possível editar o lançamento." }, { status: 400 });
  const { data: link } = await supabase.from("card_installments").select("purchase_id,installment_count").eq("entry_id", id).maybeSingle();
  if (link) {
    await supabase.from("card_installments").update({ amount, competence_date: date }).eq("entry_id", id);
    if (link.installment_count === 1) await supabase.from("card_purchases").update({ description, total_amount: amount, purchase_date: date, category_id: categoryId, updated_at: new Date().toISOString() }).eq("id", link.purchase_id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, entry } = await entryContext(id);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!entry) return NextResponse.json({ message: "Lançamento não encontrado." }, { status: 404 });
  const { data: link } = await supabase.from("card_installments").select("purchase_id").eq("entry_id", id).maybeSingle();
  if (link) {
    const { data: linkedEntries } = await supabase.from("card_installments").select("entry_id").eq("purchase_id", link.purchase_id);
    const ids = (linkedEntries ?? []).map((item) => item.entry_id);
    if (ids.length) await supabase.from("financial_entries").update({ status: "void", archived_at: new Date().toISOString() }).in("id", ids);
    await supabase.from("card_purchases").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", link.purchase_id);
  } else {
    await supabase.from("financial_entries").update({ status: "void", archived_at: new Date().toISOString() }).eq("id", id).eq("family_id", entry.family_id);
  }
  return NextResponse.json({ ok: true });
}
