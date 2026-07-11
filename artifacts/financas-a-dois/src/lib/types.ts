export type TransactionType = "income" | "expense";
export type PaymentStatus = "paid" | "pending";

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
  owner: string;
  status: PaymentStatus;
  household_id?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  category: string;
  responsible: string;
  status: PaymentStatus;
  recurring: boolean;
  household_id?: string;
}

export interface Card {
  id: string;
  name: string;
  brand: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  holder: string;
  household_id?: string;
}

export interface CardPurchase {
  id: string;
  card_id: string;
  description: string;
  amount: number;
  installments: number;
  purchase_date: string;
  category: string;
  household_id?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit_amount: number;
  month: string;
  household_id?: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  icon: string;
  household_id?: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
}

export interface FinanceState {
  transactions: Transaction[];
  bills: Bill[];
  cards: Card[];
  purchases: CardPurchase[];
  budgets: Budget[];
  goals: Goal[];
  household: Household | null;
}
