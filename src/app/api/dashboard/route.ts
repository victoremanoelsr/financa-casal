import { NextResponse } from "next/server";
import { addCivilDays, formatCivilDate, getCardCycle } from "@/lib/bill-status";
import {
  cashPaymentEvents,
  cumulativeCashFlow,
  monthlyFinancialSummary,
  paymentAmountFor,
  paymentDate,
  type FinancialRow,
  type PaymentMetadata,
} from "@/lib/finance-domain";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const COLORS = {
  stores: "#0F6170",
  cards: "#13A985",
  fixed: "#3B82F6",
  subscriptions: "#8B5CF6",
  direct: "#F59E0B",
};
const relation = (value: unknown) =>
  (Array.isArray(value) ? value[0] : value) as {
    name?: string;
    display_name?: string;
  } | null;
const money = (value: number) => Math.round(value * 100) / 100;
const monthDate = (month: string, day: number) => {
  const [year, number] = month.split("-").map(Number);
  const last = new Date(year, number, 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
};

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const requestedMonth = new URL(request.url).searchParams.get("month");
  const month = /^\d{4}-\d{2}$/.test(requestedMonth ?? "")
    ? requestedMonth!
    : formatCivilDate(new Date()).slice(0, 7);
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  if (demoMode) {
    return NextResponse.json({
      userName: "Victor",
      income: 6400,
      expenses: 3890,
      previousBalance: 1450,
      balance: 3960,
      cashFlow: [
        { label: "01/09", receitas: 5200, despesas: 1450 },
        { label: "05/09", receitas: 5200, despesas: 2350 },
        { label: "10/09", receitas: 6400, despesas: 3100 },
        { label: "15/09", receitas: 6400, despesas: 3890 },
      ],
      categories: [
        { name: "Moradia", value: 1650, color: "#00c882" },
        { name: "Alimentação", value: 1420, color: "#0f8b8d" },
        { name: "Cartões", value: 1850, color: "#3b82f6" },
        { name: "Transporte", value: 680, color: "#8b5cf6" },
        { name: "Contas da casa", value: 490, color: "#f59e0b" },
      ],
      upcoming: [
        { id: "up-1", title: "Cartão Atacadão", origin: "Cartão", dueDate: `${month}-05`, remaining: 850, href: "/cartoes" },
        { id: "up-2", title: "Nubank", origin: "Cartão", dueDate: `${month}-10`, remaining: 1000, href: "/cartoes" },
        { id: "up-3", title: "Água", origin: "Contas da casa", dueDate: `${month}-12`, remaining: 85.40, href: "/contas" },
        { id: "up-4", title: "Internet Vivo Fibra", origin: "Contas da casa", dueDate: `${month}-15`, remaining: 119.90, href: "/contas" },
      ],
      movements: [
        { id: "mov-1", type: "income", title: "Salário Principal", subtitle: "Salário", origin: "Financeiro", amount: 5200, date: `${month}-01`, href: "/financeiro" },
        { id: "mov-2", type: "expense", title: "Aluguel Apartamento", subtitle: "Moradia", origin: "Financeiro", amount: 950, date: `${month}-05`, href: "/financeiro" },
        { id: "mov-3", type: "expense", title: "Supermercado Atacadão", subtitle: "Alimentação", origin: "Financeiro", amount: 650.40, date: `${month}-04`, href: "/financeiro" },
      ],
    });
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership)
    return NextResponse.json({
      userName: "",
      income: 0,
      expenses: 0,
      previousBalance: 0,
      balance: 0,
      cashFlow: [],
      categories: [],
      upcoming: [],
      movements: [],
    });

  const [
    profile,
    entries,
    cardPurchases,
    cardInstallments,
    cards,
    storePurchases,
    storeInstallments,
    stores,
    subscriptions,
    fixedExpenses,
    events,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("financial_entries")
      .select(
        "id,kind,description,amount,competence_date,category_id,categories(name),family_members!financial_entries_responsible_member_id_fkey(display_name)",
      )
      .eq("family_id", membership.family_id)
      .eq("status", "posted")
      .is("archived_at", null)
      .in("kind", ["income", "expense", "initial_balance"]),
    supabase
      .from("card_purchases")
      .select("id,card_id,description,total_amount,purchase_date,status,source_type,payment_type")
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("card_installments")
      .select("entry_id,purchase_id")
      .eq("family_id", membership.family_id),
    supabase
      .from("cards")
      .select("id,name,institution,card_type,closing_day,due_day")
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("store_purchases")
      .select("id,store_id,total_amount,purchase_date,status")
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("store_installments")
      .select("id,purchase_id,entry_id,amount,due_date")
      .eq("family_id", membership.family_id),
    supabase
      .from("stores")
      .select("id,name")
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("id,name,amount,due_day,status")
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("fixed_expenses")
      .select("id,name,reference_amount,due_day,status")
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("audit_events")
      .select(
        "id,actor_id,event_type,entity_type,entity_id,metadata,created_at",
      )
      .eq("family_id", membership.family_id)
      .in("event_type", ["bill_payment_recorded", "bill_payment_reversed"])
      .order("created_at"),
  ]);
  const results = [
    profile,
    entries,
    cardPurchases,
    cardInstallments,
    cards,
    storePurchases,
    storeInstallments,
    stores,
    subscriptions,
    fixedExpenses,
    events,
  ];
  if (results.some((result) => result.error))
    return NextResponse.json(
      { message: "Não foi possível carregar o Dashboard." },
      { status: 500 },
    );

  const cardEntryIds = new Set(
    (cardInstallments.data ?? []).map((item) => item.entry_id),
  );
  const storeEntryIds = new Set(
    (storeInstallments.data ?? []).map((item) => item.entry_id),
  );
  const cardPurchaseMap = new Map(
    (cardPurchases.data ?? []).map((item) => [item.id, item.card_id]),
  );
  const cardMap = new Map((cards.data ?? []).map((item) => [item.id, item]));
  const debitCardEntryIds = new Set(
    (cardInstallments.data ?? [])
      .filter(
        (item) =>
          (cardPurchases.data ?? []).find(
            (purchase) => purchase.id === item.purchase_id,
          )?.payment_type === "debit" ||
          cardMap.get(cardPurchaseMap.get(item.purchase_id) ?? "")
            ?.card_type === "debit",
      )
      .map((item) => item.entry_id),
  );
  const directEntries = (entries.data ?? []).filter(
    (entry) =>
      (!cardEntryIds.has(entry.id) || debitCardEntryIds.has(entry.id)) &&
      !storeEntryIds.has(entry.id),
  );
  const cashPayments = cashPaymentEvents(events.data ?? []);
  const cashRows: FinancialRow[] = [
    ...directEntries.map((entry) => ({
      type: entry.kind as FinancialRow["type"],
      amount: Number(entry.amount),
      date: entry.competence_date,
    })),
    ...cashPayments.map((event) => ({
      type: "expense" as const,
      amount: Number((event.metadata as PaymentMetadata).amount ?? 0),
      date: paymentDate(event),
    })),
  ];
  const summary = monthlyFinancialSummary(cashRows, month);
  const storeMap = new Map((stores.data ?? []).map((item) => [item.id, item]));
  const subscriptionMap = new Map(
    (subscriptions.data ?? []).map((item) => [item.id, item]),
  );
  const fixedMap = new Map(
    (fixedExpenses.data ?? []).map((item) => [item.id, item]),
  );

  const paymentOrigin = (event: (typeof cashPayments)[number]) => {
    const key = String((event.metadata as PaymentMetadata).billKey ?? "");
    const id = event.entity_id ?? "";
    if (key.startsWith("card-"))
      return {
        group: "Cartões",
        origin: "Cartão",
        title: cardMap.get(id)?.name ?? "Pagamento de cartão",
        href: id ? `/cartoes/${id}` : "/cartoes",
      };
    if (key.startsWith("store-")) {
      const installment = (storeInstallments.data ?? []).find(
        (item) => item.id === id,
      );
      const purchase = installment
        ? (storePurchases.data ?? []).find(
            (item) => item.id === installment.purchase_id,
          )
        : null;
      const store = purchase ? storeMap.get(purchase.store_id) : null;
      return {
        group: "Comércios",
        origin: "Comércio",
        title: store?.name ?? "Pagamento de comércio",
        href: store ? `/comercios/${store.id}` : "/comercios",
      };
    }
    if (key.startsWith("subscription-"))
      return {
        group: "Assinaturas",
        origin: "Assinatura",
        title: subscriptionMap.get(id)?.name ?? "Pagamento de assinatura",
        href: "/assinaturas",
      };
    if (key.startsWith("fixed-"))
      return {
        group: "Despesas Fixas",
        origin: "Despesa fixa",
        title: fixedMap.get(id)?.name ?? "Pagamento de despesa fixa",
        href: "/despesas-fixas",
      };
    return {
      group: "Outros",
      origin: "Contas",
      title: "Pagamento de conta",
      href: "/contas",
    };
  };
  const monthPayments = cashPayments.filter((event) =>
    paymentDate(event).startsWith(month),
  );
  const directExpenses = directEntries.filter(
    (entry) =>
      entry.kind === "expense" && entry.competence_date.startsWith(month),
  );
  const groups = new Map<string, number>();
  directExpenses.forEach((entry) => {
    const isDebitCard = debitCardEntryIds.has(entry.id);
    const group = isDebitCard ? "Cartões" : "Outros";
    groups.set(group, (groups.get(group) ?? 0) + Number(entry.amount));
  });
  monthPayments.forEach((event) => {
    const group = paymentOrigin(event).group;
    groups.set(
      group,
      (groups.get(group) ?? 0) +
        Number((event.metadata as PaymentMetadata).amount ?? 0),
    );
  });
  const colorFor = (name: string) =>
    name === "Comércios"
      ? COLORS.stores
      : name === "Cartões"
        ? COLORS.cards
        : name === "Despesas Fixas"
          ? COLORS.fixed
          : name === "Assinaturas"
            ? COLORS.subscriptions
            : COLORS.direct;
  const categories = [...groups]
    .map(([name, value]) => ({
      name,
      value: money(value),
      color: colorFor(name),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const movements = [
    ...directEntries
      .filter(
        (entry) =>
          entry.competence_date.startsWith(month) &&
          entry.kind !== "initial_balance",
      )
      .map((entry) => ({
        id: entry.id,
        type:
          entry.kind === "income" ? ("income" as const) : ("expense" as const),
        title: entry.description,
        subtitle:
          relation(entry.categories)?.name ??
          (entry.kind === "income" ? "Receita" : "Financeiro"),
        origin: "Financeiro",
        amount: Number(entry.amount),
        date: entry.competence_date,
        href: "/financeiro",
      })),
    ...monthPayments.map((event) => {
      const source = paymentOrigin(event);
      return {
        id: `payment-${event.id}`,
        type: "expense" as const,
        title: source.title,
        subtitle: source.origin,
        origin: source.origin,
        amount: Number((event.metadata as PaymentMetadata).amount ?? 0),
        date: paymentDate(event),
        href: source.href,
      };
    }),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 10);

  const today = formatCivilDate(new Date());
  const limitDate = addCivilDays(today, 10);
  const candidates: Array<{
    id: string;
    title: string;
    origin: string;
    dueDate: string;
    amount: number;
    href: string;
    billKey: string;
  }> = [];
  for (const card of cards.data ?? []) {
    const cycles = new Map<string, number>();
    for (const purchase of (cardPurchases.data ?? []).filter(
      (item) => item.card_id === card.id,
    )) {
      const cycle = getCardCycle(
        purchase.purchase_date,
        card.closing_day ?? 1,
        card.due_day ?? 1,
      );
      cycles.set(
        cycle.dueDate,
        (cycles.get(cycle.dueDate) ?? 0) + Number(purchase.total_amount),
      );
    }
    cycles.forEach((amount, dueDate) =>
      candidates.push({
        id: `card-${card.id}-${dueDate}`,
        title: card.name,
        origin: "Cartão",
        dueDate,
        amount,
        href: `/cartoes/${card.id}`,
        billKey: `card-${card.id}-${dueDate}`,
      }),
    );
  }
  for (const installment of storeInstallments.data ?? []) {
    const purchase = (storePurchases.data ?? []).find(
      (item) => item.id === installment.purchase_id,
    );
    const store = purchase ? storeMap.get(purchase.store_id) : null;
    if (store)
      candidates.push({
        id: `store-${installment.id}`,
        title: store.name,
        origin: "Comércio",
        dueDate: installment.due_date,
        amount: Number(installment.amount),
        href: `/comercios/${store.id}`,
        billKey: `store-${installment.id}`,
      });
  }
  const currentAndNext = [
    today.slice(0, 7),
    addCivilDays(today, 10).slice(0, 7),
  ];
  for (const reference of [...new Set(currentAndNext)]) {
    for (const item of subscriptions.data ?? []) {
      const dueDate = monthDate(reference, item.due_day);
      candidates.push({
        id: `subscription-${item.id}-${reference}`,
        title: item.name,
        origin: "Assinatura",
        dueDate,
        amount: Number(item.amount),
        href: "/assinaturas",
        billKey: `subscription-${item.id}-${reference}`,
      });
    }
    for (const item of fixedExpenses.data ?? []) {
      const dueDate = monthDate(reference, item.due_day);
      candidates.push({
        id: `fixed-${item.id}-${reference}`,
        title: item.name,
        origin: "Despesa fixa",
        dueDate,
        amount: Number(item.reference_amount),
        href: "/despesas-fixas",
        billKey: `fixed-${item.id}-${reference}`,
      });
    }
  }
  const upcoming = candidates
    .map((item) => ({
      id: item.id,
      title: item.title,
      origin: item.origin,
      dueDate: item.dueDate,
      href: item.href,
      remaining: money(
        Math.max(
          0,
          item.amount - paymentAmountFor(events.data ?? [], item.billKey),
        ),
      ),
    }))
    .filter(
      (item) =>
        item.remaining > 0 &&
        item.dueDate >= today &&
        item.dueDate <= limitDate,
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const fullName = profile.data?.full_name ?? "";
  const firstName = fullName.split(/\s+/)[0];
  return NextResponse.json({
    userName: firstName
      ? firstName.charAt(0) + firstName.slice(1).toLocaleLowerCase("pt-BR")
      : "",
    ...summary,
    cashFlow: cumulativeCashFlow(cashRows, month),
    categories,
    upcoming,
    movements,
  });
}
