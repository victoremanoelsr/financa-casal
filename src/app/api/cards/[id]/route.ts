import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function cardContext(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return { supabase, userId: null, card: null };
  const { data: card } = await supabase.from("cards").select("id,family_id,name,institution,card_type,credit_limit,closing_day,due_day,last_four,visual_key,holder_member_id,family_members!cards_holder_member_id_fkey(display_name)").eq("id", id).eq("status", "active").maybeSingle();
  return { supabase, userId, card };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, card } = await cardContext(id);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!card) return NextResponse.json({ message: "Cartão não encontrado." }, { status: 404 });
  const { data: purchases, error } = await supabase.from("card_purchases").select("id,description,total_amount,purchase_date,installment_count,category_id,categories(name)").eq("card_id", card.id).eq("status", "active").order("purchase_date", { ascending: false });
  if (error) return NextResponse.json({ message: "Não foi possível carregar as compras." }, { status: 500 });
  const holder = card.family_members as unknown as { display_name: string } | { display_name: string }[] | null;
  return NextResponse.json({ card: { id: card.id, name: card.name, institution: card.institution, type: card.card_type, limit: Number(card.credit_limit ?? 0), closingDay: card.closing_day, dueDay: card.due_day, lastFour: card.last_four ?? "0000", visualKey: card.visual_key ?? "blue", holder: Array.isArray(holder) ? holder[0]?.display_name : holder?.display_name }, purchases: (purchases ?? []).map((purchase) => { const category = purchase.categories as unknown as { name: string } | { name: string }[] | null; return { id: purchase.id, description: purchase.description, amount: Number(purchase.total_amount), date: purchase.purchase_date, installments: purchase.installment_count, category: Array.isArray(category) ? category[0]?.name : category?.name ?? "Sem categoria" }; }) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, card } = await cardContext(id);
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!card) return NextResponse.json({ message: "Cartão não encontrado." }, { status: 404 });
  const input = await request.json().catch(() => null);
  const description = String(input?.description ?? "").trim(); const amount = Number(input?.amount); const installments = Number(input?.installments); const purchaseDate = String(input?.purchaseDate ?? ""); const categoryId = String(input?.categoryId ?? "") || null;
  if (!description || !(amount > 0) || installments < 1 || installments > 48 || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) return NextResponse.json({ message: "Revise os dados da compra." }, { status: 400 });
  if (categoryId) { const { data: category } = await supabase.from("categories").select("id").eq("id", categoryId).maybeSingle(); if (!category) return NextResponse.json({ message: "Categoria inválida." }, { status: 400 }); }
  const { error } = await supabase.from("card_purchases").insert({ family_id: card.family_id, card_id: card.id, description, total_amount: amount, purchase_date: purchaseDate, category_id: categoryId, installment_count: installments, created_by: userId });
  if (error) return NextResponse.json({ message: "Não foi possível salvar a compra." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
