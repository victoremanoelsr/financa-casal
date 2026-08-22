import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

export function normalizePersonName(value: string) {
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleUpperCase("pt-BR");
}

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, "");
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function splitInstallments(totalInCents: number, count: number) {
  if (!Number.isInteger(totalInCents) || totalInCents <= 0) throw new Error("Valor inválido.");
  if (!Number.isInteger(count) || count < 1 || count > 48) throw new Error("Quantidade de parcelas inválida.");

  const base = Math.floor(totalInCents / count);
  const remainder = totalInCents % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function getBillStatus(dueDate: string, paidAt?: string | null, today = new Date()) {
  if (paidAt) return "paid" as const;
  const due = parseISO(dueDate);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due < current ? ("overdue" as const) : ("pending" as const);
}
