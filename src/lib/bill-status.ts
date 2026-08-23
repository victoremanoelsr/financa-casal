export type BillStatus = "open" | "pending" | "overdue" | "paid";

export function parseCivilDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatCivilDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCivilDays(value: string, days: number) {
  const date = parseCivilDate(value); date.setDate(date.getDate() + days); return formatCivilDate(date);
}

export function calendarDaysBetween(from: string, to: string) {
  const start = parseCivilDate(from); const end = parseCivilDate(to);
  return Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86_400_000);
}

export function calculateStoreStatus(originalDate: string, remaining: number, today = formatCivilDate(new Date())): BillStatus {
  if (remaining <= 0) return "paid";
  const days = calendarDaysBetween(originalDate, today);
  if (days < 20) return "open";
  if (days <= 30) return "pending";
  return "overdue";
}

export function getCardCycle(purchaseDate: string, closingDay: number, dueDay: number) {
  const purchase = parseCivilDate(purchaseDate);
  const closing = new Date(purchase.getFullYear(), purchase.getMonth() + (purchase.getDate() > closingDay ? 1 : 0), closingDay, 12);
  const due = new Date(closing.getFullYear(), closing.getMonth() + (dueDay <= closingDay ? 1 : 0), dueDay, 12);
  return { closingDate: formatCivilDate(closing), dueDate: formatCivilDate(due), referenceMonth: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-01` };
}

export function calculateCardStatus(closingDate: string, dueDate: string, remaining: number, today = formatCivilDate(new Date())): BillStatus {
  if (remaining <= 0) return "paid";
  if (today < closingDate) return "open";
  if (today <= dueDate) return "pending";
  return "overdue";
}

export function monthLabel(value: string) {
  const date = parseCivilDate(value.slice(0, 7) + "-01");
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
