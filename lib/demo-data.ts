import type { FinanceState } from "./types";

const month = new Date().toISOString().slice(0, 7);
const year = new Date().getFullYear();
const currentMonth = new Date().getMonth();
const d = (day: number) => new Date(year, currentMonth, day).toISOString().slice(0, 10);

export const demoState: FinanceState = {
  household: { id: "demo", name: "Nossa Casa", invite_code: "CASAL-2026" },
  transactions: [
    { id: "t1", type: "income", description: "Salário Victor", amount: 4200, category: "Salário", date: d(5), owner: "Victor", status: "paid" },
    { id: "t2", type: "income", description: "Salário Esposa", amount: 3600, category: "Salário", date: d(5), owner: "Esposa", status: "paid" },
    { id: "t3", type: "expense", description: "Supermercado", amount: 842.5, category: "Alimentação", date: d(8), owner: "Casal", status: "paid" },
    { id: "t4", type: "expense", description: "Combustível", amount: 380, category: "Transporte", date: d(10), owner: "Victor", status: "paid" },
    { id: "t5", type: "expense", description: "Farmácia", amount: 126.9, category: "Saúde", date: d(12), owner: "Esposa", status: "paid" },
    { id: "t6", type: "expense", description: "Jantar", amount: 145, category: "Lazer", date: d(15), owner: "Casal", status: "paid" }
  ],
  bills: [
    { id: "b1", name: "Energia", amount: 286.4, due_day: 10, category: "Casa", responsible: "Casal", status: "paid", recurring: true },
    { id: "b2", name: "Internet", amount: 119.9, due_day: 12, category: "Casa", responsible: "Victor", status: "paid", recurring: true },
    { id: "b3", name: "Prestação do carro", amount: 1150, due_day: 20, category: "Transporte", responsible: "Casal", status: "pending", recurring: true },
    { id: "b4", name: "Plano de saúde", amount: 480, due_day: 25, category: "Saúde", responsible: "Casal", status: "pending", recurring: true }
  ],
  cards: [
    { id: "c1", name: "Nubank", brand: "Mastercard", limit_amount: 6000, closing_day: 18, due_day: 25, holder: "Victor" },
    { id: "c2", name: "Inter", brand: "Visa", limit_amount: 4000, closing_day: 10, due_day: 17, holder: "Esposa" }
  ],
  purchases: [
    { id: "p1", card_id: "c1", description: "Geladeira", amount: 3600, installments: 12, purchase_date: d(3), category: "Casa" },
    { id: "p2", card_id: "c1", description: "Streaming", amount: 49.9, installments: 1, purchase_date: d(7), category: "Assinaturas" },
    { id: "p3", card_id: "c2", description: "Roupas", amount: 420, installments: 3, purchase_date: d(11), category: "Pessoal" }
  ],
  budgets: [
    { id: "o1", category: "Alimentação", limit_amount: 1200, month },
    { id: "o2", category: "Transporte", limit_amount: 700, month },
    { id: "o3", category: "Lazer", limit_amount: 400, month },
    { id: "o4", category: "Saúde", limit_amount: 600, month }
  ],
  goals: [
    { id: "g1", name: "Reserva de emergência", target_amount: 15000, current_amount: 6200, target_date: `${year + 1}-12-31`, icon: "shield" },
    { id: "g2", name: "Viagem do casal", target_amount: 8000, current_amount: 2800, target_date: `${year + 1}-07-01`, icon: "plane" },
    { id: "g3", name: "Entrada da casa", target_amount: 30000, current_amount: 9100, target_date: `${year + 2}-12-31`, icon: "home" }
  ]
};
