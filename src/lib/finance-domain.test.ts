import { describe, expect, it } from "vitest";
import { activePaymentEvents, cashPaymentEvents, cumulativeCashFlow, monthlyFinancialSummary, obligationSummary, paymentAmountFor, splitAmount } from "./finance-domain";

describe("finance domain", () => {
  const payment = (id: number, billKey: string, amount: number) => ({ id, event_type: "bill_payment_recorded", metadata: { billKey, amount } });

  it("mantém a compra original e reduz somente o saldo em aberto", () => {
    const commerce = obligationSummary(600, paymentAmountFor([payment(1, "store-1", 100)], "store-1"));
    const card = obligationSummary(500, paymentAmountFor([payment(1, "store-1", 100)], "card-1"));
    expect(commerce).toEqual({ original: 600, paid: 100, open: 500 });
    expect(card.open).toBe(500);
    expect(commerce.open + card.open).toBe(1000);
  });

  it("quita integralmente sem produzir saldo negativo", () => {
    expect(obligationSummary(600, 600)).toEqual({ original: 600, paid: 600, open: 0 });
    expect(obligationSummary(600, 700).open).toBe(0);
  });

  it("restaura o saldo quando o pagamento é estornado", () => {
    const events = [payment(7, "store-1", 100), { id: 8, event_type: "bill_payment_reversed", metadata: { paymentEventId: 7 } }];
    expect(activePaymentEvents(events)).toHaveLength(0);
    expect(obligationSummary(600, paymentAmountFor(events, "store-1")).open).toBe(600);
  });

  it("não retira do caixa pagamentos feitos no crédito", () => {
    const events = [
      { ...payment(1, "store-1", 100), metadata: { billKey: "store-1", amount: 100, method: "pix" } },
      { ...payment(2, "store-1", 200), metadata: { billKey: "store-1", amount: 200, method: "credit" } },
    ];
    expect(cashPaymentEvents(events).map((event) => event.id)).toEqual([1]);
  });

  it("divide parcelas preservando exatamente os centavos", () => {
    expect(splitAmount(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(splitAmount(100, 3).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("não usa pagamentos no resumo financeiro por competência", () => {
    const summary = monthlyFinancialSummary([{ type: "expense", amount: 1100, date: "2026-08-23" }], "2026-08");
    expect(summary).toEqual({ previousBalance: 0, income: 0, expenses: 1100, balance: -1100 });
  });

  it("transporta o saldo positivo ou negativo para o mês seguinte", () => {
    const rows = [
      { type: "income" as const, amount: 3000, date: "2026-08-01" },
      { type: "expense" as const, amount: 2000, date: "2026-08-10" },
      { type: "income" as const, amount: 2000, date: "2026-09-01" },
      { type: "expense" as const, amount: 1500, date: "2026-09-10" },
    ];
    expect(monthlyFinancialSummary(rows, "2026-09")).toEqual({ previousBalance: 1000, income: 2000, expenses: 1500, balance: 1500 });
  });

  it("trata ajuste inicial como saldo transportado e não como entrada do mês", () => {
    expect(monthlyFinancialSummary([{ type: "initial_balance", amount: 750, date: "2026-09-01" }], "2026-09")).toEqual({ previousBalance: 750, income: 0, expenses: 0, balance: 750 });
  });

  it("transporta corretamente de dezembro para janeiro do ano seguinte", () => {
    const rows = [{ type: "income" as const, amount: 2000, date: "2026-12-10" }, { type: "expense" as const, amount: 500, date: "2026-12-20" }, { type: "expense" as const, amount: 250, date: "2027-01-03" }];
    expect(monthlyFinancialSummary(rows, "2027-01")).toEqual({ previousBalance: 1500, income: 0, expenses: 250, balance: 1250 });
  });

  it("acumula entradas e saídas diariamente sem inventar dados", () => {
    const points = cumulativeCashFlow([
      { type: "income", amount: 1000, date: "2026-09-01" },
      { type: "expense", amount: 200, date: "2026-09-02" },
      { type: "income", amount: 500, date: "2026-09-10" },
    ], "2026-09");
    expect(points[0]).toMatchObject({ day: 1, receitas: 1000, despesas: 0 });
    expect(points[1]).toMatchObject({ day: 2, receitas: 1000, despesas: 200 });
    expect(points[9]).toMatchObject({ day: 10, receitas: 1500, despesas: 200 });
    expect(cumulativeCashFlow([], "2026-09")).toEqual([]);
  });
});
