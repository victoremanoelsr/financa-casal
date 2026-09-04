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

export const cashFlow: CashFlowPoint[] = [
  { label: "01/09", receitas: 5200, despesas: 1450 },
  { label: "05/09", receitas: 5200, despesas: 2350 },
  { label: "10/09", receitas: 6400, despesas: 3100 },
  { label: "15/09", receitas: 6400, despesas: 3890 },
  { label: "20/09", receitas: 7800, despesas: 4250 },
  { label: "25/09", receitas: 7800, despesas: 4680 },
  { label: "30/09", receitas: 7800, despesas: 5120 },
];

export const categories: CategorySummary[] = [
  { name: "Moradia", value: 1650, color: "#00c882" },
  { name: "Alimentação", value: 1420, color: "#0f8b8d" },
  { name: "Cartões", value: 1850, color: "#3b82f6" },
  { name: "Transporte", value: 680, color: "#8b5cf6" },
  { name: "Contas da casa", value: 490, color: "#f59e0b" },
];

export const transactions: Transaction[] = [
  { id: "demo-1", title: "Salário Principal", person: "Victor", category: "Salário", date: "2026-09-01", amount: 5200, type: "income" },
  { id: "demo-2", title: "Renda Extra Freelance", person: "Emilly", category: "Renda extra", date: "2026-09-08", amount: 1200, type: "income" },
  { id: "demo-3", title: "Supermercado Atacadão", person: "Família", category: "Alimentação", date: "2026-09-04", amount: 650.40, type: "expense" },
  { id: "demo-4", title: "Aluguel Apartamento", person: "Victor", category: "Moradia", date: "2026-09-05", amount: 950, type: "expense" },
  { id: "demo-5", title: "Farmácia São João", person: "Emilly", category: "Saúde", date: "2026-09-03", amount: 145.80, type: "expense" },
];

export const cards: Card[] = [
  { id: "demo-c1", name: "Nubank", bank: "Nu Pagamentos", holder: "Victor", type: "credit", lastDigits: "1234", limit: 4500, used: 1000, statement: 1000, closingDay: 3, dueDay: 10, color: "#5822b4" },
  { id: "demo-c2", name: "Cartão Atacadão", bank: "Banco CSF", holder: "Emilly", type: "credit", lastDigits: "5225", limit: 3000, used: 850, statement: 850, closingDay: 28, dueDay: 5, color: "#dc2626" },
  { id: "demo-c3", name: "Mercado Pago", bank: "Mercado Pago", holder: "Victor", type: "credit", lastDigits: "0802", limit: 2000, used: 420, statement: 420, closingDay: 15, dueDay: 22, color: "#00a8e1" },
];

export const stores: Store[] = [
  { id: "demo-s1", name: "Farmácia São João", holder: "Família", limit: 1000, used: 300, purchases: 3, color: "#e11d48" },
  { id: "demo-s2", name: "Supermercado Alvorada", holder: "Família", limit: 1500, used: 450, purchases: 2, color: "#059669" },
];

export const subscriptions: Subscription[] = [
  { id: "demo-sub1", name: "Netflix", category: "Entretenimento", amount: 44.90, dueDay: 15, frequency: "monthly", payment: "Cartão Atacadão •••• 5225", status: "active" },
  { id: "demo-sub2", name: "Spotify", category: "Música", amount: 21.90, dueDay: 8, frequency: "monthly", payment: "PIX", status: "active" },
  { id: "demo-sub3", name: "Prime Video", category: "Entretenimento", amount: 19.90, dueDay: 20, frequency: "monthly", payment: "Cartão Mercado Pago •••• 0802", status: "active" },
  { id: "demo-sub4", name: "YouTube Premium", category: "Entretenimento", amount: 16.90, dueDay: 25, frequency: "monthly", payment: "PIX", status: "active" },
  { id: "demo-sub5", name: "HBO Max", category: "Entretenimento", amount: 39.90, dueDay: 30, frequency: "monthly", payment: "Cartão Nubank •••• 1234", status: "active" },
];

export const fixedExpenses: FixedExpense[] = [
  { id: "demo-f1", name: "Aluguel", category: "Moradia", amount: 950, dueDay: 5, responsible: "Victor", status: "overdue" },
  { id: "demo-f2", name: "Energia Elétrica", category: "Contas da casa", amount: 120.50, dueDay: 30, responsible: "Victor", status: "pending" },
  { id: "demo-f3", name: "Água", category: "Contas da casa", amount: 85.40, dueDay: 12, responsible: "Victor", status: "pending" },
  { id: "demo-f4", name: "Internet Vivo Fibra", category: "Contas da casa", amount: 119.90, dueDay: 15, responsible: "Victor", status: "pending" },
];

export const goals: Goal[] = [
  { id: "demo-g1", name: "Reserva de Emergência", target: 15000, saved: 6500, deadline: "2026-12-31", color: "#00c882" },
  { id: "demo-g2", name: "Viagem de Fim de Ano", target: 4000, saved: 2100, deadline: "2026-11-30", color: "#3b82f6" },
];

export const bills: Bill[] = [
  { id: "demo-b1", name: "Farmácia São João", origin: "Comércio", dueDate: "2026-08-25", amount: 300, status: "overdue" },
  { id: "demo-b2", name: "Energia Elétrica", origin: "Conta de agosto", dueDate: "2026-08-30", amount: 120.50, status: "pending" },
  { id: "demo-b3", name: "Nubank (Fatura Setembro)", origin: "Cartão", dueDate: "2026-09-10", amount: 1000, status: "pending" },
  { id: "demo-b4", name: "Cartão Atacadão", origin: "Cartão", dueDate: "2026-09-05", amount: 850, status: "overdue" },
  { id: "demo-b5", name: "Água", origin: "Contas da casa", dueDate: "2026-09-12", amount: 85.40, status: "pending" },
  { id: "demo-b6", name: "Internet Vivo Fibra", origin: "Contas da casa", dueDate: "2026-09-15", amount: 119.90, status: "pending" },
  { id: "demo-b7", name: "Aluguel", origin: "Moradia", dueDate: "2026-09-05", amount: 950, status: "overdue" },
];
