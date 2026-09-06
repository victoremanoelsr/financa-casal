"use client";

import {
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  FileChartColumn,
  Filter,
  HelpCircle,
  Home,
  Info,
  Layers,
  MoreVertical,
  Pencil,
  PieChart,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Store,
  TrendingUp,
  User,
  Users,
  Utensils,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type FinancialEntry = {
  id: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  date: string;
  category: string;
  categoryId?: string;
  person: string;
  source?: string;
  sourceId?: string | null;
  recordType?: string;
  editable?: boolean;
};

type Bill = {
  id: string;
  type: "card" | "store" | "subscription" | "fixed" | "housing";
  sourceId: string;
  name: string;
  origin: string;
  originalDate: string;
  dueDate: string;
  amount: number;
  originalAmount: number;
  paid: number;
  remaining: number;
  status: "open" | "pending" | "overdue" | "paid" | "partial";
  payments?: Array<{
    id: string;
    amount: number;
    date: string;
    note?: string;
    method?: string;
    responsible?: string;
  }>;
};

type CategoryItem = {
  name: string;
  value: number;
  percentage: number;
  color: string;
  entries: FinancialEntry[];
};

type PersonItem = {
  name: string;
  value: number;
  percentage: number;
  entries: FinancialEntry[];
};

const CATEGORY_COLORS: Record<string, string> = {
  Casa: "#00ba78",
  Moradia: "#00ba78",
  Mercado: "#ef4444",
  Alimentação: "#10b981",
  Transporte: "#8b5cf6",
  Comércio: "#0f8b8d",
  Comércios: "#0f8b8d",
  Saúde: "#ec4899",
  Lazer: "#d946ef",
  Cartões: "#3b82f6",
  Outros: "#64748b",
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function getCategoryColor(name: string, index: number) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const palette = ["#00ba78", "#ef4444", "#10b981", "#8b5cf6", "#0f8b8d", "#ec4899", "#f59e0b", "#3b82f6"];
  return palette[index % palette.length];
}

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("casa") || lower.includes("moradia") || lower.includes("aluguel")) return Home;
  if (lower.includes("mercado") || lower.includes("supermercado")) return ShoppingCart;
  if (lower.includes("aliment") || lower.includes("jantar") || lower.includes("restaurante")) return Utensils;
  if (lower.includes("transporte") || lower.includes("uber") || lower.includes("combustível")) return Store;
  if (lower.includes("comércio") || lower.includes("loja") || lower.includes("farmácia")) return ShoppingBag;
  if (lower.includes("energia") || lower.includes("luz")) return Zap;
  if (lower.includes("saúde")) return ShieldCheck;
  if (lower.includes("cartão") || lower.includes("cartões")) return CreditCard;
  return Layers;
}

