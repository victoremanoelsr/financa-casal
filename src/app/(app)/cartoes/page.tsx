"use client";

import Link from "next/link";
import { CreditCard, Plus, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, ProgressBar } from "@/components/ui";
import { cards as initialCards } from "@/lib/demo-data";
import { formatCurrency, normalizePersonName } from "@/lib/format";

export default function CardsPage() {
  const [items, setItems] = useState(initialCards);
  const [open, setOpen] = useState(false);

  function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const type = String(data.get("type"));
    const limit = type === "Crédito" ? Number(data.get("limit")) : 0;
    if (!name || (type === "Crédito" && limit <= 0)) return toast.error("Revise os dados do cartão.");
    setItems((current) => [...current, { id: crypto.randomUUID(), name, bank: String(data.get("bank")), holder: normalizePersonName(String(data.get("holder"))), type, lastDigits: "0000", limit, used: 0, statement: 0, closingDay: Number(data.get("closingDay")) || 0, dueDay: Number(data.get("dueDay")) || 0, color: "blue" }]);
    setOpen(false); toast.success("Cartão cadastrado com sucesso.");
  }

  return (
    <>
      <PageHeader title="Cartões" subtitle="Acompanhe limites, faturas e compras de todos os cartões da família." />
      <div className="toolbar"><PeriodFilter /><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16} /> Adicionar cartão</button></div>
      <section className="cards-grid">{items.map((card) => {
        const usage = card.limit ? card.used / card.limit * 100 : 0;
        return <Link href={`/cartoes/${card.id}`} className={`bank-card ${card.color}`} key={card.id}><div className="bank-card-top"><span><CreditCard size={20} /><small>{card.bank}</small></span><i>{card.type}</i></div><div className="bank-card-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; {card.lastDigits}</div><div className="bank-card-holder"><span><small>TITULAR</small><strong>{card.holder}</strong></span><span><small>VENCIMENTO</small><strong>{card.dueDay ? `${String(card.dueDay).padStart(2, "0")}/MÊS` : "—"}</strong></span></div><div className="card-usage"><p><span>Limite utilizado</span><strong>{formatCurrency(card.used)} <small>de {formatCurrency(card.limit)}</small></strong></p><ProgressBar value={usage} color="#FFFFFF" /><small>{Math.round(usage)}% utilizado</small></div><div className="card-statement"><span>Fatura atual</span><strong>{formatCurrency(card.statement)}</strong></div></Link>;
      })}</section>
      <article className="info-banner"><span><Sparkles /></span><div><strong>Parcelas entram no mês correto</strong><p>Uma compra de R$ 900 em 3x gera três parcelas de R$ 300 e nunca duplica o valor integral nos relatórios.</p></div></article>

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar cartão" description="Cadastre um cartão de crédito ou débito da família.">
        <form className="modal-form" onSubmit={addCard}><div className="form-grid two"><Field label="Nome do cartão"><input name="name" placeholder="Ex.: Cartão Principal" required /></Field><Field label="Banco ou instituição"><input name="bank" placeholder="Ex.: Banco Inter" required /></Field></div><div className="form-grid two"><Field label="Titular"><select name="holder"><option>VICTOR SILVA</option><option>EMILY SILVA</option></select></Field><Field label="Tipo"><select name="type"><option>Crédito</option><option>Débito</option></select></Field></div><Field label="Limite do cartão"><input name="limit" type="number" min="0" step="0.01" placeholder="0,00" /></Field><div className="form-grid two"><Field label="Dia de fechamento"><input name="closingDay" type="number" min="1" max="31" /></Field><Field label="Dia de vencimento"><input name="dueDay" type="number" min="1" max="31" /></Field></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar cartão</button></div></form>
      </Modal>
    </>
  );
}
