"use client";

import { CreditCard, Plus, Repeat2, Smartphone } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, StatusBadge } from "@/components/ui";
import { subscriptions as initialItems } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/format";

type CardOption = { id: string; name: string; institution: string; lastFour: string };

export default function SubscriptionsPage() {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState("Cartão");
  const [cards, setCards] = useState<CardOption[]>([]);

  useEffect(() => {
    void fetch("/api/cards", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setCards(result?.cards ?? []))
      .catch(() => setCards([]));
  }, []);

  const monthly = items.reduce((sum, item) => sum + item.amount, 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    if (amount <= 0) return toast.error("Informe um valor válido.");
    const selectedCard = cards.find((card) => card.id === String(data.get("card")));
    if (payment === "Cartão" && !selectedCard) return toast.error("Cadastre ou selecione um cartão válido.");
    setItems((current) => [...current, {
      id: crypto.randomUUID(), name: String(data.get("name")), category: String(data.get("category")), amount,
      dueDay: Number(data.get("dueDay")), frequency: String(data.get("frequency")),
      payment: selectedCard ? selectedCard.name : payment,
      status: payment === "PIX" ? "pending" as const : "active" as const,
    }]);
    setOpen(false);
    toast.success("Assinatura salva sem criar despesa duplicada.");
  }

  return <>
    <PageHeader title="Assinaturas" subtitle="Gerencie serviços recorrentes e acompanhe onde cada cobrança será paga." />
    <div className="toolbar"><PeriodFilter /><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16} /> Adicionar assinatura</button></div>
    <section className="subscription-summary">
      <article><span className="overview-icon green"><Repeat2 /></span><div><small>Custo mensal</small><strong>{formatCurrency(monthly)}</strong></div></article>
      <article><span className="overview-icon blue"><CreditCard /></span><div><small>No cartão</small><strong>{formatCurrency(items.filter((item) => item.payment.includes("Cartão")).reduce((sum, item) => sum + item.amount, 0))}</strong></div></article>
      <article><span className="overview-icon purple"><Smartphone /></span><div><small>Serviços ativos</small><strong>{items.length}</strong></div></article>
    </section>
    <section className="panel list-panel module-section">
      <div className="panel-heading"><div><h2>Suas assinaturas</h2><p>Cobranças recorrentes de agosto</p></div></div>
      <div className="subscription-list">{items.map((item) => <article key={item.id}><span className="subscription-logo">{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.category} · {item.frequency}</small></div><span><small>Forma de pagamento</small><strong>{item.payment}</strong></span><span><small>Vencimento</small><strong>Dia {item.dueDay}</strong></span><b>{formatCurrency(item.amount)}</b><StatusBadge status={item.status} /><button>•••</button></article>)}</div>
    </section>
    <Modal open={open} onClose={() => setOpen(false)} title="Adicionar assinatura" description="Se for paga no cartão, a mesma cobrança será vinculada à fatura sem duplicar o lançamento.">
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid two"><Field label="Nome"><input name="name" placeholder="Ex.: Netflix" required /></Field><Field label="Valor"><input name="amount" type="number" min="0.01" step="0.01" required /></Field></div>
        <div className="form-grid two"><Field label="Vencimento"><input name="dueDay" type="number" min="1" max="31" required /></Field><Field label="Periodicidade"><select name="frequency"><option>Mensal</option><option>Anual</option><option>Semanal</option></select></Field></div>
        <Field label="Categoria"><select name="category"><option>Assinaturas</option><option>Celular</option><option>Internet</option><option>Outros</option></select></Field>
        <Field label="Forma de pagamento"><select value={payment} onChange={(event) => setPayment(event.target.value)}><option>Cartão</option><option>PIX</option><option>Dinheiro</option></select></Field>
        {payment === "Cartão" && <Field label="Cartão" hint={cards.length === 0 ? "Nenhum cartão cadastrado pela família." : "Selecione um cartão cadastrado."}><select name="card" required disabled={cards.length === 0}><option value="">{cards.length === 0 ? "Nenhum cartão cadastrado" : "Selecione"}</option>{cards.map((card) => <option value={card.id} key={card.id}>{card.name} · {card.institution} · final {card.lastFour}</option>)}</select></Field>}
        <div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar assinatura</button></div>
      </form>
    </Modal>
  </>;
}
