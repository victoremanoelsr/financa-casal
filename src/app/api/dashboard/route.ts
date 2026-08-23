import { NextResponse } from "next/server";
import { formatCivilDate } from "@/lib/bill-status";
import { monthlyFinancialSummary } from "@/lib/finance-domain";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const COLORS = { cards: "#16a085", stores: "#0f4c5c", direct: "#7c4dff" };
const relationName = (value: unknown) => {
  const row = (Array.isArray(value) ? value[0] : value) as { name?: string } | null;
  return row?.name ?? "Sem categoria";
};

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const { data: membership } = await supabase.from("family_members").select("family_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
  const requestedMonth = new URL(request.url).searchParams.get("month");
  const month = /^\d{4}-\d{2}$/.test(requestedMonth ?? "") ? requestedMonth! : formatCivilDate(new Date()).slice(0, 7);
  if (!membership) return NextResponse.json({ income: 0, expenses: 0, previousBalance: 0, balance: 0, cashFlow: [], categories: [], expenseItems: [] });

  const [entriesResult, cardPurchasesResult, cardInstallmentsResult, cardsResult, storePurchasesResult, storeInstallmentsResult, storesResult] = await Promise.all([
    supabase.from("financial_entries").select("id,kind,description,amount,competence_date,categories(name)").eq("family_id", membership.family_id).eq("status", "posted").in("kind", ["income", "expense", "initial_balance"]),
    supabase.from("card_purchases").select("id,card_id,description,total_amount,purchase_date,status").eq("family_id", membership.family_id).eq("status", "active"),
    supabase.from("card_installments").select("entry_id").eq("family_id", membership.family_id),
    supabase.from("cards").select("id,name").eq("family_id", membership.family_id).eq("status", "active"),
    supabase.from("store_purchases").select("id,store_id,total_amount,purchase_date,status").eq("family_id", membership.family_id).eq("status", "active"),
    supabase.from("store_installments").select("entry_id").eq("family_id", membership.family_id),
    supabase.from("stores").select("id,name").eq("family_id", membership.family_id).eq("status", "active"),
  ]);
  if ([entriesResult, cardPurchasesResult, cardInstallmentsResult, cardsResult, storePurchasesResult, storeInstallmentsResult, storesResult].some((result) => result.error)) return NextResponse.json({ message: "Não foi possível carregar o Dashboard." }, { status: 500 });

  const cardEntryIds = new Set((cardInstallmentsResult.data ?? []).map((item) => item.entry_id));
  const storeEntryIds = new Set((storeInstallmentsResult.data ?? []).map((item) => item.entry_id));
  const financialRows = [
    ...(entriesResult.data ?? []).filter((entry) => !cardEntryIds.has(entry.id)).map((entry) => ({ type: entry.kind as "income" | "expense" | "initial_balance", amount: Number(entry.amount), date: entry.competence_date })),
    ...(cardPurchasesResult.data ?? []).map((purchase) => ({ type: "expense" as const, amount: Number(purchase.total_amount), date: purchase.purchase_date })),
  ];
  const summary = monthlyFinancialSummary(financialRows, month);
  const monthRows = financialRows.filter((row) => row.date.startsWith(month));
  const byDay = monthRows.reduce<Record<string, { receitas: number; despesas: number }>>((result, row) => {
    const day = row.date.slice(-2); const current = result[day] ?? { receitas: 0, despesas: 0 };
    if (row.type === "expense") current.despesas += row.amount; else current.receitas += row.amount;
    result[day] = current; return result;
  }, {});
  const cards = new Map((cardsResult.data ?? []).map((card) => [card.id, card.name]));
  const stores = new Map((storesResult.data ?? []).map((store) => [store.id, store.name]));
  const expenseItems = [
    ...(cardPurchasesResult.data ?? []).filter((item) => item.purchase_date.startsWith(month)).map((item) => ({ type: "card" as const, id: item.card_id, name: cards.get(item.card_id) ?? item.description, subtitle: item.description, amount: Number(item.total_amount), date: item.purchase_date })),
    ...(storePurchasesResult.data ?? []).filter((item) => item.purchase_date.startsWith(month)).map((item) => ({ type: "store" as const, id: item.store_id, name: stores.get(item.store_id) ?? "Comércio", subtitle: "Comércio", amount: Number(item.total_amount), date: item.purchase_date })),
    ...(entriesResult.data ?? []).filter((entry) => entry.kind === "expense" && !cardEntryIds.has(entry.id) && !storeEntryIds.has(entry.id) && entry.competence_date.startsWith(month)).map((entry) => ({ type: "direct" as const, id: entry.id, name: entry.description, subtitle: relationName(entry.categories), amount: Number(entry.amount), date: entry.competence_date })),
  ].sort((a, b) => b.amount - a.amount);
  const categories = [
    { name: "Comércios", value: expenseItems.filter((item) => item.type === "store").reduce((sum, item) => sum + item.amount, 0), color: COLORS.stores },
    { name: "Cartões", value: expenseItems.filter((item) => item.type === "card").reduce((sum, item) => sum + item.amount, 0), color: COLORS.cards },
    { name: "Outras", value: expenseItems.filter((item) => item.type === "direct").reduce((sum, item) => sum + item.amount, 0), color: COLORS.direct },
  ].filter((item) => item.value > 0);
  return NextResponse.json({ ...summary, cashFlow: Object.entries(byDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, values]) => ({ label: `Dia ${Number(day)}`, ...values })), categories, expenseItems });
}