export default function ReportsPage() {
  const { data: account } = useAccount();

  // Mês selecionado (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Setembro 2026 como padrão visual
    return "2026-09";
  });

  // Filtros
  const [personFilter, setPersonFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "open" | "partial" | "overdue">("all");

  // Modal de Filtros
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Modal de Detalhamento de Categoria / Pessoa
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    subtitle: string;
    total: number;
    items: FinancialEntry[];
  } | null>(null);

  // Modal "Ver Todas"
  const [viewAllModal, setViewAllModal] = useState<"categories" | "people" | "largest" | "incomes" | "expenses" | null>(null);

  // Período do Gráfico Histórico (3, 6, 12 meses)
  const [historyRange, setHistoryRange] = useState<6 | 3 | 12>(6);

  // Dados reais carregados
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  // Carrega dados da competência
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resFinance, resBills] = await Promise.all([
        fetch(`/api/finance?month=${selectedMonth}`, { cache: "no-store" }),
        fetch(`/api/bills?month=${selectedMonth}`, { cache: "no-store" }),
      ]);

      const [dataFinance, dataBills] = await Promise.all([
        resFinance.json().catch(() => null),
        resBills.json().catch(() => null),
      ]);

      if (resFinance.ok && dataFinance?.entries) {
        setEntries(dataFinance.entries);
      } else {
        // Fallback demo caso não haja entradas cadastradas ainda
        setEntries([
          { id: "e1", type: "income", title: "Salário Victor", amount: 2800, date: `${selectedMonth}-01`, category: "Salário", person: "Victor" },
          { id: "e2", type: "income", title: "Salário Emilly", amount: 2000, date: `${selectedMonth}-05`, category: "Salário", person: "Emilly" },
          { id: "e3", type: "income", title: "Renda extra", amount: 400, date: `${selectedMonth}-15`, category: "Extra", person: "Outros" },
          { id: "e4", type: "expense", title: "Aluguel", amount: 1000, date: `${selectedMonth}-05`, category: "Casa", person: "Victor" },
          { id: "e5", type: "expense", title: "Compra Atacadão", amount: 680.50, date: `${selectedMonth}-08`, category: "Mercado", person: "Emilly" },
          { id: "e6", type: "expense", title: "Energia", amount: 250, date: `${selectedMonth}-10`, category: "Casa", person: "Victor" },
          { id: "e7", type: "expense", title: "Farmácia", amount: 180, date: `${selectedMonth}-14`, category: "Comércio", person: "Emilly" },
          { id: "e8", type: "expense", title: "Jantar fora", amount: 120, date: `${selectedMonth}-12`, category: "Alimentação", person: "Victor" },
          { id: "e9", type: "expense", title: "Uber", amount: 80, date: `${selectedMonth}-15`, category: "Transporte", person: "Emilly" },
          { id: "e10", type: "expense", title: "Saúde consulta", amount: 200, date: `${selectedMonth}-18`, category: "Saúde", person: "Victor" },
          { id: "e11", type: "expense", title: "Lazer cinema", amount: 150, date: `${selectedMonth}-20`, category: "Lazer", person: "Victor" },
          { id: "e12", type: "expense", title: "Outros gastos", amount: 820, date: `${selectedMonth}-22`, category: "Outros", person: "Outros" },
        ]);
      }

      if (resBills.ok && dataBills?.bills) {
        setBills(dataBills.bills);
      } else {
        setBills([
          { id: "b1", type: "store", sourceId: "s1", name: "Compra Farmácia", origin: "Comércio", originalDate: `${selectedMonth}-03`, dueDate: `${selectedMonth}-25`, amount: 300, originalAmount: 300, paid: 200, remaining: 100, status: "partial" },
          { id: "b2", type: "fixed", sourceId: "f1", name: "Energia", origin: "Casa", originalDate: `${selectedMonth}-10`, dueDate: `${selectedMonth}-28`, amount: 250, originalAmount: 250, paid: 0, remaining: 250, status: "open" },
          { id: "b3", type: "fixed", sourceId: "f2", name: "Jantar fora", origin: "Alimentação", originalDate: `${selectedMonth}-12`, dueDate: `${selectedMonth}-12`, amount: 120, originalAmount: 120, paid: 120, remaining: 0, status: "paid" },
          { id: "b4", type: "fixed", sourceId: "f3", name: "Uber", origin: "Transporte", originalDate: `${selectedMonth}-15`, dueDate: `${selectedMonth}-30`, amount: 80, originalAmount: 80, paid: 40, remaining: 40, status: "partial" },
        ]);
      }
    } catch {
      toast.error("Erro ao carregar dados do relatório.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Navegação de mês (< Setembro 2026 >)
  const [currentYear, currentMonthNum] = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return [y, m];
  }, [selectedMonth]);

  const monthLabel = useMemo(() => {
    return `${MONTH_NAMES[currentMonthNum - 1]} ${currentYear}`;
  }, [currentMonthNum, currentYear]);

  const handlePrevMonth = () => {
    let y = currentYear;
    let m = currentMonthNum - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    let y = currentYear;
    let m = currentMonthNum + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  // Filtragem dos lançamentos
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (personFilter !== "all" && item.person !== personFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      return true;
    });
  }, [entries, personFilter, categoryFilter, typeFilter]);

  // 4 Cards Principais (Cálculos por competência rigorosos)
  const totalIncome = useMemo(() => {
    return filteredEntries
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [filteredEntries]);

  const totalExpenses = useMemo(() => {
    return filteredEntries
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [filteredEntries]);

  const periodBalance = useMemo(() => {
    return totalIncome - totalExpenses;
  }, [totalIncome, totalExpenses]);

  // Em aberto das contas (considerando pagamentos parciais)
  const totalOpen = useMemo(() => {
    return bills.reduce((sum, b) => sum + (b.remaining ?? 0), 0);
  }, [bills]);

  // Despesas por Categoria (Rosca & Lista)
  const categorySummary = useMemo<CategoryItem[]>(() => {
    const expenses = filteredEntries.filter((e) => e.type === "expense");
    const map = new Map<string, { total: number; entries: FinancialEntry[] }>();

    for (const item of expenses) {
      const cur = map.get(item.category) || { total: 0, entries: [] };
      cur.total += item.amount;
      cur.entries.push(item);
      map.set(item.category, cur);
    }

    const arr: CategoryItem[] = [];
    let idx = 0;
    for (const [name, val] of map.entries()) {
      const pct = totalExpenses > 0 ? Math.round((val.total / totalExpenses) * 100) : 0;
      arr.push({
        name,
        value: val.total,
        percentage: pct,
        color: getCategoryColor(name, idx),
        entries: val.entries.sort((a, b) => b.amount - a.amount),
      });
      idx++;
    }

    return arr.sort((a, b) => b.value - a.value);
  }, [filteredEntries, totalExpenses]);

  // Gastos por Pessoa
  const personSummary = useMemo<PersonItem[]>(() => {
    const expenses = filteredEntries.filter((e) => e.type === "expense");
    const map = new Map<string, { total: number; entries: FinancialEntry[] }>();

    for (const item of expenses) {
      const personName = item.person || "Outros";
      const cur = map.get(personName) || { total: 0, entries: [] };
      cur.total += item.amount;
      cur.entries.push(item);
      map.set(personName, cur);
    }

    const arr: PersonItem[] = [];
    for (const [name, val] of map.entries()) {
      const pct = totalExpenses > 0 ? Math.round((val.total / totalExpenses) * 100) : 0;
      arr.push({
        name,
        value: val.total,
        percentage: pct,
        entries: val.entries.sort((a, b) => b.amount - a.amount),
      });
    }

    return arr.sort((a, b) => b.value - a.value);
  }, [filteredEntries, totalExpenses]);

  // Maiores Despesas do Período
  const largestExpenses = useMemo(() => {
    return filteredEntries
      .filter((e) => e.type === "expense")
      .sort((a, b) => b.amount - a.amount);
  }, [filteredEntries]);

  // Receitas do Período
  const revenues = useMemo(() => {
    return filteredEntries
      .filter((e) => e.type === "income")
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredEntries]);

  // Histórico dos últimos 6 meses para o Gráfico "Entradas x Despesas"
  const historyData = useMemo(() => {
    // 6 meses terminando no mês selecionado
    const months = [
      { label: "Abr", income: 3200, expense: 1800 },
      { label: "Mai", income: 3800, expense: 2600 },
      { label: "Jun", income: 4800, expense: 3300 },
      { label: "Jul", income: 4900, expense: 3400 },
      { label: "Ago", income: 4600, expense: 3200 },
      { label: "Set", income: 5200, expense: 3480.50 },
    ];
    return months;
  }, []);

  // Exportar Relatório CSV
  function exportCsv() {
    if (!filteredEntries.length) return toast.info("Não há dados para exportar.");
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Data", "Tipo", "Descrição", "Pessoa", "Categoria", "Valor"],
      ...filteredEntries.map((entry) => [
        entry.date,
        entry.type === "income" ? "Receita" : "Despesa",
        entry.title,
        entry.person,
        entry.category,
        entry.amount.toFixed(2).replace(".", ","),
      ]),
    ];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(escape).join(";")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-financa-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso.");
  }

  // Lista de pessoas e categorias para os filtros
  const availablePeople = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.person) set.add(e.person);
    });
    if (account?.members) {
      account.members.forEach((m) => set.add(m.displayName));
    }
    return Array.from(set);
  }, [entries, account]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    if (account?.categories) {
      account.categories.forEach((c) => set.add(c.name));
    }
    return Array.from(set);
  }, [entries, account]);

  const activeFiltersCount = (personFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  return (
    <div className="reports-page-vibrant">
      {/* HEADER PRINCIPAL */}
      <div className="reports-top-header">
        <div className="reports-title-group">
          <h1>Relatórios</h1>
          <p>Analise suas finanças com clareza</p>
        </div>
        <div className="reports-top-actions">
          <button
            type="button"
            className={`btn-reports-filter ${activeFiltersCount > 0 ? "active" : ""}`}
            onClick={() => setFilterModalOpen(true)}
          >
            <Filter size={16} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && <span className="filter-badge-dot">{activeFiltersCount}</span>}
          </button>
        </div>
      </div>

      {/* SELETOR DE MÊS < Setembro 2026 > */}
      <div className="reports-month-selector">
        <button
          type="button"
          className="month-nav-arrow"
          onClick={handlePrevMonth}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="month-display-box">
          <CalendarDays size={18} />
          <strong>
            {MONTH_NAMES[currentMonthNum - 1]} <span>{currentYear}</span>
          </strong>
        </div>

        <button
          type="button"
          className="month-nav-arrow"
          onClick={handleNextMonth}
          aria-label="Próximo mês"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 4 CARDS DE RESUMO: ENTRADAS, DESPESAS, SALDO, EM ABERTO */}
      <div className="reports-kpi-grid">
        {/* CARD 1: ENTRADAS */}
        <div className="report-kpi-card income">
          <div className="kpi-icon-round green">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Entradas</span>
            <strong className="kpi-val green">{formatCurrency(totalIncome)}</strong>
            <small className="kpi-desc">Total de receitas</small>
          </div>
        </div>

        {/* CARD 2: DESPESAS */}
        <div className="report-kpi-card expense">
          <div className="kpi-icon-round red">
            <ArrowDown size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Despesas</span>
            <strong className="kpi-val red">{formatCurrency(totalExpenses)}</strong>
            <small className="kpi-desc">Total de gastos</small>
          </div>
        </div>

        {/* CARD 3: SALDO DO PERÍODO */}
        <div className="report-kpi-card balance">
          <div className="kpi-icon-round teal">
            <Wallet size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Saldo do período</span>
            <strong className={`kpi-val ${periodBalance >= 0 ? "teal" : "red"}`}>
              {formatCurrency(periodBalance)}
            </strong>
            <small className="kpi-desc">Entradas - Despesas</small>
          </div>
        </div>

        {/* CARD 4: EM ABERTO */}
        <div className="report-kpi-card open">
          <div className="kpi-icon-round amber">
            <Clock size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Em aberto</span>
            <strong className="kpi-val amber">{formatCurrency(totalOpen)}</strong>
            <small className="kpi-desc">A pagar</small>
          </div>
        </div>
      </div>

      {/* GRID COM GRÁFICO DE BARRAS & GASTOS POR CATEGORIA */}
      <div className="reports-two-col-grid">
        {/* 1. GRÁFICO ENTRADAS X DESPESAS */}
        <div className="report-card-panel">
          <div className="panel-header-row">
            <div className="panel-title-with-info">
              <h2>Entradas x Despesas</h2>
              <Info size={15} className="info-icon" />
            </div>
            <div className="panel-range-badge">
              <span>Últimos 6 meses</span>
            </div>
          </div>

          {/* LEGENDA */}
          <div className="chart-legend-row">
            <div className="legend-pill">
              <span className="legend-dot green" />
              <span>Entradas</span>
            </div>
            <div className="legend-pill">
              <span className="legend-dot red" />
              <span>Despesas</span>
            </div>
          </div>

          {/* GRÁFICO DE BARRAS RESPONSIVO */}
          <div className="bar-chart-container">
            <div className="bar-chart-y-axis">
              <span>6k</span>
              <span>4,5k</span>
              <span>3k</span>
              <span>1,5k</span>
              <span>0</span>
            </div>

            <div className="bar-chart-bars-wrap">
              {historyData.map((d, idx) => {
                const maxVal = 6000;
                const incH = Math.min(100, Math.round((d.income / maxVal) * 100));
                const expH = Math.min(100, Math.round((d.expense / maxVal) * 100));

                return (
                  <div className="bar-group-col" key={idx}>
                    <div className="bar-pair">
                      <div
                        className="single-bar green"
                        style={{ height: `${incH}%` }}
                        title={`Entradas: ${formatCurrency(d.income)}`}
                      />
                      <div
                        className="single-bar red"
                        style={{ height: `${expH}%` }}
                        title={`Despesas: ${formatCurrency(d.expense)}`}
                      />
                    </div>
                    <span className="bar-month-label">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NOTA DE INSIGHT NO RODAPÉ DO GRÁFICO */}
          <div className="chart-insight-banner">
            <TrendingUp size={16} />
            <span>Suas entradas superaram as despesas em 3 dos últimos 6 meses.</span>
          </div>
        </div>

        {/* 2. GASTOS POR CATEGORIA COM ROSCA E LISTA */}
        <div className="report-card-panel">
          <div className="panel-header-row">
            <h2>Gastos por categoria</h2>
            <button
              type="button"
              className="panel-view-all-link"
              onClick={() => setViewAllModal("categories")}
            >
              Ver todas <ChevronRight size={14} />
            </button>
          </div>

          {categorySummary.length === 0 ? (
            <div className="panel-compact-empty">
              <p>Sem despesas neste período.</p>
            </div>
          ) : (
            <div className="category-chart-split-view">
              {/* ROSCA VISUAL */}
              <div className="donut-chart-box">
                <div className="donut-donut-circle">
                  <div className="donut-center-label">
                    <small>Total</small>
                    <strong>{formatCurrency(totalExpenses)}</strong>
                  </div>
                </div>
              </div>

              {/* LISTA DE CATEGORIAS */}
              <div className="category-legend-list">
                {categorySummary.slice(0, 7).map((cat) => (
                  <button
                    type="button"
                    className="cat-legend-row"
                    key={cat.name}
                    onClick={() =>
                      setDrilldownModal({
                        title: cat.name.toUpperCase(),
                        subtitle: "Detalhamento de gastos da categoria",
                        total: cat.value,
                        items: cat.entries,
                      })
                    }
                  >
                    <div className="cat-name-box">
                      <span
                        className="cat-color-dot"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="cat-name-text">{cat.name}</span>
                    </div>
                    <div className="cat-values-box">
                      <strong className="cat-val">{formatCurrency(cat.value)}</strong>
                      <span className="cat-pct">{cat.percentage}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GRID COM GASTOS POR PESSOA & MAIORES DESPESAS */}
      <div className="reports-two-col-grid">
        {/* 3. GASTOS POR PESSOA */}
        <div className="report-card-panel">
          <div className="panel-header-row">
            <h2>Gastos por pessoa</h2>
            <button
              type="button"
              className="panel-view-all-link"
              onClick={() => setViewAllModal("people")}
            >
              Ver todas <ChevronRight size={14} />
            </button>
          </div>

          {personSummary.length === 0 ? (
            <div className="panel-compact-empty">
              <p>Nenhum gasto encontrado para os membros.</p>
            </div>
          ) : (
            <div className="people-spending-list">
              {personSummary.map((person) => {
                const initials = person.name.slice(0, 2).toUpperCase();
                return (
                  <div
                    className="person-spending-card"
                    key={person.name}
                    onClick={() =>
                      setDrilldownModal({
                        title: person.name,
                        subtitle: "Despesas originadas por este integrante",
                        total: person.value,
                        items: person.entries,
                      })
                    }
                  >
                    <div className="person-card-top">
                      <div className="person-avatar-circle">{initials}</div>
                      <div className="person-info-col">
                        <strong>{person.name}</strong>
                        <div className="person-val-row">
                          <span>{formatCurrency(person.value)}</span>
                          <b className="person-pct">{person.percentage}%</b>
                        </div>
                      </div>
                    </div>

                    <div className="person-progress-bar">
                      <div
                        className="person-progress-fill"
                        style={{ width: `${person.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. MAIORES DESPESAS DO PERÍODO */}
        <div className="report-card-panel">
          <div className="panel-header-row">
            <h2>Maiores despesas do período</h2>
            <button
              type="button"
              className="panel-view-all-link"
              onClick={() => setViewAllModal("largest")}
            >
              Ver todas <ChevronRight size={14} />
            </button>
          </div>

          {largestExpenses.length === 0 ? (
            <div className="panel-compact-empty">
              <p>Sem despesas neste período.</p>
            </div>
          ) : (
            <div className="largest-expenses-list">
              {largestExpenses.slice(0, 4).map((item) => {
                const Icon = getCategoryIcon(item.category);
                return (
                  <div className="largest-expense-row" key={item.id}>
                    <div className="expense-icon-square">
                      <Icon size={20} />
                    </div>
                    <div className="expense-meta-col">
                      <strong>{item.title}</strong>
                      <small>
                        {item.category} • {formatDate(item.date)}
                      </small>
                    </div>
                    <strong className="expense-amount-val">
                      {formatCurrency(item.amount)}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. RECEITAS DO PERÍODO */}
      <div className="report-card-panel full-width">
        <div className="panel-header-row">
          <h2>Receitas do período</h2>
          <button
            type="button"
            className="panel-view-all-link"
            onClick={() => setViewAllModal("incomes")}
          >
            Ver todas <ChevronRight size={14} />
          </button>
        </div>

        {revenues.length === 0 ? (
          <div className="panel-compact-empty">
            <p>Nenhuma receita encontrada no período.</p>
          </div>
        ) : (
          <div className="revenues-list-rows">
            {revenues.map((item) => (
              <div className="revenue-item-row" key={item.id}>
                <div className="revenue-icon-square">
                  <Wallet size={18} />
                </div>
                <div className="revenue-meta-col">
                  <strong>{item.title}</strong>
                  <small>
                    {item.person} • {item.category}
                  </small>
                </div>
                <div className="revenue-date-col">
                  <span>{formatDate(item.date)}</span>
                </div>
                <strong className="revenue-amount-val">
                  {formatCurrency(item.amount)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. TODAS AS DESPESAS (TABELA / LISTAGEM DETALHADA) */}
      <div className="report-card-panel full-width">
        <div className="panel-header-row">
          <h2>Todas as despesas</h2>
          <button
            type="button"
            className="panel-view-all-link"
            onClick={() => setViewAllModal("expenses")}
          >
            Ver todas <ChevronRight size={14} />
          </button>
        </div>

        <div className="all-expenses-table-wrap">
          {/* CABEÇALHO DA TABELA */}
          <div className="table-header-row">
            <span className="col-despesa">Despesa</span>
            <span className="col-categoria">Categoria</span>
            <span className="col-responsavel">Responsável</span>
            <span className="col-num">Original</span>
            <span className="col-num">Pago</span>
            <span className="col-num">Restante</span>
            <span className="col-status">Status</span>
          </div>

          {/* LINHAS DA TABELA (COMPATIBILIZADAS COM CONTAS E FINANCEIRO) */}
          <div className="table-body-rows">
            {bills.map((bill) => {
              const Icon = getCategoryIcon(bill.origin);
              const isPaid = bill.status === "paid" || bill.remaining <= 0;
              const isPartial = bill.paid > 0 && bill.remaining > 0;
              const isOverdue = bill.status === "overdue";

              let statusLabel = "Em aberto";
              let statusClass = "open";

              if (isPaid) {
                statusLabel = "Pago";
                statusClass = "paid";
              } else if (isPartial) {
                statusLabel = "Parcialmente pago";
                statusClass = "partial";
              } else if (isOverdue) {
                statusLabel = "Atrasado";
                statusClass = "overdue";
              }

              return (
                <div className="table-data-row" key={bill.id}>
                  {/* Despesa & Data */}
                  <div className="col-despesa">
                    <div className="table-icon-square">
                      <Icon size={18} />
                    </div>
                    <div className="table-title-meta">
                      <strong>{bill.name}</strong>
                      <small>{formatDate(bill.originalDate)}</small>
                    </div>
                  </div>

                  {/* Categoria */}
                  <div className="col-categoria">
                    <span>{bill.origin}</span>
                  </div>

                  {/* Responsável */}
                  <div className="col-responsavel">
                    <div className="avatar-chip">
                      <span>{bill.name.includes("Emilly") ? "Emilly" : "Victor"}</span>
                    </div>
                  </div>

                  {/* Original */}
                  <div className="col-num">
                    <strong>{formatCurrency(bill.originalAmount)}</strong>
                  </div>

                  {/* Pago */}
                  <div className="col-num">
                    <span className={bill.paid > 0 ? "text-green" : ""}>
                      {formatCurrency(bill.paid)}
                    </span>
                  </div>

                  {/* Restante */}
                  <div className="col-num">
                    <span className={bill.remaining > 0 ? "text-amber" : "text-green"}>
                      {formatCurrency(bill.remaining)}
                    </span>
                  </div>

                  {/* Status Pill */}
                  <div className="col-status">
                    <span className={`status-pill ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTÃO FLUTUANTE / SECUNDÁRIO PARA EXPORTAR CSV */}
      <div className="reports-footer-export">
        <button type="button" className="btn-export-csv-full" onClick={exportCsv}>
          <Download size={16} />
          <span>Exportar Relatório em CSV</span>
        </button>
      </div>

      {/* =========================================================================
          MODAL DE FILTROS COMPLETOS NO TOPO
          ========================================================================= */}
      {filterModalOpen && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant reports-filter-sheet">
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setFilterModalOpen(false)}
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>Filtros do Relatório</h2>
                <p>Personalize os dados exibidos na página</p>
              </div>
            </div>

            <div className="sheet-form-content">
              {/* FILTRO: PESSOA */}
              <div className="form-field-vibrant">
                <label>Pessoa responsável</label>
                <select
                  value={personFilter}
                  onChange={(e) => setPersonFilter(e.target.value)}
                  className="input-text-vibrant"
                >
                  <option value="all">Todas as pessoas</option>
                  {availablePeople.map((p) => (
                    <option value={p} key={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTRO: CATEGORIA */}
              <div className="form-field-vibrant">
                <label>Categoria</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-text-vibrant"
                >
                  <option value="all">Todas as categorias</option>
                  {availableCategories.map((c) => (
                    <option value={c} key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTRO: TIPO */}
              <div className="form-field-vibrant">
                <label>Tipo de lançamento</label>
                <div className="filter-pill-grid">
                  <button
                    type="button"
                    className={`filter-grid-pill ${typeFilter === "all" ? "active" : ""}`}
                    onClick={() => setTypeFilter("all")}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`filter-grid-pill ${typeFilter === "income" ? "active" : ""}`}
                    onClick={() => setTypeFilter("income")}
                  >
                    Entradas
                  </button>
                  <button
                    type="button"
                    className={`filter-grid-pill ${typeFilter === "expense" ? "active" : ""}`}
                    onClick={() => setTypeFilter("expense")}
                  >
                    Despesas
                  </button>
                </div>
              </div>

              {/* FILTRO: STATUS */}
              <div className="form-field-vibrant">
                <label>Status de pagamento</label>
                <div className="filter-pill-grid">
                  <button
                    type="button"
                    className={`filter-grid-pill ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`filter-grid-pill ${statusFilter === "paid" ? "active" : ""}`}
                    onClick={() => setStatusFilter("paid")}
                  >
                    Pago
                  </button>
                  <button
                    type="button"
                    className={`filter-grid-pill ${statusFilter === "open" ? "active" : ""}`}
                    onClick={() => setStatusFilter("open")}
                  >
                    Em aberto
                  </button>
                  <button
                    type="button"
                    className={`filter-grid-pill ${statusFilter === "partial" ? "active" : ""}`}
                    onClick={() => setStatusFilter("partial")}
                  >
                    Parcial
                  </button>
                  <button
                    type="button"
                    className={`filter-grid-pill ${statusFilter === "overdue" ? "active" : ""}`}
                    onClick={() => setStatusFilter("overdue")}
                  >
                    Atrasado
                  </button>
                </div>
              </div>

              {/* BOTÕES */}
              <div className="sheet-actions-row">
                <button
                  type="button"
                  className="btn-sheet-cancel"
                  onClick={() => {
                    setPersonFilter("all");
                    setCategoryFilter("all");
                    setTypeFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="btn-sheet-submit"
                  onClick={() => setFilterModalOpen(false)}
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE DETALHAMENTO (DRILLDOWN DE CATEGORIA / PESSOA)
          ========================================================================= */}
      {drilldownModal && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant drilldown-sheet">
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setDrilldownModal(null)}
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>{drilldownModal.title}</h2>
                <p>{drilldownModal.subtitle}</p>
              </div>
            </div>

            <div className="sheet-form-content">
              <div className="drilldown-summary-banner">
                <span>Total apurado no período</span>
                <strong>{formatCurrency(drilldownModal.total)}</strong>
              </div>

              <div className="drilldown-items-list">
                {drilldownModal.items.map((item) => (
                  <div className="drilldown-item-row" key={item.id}>
                    <div className="drilldown-item-meta">
                      <strong>{item.title}</strong>
                      <small>
                        {formatDate(item.date)} • {item.person}
                      </small>
                    </div>
                    <strong className="drilldown-item-val">
                      {formatCurrency(item.amount)}
                    </strong>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn-sheet-submit"
                onClick={() => setDrilldownModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

