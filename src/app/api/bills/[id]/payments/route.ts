import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { splitAmount } from "@/lib/finance-domain";

const METHODS = new Set([
  "pix",
  "credit",
  "debit",
  "cash",
  "bank_transfer",
  "other",
]);
const monthDate = (date: string, offset: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setMonth(value.getMonth() + offset);
  return value.toISOString().slice(0, 10);
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: billKey } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership)
    return NextResponse.json(
      { message: "Família não encontrada." },
      { status: 404 },
    );
  const input = await request.json().catch(() => null);
  const amount = Number(input?.amount);
  const paymentDate = String(input?.paymentDate ?? "");
  const note = String(input?.note ?? "")
    .trim()
    .slice(0, 500);
  const method = METHODS.has(String(input?.method))
    ? String(input.method)
    : "other";
  const cardId = String(input?.cardId ?? "");
  const installmentCount = Math.max(
    1,
    Math.min(48, Number(input?.installmentCount) || 1),
  );
  if (!(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate))
    return NextResponse.json(
      { message: "Informe um valor e uma data válidos." },
      { status: 400 },
    );

  let originalAmount = 0;
  let sourceId = "";
  let billType: "card" | "store" | "fixed" | "subscription";
  if (billKey.startsWith("card-")) {
    sourceId = billKey.slice(5, 41);
    const dueDate = billKey.slice(42);
    billType = "card";
    const { data: card } = await supabase
      .from("cards")
      .select("id,closing_day,due_day")
      .eq("id", sourceId)
      .eq("family_id", membership.family_id)
      .eq("status", "active")
      .maybeSingle();
    if (!card)
      return NextResponse.json(
        { message: "Conta não encontrada." },
        { status: 404 },
      );
    const referenceMonth = dueDate.slice(0, 7);
    const nextMonth = monthDate(`${referenceMonth}-01`, 1).slice(0, 7);
    const { data: installments, error: installmentError } = await supabase
      .from("card_installments")
      .select("amount,card_purchases!inner(card_id,status,payment_type)")
      .eq("family_id", membership.family_id)
      .eq("card_purchases.card_id", sourceId)
      .eq("card_purchases.status", "active")
      .eq("card_purchases.payment_type", "credit")
      .gte("competence_date", `${referenceMonth}-01`)
      .lt("competence_date", `${nextMonth}-01`);
    if (installmentError)
      return NextResponse.json(
        { message: "Não foi possível calcular a fatura." },
        { status: 500 },
      );
    originalAmount = (installments ?? []).reduce(
      (sum, installment) => sum + Number(installment.amount),
      0,
    );
  } else if (billKey.startsWith("store-")) {
    sourceId = billKey.slice(6);
    billType = "store";
    const { data: installment } = await supabase
      .from("store_installments")
      .select("id,amount")
      .eq("id", sourceId)
      .eq("family_id", membership.family_id)
      .maybeSingle();
    if (!installment)
      return NextResponse.json(
        { message: "Conta não encontrada." },
        { status: 404 },
      );
    originalAmount = Number(installment.amount);
  } else if (billKey.startsWith("fixed-")) {
    sourceId = billKey.slice(6, 42);
    billType = "fixed";
    const { data } = await supabase
      .from("fixed_expenses")
      .select("id,reference_amount")
      .eq("id", sourceId)
      .eq("family_id", membership.family_id)
      .eq("status", "active")
      .maybeSingle();
    if (!data)
      return NextResponse.json(
        { message: "Conta não encontrada." },
        { status: 404 },
      );
    originalAmount = Number(data.reference_amount);
  } else if (billKey.startsWith("subscription-")) {
    sourceId = billKey.slice(13, 49);
    billType = "subscription";
    const { data } = await supabase
      .from("subscriptions")
      .select("id,amount")
      .eq("id", sourceId)
      .eq("family_id", membership.family_id)
      .eq("status", "active")
      .maybeSingle();
    if (!data)
      return NextResponse.json(
        { message: "Assinatura não encontrada." },
        { status: 404 },
      );
    originalAmount = Number(data.amount);
  } else
    return NextResponse.json(
      { message: "Tipo de conta inválido." },
      { status: 400 },
    );

  const { data: events } = await supabase
    .from("audit_events")
    .select("id,event_type,metadata")
    .eq("family_id", membership.family_id)
    .in("event_type", ["bill_payment_recorded", "bill_payment_reversed"]);
  const reversed = new Set(
    (events ?? [])
      .filter((event) => event.event_type === "bill_payment_reversed")
      .map((event) =>
        Number((event.metadata as { paymentEventId?: number }).paymentEventId),
      ),
  );
  const paid = (events ?? [])
    .filter(
      (event) =>
        event.event_type === "bill_payment_recorded" &&
        !reversed.has(Number(event.id)) &&
        (event.metadata as { billKey?: string }).billKey === billKey,
    )
    .reduce(
      (sum, event) =>
        sum + Number((event.metadata as { amount?: number }).amount ?? 0),
      0,
    );
  const remaining = Math.max(
    0,
    Math.round((originalAmount - paid) * 100) / 100,
  );
  if (amount > remaining)
    return NextResponse.json(
      {
        message: `O valor informado é maior que o saldo pendente de ${remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      },
      { status: 400 },
    );

  // Se o pagamento for via saldo (PIX, débito, dinheiro, transferência), verifica se há saldo suficiente na conta
  if (method !== "credit") {
    const [{ data: allEntries }, { data: cardLinks }, { data: cardPurchasesData }, { data: allCards }] = await Promise.all([
      supabase
        .from("financial_entries")
        .select("id,kind,amount,status")
        .eq("family_id", membership.family_id)
        .eq("status", "posted")
        .is("archived_at", null)
        .in("kind", ["income", "expense", "initial_balance"]),
      supabase
        .from("card_installments")
        .select("entry_id,purchase_id")
        .eq("family_id", membership.family_id),
      supabase
        .from("card_purchases")
        .select("id,payment_type,card_id")
        .eq("family_id", membership.family_id)
        .eq("status", "active"),
      supabase
        .from("cards")
        .select("id,card_type")
        .eq("family_id", membership.family_id)
        .eq("status", "active"),
    ]);

    const cardTypesMap = new Map((allCards ?? []).map((c) => [c.id, c.card_type]));
    const cardPurchaseMap = new Map((cardPurchasesData ?? []).map((p) => [p.id, p]));
    const cardEntrySet = new Set((cardLinks ?? []).map((l) => l.entry_id));
    const debitCardEntrySet = new Set(
      (cardLinks ?? [])
        .filter((l) => {
          const purchase = cardPurchaseMap.get(l.purchase_id);
          return purchase?.payment_type === "debit" || cardTypesMap.get(purchase?.card_id ?? "") === "debit";
        })
        .map((l) => l.entry_id),
    );

    const directBalance = (allEntries ?? [])
      .filter((entry) => !cardEntrySet.has(entry.id) || debitCardEntrySet.has(entry.id))
      .reduce((sum, entry) => {
        const val = Number(entry.amount);
        return entry.kind === "expense" ? sum - val : sum + val;
      }, 0);

    const cashPaidEventsTotal = (events ?? [])
      .filter(
        (event) =>
          event.event_type === "bill_payment_recorded" &&
          !reversed.has(Number(event.id)) &&
          (event.metadata as { method?: string }).method !== "credit",
      )
      .reduce((sum, event) => sum + Number((event.metadata as { amount?: number }).amount ?? 0), 0);

    const currentAccountBalance = Math.round((directBalance - cashPaidEventsTotal) * 100) / 100;

    if (amount > currentAccountBalance) {
      return NextResponse.json(
        {
          message: `Saldo insuficiente na conta para realizar o pagamento (Saldo atual: ${currentAccountBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).`,
        },
        { status: 400 },
      );
    }
  }

  if (method === "credit") {
    const { data: card } = await supabase
      .from("cards")
      .select("id,closing_day,card_type")
      .eq("id", cardId)
      .eq("family_id", membership.family_id)
      .eq("status", "active")
      .maybeSingle();
    if (!card || card.card_type === "debit")
      return NextResponse.json(
        { message: "Selecione um cartão com função crédito." },
        { status: 400 },
      );
    const operationKey = `bill-payment:${billKey}:${crypto.randomUUID()}`;
    const { data: purchase, error: purchaseError } = await supabase
      .from("card_purchases")
      .insert({
        family_id: membership.family_id,
        card_id: card.id,
        description: `Pagamento de conta: ${billKey}`,
        total_amount: amount,
        purchase_date: paymentDate,
        installment_count: installmentCount,
        source_type: "account_transfer",
        payment_type: "credit",
        origin_key: operationKey,
        created_by: userId,
      })
      .select("id")
      .single();
    if (purchaseError || !purchase)
      return NextResponse.json(
        { message: "Não foi possível transferir a dívida para o cartão." },
        { status: 400 },
      );
    const values = splitAmount(amount, installmentCount);
    for (let index = 0; index < installmentCount; index++) {
      const competence = monthDate(
        paymentDate,
        Number(paymentDate.slice(-2)) > Number(card.closing_day ?? 31)
          ? index + 1
          : index,
      );
      const { data: entry, error: entryError } = await supabase
        .from("financial_entries")
        .insert({
          family_id: membership.family_id,
          kind: "expense",
          description: `Transferência para cartão (${index + 1}/${installmentCount})`,
          amount: values[index],
          competence_date: competence,
          status: "posted",
          created_by: userId,
          deduplication_key: `${operationKey}:${index + 1}`,
        })
        .select("id")
        .single();
      if (entryError || !entry)
        return NextResponse.json(
          { message: "Não foi possível criar todas as parcelas no cartão." },
          { status: 400 },
        );
      await supabase
        .from("card_installments")
        .insert({
          family_id: membership.family_id,
          purchase_id: purchase.id,
          entry_id: entry.id,
          installment_number: index + 1,
          installment_count: installmentCount,
          amount: values[index],
          competence_date: competence,
        });
    }
  }
  const entityTypes = {
    card: "card",
    store: "store_installment",
    fixed: "fixed_expense",
    subscription: "subscription",
  } as const;
  const { error } = await supabase
    .from("audit_events")
    .insert({
      family_id: membership.family_id,
      actor_id: userId,
      event_type: "bill_payment_recorded",
      entity_type: entityTypes[billType],
      entity_id: sourceId,
      metadata: {
        billKey,
        amount,
        paymentDate,
        note,
        method,
        originalAmount,
        cardId: method === "credit" ? cardId : null,
        installmentCount: method === "credit" ? installmentCount : 1,
      },
    });
  if (error)
    return NextResponse.json(
      { message: "Não foi possível registrar o pagamento." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
