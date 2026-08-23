"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, CreditCard, Plus, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { formatCurrency } from "@/lib/format";

type DashboardData = {
  income: number;
  expenses: number;
  previousBalance: number;
  balance: number;
  cashFlow: Array<{ label: string; receitas: number; despesas: number }>;
  categories: Array<{ name: string; value: number; color: string }>;
  expenseItems: Array<{ type: "card" | "store" | "direct"; id: string; name: string; subtitle: string; amount: number; date: string }>;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);
const EMPTY: DashboardData = { income: 0, expenses: 0, previousBalance: 0, balance: 0, cashFlow: [], categories: [], expenseItems: [] };

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [month, setMonth] = useState(currentMonth);
  useEffect(() => {
    fetch(`/api/dashboard?month=${month}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : EMPTY)
      .then(setData)
      .catch(() => setData(EMPTY));
  }, [month]);
  const totalCategories = data.categories.reduce((total, item) => total + item.value, 0);
  const largestCategory = Math.max(...data.categories.map((item) => item.value), 1);
  let accumulated = 0;
  const donut = totalCategories ? `conic-gradient(${data.categories.map((category) => {
    const start = accumulated;
    accumulated += category.value / totalCategories * 100;
    return `${category.color} ${start}% ${accumulated}%`;
  }).join(",")})` : "#e7edf0";

  return <>
    <PageHeader title="Olá! 👋" subtitle="Acompanhe como estão as finanças da sua família." />
    <div className="toolbar"><PeriodFilter value={month} onChange={setMonth} /><Link href="/financeiro?novo=1" className="primary-button"><Plus size={16} /> Novo lançamento</Link></div>
    <section className="report-summary dashboard-summary" aria-label="Resumo financeiro">
      <article className="summary-card balance"><div className="summary-icon"><CircleDollarSign /></div><div><small>Saldo atual</small><strong>{formatCurrency(data.balance)}</strong></div></article>
      <article className="summary-card"><div className="summary-icon income"><ArrowDownLeft /></div><div><small>Receitas</small><strong>{formatCurrency(data.income)}</strong></div></article>
      <article className="summary-card"><div className="summary-icon expense"><ArrowUpRight /></div><div><small>Despesas</small><strong>{formatCurrency(data.expenses)}</strong></div></article>
    </section>
    <section className="dashboard-grid">
      <article className="panel cashflow-panel">
        <div className="panel-heading"><div><h2>Receitas e despesas</h2><p>Lançamentos originais do mês</p></div><div className="legend"><span className="income-dot" />Receitas <span className="expense-dot" />Despesas</div></div>
        <div className="recharts-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.cashFlow} margin={{ top: 15, right: 5, left: -18, bottom: 0 }}><defs><linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16A085" stopOpacity={0.28} /><stop offset="100%" stopColor="#16A085" stopOpacity={0} /></linearGradient><linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.16} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#E8EDF1" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #E8EDF1", fontSize: 11 }} /><Area type="monotone" dataKey="receitas" stroke="#16A085" strokeWidth={3} fill="url(#greenGradient)" /><Area type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={2.5} fill="url(#redGradient)" /></AreaChart></ResponsiveContainer></div>
      </article>
      <article className="panel category-panel">
        <div className="panel-heading"><div><h2>Gastos por categoria</h2><p>{totalCategories ? "Despesas originais do mês" : "Nenhuma despesa cadastrada"}</p></div></div>
        <div className="donut-wrap"><div className="donut" style={{ background: donut }}><span><small>Total gasto</small><strong>{formatCurrency(totalCategories)}</strong></span></div><div className="category-legend">{data.categories.slice(0, 4).map((category) => <p key={category.name}><i style={{ background: category.color }} />{category.name}<strong>{Math.round(category.value / totalCategories * 100)}%</strong></p>)}</div></div>
      </article>
    </section>
    <section className="bottom-grid">
      <article className="panel open-expenses-panel"><div className="panel-heading"><div><h2>Gastos do período</h2><p>Compras e despesas originais cadastradas no mês</p></div></div><div className="open-expense-list">{data.expenseItems.slice(0, 6).map((item) => { const content = <><span className="open-expense-image">{item.type === "card" ? <CreditCard /> : <Store />}</span><div><p><strong>{item.name}</strong><span>{formatCurrency(item.amount)}</span></p><small>{item.subtitle}</small></div></>; return item.type === "direct" ? <div className="open-expense-row" key={`${item.type}-${item.id}`}>{content}</div> : <Link href={`/${item.type === "card" ? "cartoes" : "comercios"}/${item.id}`} className="open-expense-row" key={`${item.type}-${item.id}`}>{content}</Link>; })}</div></article>
      <article className="panel alerts-panel"><div className="panel-heading"><div><h2>Próximos vencimentos</h2><p>Nenhuma conta cadastrada</p></div><span className="alert-count">0 avisos</span></div><Link href="/contas" className="secondary-button">Ver todas as contas</Link></article>
    </section>
    <section className="panel module-section"><div className="panel-heading"><div><h2>Análise por categoria</h2><p>Compare rapidamente onde sua família gasta mais e menos</p></div><Link className="text-button" href="/relatorios">Explorar relatório →</Link></div><div className="category-bars">{data.categories.map((category) => <div key={category.name}><span>{category.name}</span><i><b style={{ height: `${Math.max(18, category.value / largestCategory * 100)}%`, background: category.color }} /></i><strong>{formatCurrency(category.value)}</strong></div>)}</div></section>
  </>;
}
