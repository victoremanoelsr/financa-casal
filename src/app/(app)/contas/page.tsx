"use client";

import Link from "next/link";
import { Check, ChevronRight, Clock3, CreditCard, History, Repeat2, RotateCcw, Store, TriangleAlert } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

type Payment = { id: string; amount: number; date: string; createdAt: string; note: string; method: string; responsible: string };
type PurchaseItem = { name: string; quantity: number; unitPrice: number; total: number };
type Purchase = { id: string; description: string; date: string; amount: number; items: PurchaseItem[] };
type Bill = { id: string; type: "card" | "store"; sourceId: string; name: string; origin: string; originalDate: string; closingDate?: string; dueDate: string; amount: number; originalAmount: number; paid: number; remaining: number; status: "open" | "pending" | "paid" | "overdue"; payments: Payment[]; purchases: Purchase[]; originMonth: string; carried: boolean };
type BillData = { bills: Bill[]; groups: { cards: number; stores: number; subscriptions: number; fixed: number } };
const EMPTY: BillData = { bills: [], groups: { cards: 0, stores: 0, subscriptions: 0, fixed: 0 } };
const METHOD_LABELS: Record<string, string> = { pix: "PIX", cash: "Dinheiro", bank_transfer: "Transferência", card: "Cartão", other: "Outro" };

