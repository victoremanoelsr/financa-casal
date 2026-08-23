import { describe, expect, it } from "vitest";
import { activePaymentEvents, monthlyFinancialSummary, obligationSummary, paymentAmountFor } from "./finance-domain";

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
});
