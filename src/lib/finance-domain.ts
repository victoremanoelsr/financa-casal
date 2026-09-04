export type PaymentMetadata = {
  billKey?: string;
  amount?: number;
  paymentDate?: string;
  note?: string;
  method?: string;
  originalAmount?: number;
  paymentEventId?: number;
};

export type PaymentEvent = {
  id: number | string;
  event_type: string;
  entity_id?: string | null;
  metadata: unknown;
  created_at?: string;
};

const money = (value: number) => Math.round(value * 100) / 100;

export type FinancialRow = {
  type: "income" | "expense" | "initial_balance";
  amount: number;
  date: string;
};

export function monthlyFinancialSummary(rows: FinancialRow[], month: string) {
  const previousBalance = money(rows.filter((row) => row.date.slice(0, 7) < month || (row.type === "initial_balance" && row.date.startsWith(month))).reduce((total, row) => total + (row.type === "expense" ? -row.amount : row.amount), 0));
  const monthRows = rows.filter((row) => row.date.startsWith(month));
  const income = money(monthRows.filter((row) => row.type === "income").reduce((total, row) => total + row.amount, 0));
  const expenses = money(monthRows.filter((row) => row.type === "expense").reduce((total, row) => total + row.amount, 0));
  return { previousBalance, income, expenses, balance: money(previousBalance + income - expenses) };
}

export function cumulativeCashFlow(rows: FinancialRow[], month: string) {
  const monthRows = rows.filter((row) => row.date.startsWith(month) && (row.type === "income" || row.type === "expense"));
  if (!monthRows.length) return [];
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  const totals = monthRows.reduce<Record<number, { income: number; expenses: number }>>((result, row) => {
    const day = Number(row.date.slice(-2)); const current = result[day] ?? { income: 0, expenses: 0 };
    if (row.type === "income") current.income += row.amount; else current.expenses += row.amount;
    result[day] = current; return result;
  }, {});
  let income = 0; let expenses = 0;
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1; income = money(income + (totals[day]?.income ?? 0)); expenses = money(expenses + (totals[day]?.expenses ?? 0));
    return { day, label: String(day).padStart(2, "0"), receitas: income, despesas: expenses };
  });
}

/** Fonte central para pagamentos ativos. Um estorno neutraliza o pagamento original. */
export function activePaymentEvents<T extends PaymentEvent>(events: T[]) {
  const reversed = new Set(
    events
      .filter((event) => event.event_type === "bill_payment_reversed")
      .map((event) => Number((event.metadata as PaymentMetadata).paymentEventId)),
  );
  return events.filter(
    (event) =>
      event.event_type === "bill_payment_recorded" &&
      !reversed.has(Number(event.id)),
  );
}

/** Pagamentos em crédito apenas transferem a dívida e não saem do caixa. */
export function cashPaymentEvents<T extends PaymentEvent>(events: T[]) {
  return activePaymentEvents(events).filter(
    (event) => (event.metadata as PaymentMetadata).method !== "credit",
  );
}

/** Divide em centavos e distribui o resto sem perder ou inventar valor. */
export function splitAmount(amount: number, count: number) {
  const safeCount = Math.max(1, Math.trunc(count));
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / safeCount);
  return Array.from(
    { length: safeCount },
    (_, index) => (base + (index < cents % safeCount ? 1 : 0)) / 100,
  );
}

export function paymentAmountFor(events: PaymentEvent[], billKey: string) {
  return money(
    activePaymentEvents(events)
      .filter((event) => (event.metadata as PaymentMetadata).billKey === billKey)
      .reduce(
        (total, event) =>
          total + Number((event.metadata as PaymentMetadata).amount ?? 0),
        0,
      ),
  );
}

export function obligationSummary(originalAmount: number, paidAmount: number) {
  const original = money(Math.max(0, originalAmount));
  const paid = money(Math.min(original, Math.max(0, paidAmount)));
  return { original, paid, open: money(original - paid) };
}

export function paymentDate(event: PaymentEvent) {
  const metadata = event.metadata as PaymentMetadata;
  return metadata.paymentDate ?? event.created_at?.slice(0, 10) ?? "";
}

export function paymentTotalInMonth(events: PaymentEvent[], month: string) {
  return money(
    activePaymentEvents(events)
      .filter((event) => paymentDate(event).startsWith(month))
      .reduce(
        (total, event) =>
          total + Number((event.metadata as PaymentMetadata).amount ?? 0),
        0,
      ),
  );
}