export default function BillsPage() {
  const [data, setData] = useState<BillData>(EMPTY);
  const [selected, setSelected] = useState<Bill | null>(null);
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { const response = await fetch("/api/bills", { cache: "no-store" }); setData(response.ok ? await response.json() : EMPTY); }, []);
  useEffect(() => {
    // Carrega as obrigações e seus pagamentos reais.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const openDetails = (bill: Bill) => { setSelected(bill); setAmount(bill.remaining); setPaymentMode(false); };
  const openPayment = (bill: Bill) => { setSelected(bill); setAmount(bill.remaining); setPaymentMode(true); };
  const pending = data.bills.reduce((sum, item) => sum + item.remaining, 0);
  const overdue = data.bills.filter((item) => item.status === "overdue").reduce((sum, item) => sum + item.remaining, 0);
  const groups = [
    { name: "Cartões", value: data.groups.cards, href: "/cartoes", icon: CreditCard, color: "blue" },
    { name: "Comércios", value: data.groups.stores, href: "/comercios", icon: Store, color: "purple" },
    { name: "Assinaturas", value: data.groups.subscriptions, href: "/assinaturas", icon: Repeat2, color: "green" },
    { name: "Despesas Fixas", value: data.groups.fixed, href: "/despesas-fixas", icon: Clock3, color: "amber" },
  ];
  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    if (!(amount > 0)) return toast.error("O pagamento precisa ser maior que R$ 0,00.");
    if (amount > selected.remaining) return toast.error(`O valor informado é maior que o saldo pendente de ${formatCurrency(selected.remaining)}.`);
    setSaving(true); const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/bills/${encodeURIComponent(selected.id)}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, paymentDate: form.get("paymentDate"), note: form.get("note"), method: form.get("method") }) });
    const result = await response.json().catch(() => null); setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível registrar o pagamento.");
    setSelected(null); await load(); toast.success(amount === selected.remaining ? "Conta quitada com sucesso." : "Pagamento parcial registrado.");
  }
  async function reverse(payment: Payment) {
    if (!selected || !confirm(`Estornar o pagamento de ${formatCurrency(payment.amount)}?`)) return;
    const response = await fetch(`/api/bills/${encodeURIComponent(selected.id)}/payments/${payment.id}/reverse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: "Estorno confirmado pelo usuário" }) });
    const result = await response.json().catch(() => null); if (!response.ok) return toast.error(result?.message ?? "Não foi possível estornar.");
    setSelected(null); await load(); toast.success("Pagamento estornado e saldo restaurado.");
  }
  return <>
    <PageHeader title="Contas" subtitle="Tudo o que sua família precisa pagar neste mês, em um só lugar." />
    <div className="toolbar"><PeriodFilter /><span className="sync-note"><Check size={14} /> Saldos reais, sem duplicidade</span></div>
    <section className="bill-overview"><article className="bill-highlight"><small>Total a pagar</small><strong>{formatCurrency(pending)}</strong><p>{data.bills.filter((bill) => bill.remaining > 0).length} contas em aberto</p></article><article><span className="overview-icon amber"><Clock3 /></span><div><small>Pendente</small><strong>{formatCurrency(pending - overdue)}</strong></div></article><article><span className="overview-icon red"><TriangleAlert /></span><div><small>Em atraso</small><strong>{formatCurrency(overdue)}</strong></div></article></section>
    <section className="account-groups">{groups.map(({ name, value, href, icon: Icon, color }) => <Link className="account-group-card" href={href} key={name}><span className={`overview-icon ${color}`}><Icon /></span><div><small>{name}</small><strong>{formatCurrency(value)}</strong><p>Ver detalhes <ChevronRight size={13} /></p></div></Link>)}</section>
    <section className="panel list-panel module-section"><div className="panel-heading"><div><h2>Contas do período</h2><p>Quem pagar, quanto falta e a situação de cada conta</p></div></div><div className="bills-list bills-list-simple">{data.bills.map((bill) => <article className="bill-item bill-item-simple" key={bill.id} onClick={() => openDetails(bill)}><span className="bill-date"><small>{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${bill.dueDate}T12:00:00`)).toUpperCase()}</small><strong>{bill.dueDate.slice(-2)}</strong></span><div className="bill-main"><strong>{bill.name}</strong>{bill.payments.length > 0 && <button type="button" onClick={(event) => { event.stopPropagation(); openDetails(bill); }}><History size={12} /> {bill.payments.length} {bill.payments.length === 1 ? "pagamento" : "pagamentos"}</button>}</div><StatusBadge status={bill.paid > 0 && bill.remaining > 0 ? "partial" : bill.status} /><div className="bill-open-value"><strong>{formatCurrency(bill.remaining)}</strong>{bill.paid > 0 && bill.remaining > 0 && <small>restante</small>}</div>{bill.remaining > 0 ? <button className="pay-button" onClick={(event) => { event.stopPropagation(); openPayment(bill); }}>{bill.paid > 0 ? "Pagar restante" : "Pagar"}</button> : <button className="pay-button history-button" onClick={(event) => { event.stopPropagation(); openDetails(bill); }}><History size={13} /> Histórico</button>}</article>)}</div></section>
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={paymentMode ? "Registrar pagamento" : "Detalhes da conta"} description={selected?.name ?? ""}>{selected && <div className="bill-payment-modal"><div className="payment-summary"><p><span>Valor original</span><strong>{formatCurrency(selected.originalAmount)}</strong></p><p><span>Total pago</span><strong>{formatCurrency(selected.paid)}</strong></p><p className="remaining"><span>Restante</span><strong>{formatCurrency(selected.remaining)}</strong></p></div><div className="original-purchase"><h3>Compra original — {formatDate(selected.originalDate)}</h3>{selected.purchases?.map((purchase) => <article key={purchase.id}><div><strong>{purchase.description}</strong><span>{formatCurrency(purchase.amount)}</span></div>{purchase.items?.length > 0 ? <div className="purchase-history-items">{purchase.items.map((item, index) => <p key={`${purchase.id}-${index}`}><span>{item.name}<small>{item.quantity} × {formatCurrency(item.unitPrice)}</small></span><strong>{formatCurrency(item.total)}</strong></p>)}</div> : <p>Valor cadastrado sem detalhamento de itens.</p>}</article>)}</div>{paymentMode && selected.remaining > 0 && <form className="modal-form" onSubmit={pay}><Field label="Quanto deseja pagar?"><input type="number" min="0.01" max={selected.remaining} step="0.01" value={amount || ""} onChange={(event) => setAmount(Number(event.target.value))} required /></Field><div className="form-grid two"><Field label="Data do pagamento"><input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field><Field label="Forma de pagamento"><select name="method" defaultValue="other"><option value="pix">PIX</option><option value="cash">Dinheiro</option><option value="bank_transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outro</option></select></Field></div><Field label="Observação" hint="Opcional"><textarea name="note" rows={3} placeholder="Ex.: Pagamento parcial em dinheiro." /></Field><div className="payment-preview"><span>Pagamento atual <strong>{formatCurrency(amount)}</strong></span><span>Saldo após pagamento <strong>{formatCurrency(Math.max(0, selected.remaining - amount))}</strong></span></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setSelected(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Confirmar pagamento"}</button></div></form>}{!paymentMode && selected.remaining > 0 && <button className="primary-button bill-detail-pay" onClick={() => setPaymentMode(true)}>{selected.paid > 0 ? "Pagar restante" : "Pagar conta"}</button>}<div className="payment-history"><h3>Histórico de pagamentos</h3>{selected.payments.length === 0 ? <p>Nenhum pagamento registrado.</p> : selected.payments.map((payment) => <article key={payment.id}><div><strong>{formatCurrency(payment.amount)}</strong><small>{formatDate(payment.date)} · {payment.responsible} · {METHOD_LABELS[payment.method] ?? "Outro"}</small>{payment.note && <p>{payment.note}</p>}</div><button type="button" onClick={() => void reverse(payment)} title="Estornar pagamento"><RotateCcw size={14} /> Estornar</button></article>)}</div></div>}</Modal>
  </>;
}
