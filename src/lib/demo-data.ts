// As coleções começam zeradas para controle a partir do zero.
export type CashFlowPoint = { label: string; receitas: number; despesas: number };
export type CategorySummary = { name: string; value: number; color: string };
export type Transaction = { id: string; title: string; person: string; category: string; date: string; amount: number; type: "income" | "expense" };
export type Card = { id: string; name: string; bank: string; holder: string; type: string; lastDigits: string; limit: number; used: number; statement: number; closingDay: number; dueDay: number; color: string };
export type Store = { id: string; name: string; holder: string; limit: number; used: number; purchases: number; color: string };
export type Subscription = { id: string; name: string; category: string; amount: number; dueDay: number; frequency: string; payment: string; status: "active" | "pending" };
export type FixedExpense = { id: string; name: string; category: string; amount: number; dueDay: number; responsible: string; status: "paid" | "pending" | "overdue" };
export type Goal = { id: string; name: string; target: number; saved: number; deadline: string | null; color: string };
export type Bill = { id: string; name: string; origin: string; dueDate: string; amount: number; status: "paid" | "pending" | "overdue" };

export const cashFlow: CashFlowPoint[] = [];

export const categories: CategorySummary[] = [];

export const transactions: Transaction[] = [];

export const cards: Card[] = [
  { id: "demo-c1", name: "Nubank", bank: "Nu Pagamentos", holder: "Victor Emanuel", type: "credit", lastDigits: "4892", limit: 2500, used: 0, statement: 0, closingDay: 3, dueDay: 10, color: "#5822b4" },
  { id: "demo-c2", name: "Cartão Atacadão", bank: "Banco CSF", holder: "Victor Emanuel", type: "credit", lastDigits: "7731", limit: 2000, used: 0, statement: 0, closingDay: 15, dueDay: 22, color: "#dc2626" },
  { id: "demo-c3", name: "Mercado Pago", bank: "Mercado Pago", holder: "Victor Emanuel", type: "credit", lastDigits: "3309", limit: 1500, used: 0, statement: 0, closingDay: 1, dueDay: 8, color: "#00a8e1" },
];

export const stores: Store[] = [
  { id: "demo-s1", name: "Capitinha", holder: "Victor Emanuel", limit: 2000, used: 0, purchases: 0, color: "#0f8b8d" },
  { id: "demo-s2", name: "Farmácia São João", holder: "Emilly Andrade", limit: 2000, used: 0, purchases: 0, color: "#e11d48" },
  { id: "demo-s3", name: "Loja Center", holder: "Victor Emanuel", limit: 1500, used: 0, purchases: 0, color: "#059669" },
];

export const subscriptions: Subscription[] = [];

export const fixedExpenses: FixedExpense[] = [];

export const goals: Goal[] = [];

export const bills: Bill[] = [];

