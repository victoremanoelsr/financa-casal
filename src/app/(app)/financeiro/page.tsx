"use client";

import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Plus, Search, SlidersHorizontal } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { transactions as initialTransactions } from "@/lib/demo-data";
import { formatCurrency, formatDate, normalizePersonName } from "@/lib/format";

export default function FinancePage() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [initialOpen, setInitialOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState(2500);
  const [type, setType] = useState<"income" | "expense">("expense");

  const visible = useMemo(() => transactions.filter((item) => (filter === "all" || item.type === filter) && item.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [filter, query, transactions]);
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(String(data.get("amount")).replace(",", "."));
    if (!amount || amount <= 0) return toast.error("Informe um valor maior que zero.");
    const title = String(data.get("description") || "").trim();
    if (!title) return toast.error("Informe uma descrição.");
    setTransactions((current) => [{ id: crypto.randomUUID(), title, person: normalizePersonName(String(data.get("person"))), category: String(data.get("category")), date: String(data.get("date")), amount, type }, ...current]);
    setOpen(false);
    toast.success(type === "income" ? "Receita salva com sucesso." : "Despesa salva com sucesso.");
  }

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Registre e acompanhe todas as receitas e despesas da família." />
      <div className="toolbar"><PeriodFilter /><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16} /> Novo lançamento</button></div>
      <section className="summary-grid">
        <article className="summary-card balance"><div className="summary-icon"><CircleDollarSign /></div><div><small>Saldo atual</small><strong>{formatCurrency(initialBalance + income - expenses)}</strong></div><span className="trend positive">Atualizado</span></article>
        <article className="summary-card"><div className="summary-icon income"><ArrowDownLeft /></div><div><small>Receitas</small><strong>{formatCurrency(income)}</strong></div><span className="trend positive">2 lançamentos</span></article>
        <article className="summary-card"><div className="summary-icon expense"><ArrowUpRight /></div><div><small>Despesas</small><strong>{formatCurrency(expenses)}</strong></div><span className="trend negative">3 lançamentos</span></article>
      </section>
      <article className="initial-balance-banner"><div><span>Saldo inicial</span><strong>{formatCurrency(initialBalance)}</strong><p>Valor que a família já possuía antes de começar a usar o sistema. Não entra como receita do mês.</p></div><button className="secondary-button inline" onClick={() => setInitialOpen(true)}>Editar saldo inicial</button></article>

      <section className="panel list-panel module-section">
        <div className="list-toolbar">
          <div className="segmented-control">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button>
            <button className={filter === "income" ? "active" : ""} onClick={() => setFilter("income")}>Receitas</button>
            <button className={filter === "expense" ? "active" : ""} onClick={() => setFilter("expense")}>Despesas</button>
          </div>
          <div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lançamento" /><button aria-label="Mais filtros"><SlidersHorizontal size={15} /></button></div>
        </div>
        <div className="transaction-list">
          {visible.map((item) => <article className="transaction-item" key={item.id}><span className={item.type === "income" ? "transaction-icon income" : "transaction-icon expense"}>{item.type === "income" ? <ArrowDownLeft /> : <ArrowUpRight />}</span><div><strong>{item.title}</strong><small>{item.person} · {item.category}</small></div><time>{formatDate(item.date)}</time><b className={item.type}>{item.type === "income" ? "+ " : "− "}{formatCurrency(item.amount)}</b><button aria-label={`Opções de ${item.title}`}>•••</button></article>)}
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo lançamento" description="Registre uma receita ou despesa sem misturar o saldo inicial.">
        <form className="modal-form" onSubmit={addTransaction}>
          <div className="segmented-control full"><button type="button" className={type === "income" ? "active" : ""} onClick={() => setType("income")}>Receita</button><button type="button" className={type === "expense" ? "active danger" : ""} onClick={() => setType("expense")}>Despesa</button></div>
          <div className="form-grid two"><Field label="Pessoa da família"><select name="person" required><option>VICTOR SILVA</option><option>EMILY SILVA</option></select></Field><Field label="Categoria"><select name="category" required><option>{type === "income" ? "Salário" : "Alimentação"}</option><option>{type === "income" ? "Renda Extra" : "Moradia"}</option><option>Outros</option></select></Field></div>
          <Field label="Descrição"><input name="description" placeholder={type === "income" ? "Ex.: Salário" : "Ex.: Compra do mercado"} required /></Field>
          <div className="form-grid two"><Field label="Valor"><input name="amount" inputMode="decimal" placeholder="0,00" required /></Field><Field label="Data"><input name="date" type="date" defaultValue="2026-08-18" required /></Field></div>
          <div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar lançamento</button></div>
        </form>
      </Modal>
      <Modal open={initialOpen} onClose={() => setInitialOpen(false)} title="Saldo inicial" description="Este valor altera o saldo disponível, mas nunca será somado às receitas do período.">
        <form className="modal-form" onSubmit={(event) => { event.preventDefault(); const value = Number(new FormData(event.currentTarget).get("initialBalance")); if (value < 0) return toast.error("O saldo inicial não pode ser negativo nesta versão."); setInitialBalance(value); setInitialOpen(false); toast.success("Saldo inicial atualizado."); }}><Field label="Valor disponível ao começar"><input name="initialBalance" type="number" min="0" step="0.01" defaultValue={initialBalance} required /></Field><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setInitialOpen(false)}>Cancelar</button><button className="primary-button">Salvar saldo</button></div></form>
      </Modal>
    </>
  );
}
