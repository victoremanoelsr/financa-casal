"use client";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, CalendarDays, ChevronDown, ChevronRight, CircleDollarSign, CreditCard, Landmark, ReceiptText, Repeat2, Store, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/app-shell";
import { formatCurrency, formatDate } from "@/lib/format";

type Movement = { id: string; type: "income" | "expense"; title: string; subtitle: string; origin: string; amount: number; date: string; href: string };
type DashboardData = { userName: string; income: number; expenses: number; previousBalance: number; balance: number; cashFlow: Array<{ day: number; label: string; receitas: number; despesas: number }>; categories: Array<{ name: string; value: number; color: string }>; upcoming: Array<{ id: string; title: string; origin: string; dueDate: string; remaining: number; href: string }>; movements: Movement[] };
const EMPTY: DashboardData = { userName: "", income: 0, expenses: 0, previousBalance: 0, balance: 0, cashFlow: [], categories: [], upcoming: [], movements: [] };
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; };
const iconFor = (origin: string) => origin === "Cartão" ? CreditCard : origin === "Comércio" ? Store : origin === "Assinatura" ? Repeat2 : origin === "Despesa fixa" ? ReceiptText : origin === "Financeiro" ? WalletCards : Landmark;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY); const [month, setMonth] = useState(currentMonth); const [periodOpen, setPeriodOpen] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/dashboard?month=${month}`, { cache: "no-store" }).then(async (response) => response.ok ? response.json() : EMPTY).then(setData).catch(() => setData(EMPTY)).finally(() => setLoading(false)); }, [month]);
  const [year, monthNumber] = month.split("-").map(Number); const years = useMemo(() => Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index), []);
  const totalCategories = data.categories.reduce((total, item) => total + item.value, 0); let accumulated = 0;
  const donut = totalCategories ? `conic-gradient(${data.categories.map((item) => { const start = accumulated; accumulated += item.value / totalCategories * 100; return `${item.color} ${start}% ${accumulated}%`; }).join(",")})` : "#e7edf0";
  const selectPeriod = (nextMonth: number, nextYear: number) => { setLoading(true); setMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`); };
  return <div className="dashboard-page">
    <section className="dashboard-header-row">
      <div className="dashboard-greeting">
        <h1>Olá, {data.userName || "Victor"}! 👋</h1>
        <p>Acompanhe como estão as finanças da sua família.</p>
      </div>
      <div className="dashboard-period">
        <button
          className="dashboard-period-btn"
          onClick={() => setPeriodOpen((open) => !open)}
          aria-expanded={periodOpen}
        >
          <CalendarDays size={16} />
          <span>{MONTHS[monthNumber - 1]} {year}</span>
          <ChevronDown size={15} />
        </button>
        {periodOpen && (
          <div className="dashboard-period-popover">
            <div className="popover-fields">
              <label>
                <span>Mês</span>
                <select
                  value={monthNumber}
                  onChange={(event) => selectPeriod(Number(event.target.value), year)}
                >
                  {MONTHS.map((name, index) => (
                    <option value={index + 1} key={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Ano</span>
                <select
                  value={year}
                  onChange={(event) => selectPeriod(monthNumber, Number(event.target.value))}
                >
                  {years.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="popover-apply-btn" onClick={() => setPeriodOpen(false)}>
              Aplicar período
            </button>
          </div>
        )}
      </div>
    </section>

    {/* CARDS PRINCIPAIS: SALDO, ENTRADAS, SAÍDAS */}
    <section className="dashboard-kpis-vibrant" aria-label="Resumo financeiro">
      <article className="kpi-card-vibrant balance">
        <div className="kpi-top">
          <span className="kpi-icon-vibrant balance">
            <WalletCards size={20} strokeWidth={2.2} />
          </span>
          <div className="kpi-meta">
            <small>Saldo</small>
            <strong>{formatCurrency(data.balance)}</strong>
          </div>
        </div>
        <span className="kpi-subtext">
          Saldo atual <span title={`Saldo inicial do mês anterior: ${formatCurrency(data.previousBalance)}`}>ⓘ</span>
        </span>
      </article>

      <article className="kpi-card-vibrant income">
        <div className="kpi-top">
          <span className="kpi-icon-vibrant income">
            <ArrowDownToLine size={20} strokeWidth={2.2} />
          </span>
          <div className="kpi-meta">
            <small>Entradas</small>
            <strong className="income-amount">{formatCurrency(data.income)}</strong>
          </div>
        </div>
        <span className="kpi-subtext">Total no mês</span>
      </article>

      <article className="kpi-card-vibrant expense">
        <div className="kpi-top">
          <span className="kpi-icon-vibrant expense">
            <ArrowUpRight size={20} strokeWidth={2.2} />
          </span>
          <div className="kpi-meta">
            <small>Saídas</small>
            <strong className="expense-amount">{formatCurrency(data.expenses)}</strong>
          </div>
        </div>
        <span className="kpi-subtext">Total no mês</span>
      </article>
    </section>

    {/* GRÁFICO 1: RECEITAS E DESPESAS */}
    <section className="panel-vibrant cashflow-section">
      <div className="section-head-vibrant">
        <div>
          <h2>Receitas e despesas</h2>
          <p>Acompanhe a evolução durante o mês</p>
        </div>
        <div className="legend-vibrant">
          <span className="legend-item"><i className="dot income" /> Entradas</span>
          <span className="legend-item"><i className="dot expense" /> Saídas</span>
        </div>
      </div>

      {data.cashFlow.length ? (
        <div className="chart-wrapper-vibrant">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={data.cashFlow} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="vibrantIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00c882" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00c882" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="vibrantExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4d4d" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ff4d4d" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f0f3f6" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                interval={Math.max(1, Math.floor(data.cashFlow.length / 5))}
                tickFormatter={(value) => `${value} ${MONTHS[monthNumber - 1].slice(0, 3)}`}
                tick={{ fontSize: 10, fill: "#8fa0ad", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) =>
                  Number(value) >= 1000
                    ? `R$ ${(Number(value) / 1000).toFixed(0)} mil`
                    : `R$ ${value}`
                }
                tick={{ fontSize: 9, fill: "#9aaab7" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), ""]}
                labelFormatter={(label) => `Dia ${label}`}
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid #e1e8ed",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <Area
                type="monotone"
                dataKey="receitas"
                name="Entradas"
                stroke="#00c882"
                strokeWidth={3}
                fill="url(#vibrantIncome)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="despesas"
                name="Saídas"
                stroke="#ff4d4d"
                strokeWidth={3}
                fill="url(#vibrantExpense)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="dashboard-empty-vibrant">
          <WalletCards size={36} />
          <strong>Nenhuma movimentação neste período.</strong>
          <p>O gráfico aparecerá automaticamente quando houver entradas ou saídas.</p>
        </div>
      )}
    </section>

    {/* GRÁFICO 2: GASTOS POR CATEGORIA */}
    <section className="panel-vibrant category-section">
      <div className="section-head-vibrant">
        <div>
          <h2>Gastos por categoria</h2>
          <p>Distribuição das despesas do mês</p>
        </div>
      </div>

      {totalCategories ? (
        <div className="category-layout-vibrant">
          <div className="donut-box-vibrant">
            <div className="donut-circle-vibrant" style={{ background: donut }}>
              <div className="donut-center-vibrant">
                <small>Total gasto</small>
                <strong>{formatCurrency(totalCategories)}</strong>
              </div>
            </div>
          </div>

          <div className="category-list-vibrant">
            {data.categories.map((item) => (
              <div className="category-item-vibrant" key={item.name}>
                <div className="category-item-name">
                  <i style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <strong className="category-val">{formatCurrency(item.value)}</strong>
                <span className="category-pct">
                  {(item.value / totalCategories * 100).toFixed(1).replace(".", ",")}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="dashboard-empty-vibrant compact">
          <CircleDollarSign size={24} />
          <strong>Nenhuma saída neste período.</strong>
        </div>
      )}
    </section>

    {/* PRÓXIMOS VENCIMENTOS */}
    <section className="panel-vibrant upcoming-section">
      <div className="section-head-vibrant">
        <div>
          <h2>Próximos vencimentos</h2>
          <p>Contas que vencem nos próximos 10 dias</p>
        </div>
        {data.upcoming.length > 0 && (
          <span className="badge-upcoming">
            {data.upcoming.length} {data.upcoming.length === 1 ? "próximo" : "próximos"}
          </span>
        )}
      </div>

      {data.upcoming.length ? (
        <div className="list-vibrant">
          {data.upcoming.map((item) => {
            const Icon = iconFor(item.origin);
            return (
              <Link href={item.href} className="row-vibrant" key={item.id}>
                <div className="row-left">
                  <span className={`icon-bubble ${item.origin === "Cartão" ? "purple" : item.origin === "Comércio" ? "orange" : "blue"}`}>
                    <Icon size={18} />
                  </span>
                  <div className="row-text">
                    <strong>{item.title}</strong>
                    <small>Vence em {item.dueDate.split("-").reverse().slice(0, 2).join("/")}</small>
                  </div>
                </div>
                <div className="row-right">
                  <b>{formatCurrency(item.remaining)}</b>
                  <ChevronRight size={17} className="chevron" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-empty-vibrant compact">
          <CalendarDays size={24} />
          <strong>Nenhum vencimento nos próximos 10 dias.</strong>
        </div>
      )}

      <Link href="/contas" className="footer-link-vibrant">
        Ver todas as contas <ChevronRight size={15} />
      </Link>
    </section>

    {/* HISTÓRICO DE MOVIMENTAÇÕES */}
    <section className="panel-vibrant movements-section">
      <div className="section-head-vibrant">
        <div>
          <h2>Histórico de movimentações</h2>
          <p>Últimas movimentações do mês</p>
        </div>
        <Link href={`/financeiro?month=${month}`} className="link-action-vibrant">
          Ver todo histórico
        </Link>
      </div>

      {data.movements.length ? (
        <div className="list-vibrant">
          {data.movements.map((item) => {
            const Icon = item.type === "income" ? ArrowDownToLine : iconFor(item.origin);
            const isIncome = item.type === "income";
            return (
              <Link href={item.href} className="row-vibrant" key={item.id}>
                <div className="row-left">
                  <span className={`icon-bubble ${isIncome ? "green" : item.origin === "Cartão" ? "purple" : item.origin === "Comércio" ? "orange" : "teal"}`}>
                    <Icon size={18} />
                  </span>
                  <span className="movement-day-vibrant">
                    {item.date.split("-").reverse().slice(0, 2).join("/")}
                  </span>
                  <div className="row-text">
                    <strong>{item.title}</strong>
                    <small>{item.subtitle || item.origin}</small>
                  </div>
                </div>
                <div className="row-right">
                  <b className={isIncome ? "positive-val" : "negative-val"}>
                    {isIncome ? "+ " : "- "}
                    {formatCurrency(item.amount)}
                  </b>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-empty-vibrant compact">
          <ReceiptText size={24} />
          <strong>Nenhuma movimentação neste período.</strong>
        </div>
      )}
    </section>

    {loading && <div className="loading-bar-vibrant" aria-label="Carregando..." />}
  </div>;
}
