import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function context() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ? String(data.claims.sub) : null;
  if (!userId) return { supabase, userId: null, membership: null };
  const { data: membership } = await supabase.from("family_members").select("id,family_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
  return { supabase, userId, membership };
}

export async function GET() {
  const { supabase, userId, membership } = await context();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!membership) return NextResponse.json({ cards: [] });
  const { data, error } = await supabase.from("cards").select("id,name,institution,card_type,credit_limit,closing_day,due_day,last_four,visual_key,holder_member_id,family_members!cards_holder_member_id_fkey(display_name)").eq("family_id", membership.family_id).eq("status", "active").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ message: "Não foi possível carregar os cartões." }, { status: 500 });
  return NextResponse.json({ cards: (data ?? []).map((card) => {
    const holderRelation = card.family_members as unknown as { display_name: string } | { display_name: string }[] | null;
    return {
      id: card.id, name: card.name, institution: card.institution, type: card.card_type,
      limit: Number(card.credit_limit ?? 0), closingDay: card.closing_day, dueDay: card.due_day,
      lastFour: card.last_four ?? "0000", visualKey: card.visual_key ?? "blue",
      holder: Array.isArray(holderRelation) ? holderRelation[0]?.display_name : holderRelation?.display_name,
    };
  }) });
}

export async function POST(request: Request) {
  const { supabase, userId, membership } = await context();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!membership) return NextResponse.json({ message: "Família não encontrada." }, { status: 404 });
  const input = await request.json().catch(() => null);
  const name = String(input?.name ?? "").trim();
  const institution = String(input?.institution ?? "").trim();
  const holderMemberId = String(input?.holderMemberId ?? "");
  const cardType = input?.type === "debit" ? "debit" : "credit";
  const creditLimit = Number(input?.limit);
  const closingDay = Number(input?.closingDay);
  const dueDay = Number(input?.dueDay);
  const lastFour = String(input?.lastFour ?? "").replace(/\D/g, "");
  if (!name || !institution || lastFour.length !== 4) return NextResponse.json({ message: "Revise os dados do cartão." }, { status: 400 });
  if (cardType === "credit" && (!(creditLimit > 0) || closingDay < 1 || closingDay > 31 || dueDay < 1 || dueDay > 31)) return NextResponse.json({ message: "Informe limite, fechamento e vencimento válidos." }, { status: 400 });
  const { data: holder } = await supabase.from("family_members").select("id").eq("id", holderMemberId).eq("family_id", membership.family_id).eq("status", "active").maybeSingle();
  if (!holder) return NextResponse.json({ message: "Selecione um titular da família." }, { status: 400 });
  const { error } = await supabase.from("cards").insert({ family_id: membership.family_id, name, institution, holder_member_id: holder.id, card_type: cardType, credit_limit: cardType === "credit" ? creditLimit : null, closing_day: cardType === "credit" ? closingDay : null, due_day: cardType === "credit" ? dueDay : null, last_four: lastFour, visual_key: "blue", created_by: userId });
  if (error) return NextResponse.json({ message: "Não foi possível salvar o cartão." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
