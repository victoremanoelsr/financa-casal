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

export const BRAZILIAN_STATES = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
];

export function generateCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T; header: string; format?: (value: any) => string }>
): string {
  const header = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(";");
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        const formatted = col.format ? col.format(val) : String(val ?? "");
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(";")
  );
  return `\uFEFF${[header, ...dataLines].join("\r\n")}`;
}

