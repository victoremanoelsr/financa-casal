import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addCivilDays, calculateCardStatus, calculateStoreStatus, formatCivilDate, getCardCycle, monthLabel } from "@/lib/bill-status";
import { activePaymentEvents, type PaymentMetadata } from "@/lib/finance-domain";


export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const { data: membership } = await supabase.from("family_members").select("family_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ bills: [], groups: { cards: 0, stores: 0, subscriptions: 0, fixed: 0 } });
  const [cardsResult, storesResult, storePurchasesResult, storeInstallmentsResult, eventsResult] = await Promise.all([
    supabase.from("cards").select("id,name,institution,closing_day,due_day,last_four,card_purchases(id,description,total_amount,purchase_date,status)").eq("family_id", membership.family_id).eq("status", "active"),
    supabase.from("stores").select("id,name").eq("family_id", membership.family_id).eq("status", "active"),
    supabase.from("store_purchases").select("id,store_id,purchase_date,total_amount,status,purchase_items(name,quantity,unit_price,total_amount)").eq("family_id", membership.family_id).eq("status", "active"),
    supabase.from("store_installments").select("id,purchase_id,amount,due_date,installment_number,installment_count").eq("family_id", membership.family_id),
    supabase.from("audit_events").select("id,actor_id,event_type,entity_id,metadata,created_at").eq("family_id", membership.family_id).in("event_type", ["bill_payment_recorded", "bill_payment_reversed"]).order("created_at"),
  ]);
  if (cardsResult.error || storesResult.error || storePurchasesResult.error || storeInstallmentsResult.error || eventsResult.error)
    return NextResponse.json({ message: "Não foi possível carregar as contas." }, { status: 500 });

  const events = eventsResult.data ?? [];
  const paymentEvents = activePaymentEvents(events);
  const actorIds = [...new Set(paymentEvents.map((event) => event.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id,full_name").in("id", actorIds) : { data: [] };
  const actorNames = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name]));
  const paymentsFor = (billKey: string) => paymentEvents.filter((event) => (event.metadata as PaymentMetadata).billKey === billKey).map((event) => {
    const metadata = event.metadata as PaymentMetadata;
    return { id: String(event.id), amount: Number(metadata.amount ?? 0), date: metadata.paymentDate ?? event.created_at.slice(0, 10), createdAt: event.created_at, note: metadata.note ?? "", method: metadata.method ?? "other", responsible: event.actor_id ? actorNames.get(event.actor_id) ?? "Membro da família" : "Membro da família" };
  });
  const today = formatCivilDate(new Date());
  const currentMonth = today.slice(0, 7);
  const enrich = <T extends { id: string; amount: number; dueDate: string; originalDate: string; type: "card" | "store"; sourceId: string }>(bill: T, statusFor: (remaining: number) => "open" | "pending" | "overdue" | "paid") => {
    const payments = paymentsFor(bill.id);
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, Math.round((bill.amount - paid) * 100) / 100);
    const status = statusFor(remaining);
    const originMonth = bill.originalDate.slice(0, 7);
    return { ...bill, originalAmount: bill.amount, paid, remaining, status, payments, originMonth: monthLabel(`${originMonth}-01`), carried: originMonth < currentMonth };
  };

  const cardBills = (cardsResult.data ?? []).flatMap((card) => {
    const purchases = ((card.card_purchases as unknown as Array<{ id: string; description: string; total_amount: number; purchase_date: string; status: string }> | null) ?? []).filter((purchase) => purchase.status === "active");
    const cycles = new Map<string, { amount: number; originalDate: string; closingDate: string; dueDate: string; purchases: Array<{ id: string; description: string; date: string; amount: number; items: never[] }> }>();
    for (const purchase of purchases) {
      const cycle = getCardCycle(purchase.purchase_date, card.closing_day ?? 1, card.due_day ?? 1);
      const current = cycles.get(cycle.dueDate);
      cycles.set(cycle.dueDate, { amount: (current?.amount ?? 0) + Number(purchase.total_amount), originalDate: current?.originalDate && current.originalDate < purchase.purchase_date ? current.originalDate : purchase.purchase_date, closingDate: cycle.closingDate, dueDate: cycle.dueDate, purchases: [...(current?.purchases ?? []), { id: purchase.id, description: purchase.description, date: purchase.purchase_date, amount: Number(purchase.total_amount), items: [] }] });
    }
      return [...cycles.values()].map((cycle) => enrich({ id: `card-${card.id}-${cycle.dueDate}`, type: "card" as const, sourceId: card.id, name: card.name, origin: "Cartão", originalDate: cycle.originalDate, closingDate: cycle.closingDate, dueDate: cycle.dueDate, amount: cycle.amount, purchases: cycle.purchases }, (remaining) => calculateCardStatus(cycle.closingDate, cycle.dueDate, remaining, today)));
  });
  const storesById = new Map((storesResult.data ?? []).map((store) => [store.id, store]));
  const purchasesById = new Map((storePurchasesResult.data ?? []).map((purchase) => [purchase.id, purchase]));
  const storeBills = (storeInstallmentsResult.data ?? []).flatMap((installment) => {
    const purchase = purchasesById.get(installment.purchase_id); const store = purchase ? storesById.get(purchase.store_id) : null;
    if (!purchase || !store) return [];
    const originalDate = purchase.purchase_date;
    const items = ((purchase.purchase_items as unknown as Array<{ name: string; quantity: number; unit_price: number; total_amount: number }> | null) ?? []).map((item) => ({ name: item.name, quantity: Number(item.quantity), unitPrice: Number(item.unit_price), total: Number(item.total_amount) }));
    return [enrich({ id: `store-${installment.id}`, type: "store" as const, sourceId: installment.id, name: store.name, origin: "Comércio", originalDate, dueDate: addCivilDays(originalDate, 30), amount: Number(installment.amount), purchases: [{ id: purchase.id, description: store.name, date: purchase.purchase_date, amount: Number(purchase.total_amount), items }] }, (remaining) => calculateStoreStatus(originalDate, remaining, today))];
  });
  const bills = [...cardBills, ...storeBills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const cardsTotal = cardBills.reduce((sum, bill) => sum + bill.remaining, 0);
  const storesTotal = storeBills.reduce((sum, bill) => sum + bill.remaining, 0);
  return NextResponse.json({ bills, groups: { cards: cardsTotal, stores: storesTotal, subscriptions: 0, fixed: 0 } });
}
