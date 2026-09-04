import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { monthlyFinancialSummary } from "@/lib/finance-domain";

async function context() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ? String(data.claims.sub) : null;
  if (!userId) return { supabase, userId: null, membership: null };
  const { data: membership } = await supabase
    .from("family_members")
    .select("id,family_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return { supabase, userId, membership };
}
const relationName = (value: unknown, field: string) => {
  const row = (Array.isArray(value) ? value[0] : value) as Record<
    string,
    string
  > | null;
  return row?.[field] ?? "";
};
const monthDate = (date: string, offset: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setMonth(value.getMonth() + offset);
  return value.toISOString().slice(0, 10);
};
const installments = (amount: number, count: number) => {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / count);
  return Array.from(
    { length: count },
    (_, index) => (base + (index < cents % count ? 1 : 0)) / 100,
  );
};

export async function GET(request: Request) {
  const { supabase, userId, membership } = await context();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!membership)
    return NextResponse.json({ entries: [], cards: [], stores: [] });
  const requestedMonth = new URL(request.url).searchParams.get("month");
  const month = /^\d{4}-\d{2}$/.test(requestedMonth ?? "")
    ? requestedMonth!
    : new Date().toISOString().slice(0, 7);
  const [entries, cards, stores, cardPurchases, paymentEvents] =
    await Promise.all([
      supabase
        .from("financial_entries")
        .select(
          "id,kind,description,amount,competence_date,category_id,categories(name),family_members!financial_entries_responsible_member_id_fkey(display_name)",
        )
        .eq("family_id", membership.family_id)
        .eq("status", "posted")
        .in("kind", ["income", "expense", "initial_balance"])
        .order("competence_date", { ascending: false }),
      supabase
        .from("cards")
        .select(
          "id,name,institution,last_four,card_type,family_members!cards_holder_member_id_fkey(display_name)",
        )
        .eq("family_id", membership.family_id)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("stores")
        .select("id,name,credit_limit")
        .eq("family_id", membership.family_id)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("card_purchases")
        .select("id,card_id,description,total_amount,purchase_date,category_id,source_type,payment_type")
        .eq("family_id", membership.family_id)
        .eq("status", "active"),
      supabase
        .from("audit_events")
        .select("id,event_type,metadata")
        .eq("family_id", membership.family_id)
        .in("event_type", ["bill_payment_recorded", "bill_payment_reversed"]),
    ]);
  if (
    entries.error ||
    cards.error ||
    stores.error ||
    cardPurchases.error ||
    paymentEvents.error
  )
    return NextResponse.json(
      { message: "Não foi possível carregar o financeiro." },
      { status: 500 },
    );
  const entryIds = (entries.data ?? []).map((entry) => entry.id);
  const [{ data: cardLinks }, { data: storeLinks }] = entryIds.length
    ? await Promise.all([
        supabase
          .from("card_installments")
          .select("entry_id,purchase_id")
          .in("entry_id", entryIds),
        supabase
          .from("store_installments")
          .select("entry_id,purchase_id")
          .in("entry_id", entryIds),
      ])
    : [{ data: [] }, { data: [] }];
  const cardByEntry = new Map(
    (cardLinks ?? []).map((link) => [link.entry_id, link.purchase_id]),
  );
  const storeByEntry = new Map(
    (storeLinks ?? []).map((link) => [link.entry_id, link.purchase_id]),
  );
  const cardTypes = new Map(
    (cards.data ?? []).map((card) => [card.id, card.card_type]),
  );
  const cardPurchaseTypes = new Map(
    (cardPurchases.data ?? []).map((purchase) => [
      purchase.id,
      purchase.payment_type ?? cardTypes.get(purchase.card_id),
    ]),
  );
  const debitCardEntries = new Set(
    (cardLinks ?? [])
      .filter((link) => cardPurchaseTypes.get(link.purchase_id) === "debit")
      .map((link) => link.entry_id),
  );
  const originalEntries = (entries.data ?? [])
    .filter(
      (entry) =>
        (entry.kind === "income" || entry.kind === "expense") &&
        (!cardByEntry.has(entry.id) || debitCardEntries.has(entry.id)),
    )
    .map((entry) => ({
      id: entry.id,
      type: entry.kind,
      title: entry.description,
      amount: Number(entry.amount),
      date: entry.competence_date,
      category: storeByEntry.has(entry.id)
        ? "Comércios"
        : relationName(entry.categories, "name") || "Sem categoria",
      categoryId: entry.category_id,
      person: relationName(entry.family_members, "display_name") || "Família",
      source: storeByEntry.has(entry.id) ? "store" : "direct",
      sourceId: storeByEntry.get(entry.id) ?? null,
      recordType: "original" as const,
      editable: true,
    }));
  const cardOriginalEntries = (cardPurchases.data ?? [])
    .filter((purchase) => cardPurchaseTypes.get(purchase.id) !== "debit" && purchase.source_type !== "account_transfer")
    .map((purchase) => ({
      id: purchase.id,
      type: "expense" as const,
      title: purchase.description,
      amount: Number(purchase.total_amount),
      date: purchase.purchase_date,
      category: "Cartões",
      categoryId: purchase.category_id,
      person: "Família",
      source: "card" as const,
      sourceId: purchase.card_id,
      recordType: "original" as const,
      editable: false,
    }));
  const reversed = new Set(
    (paymentEvents.data ?? [])
      .filter((event) => event.event_type === "bill_payment_reversed")
      .map((event) =>
        Number((event.metadata as { paymentEventId?: number }).paymentEventId),
      ),
  );
  const summaryRows = [
    ...(entries.data ?? [])
      .filter(
        (entry) => !cardByEntry.has(entry.id) || debitCardEntries.has(entry.id),
      )
      .map((entry) => ({
        type: entry.kind as "income" | "expense" | "initial_balance",
        amount: Number(entry.amount),
        date: entry.competence_date,
      })),
    ...(paymentEvents.data ?? [])
      .filter(
        (event) =>
          event.event_type === "bill_payment_recorded" &&
          !reversed.has(Number(event.id)) && (event.metadata as { method?: string }).method !== "credit",
      )
      .map((event) => {
        const metadata = event.metadata as {
          amount?: number;
          paymentDate?: string;
        };
        return {
          type: "expense" as const,
          amount: Number(metadata.amount ?? 0),
          date: metadata.paymentDate ?? "",
        };
      }),
  ];
  const summary = monthlyFinancialSummary(summaryRows, month);
  return NextResponse.json({
    entries: [...originalEntries, ...cardOriginalEntries]
      .filter((entry) => entry.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date)),
    summary,
    cards: (cards.data ?? []).map((card) => ({
      ...card,
      holder: relationName(card.family_members, "display_name"),
    })),
    stores: stores.data ?? [],
  });
}

