export const cashFlow = [
  { label: "01 Ago", receitas: 1200, despesas: 420 },
  { label: "05 Ago", receitas: 5800, despesas: 980 },
  { label: "10 Ago", receitas: 3850, despesas: 1200 },
  { label: "15 Ago", receitas: 6200, despesas: 1800 },
  { label: "20 Ago", receitas: 5100, despesas: 1350 },
  { label: "25 Ago", receitas: 7300, despesas: 2400 },
  { label: "31 Ago", receitas: 8500, despesas: 3180 },
];

export const categories = [
  { name: "Moradia", value: 1450, color: "#0F4C5C" },
  { name: "Alimentação", value: 850, color: "#16A085" },
  { name: "Transporte", value: 520, color: "#8B5CF6" },
  { name: "Assinaturas", value: 180, color: "#F59E0B" },
  { name: "Lazer", value: 270, color: "#3B82F6" },
  { name: "Outros", value: 180, color: "#EF4444" },
];

export const transactions = [
  { id: "t1", title: "Salário", person: "VICTOR SILVA", category: "Salário", date: "2026-08-05", amount: 7200, type: "income" as const },
  { id: "t2", title: "Salário", person: "EMILY SILVA", category: "Salário", date: "2026-08-05", amount: 5650, type: "income" as const },
  { id: "t3", title: "Supermercado Carvalho", person: "VICTOR SILVA", category: "Alimentação", date: "2026-08-16", amount: 385.9, type: "expense" as const },
  { id: "t4", title: "Conta de energia", person: "EMILY SILVA", category: "Energia", date: "2026-08-18", amount: 280, type: "expense" as const },
  { id: "t5", title: "Netflix", person: "VICTOR SILVA", category: "Assinaturas", date: "2026-08-18", amount: 45.9, type: "expense" as const },
];

export const cards = [
  { id: "principal", name: "Cartão Principal", bank: "Banco Inter", holder: "VICTOR SILVA", type: "Crédito", lastDigits: "4832", limit: 5000, used: 2100, statement: 1850, closingDay: 19, dueDay: 27, color: "petrol" },
  { id: "emily", name: "Cartão da Emily", bank: "Nubank", holder: "EMILY SILVA", type: "Crédito", lastDigits: "1098", limit: 3500, used: 920, statement: 760, closingDay: 22, dueDay: 2, color: "purple" },
  { id: "debito", name: "Débito da Família", bank: "Caixa", holder: "VICTOR SILVA", type: "Débito", lastDigits: "7710", limit: 0, used: 0, statement: 0, closingDay: 0, dueDay: 0, color: "blue" },
];

export const stores = [
  { id: "carvalho", name: "Armazém Carvalho", holder: "VICTOR SILVA", limit: 2500, used: 620, purchases: 3, color: "#16A085" },
  { id: "moveis", name: "Casa dos Móveis", holder: "EMILY SILVA", limit: 4000, used: 1380, purchases: 2, color: "#3B82F6" },
];

export const subscriptions = [
  { id: "s1", name: "Netflix", category: "Assinaturas", amount: 45.9, dueDay: 18, frequency: "Mensal", payment: "Cartão Principal", status: "active" as const },
  { id: "s2", name: "Spotify Família", category: "Assinaturas", amount: 34.9, dueDay: 12, frequency: "Mensal", payment: "Cartão da Emily", status: "active" as const },
  { id: "s3", name: "Plano de celular", category: "Celular", amount: 99.9, dueDay: 20, frequency: "Mensal", payment: "PIX", status: "pending" as const },
];

export const fixedExpenses = [
  { id: "f1", name: "Aluguel", category: "Moradia", amount: 1100, dueDay: 10, responsible: "VICTOR SILVA", status: "paid" as const },
  { id: "f2", name: "Energia", category: "Energia", amount: 280, dueDay: 19, responsible: "EMILY SILVA", status: "pending" as const },
  { id: "f3", name: "Internet", category: "Internet", amount: 120, dueDay: 15, responsible: "VICTOR SILVA", status: "overdue" as const },
  { id: "f4", name: "Água", category: "Água", amount: 96.5, dueDay: 22, responsible: "EMILY SILVA", status: "pending" as const },
];

export const goals = [
  { id: "g1", name: "Reserva de Emergência", target: 10000, saved: 3500, deadline: null, color: "#16A085" },
  { id: "g2", name: "Viagem do casal", target: 8500, saved: 2100, deadline: "2027-06-20", color: "#8B5CF6" },
  { id: "g3", name: "Entrada da casa", target: 50000, saved: 8750, deadline: null, color: "#3B82F6" },
];

export const bills = [
  { id: "b1", name: "Cartão Principal", origin: "Cartões", dueDate: "2026-08-27", amount: 1850, status: "pending" as const },
  { id: "b2", name: "Casa dos Móveis", origin: "Comércios", dueDate: "2026-08-25", amount: 620, status: "pending" as const },
  { id: "b3", name: "Internet", origin: "Despesas Fixas", dueDate: "2026-08-15", amount: 120, status: "overdue" as const },
  { id: "b4", name: "Energia", origin: "Despesas Fixas", dueDate: "2026-08-19", amount: 280, status: "pending" as const },
  { id: "b5", name: "Aluguel", origin: "Despesas Fixas", dueDate: "2026-08-10", amount: 1100, status: "paid" as const },
];
