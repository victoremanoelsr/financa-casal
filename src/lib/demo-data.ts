// As coleções começam vazias. Dados reais serão carregados do Supabase para a família autenticada.
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
export const cards: Card[] = [];
export const stores: Store[] = [];
export const subscriptions: Subscription[] = [];
export const fixedExpenses: FixedExpense[] = [];
export const goals: Goal[] = [];
export const bills: Bill[] = [];