export async function POST(request: Request) {
  const { supabase, userId, membership } = await context();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!membership)
    return NextResponse.json(
      { message: "Família não encontrada." },
      { status: 404 },
    );
  const input = await request.json().catch(() => null);
  const type = input?.type === "income" ? "income" : "expense";
  const origin =
    type === "expense" && ["card", "store"].includes(input?.origin)
      ? (input.origin as "card" | "store")
      : "direct";
  const requestedDescription = String(input?.description ?? "").trim();
  const date = String(input?.date ?? "");
  const memberId = String(input?.memberId ?? "");
  const categoryId = String(input?.categoryId ?? "");
  const count = Math.max(1, Math.min(48, Number(input?.installmentCount) || 1));
  const items = Array.isArray(input?.items)
    ? input.items
        .map((item: unknown) => {
          const row = item as Record<string, unknown>;
          return {
            name: String(row.name ?? "").trim(),
            quantity: Number(row.quantity),
            unitPrice: Number(row.unitPrice),
          };
        })
        .filter(
          (item: { name: string; quantity: number; unitPrice: number }) =>
            item.name && item.quantity > 0 && item.unitPrice >= 0,
        )
    : [];
  const itemTotal = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0,
  );
  const detailed = input?.registrationMode === "detailed";
  const amount =
    origin === "direct" || !detailed
      ? Number(input?.amount)
      : Math.round(itemTotal * 100) / 100;
  const description =
    requestedDescription ||
    (type === "income"
      ? "Receita"
      : origin === "card"
        ? "Compra no cartão"
        : origin === "store"
          ? "Compra no comércio"
          : "Despesa");
  if (!(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json(
      {
        message:
          origin === "direct" || !detailed
            ? "Revise os dados do lançamento."
            : "Adicione pelo menos um item válido.",
      },
      { status: 400 },
    );
  const categoryQuery =
    categoryId === "__card"
      ? supabase
          .from("categories")
          .select("id,kind,name")
          .eq("name", "Compras")
          .is("family_id", null)
          .eq("status", "active")
          .maybeSingle()
      : supabase
          .from("categories")
          .select("id,kind,name")
          .eq("id", categoryId)
          .eq("status", "active")
          .maybeSingle();
  const [{ data: member }, { data: category }] = await Promise.all([
    supabase
      .from("family_members")
      .select("id")
      .eq("id", memberId)
      .eq("family_id", membership.family_id)
      .eq("status", "active")
      .maybeSingle(),
    categoryQuery,
  ]);
  if (!member || !category || ![type, "both"].includes(category.kind))
    return NextResponse.json(
      { message: "Pessoa ou categoria inválida." },
      { status: 400 },
    );
  let purchaseId: string | null = null;
  let selectedId: string | null = null;
  if (origin === "card") {
    selectedId = String(input.cardId ?? "");
    const { data: card } = await supabase
      .from("cards")
      .select("id,card_type,closing_day")
      .eq("id", selectedId)
      .eq("family_id", membership.family_id)
      .eq("status", "active")
      .maybeSingle();
    if (!card)
      return NextResponse.json(
        { message: "Selecione um cartão válido." },
        { status: 400 },
      );
    const finalCount =
      input.paymentType === "debit" || card.card_type === "debit" ? 1 : count;
    const { data: purchase, error } = await supabase
      .from("card_purchases")
      .insert({
        family_id: membership.family_id,
        card_id: card.id,
        description,
        total_amount: amount,
        purchase_date: date,
        category_id: category.id,
        installment_count: finalCount,
        payment_type:
          input.paymentType === "debit" || card.card_type === "debit"
            ? "debit"
            : "credit",
        created_by: userId,
      })
      .select("id")
      .single();
    if (error || !purchase)
      return NextResponse.json(
        { message: "Não foi possível salvar a compra no cartão." },
        { status: 400 },
      );
    purchaseId = purchase.id;
    input.installmentCount = finalCount;
    input.startDate = monthDate(
      date,
      card.closing_day && Number(date.slice(-2)) > card.closing_day ? 1 : 0,
    );
  }
  if (origin === "store") {
    input.installmentCount = 1;
    selectedId = String(input.storeId ?? "");
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("id", selectedId)
      .eq("family_id", membership.family_id)
      .eq("status", "active")
      .maybeSingle();
    if (!store)
      return NextResponse.json(
        { message: "Selecione um comércio válido." },
        { status: 400 },
      );
    const { data: purchase, error } = await supabase
      .from("store_purchases")
      .insert({
        family_id: membership.family_id,
        store_id: store.id,
        purchase_date: date,
        total_amount: amount,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error || !purchase)
      return NextResponse.json(
        { message: "Não foi possível salvar a compra no comércio." },
        { status: 400 },
      );
    purchaseId = purchase.id;
    const { error: itemError } = detailed
      ? await supabase.from("purchase_items").insert(
          items.map(
            (item: { name: string; quantity: number; unitPrice: number }) => ({
              family_id: membership.family_id,
              purchase_id: purchase.id,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unitPrice,
            }),
          ),
        )
      : { error: null };
    if (itemError)
      return NextResponse.json(
        { message: "A compra foi criada, mas os itens não foram salvos." },
        { status: 400 },
      );
  }
  const finalCount =
    origin === "direct" ? 1 : Math.max(1, Number(input.installmentCount) || 1);
  const values = installments(amount, finalCount);
  for (let index = 0; index < finalCount; index++) {
    const competence = monthDate(String(input.startDate ?? date), index);
    const { data: entry, error } = await supabase
      .from("financial_entries")
      .insert({
        family_id: membership.family_id,
        kind: type,
        description:
          finalCount > 1
            ? `${description} (${index + 1}/${finalCount})`
            : description,
        amount: values[index],
        competence_date: competence,
        category_id: category.id,
        responsible_member_id: member.id,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error || !entry)
      return NextResponse.json(
        { message: "Não foi possível criar todas as parcelas." },
        { status: 400 },
      );
    if (origin === "card" && purchaseId)
      await supabase.from("card_installments").insert({
        family_id: membership.family_id,
        purchase_id: purchaseId,
        entry_id: entry.id,
        installment_number: index + 1,
        installment_count: finalCount,
        amount: values[index],
        competence_date: competence,
      });
    if (origin === "store" && purchaseId)
      await supabase.from("store_installments").insert({
        family_id: membership.family_id,
        purchase_id: purchaseId,
        entry_id: entry.id,
        installment_number: index + 1,
        installment_count: finalCount,
        amount: values[index],
        due_date: competence,
      });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
