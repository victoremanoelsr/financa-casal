"use client";

import { FormEvent, ReactNode, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Bell, CalendarDays, CheckCircle2,
  ChevronRight, CircleDollarSign, CreditCard, FileText, HeartHandshake, Home,
  LayoutDashboard, LogOut, Menu, PiggyBank, Plus, ReceiptText,
  Settings, ShieldCheck, Target, Trash2, TrendingDown, TrendingUp, UserRound,
  UsersRound, WalletCards, X
} from "lucide-react";
import { useFinance } from "@/lib/use-finance";
import type { Goal, Transaction, TransactionType } from "@/lib/types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const today = new Date();
const currentMonth = today.toISOString().slice(0, 7);

const categories = ["Casa", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Igreja", "Assinaturas", "Pessoal", "Salário", "Renda extra", "Outros"];
const owners = ["Casal", "Victor", "Esposa"];

type ViewId = "dashboard" | "transactions" | "bills" | "cards" | "budgets" | "goals" | "reports" | "settings";

const nav: { id: ViewId; label: string; icon: ReactNode }[] = [
  { id: "dashboard", label: "Visão Geral", icon: <LayoutDashboard size={19} /> },
  { id: "transactions", label: "Movimentações", icon: <CircleDollarSign size={19} /> },
  { id: "bills", label: "Contas a Pagar", icon: <ReceiptText size={19} /> },
  { id: "cards", label: "Cartões", icon: <CreditCard size={19} /> },
  { id: "budgets", label: "Orçamento", icon: <BarChart3 size={19} /> },
  { id: "goals", label: "Metas", icon: <Target size={19} /> },
  { id: "reports", label: "Relatórios", icon: <FileText size={19} /> },
  { id: "settings", label: "Configurações", icon: <Settings size={19} /> },
];

function cn(...classes: (string | false | undefined)[]) { return classes.filter(Boolean).join(" "); }
function monthMatch(date: string) { return date.slice(0, 7) === currentMonth; }
function safeDate(value: string) { return new Date(`${value}T12:00:00`); }

export default function FinanceApp() {
  const finance = useFinance();
  const [view, setView] = useState<ViewId>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = nav.find((item) => item.id === view)?.label ?? "Visão Geral";

  return (
    <div className="app-shell">
      <aside className={cn("sidebar", mobileOpen && "sidebar-open")}>
        <div className="sidebar-top">
          <div className="brand sidebar-brand">
            <span className="brand-mark"><HeartHandshake size={24} /></span>
            <div><strong>Finanças a Dois</strong><small>{finance.state.household?.name ?? "Nossa Casa"}</small></div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-caption">MENU PRINCIPAL</span>
          {nav.map((item) => (
            <button key={item.id} className={cn("nav-item", view === item.id && "active")} onClick={() => { setView(item.id); setMobileOpen(false); }}>
              {item.icon}<span>{item.label}</span>{view === item.id && <ChevronRight size={16} className="nav-chevron" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="couple-card"><UsersRound size={20} /><div><strong>Conta compartilhada</strong><span>Dados sincronizados do casal</span></div></div>
          <button className="nav-item signout" onClick={() => void finance.signOut()}><LogOut size={19} /> Sair</button>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div><span className="page-kicker">FINANÇAS DA FAMÍLIA</span><h1>{title}</h1></div>
          </div>
          <div className="topbar-actions">
            <div className="month-pill"><CalendarDays size={17} /> {monthFmt.format(today)}</div>
            <button className="icon-button"><Bell size={20} /></button>
            <div className="avatar">V</div>
          </div>
        </header>

        <section className="content-area">
          {!finance.configured && <DemoBanner onReset={finance.resetDemo} />}
          {finance.error && <div className="error-banner">{finance.error}</div>}
          {finance.loading ? <Loading /> : (
            <>
              {view === "dashboard" && <DashboardView finance={finance} onNavigate={setView} />}
              {view === "transactions" && <TransactionsView finance={finance} />}
              {view === "bills" && <BillsView finance={finance} />}
              {view === "cards" && <CardsView finance={finance} />}
              {view === "budgets" && <BudgetsView finance={finance} />}
              {view === "goals" && <GoalsView finance={finance} />}
              {view === "reports" && <ReportsView finance={finance} />}
              {view === "settings" && <SettingsView finance={finance} />}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

type FinanceHook = ReturnType<typeof useFinance>;

function DemoBanner({ onReset }: { onReset: () => void }) {
  return <div className="demo-banner"><div><strong>Modo demonstração</strong><span>Os dados estão salvos apenas neste navegador. Configure o Supabase para uso real do casal.</span></div><button className="secondary-button small" onClick={onReset}>Restaurar exemplo</button></div>;
}

function Loading() { return <div className="loading-card"><div className="spinner" /><span>Carregando as finanças...</span></div>; }

function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-header"><div>{eyebrow && <span className="page-kicker">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

function StatCard({ label, value, hint, icon, tone }: { label: string; value: string; hint: string; icon: ReactNode; tone: string }) {
  return <article className="stat-card"><div className={cn("stat-icon", tone)}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></article>;
}

function DashboardView({ finance, onNavigate }: { finance: FinanceHook; onNavigate: (v: ViewId) => void }) {
  const tx = finance.state.transactions.filter((item) => monthMatch(item.date));
  const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = tx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const pending = finance.state.bills.filter((b) => b.status === "pending").reduce((s, b) => s + Number(b.amount), 0);
  const balance = income - expenses;
  const expenseByCategory = (() => {
    const map = new Map<string, number>();
    tx.filter(t => t.type === "expense").forEach(t => map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount)));
    return [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0, 5);
  })();
  const maxCat = Math.max(...expenseByCategory.map(([,v]) => v), 1);
  const recent = [...finance.state.transactions].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 6);

  return <>
    <div className="welcome-row"><div><span className="page-kicker">RESUMO DO MÊS</span><h2>Olá, família 👋</h2><p>Este é o retrato financeiro de vocês em {monthFmt.format(today)}.</p></div><button className="primary-button" onClick={() => onNavigate("transactions")}><Plus size={18} /> Novo lançamento</button></div>
    <div className="stats-grid">
      <StatCard label="Entradas" value={brl.format(income)} hint="Receitas confirmadas" icon={<ArrowUpRight size={22} />} tone="green" />
      <StatCard label="Despesas" value={brl.format(expenses)} hint="Saídas realizadas" icon={<ArrowDownLeft size={22} />} tone="red" />
      <StatCard label="Saldo do mês" value={brl.format(balance)} hint={balance >= 0 ? "Mês no positivo" : "Atenção ao orçamento"} icon={<WalletCards size={22} />} tone="blue" />
      <StatCard label="Contas pendentes" value={brl.format(pending)} hint={`${finance.state.bills.filter(b => b.status === "pending").length} conta(s) a pagar`} icon={<ReceiptText size={22} />} tone="amber" />
    </div>

    <div className="dashboard-grid">
      <article className="panel chart-panel">
        <div className="panel-title"><div><span className="page-kicker">DISTRIBUIÇÃO</span><h3>Gastos por categoria</h3></div><button className="text-button inline" onClick={() => onNavigate("reports")}>Ver relatório</button></div>
        {expenseByCategory.length ? <div className="bar-list">{expenseByCategory.map(([category,value]) => <div className="bar-row" key={category}><div className="bar-meta"><span>{category}</span><strong>{brl.format(value)}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(6, value/maxCat*100)}%` }} /></div></div>)}</div> : <Empty text="Ainda não há despesas neste mês." />}
      </article>

      <article className="panel health-panel">
        <div className="panel-title"><div><span className="page-kicker">SAÚDE FINANCEIRA</span><h3>Como está o mês</h3></div><ShieldCheck size={23} /></div>
        <div className="health-score"><div className="score-ring" style={{ "--score": `${income ? Math.max(8, Math.min(100, Math.round((balance/income)*100 + 55))) : 0}%` } as React.CSSProperties}><strong>{income ? Math.max(8, Math.min(100, Math.round((balance/income)*100 + 55))) : 0}</strong><span>/100</span></div><div><strong>{balance >= 0 ? "Bom controle" : "Precisa de atenção"}</strong><p>{balance >= 0 ? "Vocês estão gastando menos do que recebem neste mês." : "As saídas já superaram as entradas registradas."}</p></div></div>
        <div className="health-tip"><PiggyBank size={20} /><div><strong>Sugestão do mês</strong><span>Definam um valor fixo para a reserva antes de distribuir o restante do orçamento.</span></div></div>
      </article>
    </div>

    <div className="dashboard-grid lower">
      <article className="panel">
        <div className="panel-title"><div><span className="page-kicker">ÚLTIMAS ATIVIDADES</span><h3>Movimentações recentes</h3></div><button className="text-button inline" onClick={() => onNavigate("transactions")}>Ver todas</button></div>
        <div className="transaction-list">{recent.map(t => <TransactionRow key={t.id} item={t} />)}</div>
      </article>
      <article className="panel">
        <div className="panel-title"><div><span className="page-kicker">PRÓXIMOS VENCIMENTOS</span><h3>Contas do mês</h3></div><button className="text-button inline" onClick={() => onNavigate("bills")}>Gerenciar</button></div>
        <div className="bill-mini-list">{finance.state.bills.slice(0,5).map(b => <div className="bill-mini" key={b.id}><span className={cn("status-dot", b.status === "paid" && "paid")} /><div><strong>{b.name}</strong><span>Dia {b.due_day} · {b.responsible}</span></div><strong>{brl.format(b.amount)}</strong></div>)}</div>
      </article>
    </div>
  </>;
}

function TransactionRow({ item, onDelete }: { item: Transaction; onDelete?: () => void }) {
  return <div className="transaction-row"><div className={cn("transaction-icon", item.type)}>{item.type === "income" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</div><div className="transaction-main"><strong>{item.description}</strong><span>{item.category} · {item.owner}</span></div><div className="transaction-date">{dateFmt.format(safeDate(item.date))}</div><strong className={cn("transaction-value", item.type)}>{item.type === "income" ? "+" : "−"}{brl.format(item.amount)}</strong>{onDelete && <button className="icon-button danger" onClick={onDelete}><Trash2 size={17} /></button>}</div>;
}

function TransactionsView({ finance }: { finance: FinanceHook }) {
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState<"all" | TransactionType>("all");
  const filtered = finance.state.transactions.filter(t => filter === "all" || t.type === filter);
  return <>
    <SectionHeader eyebrow="ENTRADAS E SAÍDAS" title="Movimentações do casal" description="Registre tudo que entra e sai para manter o mês sob controle." action={<button className="primary-button" onClick={() => setModal(true)}><Plus size={18} /> Novo lançamento</button>} />
    <div className="filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button><button className={filter === "income" ? "active" : ""} onClick={() => setFilter("income")}>Entradas</button><button className={filter === "expense" ? "active" : ""} onClick={() => setFilter("expense")}>Saídas</button></div>
    <article className="panel table-panel"><div className="transaction-list large">{filtered.length ? filtered.map(t => <TransactionRow key={t.id} item={t} onDelete={() => void finance.deleteTransaction(t.id)} />) : <Empty text="Nenhuma movimentação encontrada." />}</div></article>
    {modal && <TransactionModal finance={finance} close={() => setModal(false)} />}
  </>;
}

function TransactionModal({ finance, close }: { finance: FinanceHook; close: () => void }) {
  const [type, setType] = useState<TransactionType>("expense");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    await finance.addTransaction({ type, description: String(fd.get("description")), amount: Number(fd.get("amount")), category: String(fd.get("category")), date: String(fd.get("date")), owner: String(fd.get("owner")), status: "paid" }); close();
  }
  return <Modal title="Novo lançamento" subtitle="Registre uma entrada ou saída do casal." close={close}><form className="form-grid" onSubmit={submit}><div className="type-toggle span-2"><button type="button" className={type === "income" ? "active income" : ""} onClick={() => setType("income")}><ArrowUpRight size={18} /> Entrada</button><button type="button" className={type === "expense" ? "active expense" : ""} onClick={() => setType("expense")}><ArrowDownLeft size={18} /> Saída</button></div><Field label="Descrição"><input name="description" placeholder="Ex.: Supermercado" required /></Field><Field label="Valor"><input name="amount" type="number" min="0.01" step="0.01" placeholder="0,00" required /></Field><Field label="Categoria"><Select name="category" values={categories} /></Field><Field label="Responsável"><Select name="owner" values={owners} /></Field><Field label="Data"><input name="date" type="date" defaultValue={today.toISOString().slice(0,10)} required /></Field><div className="form-actions span-2"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button">Salvar lançamento</button></div></form></Modal>;
}

function BillsView({ finance }: { finance: FinanceHook }) {
  const [modal, setModal] = useState(false);
  const paid = finance.state.bills.filter(b => b.status === "paid").reduce((s,b) => s + Number(b.amount), 0);
  const pending = finance.state.bills.filter(b => b.status === "pending").reduce((s,b) => s + Number(b.amount), 0);
  return <>
    <SectionHeader eyebrow="COMPROMISSOS DO MÊS" title="Contas a pagar" description="Acompanhe vencimentos, responsáveis e pagamentos recorrentes." action={<button className="primary-button" onClick={() => setModal(true)}><Plus size={18} /> Nova conta</button>} />
    <div className="mini-stats"><div><CheckCircle2 size={20} /><span>Pago no mês<strong>{brl.format(paid)}</strong></span></div><div><CalendarDays size={20} /><span>A pagar<strong>{brl.format(pending)}</strong></span></div><div><ReceiptText size={20} /><span>Total previsto<strong>{brl.format(paid+pending)}</strong></span></div></div>
    <div className="cards-list">{finance.state.bills.map(b => <article className="bill-card" key={b.id}><div className="date-box"><strong>{String(b.due_day).padStart(2,"0")}</strong><span>DIA</span></div><div className="bill-card-main"><div><strong>{b.name}</strong><span>{b.category} · {b.responsible}{b.recurring ? " · Recorrente" : ""}</span></div><strong>{brl.format(b.amount)}</strong></div><span className={cn("status-badge", b.status)}>{b.status === "paid" ? "Pago" : "Pendente"}</span><button className="secondary-button small" onClick={() => void finance.updateBill(b.id, { status: b.status === "paid" ? "pending" : "paid" })}>{b.status === "paid" ? "Marcar pendente" : "Marcar pago"}</button><button className="icon-button danger" onClick={() => void finance.deleteBill(b.id)}><Trash2 size={17} /></button></article>)}</div>
    {modal && <BillModal finance={finance} close={() => setModal(false)} />}
  </>;
}

function BillModal({ finance, close }: { finance: FinanceHook; close: () => void }) {
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const fd = new FormData(e.currentTarget); await finance.addBill({ name: String(fd.get("name")), amount: Number(fd.get("amount")), due_day: Number(fd.get("due_day")), category: String(fd.get("category")), responsible: String(fd.get("responsible")), status: "pending", recurring: fd.get("recurring") === "on" }); close(); }
  return <Modal title="Nova conta" subtitle="Cadastre uma conta mensal ou pontual." close={close}><form className="form-grid" onSubmit={submit}><Field label="Nome da conta"><input name="name" placeholder="Ex.: Energia" required /></Field><Field label="Valor previsto"><input name="amount" type="number" min="0.01" step="0.01" required /></Field><Field label="Dia do vencimento"><input name="due_day" type="number" min="1" max="31" required /></Field><Field label="Categoria"><Select name="category" values={categories} /></Field><Field label="Responsável"><Select name="responsible" values={owners} /></Field><label className="check-field"><input name="recurring" type="checkbox" defaultChecked /><span>Repetir todo mês</span></label><div className="form-actions span-2"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button">Salvar conta</button></div></form></Modal>;
}

function CardsView({ finance }: { finance: FinanceHook }) {
  const [cardModal, setCardModal] = useState(false); const [purchaseModal, setPurchaseModal] = useState(false);
  function used(cardId: string) {
    const currentIndex = today.getFullYear() * 12 + today.getMonth();
    return finance.state.purchases
      .filter((p) => p.card_id === cardId)
      .reduce((sum, purchase) => {
        const purchaseDate = safeDate(purchase.purchase_date);
        const purchaseIndex = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth();
        const monthsSincePurchase = currentIndex - purchaseIndex;
        const activeInstallment = monthsSincePurchase >= 0 && monthsSincePurchase < purchase.installments;
        return activeInstallment ? sum + Number(purchase.amount) / Math.max(1, purchase.installments) : sum;
      }, 0);
  }
  return <>
    <SectionHeader eyebrow="CRÉDITO DO CASAL" title="Cartões e faturas" description="Visualize limites, faturas estimadas e compras parceladas." action={<div className="button-row"><button className="secondary-button" onClick={() => setCardModal(true)}><Plus size={18} /> Cartão</button><button className="primary-button" onClick={() => setPurchaseModal(true)}><Plus size={18} /> Compra</button></div>} />
    <div className="credit-grid">{finance.state.cards.map(card => { const amount = used(card.id); const pct = Math.min(100, amount/card.limit_amount*100); return <article className="credit-card-ui" key={card.id}><div className="credit-top"><div><span>{card.name}</span><strong>{card.holder}</strong></div><CreditCard size={28} /></div><div className="credit-number">•••• •••• •••• {card.id.slice(-4).toUpperCase()}</div><div className="credit-bottom"><div><span>Fatura estimada</span><strong>{brl.format(amount)}</strong></div><div><span>Limite</span><strong>{brl.format(card.limit_amount)}</strong></div></div><div className="credit-progress"><div style={{width:`${pct}%`}} /></div><div className="credit-footer">Fecha dia {card.closing_day} · Vence dia {card.due_day}<button className="icon-button light" onClick={() => void finance.deleteCard(card.id)}><Trash2 size={16} /></button></div></article>; })}</div>
    <article className="panel"><div className="panel-title"><div><span className="page-kicker">COMPRAS</span><h3>Compras no crédito</h3></div></div><div className="purchase-list">{finance.state.purchases.length ? finance.state.purchases.map(p => { const card = finance.state.cards.find(c=>c.id===p.card_id); return <div className="purchase-row" key={p.id}><div className="transaction-icon expense"><CreditCard size={18}/></div><div><strong>{p.description}</strong><span>{card?.name ?? "Cartão"} · {p.category}</span></div><span>{p.installments}x de {brl.format(p.amount/p.installments)}</span><strong>{brl.format(p.amount)}</strong><button className="icon-button danger" onClick={() => void finance.deletePurchase(p.id)}><Trash2 size={17}/></button></div>; }) : <Empty text="Nenhuma compra cadastrada." />}</div></article>
    {cardModal && <CardModal finance={finance} close={()=>setCardModal(false)} />}{purchaseModal && <PurchaseModal finance={finance} close={()=>setPurchaseModal(false)} />}
  </>;
}

function CardModal({ finance, close }: { finance: FinanceHook; close: () => void }) { async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const fd = new FormData(e.currentTarget); await finance.addCard({ name:String(fd.get("name")), brand:String(fd.get("brand")), limit_amount:Number(fd.get("limit")), closing_day:Number(fd.get("closing")), due_day:Number(fd.get("due")), holder:String(fd.get("holder")) }); close(); } return <Modal title="Novo cartão" subtitle="Cadastre um cartão usado pela família." close={close}><form className="form-grid" onSubmit={submit}><Field label="Nome"><input name="name" placeholder="Ex.: Nubank" required /></Field><Field label="Bandeira"><input name="brand" placeholder="Visa, Mastercard..." required /></Field><Field label="Limite"><input name="limit" type="number" min="1" step="0.01" required /></Field><Field label="Titular"><Select name="holder" values={owners.filter(o=>o!=="Casal")} /></Field><Field label="Dia do fechamento"><input name="closing" type="number" min="1" max="31" required /></Field><Field label="Dia do vencimento"><input name="due" type="number" min="1" max="31" required /></Field><div className="form-actions span-2"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button">Salvar cartão</button></div></form></Modal>; }

function PurchaseModal({ finance, close }: { finance: FinanceHook; close: () => void }) { async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const fd = new FormData(e.currentTarget); await finance.addPurchase({ card_id:String(fd.get("card")), description:String(fd.get("description")), amount:Number(fd.get("amount")), installments:Number(fd.get("installments")), purchase_date:String(fd.get("date")), category:String(fd.get("category")) }); close(); } return <Modal title="Nova compra" subtitle="Registre uma compra no cartão, inclusive parcelada." close={close}><form className="form-grid" onSubmit={submit}><Field label="Descrição"><input name="description" placeholder="Ex.: Geladeira" required /></Field><Field label="Cartão"><select name="card" required>{finance.state.cards.map(c=><option key={c.id} value={c.id}>{c.name} · {c.holder}</option>)}</select></Field><Field label="Valor total"><input name="amount" type="number" min="0.01" step="0.01" required /></Field><Field label="Parcelas"><input name="installments" type="number" min="1" max="60" defaultValue="1" required /></Field><Field label="Categoria"><Select name="category" values={categories} /></Field><Field label="Data da compra"><input name="date" type="date" defaultValue={today.toISOString().slice(0,10)} required /></Field><div className="form-actions span-2"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button">Salvar compra</button></div></form></Modal>; }

function BudgetsView({ finance }: { finance: FinanceHook }) {
  const [modal,setModal]=useState(false); const monthExpenses=finance.state.transactions.filter(t=>t.type==="expense"&&monthMatch(t.date));
  return <><SectionHeader eyebrow="PLANEJAMENTO" title="Orçamento mensal" description="Defina limites por categoria e acompanhe o consumo do orçamento." action={<button className="primary-button" onClick={()=>setModal(true)}><Plus size={18}/> Novo limite</button>} />
  <div className="budget-grid">{finance.state.budgets.map(b=>{ const spent=monthExpenses.filter(t=>t.category===b.category).reduce((s,t)=>s+Number(t.amount),0); const pct=Math.min(100,spent/b.limit_amount*100); return <article className="budget-card" key={b.id}><div className="budget-head"><div><span>{b.category}</span><strong>{brl.format(spent)} <small>de {brl.format(b.limit_amount)}</small></strong></div><span className={cn("budget-percent", pct>90&&"danger")}>{Math.round(pct)}%</span></div><div className="budget-track"><div className={pct>90?"danger":""} style={{width:`${pct}%`}} /></div><div className="budget-foot"><span>{brl.format(Math.max(0,b.limit_amount-spent))} disponível</span><button className="icon-button danger" onClick={()=>void finance.deleteBudget(b.id)}><Trash2 size={16}/></button></div></article>;})}</div>
  {modal&&<BudgetModal finance={finance} close={()=>setModal(false)}/>}</>;
}

function BudgetModal({finance,close}:{finance:FinanceHook;close:()=>void}){async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);await finance.addBudget({category:String(fd.get("category")),limit_amount:Number(fd.get("limit")),month:currentMonth});close();}return <Modal title="Novo limite" subtitle="Crie um teto de gastos para uma categoria." close={close}><form className="form-grid" onSubmit={submit}><Field label="Categoria"><Select name="category" values={categories}/></Field><Field label="Limite do mês"><input name="limit" type="number" min="1" step="0.01" required/></Field><div className="form-actions span-2"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button">Salvar limite</button></div></form></Modal>}

function GoalsView({ finance }: { finance: FinanceHook }) { const[modal,setModal]=useState(false); const[depositGoal,setDepositGoal]=useState<Goal|null>(null); return <><SectionHeader eyebrow="SONHOS DO CASAL" title="Metas financeiras" description="Transformem objetivos em planos visíveis e acompanhem cada avanço." action={<button className="primary-button" onClick={()=>setModal(true)}><Plus size={18}/> Nova meta</button>}/><div className="goals-grid">{finance.state.goals.map(g=>{const pct=Math.min(100,g.current_amount/g.target_amount*100);return <article className="goal-card" key={g.id}><div className="goal-icon"><Target size={22}/></div><div className="goal-title"><strong>{g.name}</strong><button className="icon-button danger" onClick={()=>void finance.deleteGoal(g.id)}><Trash2 size={16}/></button></div><div className="goal-values"><strong>{brl.format(g.current_amount)}</strong><span>de {brl.format(g.target_amount)}</span></div><div className="goal-track"><div style={{width:`${pct}%`}}/></div><div className="goal-meta"><span>{Math.round(pct)}% alcançado</span><span>Faltam {brl.format(Math.max(0,g.target_amount-g.current_amount))}</span></div><button className="secondary-button full" onClick={()=>setDepositGoal(g)}>Adicionar valor</button></article>})}</div>{modal&&<GoalModal finance={finance} close={()=>setModal(false)}/>} {depositGoal&&<DepositModal finance={finance} goal={depositGoal} close={()=>setDepositGoal(null)}/>}</> }

function GoalModal({finance,close}:{finance:FinanceHook;close:()=>void}){async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);await finance.addGoal({name:String(fd.get("name")),target_amount:Number(fd.get("target")),current_amount:Number(fd.get("current")||0),target_date:String(fd.get("date"))||null,icon:"target"});close();}return <Modal title="Nova meta" subtitle="Defina um objetivo e um valor para alcançar juntos." close={close}><form className="form-grid" onSubmit={submit}><Field label="Nome da meta"><input name="name" placeholder="Ex.: Viagem do casal" required/></Field><Field label="Valor da meta"><input name="target" type="number" min="1" step="0.01" required/></Field><Field label="Valor já guardado"><input name="current" type="number" min="0" step="0.01" defaultValue="0"/></Field><Field label="Data desejada"><input name="date" type="date"/></Field><div className="form-actions span-2"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button">Criar meta</button></div></form></Modal>}

function DepositModal({finance,goal,close}:{finance:FinanceHook;goal:Goal;close:()=>void}){async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);const amount=Number(fd.get("amount"));await finance.updateGoal(goal.id,{current_amount:Number(goal.current_amount)+amount});close();}return <Modal title="Adicionar à meta" subtitle={goal.name} close={close}><form className="form-grid" onSubmit={submit}><Field label="Valor do depósito"><input name="amount" type="number" min="0.01" step="0.01" required autoFocus/></Field><div className="form-actions span-2"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button">Adicionar valor</button></div></form></Modal>}

function ReportsView({ finance }: { finance: FinanceHook }) {
  const tx=finance.state.transactions.filter(t=>monthMatch(t.date)); const income=tx.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0); const expense=tx.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  const byOwner=owners.map(o=>({owner:o,value:tx.filter(t=>t.type==="expense"&&t.owner===o).reduce((s,t)=>s+Number(t.amount),0)})).sort((a,b)=>b.value-a.value); const max=Math.max(...byOwner.map(x=>x.value),1);
  const categoriesReport=categories.map(c=>({category:c,value:tx.filter(t=>t.type==="expense"&&t.category===c).reduce((s,t)=>s+Number(t.amount),0)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  return <><SectionHeader eyebrow="ANÁLISE DO MÊS" title="Relatórios financeiros" description="Entenda para onde o dinheiro foi e como cada área do orçamento se comportou." />
  <div className="report-summary"><div><TrendingUp size={22}/><span>Receitas<strong>{brl.format(income)}</strong></span></div><div><TrendingDown size={22}/><span>Despesas<strong>{brl.format(expense)}</strong></span></div><div><WalletCards size={22}/><span>Resultado<strong>{brl.format(income-expense)}</strong></span></div><div><PiggyBank size={22}/><span>Taxa de sobra<strong>{income?`${Math.round((income-expense)/income*100)}%`:`0%`}</strong></span></div></div>
  <div className="dashboard-grid"><article className="panel"><div className="panel-title"><div><span className="page-kicker">CATEGORIAS</span><h3>Detalhamento de despesas</h3></div></div><div className="report-table">{categoriesReport.map(r=><div key={r.category}><span>{r.category}</span><strong>{brl.format(r.value)}</strong><span>{expense?Math.round(r.value/expense*100):0}%</span></div>)}</div></article><article className="panel"><div className="panel-title"><div><span className="page-kicker">RESPONSÁVEL</span><h3>Gastos registrados por pessoa</h3></div></div><div className="owner-bars">{byOwner.map(r=><div key={r.owner}><div><span>{r.owner}</span><strong>{brl.format(r.value)}</strong></div><div className="bar-track"><div className="bar-fill" style={{width:`${Math.max(4,r.value/max*100)}%`}}/></div></div>)}</div></article></div>
  <article className="panel report-note"><ShieldCheck size={25}/><div><strong>Leitura rápida</strong><p>{income-expense>=0?`Vocês encerrariam o mês com uma sobra de ${brl.format(income-expense)} considerando os lançamentos atuais.`:`Os gastos registrados superam as entradas em ${brl.format(Math.abs(income-expense))}. Revejam categorias e contas pendentes.`}</p></div></article></>;
}

function SettingsView({ finance }: { finance: FinanceHook }) { const[name,setName]=useState(finance.state.household?.name??""); const[code,setCode]=useState(""); const[msg,setMsg]=useState(""); return <><SectionHeader eyebrow="PREFERÊNCIAS" title="Configurações da família" description="Gerencie o nome da casa, convide seu par e veja o status da conexão."/><div className="settings-grid"><article className="panel settings-card"><div className="settings-icon"><Home size={22}/></div><div><h3>Nome da família financeira</h3><p>Este nome aparece no menu e identifica o espaço compartilhado.</p><div className="inline-form"><input value={name} onChange={e=>setName(e.target.value)}/><button className="primary-button" onClick={async()=>{await finance.renameHousehold(name);setMsg("Nome atualizado.")}}>Salvar</button></div></div></article><article className="panel settings-card"><div className="settings-icon"><UsersRound size={22}/></div><div><h3>Conectar o casal</h3><p>Seu par pode criar uma conta e entrar na mesma família usando o código.</p><div className="invite-code"><span>Código da família</span><strong>{finance.state.household?.invite_code??"—"}</strong></div><div className="inline-form"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Código recebido"/><button className="secondary-button" onClick={async()=>{try{await finance.joinHousehold(code);setMsg("Família conectada com sucesso.")}catch(e){setMsg(e instanceof Error?e.message:"Não foi possível conectar.")}}}>Entrar com código</button></div></div></article><article className="panel settings-card"><div className="settings-icon"><ShieldCheck size={22}/></div><div><h3>Status da conexão</h3><p>{finance.configured?"Supabase configurado. Os dados são sincronizados com o banco online.":"Modo demonstração. Os dados ficam somente neste navegador."}</p><span className={cn("connection-badge",finance.configured&&"online")}>{finance.configured?"Banco conectado":"Banco não configurado"}</span></div></article><article className="panel settings-card"><div className="settings-icon"><UserRound size={22}/></div><div><h3>Sessão</h3><p>Encerre o acesso neste dispositivo quando necessário.</p><button className="secondary-button" onClick={()=>void finance.signOut()}><LogOut size={17}/> Sair da conta</button></div></article></div>{msg&&<div className="toast-message">{msg}</div>}</> }

function Modal({ title, subtitle, close, children }: { title: string; subtitle?: string; close: () => void; children: ReactNode }) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={close}><X size={20}/></button></div>{children}</div></div>; }
function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
function Select({name,values}:{name:string;values:string[]}){return <select name={name}>{values.map(v=><option key={v} value={v}>{v}</option>)}</select>}
function Empty({text}:{text:string}){return <div className="empty-state"><WalletCards size={28}/><span>{text}</span></div>}
