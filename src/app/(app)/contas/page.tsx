"use client";

import Link from "next/link";
import { Check, ChevronRight, Clock3, CreditCard, Repeat2, Store, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { Modal, StatusBadge } from "@/components/ui";
import { bills as initialBills } from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/format";

const groups = [
  { name: "Cartões", value: 2610, href: "/cartoes", icon: CreditCard, color: "blue" },
  { name: "Comércios", value: 620, href: "/comercios", icon: Store, color: "purple" },
  { name: "Assinaturas", value: 180.7, href: "/assinaturas", icon: Repeat2, color: "green" },
  { name: "Despesas Fixas", value: 1596.5, href: "/despesas-fixas", icon: Clock3, color: "amber" },
];

export default function BillsPage() {
  const [bills, setBills] = useState(initialBills);
  const [selected, setSelected] = useState<(typeof initialBills)[number] | null>(null);
  const pending = bills.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amount, 0);
  const overdue = bills.filter((item) => item.status === "overdue").reduce((sum, item) => sum + item.amount, 0);

  function markPaid() {
    if (!selected) return;
    setBills((current) => current.map((item) => item.id === selected.id ? { ...item, status: "paid" as const } : item));
    setSelected(null);
    toast.success("Pagamento registrado e saldo atualizado.");
  }

  return (
    <>
      <PageHeader title="Contas" subtitle="Tudo o que sua família precisa pagar neste mês, em um só lugar." />
      <div className="toolbar"><PeriodFilter /><span className="sync-note"><Check size={14} /> Valores consolidados sem duplicidade</span></div>
      <section className="bill-overview">
        <article className="bill-highlight"><small>Total a pagar</small><strong>{formatCurrency(pending)}</strong><p>5 contas neste período</p></article>
        <article><span className="overview-icon amber"><Clock3 /></span><div><small>Pendente</small><strong>{formatCurrency(pending - overdue)}</strong></div></article>
        <article><span className="overview-icon red"><TriangleAlert /></span><div><small>Em atraso</small><strong>{formatCurrency(overdue)}</strong></div></article>
      </section>
      <section className="account-groups">{groups.map(({ name, value, href, icon: Icon, color }) => <Link className="account-group-card" href={href} key={name}><span className={`overview-icon ${color}`}><Icon /></span><div><small>{name}</small><strong>{formatCurrency(value)}</strong><p>Ver detalhes <ChevronRight size={13} /></p></div></Link>)}</section>
      <section className="panel list-panel module-section">
        <div className="panel-heading"><div><h2>Contas de agosto</h2><p>Status calculado automaticamente pela data de vencimento</p></div></div>
        <div className="bills-list">{bills.map((bill) => <article className="bill-item" key={bill.id}><span className="bill-date"><small>AGO</small><strong>{bill.dueDate.slice(-2)}</strong></span><div><strong>{bill.name}</strong><small>{bill.origin} · vence em {formatDate(bill.dueDate)}</small></div><StatusBadge status={bill.status} /><b>{formatCurrency(bill.amount)}</b>{bill.status !== "paid" ? <button className="pay-button" onClick={() => setSelected(bill)}>Marcar como pago</button> : <span className="paid-check"><Check size={14} /> Baixada</span>}</article>)}</div>
      </section>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Confirmar pagamento" description="A baixa será registrada apenas uma vez e atualizará saldo, Dashboard e relatórios.">
        {selected && <div className="payment-confirm"><p><span>Conta</span><strong>{selected.name}</strong></p><p><span>Valor</span><strong>{formatCurrency(selected.amount)}</strong></p><p><span>Data do pagamento</span><strong>18/08/2026</strong></p><div className="modal-actions"><button className="ghost-button" onClick={() => setSelected(null)}>Cancelar</button><button className="primary-button" onClick={markPaid}>Confirmar pagamento</button></div></div>}
      </Modal>
    </>
  );
}
