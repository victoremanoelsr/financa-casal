import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCardCycle } from "@/lib/bill-status";

const METHODS = new Set(["pix", "card", "cash", "bank_transfer", "other"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: billKey } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const { data: membership } = await supabase.from("family_members").select("family_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ message: "Família não encontrada." }, { status: 404 });
  const input = await request.json().catch(() => null);
  const amount = Number(input?.amount); const paymentDate = String(input?.paymentDate ?? ""); const note = String(input?.note ?? "").trim().slice(0, 500); const method = METHODS.has(String(input?.method)) ? String(input.method) : "other";
  if (!(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) return NextResponse.json({ message: "Informe um valor e uma data válidos." }, { status: 400 });

  let originalAmount = 0; let sourceId = ""; let billType: "card" | "store";
  if (billKey.startsWith("card-")) {
    sourceId = billKey.slice(5, 41); const dueDate = billKey.slice(42); billType = "card";
    const { data: card } = await supabase.from("cards").select("id,closing_day,due_day,card_purchases(total_amount,purchase_date,status)").eq("id", sourceId).eq("family_id", membership.family_id).eq("status", "active").maybeSingle();
    if (!card) return NextResponse.json({ message: "Conta não encontrada." }, { status: 404 });
    originalAmount = ((card.card_purchases as unknown as Array<{ total_amount: number; purchase_date: string; status: string }> | null) ?? []).filter((purchase) => purchase.status === "active" && getCardCycle(purchase.purchase_date, card.closing_day ?? 1, card.due_day ?? 1).dueDate === dueDate).reduce((sum, purchase) => sum + Number(purchase.total_amount), 0);
  } else if (billKey.startsWith("store-")) {
    sourceId = billKey.slice(6); billType = "store";
    const { data: installment } = await supabase.from("store_installments").select("id,amount").eq("id", sourceId).eq("family_id", membership.family_id).maybeSingle();
    if (!installment) return NextResponse.json({ message: "Conta não encontrada." }, { status: 404 });
    originalAmount = Number(installment.amount);
  } else return NextResponse.json({ message: "Tipo de conta inválido." }, { status: 400 });

  const { data: events } = await supabase.from("audit_events").select("id,event_type,metadata").eq("family_id", membership.family_id).in("event_type", ["bill_payment_recorded", "bill_payment_reversed"]);
  const reversed = new Set((events ?? []).filter((event) => event.event_type === "bill_payment_reversed").map((event) => Number((event.metadata as { paymentEventId?: number }).paymentEventId)));
  const paid = (events ?? []).filter((event) => event.event_type === "bill_payment_recorded" && !reversed.has(Number(event.id)) && (event.metadata as { billKey?: string }).billKey === billKey).reduce((sum, event) => sum + Number((event.metadata as { amount?: number }).amount ?? 0), 0);
  const remaining = Math.max(0, Math.round((originalAmount - paid) * 100) / 100);
  if (amount > remaining) return NextResponse.json({ message: `O valor informado é maior que o saldo pendente de ${remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` }, { status: 400 });
  const { error } = await supabase.from("audit_events").insert({ family_id: membership.family_id, actor_id: userId, event_type: "bill_payment_recorded", entity_type: billType === "card" ? "card" : "store_installment", entity_id: sourceId, metadata: { billKey, amount, paymentDate, note, method, originalAmount } });
  if (error) return NextResponse.json({ message: "Não foi possível registrar o pagamento." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
