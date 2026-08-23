"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Plus } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { ProgressBar } from "@/components/ui";
import { cashFlow, categories } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/format";

const totalCategories = categories.reduce((total, item) => total + item.value, 0);

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Olá! 👋" subtitle="Acompanhe como estão as finanças da sua família." />
      <div className="toolbar"><PeriodFilter /><Link href="/financeiro?novo=1" className="primary-button"><Plus size={16} /> Novo lançamento</Link></div>

      <section className="summary-grid" aria-label="Resumo financeiro">
        <article className="summary-card balance"><div className="summary-icon"><CircleDollarSign /></div><div><small>Saldo atual</small><strong>{formatCurrency(0)}</strong></div></article>
        <article className="summary-card"><div className="summary-icon income"><ArrowDownLeft /></div><div><small>Receitas</small><strong>{formatCurrency(0)}</strong></div></article>
        <article className="summary-card"><div className="summary-icon expense"><ArrowUpRight /></div><div><small>Despesas</small><strong>{formatCurrency(0)}</strong></div></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel cashflow-panel">
          <div className="panel-heading"><div><h2>Receitas e despesas</h2><p>Evolução do mês</p></div><div className="legend"><span className="income-dot" />Receitas <span className="expense-dot" />Despesas</div></div>
          <div className="recharts-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlow} margin={{ top: 15, right: 5, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16A085" stopOpacity={0.28} /><stop offset="100%" stopColor="#16A085" stopOpacity={0} /></linearGradient>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.16} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#E8EDF1" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `R$ ${value / 1000} mil`} tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #E8EDF1", fontSize: 11, boxShadow: "0 8px 24px #17203318" }} />
                <Area type="monotone" dataKey="receitas" stroke="#16A085" strokeWidth={3} fill="url(#greenGradient)" />
                <Area type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={2.5} fill="url(#redGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel category-panel">
          <div className="panel-heading"><div><h2>Gastos por categoria</h2><p>Nenhum lançamento registrado</p></div></div>
          <div className="donut-wrap">
            <div className="donut"><span><small>Total gasto</small><strong>{formatCurrency(totalCategories)}</strong></span></div>
            <div className="category-legend">{categories.slice(0, 4).map((category) => <p key={category.name}><i style={{ background: category.color }} />{category.name}<strong>{Math.round(category.value / totalCategories * 100)}%</strong></p>)}</div>
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel category-list">
          <div className="panel-heading"><div><h2>Detalhamento das categorias</h2><p>Onde sua família mais gastou</p></div><Link className="text-button" href="/relatorios">Ver relatório completo →</Link></div>
          <div className="category-rows">{categories.slice(0, 4).map((category) => { const percent = category.value / totalCategories * 100; return <div className="category-row" key={category.name}><span className="category-icon" style={{ color: category.color, background: `${category.color}18` }}>●</span><div><p><strong>{category.name}</strong><span>{formatCurrency(category.value)}</span></p><ProgressBar value={percent} color={category.color} /></div><b>{Math.round(percent)}%</b></div>; })}</div>
        </article>
        <article className="panel alerts-panel">
          <div className="panel-heading"><div><h2>Próximos vencimentos</h2><p>Nenhuma conta cadastrada</p></div><span className="alert-count">0 avisos</span></div>
          <Link href="/contas" className="secondary-button">Ver todas as contas</Link>
        </article>
      </section>
      <section className="panel module-section">
        <div className="panel-heading"><div><h2>Análise por categoria</h2><p>Compare rapidamente onde sua família gasta mais e menos</p></div><Link className="text-button" href="/relatorios">Explorar relatório →</Link></div>
        <div className="category-bars">{categories.map((category) => <div key={category.name}><span>{category.name}</span><i><b style={{ height: `${Math.max(18, category.value / 1450 * 100)}%`, background: category.color }} /></i><strong>{formatCurrency(category.value)}</strong></div>)}</div>
      </section>
    </>
  );
}
