"use client";

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Droplet,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Layers,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Smile,
  Store,
  Trash2,
  TrendingUp,
  Truck,
  User,
  Utensils,
  Wallet,
  WalletCards,
  Wifi,
  Zap,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MonthYearPicker } from "@/components/month-year-picker";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type Entry = {
  id: string;
  title: string;
  person: string;
  category: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  source: "card" | "store" | "direct";
  editable?: boolean;
};

type Card = {
  id: string;
  name: string;
  institution: string;
  last_four: string | null;
  card_type: string;
  holder: string;
};

type StoreItem = { id: string; name: string; credit_limit: number };
type Item = { name: string; quantity: string; unitPrice: string };

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const INCOME_CATEGORIES = [
  { id: "salario", name: "Salário", subtitle: "Rendimento principal", icon: Briefcase },
  { id: "investimentos", name: "Investimentos", subtitle: "Aplicações e rendimentos", icon: TrendingUp },
  { id: "renda_extra", name: "Renda extra", subtitle: "Bicos, freelas e extras", icon: Wallet },
  { id: "outros", name: "Outros", subtitle: "Outras receitas", icon: MoreHorizontal },
];

const EXPENSE_CATEGORIES = [
  { id: "alimentacao", name: "Alimentação", icon: Utensils, color: "#f97316" },
  { id: "comercio", name: "Comércio", icon: Store, color: "#00ba78" },
  { id: "cartao", name: "Cartão", icon: CreditCard, color: "#8b5cf6" },
  { id: "moradia", name: "Moradia", icon: Home, color: "#0ea5e9" },
  { id: "saude", name: "Saúde", icon: HeartPulse, color: "#ef4444" },
  { id: "transporte", name: "Transporte", icon: Truck, color: "#3b82f6" },
  { id: "contas_casa", name: "Contas da casa", icon: Droplet, color: "#14b8a6" },
  { id: "educacao", name: "Educação", icon: GraduationCap, color: "#6366f1" },
  { id: "lazer", name: "Lazer", icon: Smile, color: "#ec4899" },
  { id: "compras", name: "Compras", icon: ShoppingCart, color: "#84cc16" },
  { id: "outros", name: "Outros", icon: MoreHorizontal, color: "#64748b" },
];

const CONTAS_CASA_TYPES = [
  { id: "agua", name: "Água", icon: Droplet },
  { id: "energia", name: "Energia", icon: Zap },
  { id: "internet", name: "Internet", icon: Wifi },
  { id: "telefone", name: "Telefone", icon: Phone },
  { id: "outros", name: "Outros", icon: MoreHorizontal },
];

const MORADIA_TYPES = [
  { id: "aluguel", name: "Aluguel", icon: Home },
  { id: "condominio", name: "Condomínio", icon: Building2 },
  { id: "iptu", name: "IPTU", icon: FileText },
  { id: "outros", name: "Outros", icon: MoreHorizontal },
];
export default function FinancePage() {
  const { data: account } = useAccount();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [periodOpen, setPeriodOpen] = useState(false);
  const [summary, setSummary] = useState({ previousBalance: 0, income: 0, expenses: 0, balance: 0 });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [query, setQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  // Form State
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("alimentacao");
  const [subType, setSubType] = useState("energia");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [cardPaymentType, setCardPaymentType] = useState<"credit" | "debit">("credit");
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [storeBuyMode, setStoreBuyMode] = useState<"total" | "items">("total");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reminder, setReminder] = useState(true);
  const [items, setItems] = useState<Item[]>([{ name: "", quantity: "1", unitPrice: "" }]);

  const [year, monthNumber] = month.split("-").map(Number);
  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/finance?month=${month}`, { cache: "no-store" });
      const result = await response.json().catch(() => null);
      if (response.ok) {
        setEntries(result.entries ?? []);
        setCards(result.cards ?? []);
        setStores(result.stores ?? []);
        setSummary(result.summary ?? { previousBalance: 0, income: 0, expenses: 0, balance: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (account?.members?.length && !selectedMemberId) {
      const current = account.members.find((m) => m.isCurrentUser);
      setSelectedMemberId(current?.id || account.members[0].id);
    }
    if (cards.length && !selectedCardId) {
      setSelectedCardId(cards[0].id);
    }
    if (stores.length && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [account, cards, stores, selectedMemberId, selectedCardId, selectedStoreId]);

  const selectPeriod = (mNum: number, yNum: number) => {
    setMonth(`${yNum}-${String(mNum).padStart(2, "0")}`);
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);
  const selectedCard = cards.find((c) => c.id === selectedCardId);

  const numAmount = parseFloat(amount.replace(",", ".")) || 0;

  const itemTotal = items.reduce(
    (acc, it) => acc + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice.replace(",", ".")) || 0),
    0
  );

  const finalAmount = activeTab === "expense" && selectedCategory === "comercio" && storeBuyMode === "items"
    ? itemTotal
    : numAmount;

  const installmentValue = installmentsCount > 0 ? finalAmount / installmentsCount : finalAmount;

  const visibleEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchFilter = filter === "all" || e.type === filter;
      const matchQuery = e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.category.toLowerCase().includes(query.toLowerCase()) ||
        e.person.toLowerCase().includes(query.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [entries, filter, query]);

  function resetForm() {
    setActiveTab("expense");
    setSelectedCategory("alimentacao");
    setSubType("energia");
    setCardPaymentType("credit");
    setInstallmentsCount(1);
    setStoreBuyMode("total");
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setReminder(true);
    setItems([{ name: "", quantity: "1", unitPrice: "" }]);
  }

  function openNewModal(tab: "income" | "expense" = "expense") {
    resetForm();
    setActiveTab(tab);
    if (tab === "income") {
      setSelectedCategory("salario");
    } else {
      setSelectedCategory("alimentacao");
    }
    setModalOpen(true);
  }

  function updateItem(index: number, field: keyof Item, val: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: val } : it))
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (finalAmount <= 0) {
      return toast.error("Informe um valor maior que zero.");
    }

    setSaving(true);
    try {
      let resolvedCategoryName = selectedCategory;
      if (activeTab === "income") {
        resolvedCategoryName = INCOME_CATEGORIES.find((c) => c.id === selectedCategory)?.name || "Outros";
      } else {
        resolvedCategoryName = EXPENSE_CATEGORIES.find((c) => c.id === selectedCategory)?.name || "Outros";
      }

      const matchedDbCategory = account?.categories.find(
        (c) => c.name.toLowerCase() === resolvedCategoryName.toLowerCase()
      );

      const categoryId = matchedDbCategory?.id || (selectedCategory === "cartao" ? "__card" : "");

      const origin =
        activeTab === "income"
          ? "direct"
          : selectedCategory === "cartao"
          ? "card"
          : selectedCategory === "comercio"
          ? "store"
          : "direct";

      const finalDescription =
        description.trim() ||
        (activeTab === "income"
          ? resolvedCategoryName
          : selectedCategory === "contas_casa"
          ? `Conta de ${subType.charAt(0).toUpperCase() + subType.slice(1)}`
          : selectedCategory === "moradia"
          ? `Moradia - ${subType.charAt(0).toUpperCase() + subType.slice(1)}`
          : resolvedCategoryName);

      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          origin,
          memberId: selectedMemberId,
          categoryId,
          cardId: origin === "card" ? selectedCardId : undefined,
          storeId: origin === "store" ? selectedStoreId : undefined,
          paymentType: origin === "card" ? cardPaymentType : undefined,
          installmentCount: origin === "card" && cardPaymentType === "credit" ? installmentsCount : 1,
          registrationMode: origin === "store" ? storeBuyMode : "total",
          description: finalDescription,
          amount: finalAmount,
          date,
          items: origin === "store" && storeBuyMode === "items" ? items : [],
        }),
      });

      const res = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(res?.message || "Erro ao salvar lançamento.");
      }

      toast.success(
        activeTab === "income" ? "Receita adicionada com sucesso!" : "Despesa registrada com sucesso!"
      );
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err: any) {
      toast.error(err.message || "Não foi possível registrar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: Entry) {
    if (!window.confirm(`Excluir o lançamento "${entry.title}"?`)) return;
    try {
      const res = await fetch(`/api/finance/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("Lançamento excluído com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível excluir o lançamento.");
    }
  }

  return (
    <div className="finance-page-vibrant">
      {/* CABEÇALHO */}
      <section className="finance-top-header">
        <div className="finance-title-group">
          <h1>Financeiro</h1>
          <p>Registre e acompanhe as receitas e despesas da família.</p>
        </div>

        <div className="finance-top-actions">
          <MonthYearPicker
            value={month}
            onChange={(next) => selectPeriod(Number(next.slice(5, 7)), Number(next.slice(0, 4)))}
          />

          <button className="btn-new-entry" onClick={() => openNewModal("expense")}>
            <Plus size={17} strokeWidth={2.5} />
            <span>Novo lançamento</span>
          </button>
        </div>
      </section>

      {/* 3 CARDS PRINCIPAIS: SALDO, ENTRADAS, SAÍDAS */}
      <section className="finance-kpis-row">
        <article className="finance-kpi-card balance">
          <div className="kpi-icon-wrap balance">
            <WalletCards size={20} strokeWidth={2.2} />
          </div>
          <div className="kpi-info">
            <small>Saldo</small>
            <strong>{formatCurrency(summary.balance)}</strong>
          </div>
        </article>

        <article className="finance-kpi-card income">
          <div className="kpi-icon-wrap income">
            <ArrowDownToLine size={20} strokeWidth={2.2} />
          </div>
          <div className="kpi-info">
            <small>Entradas</small>
            <strong className="positive-text">{formatCurrency(summary.income)}</strong>
          </div>
        </article>

        <article className="finance-kpi-card expense">
          <div className="kpi-icon-wrap expense">
            <ArrowUpRight size={20} strokeWidth={2.2} />
          </div>
          <div className="kpi-info">
            <small>Saídas</small>
            <strong className="negative-text">{formatCurrency(summary.expenses)}</strong>
          </div>
        </article>
      </section>

      {/* PAINEL DE LANÇAMENTOS COM FILTROS E PESQUISA */}
      <section className="finance-list-panel">
        <div className="finance-filter-bar">
          <div className="filter-pill-group">
            <button
              className={`filter-pill ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              Todos
            </button>
            <button
              className={`filter-pill ${filter === "income" ? "active" : ""}`}
              onClick={() => setFilter("income")}
            >
              Entradas
            </button>
            <button
              className={`filter-pill ${filter === "expense" ? "active" : ""}`}
              onClick={() => setFilter("expense")}
            >
              Saídas
            </button>
          </div>

          <div className="finance-search-input">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar lançamento..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* LISTA DE ITENS */}
        <div className="finance-entries-list">
          {loading ? (
            <div className="empty-placeholder">
              <CircleDollarSign className="animate-spin" size={28} />
              <p>Carregando movimentações...</p>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="empty-placeholder">
              <Receipt size={32} />
              <strong>Nenhum lançamento encontrado</strong>
              <p>Clique em "+ Novo lançamento" para adicionar uma receita ou despesa.</p>
            </div>
          ) : (
            visibleEntries.map((item) => {
              const isIncome = item.type === "income";
              return (
                <article className="entry-row" key={item.id}>
                  <div className="entry-left">
                    <span className={`entry-type-icon ${isIncome ? "green" : item.source === "card" ? "purple" : item.source === "store" ? "orange" : "teal"}`}>
                      {isIncome ? <ArrowDownToLine size={18} /> : item.source === "card" ? <CreditCard size={18} /> : item.source === "store" ? <Store size={18} /> : <ArrowUpRight size={18} />}
                    </span>
                    <div className="entry-texts">
                      <div className="entry-header-line">
                        <strong>{item.title}</strong>
                        <span className="entry-person-badge">{item.person}</span>
                      </div>
                      <div className="entry-meta-line">
                        <span>{item.category}</span>
                        <span>•</span>
                        <time>{formatDate(item.date)}</time>
                      </div>
                    </div>
                  </div>

                  <div className="entry-right">
                    <b className={isIncome ? "positive-amount" : "negative-amount"}>
                      {isIncome ? "+ " : "- "}
                      {formatCurrency(item.amount)}
                    </b>
                    {item.editable !== false && (
                      <div className="entry-actions">
                        <button
                          className="action-icon-btn delete"
                          onClick={() => void handleDelete(item)}
                          title="Excluir"
                          aria-label="Excluir lançamento"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* MODAL / BOTTOM SHEET DE NOVO LANÇAMENTO */}
      {modalOpen && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant">
            <header className="sheet-header">
              <button className="sheet-close-btn" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
              <div className="sheet-header-title">
                <h2>{activeTab === "income" ? "Nova receita" : "Nova despesa"}</h2>
                <p>{activeTab === "income" ? "Registre uma entrada de dinheiro" : "Registre seus gastos de forma rápida"}</p>
              </div>
            </header>

            {/* TOGGLE RECEITA / DESPESA */}
            <div className="tab-toggle-box">
              <button
                type="button"
                className={`tab-toggle-btn ${activeTab === "income" ? "active income" : ""}`}
                onClick={() => {
                  setActiveTab("income");
                  setSelectedCategory("salario");
                }}
              >
                Receita
              </button>
              <button
                type="button"
                className={`tab-toggle-btn ${activeTab === "expense" ? "active expense" : ""}`}
                onClick={() => {
                  setActiveTab("expense");
                  setSelectedCategory("alimentacao");
                }}
              >
                <ArrowUpRight size={16} /> Despesa
              </button>
            </div>

            <form onSubmit={handleSave} className="sheet-form-content">
              {/* BANNER INFORMATIVO (Receita) */}
              {activeTab === "income" && (
                <div className="sheet-info-banner">
                  <span className="banner-icon"><ArrowDownToLine size={18} /></span>
                  <div>
                    <strong>Receitas aumentam o saldo disponível da sua família.</strong>
                    <p>Informe os dados abaixo para registrar a receita.</p>
                  </div>
                </div>
              )}

              {/* QUEM REALIZOU / DE QUEM É */}
              <div className="form-group-vibrant">
                <label className="form-label-vibrant">
                  {activeTab === "income" ? "De quem é esta receita?" : "Quem realizou este gasto?"}
                </label>
                <div className="person-select-card">
                  <span className="person-icon"><User size={18} /></span>
                  <div className="person-info">
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="person-select-native"
                      required
                    >
                      {account?.members.map((m) => (
                        <option value={m.id} key={m.id}>{m.displayName}</option>
                      ))}
                    </select>
                    <small>Selecione a pessoa responsável</small>
                  </div>
                  <ChevronDown size={16} className="select-arrow" />
                </div>
              </div>

              {/* SELEÇÃO DE CATEGORIAS EM GRID DE CARDS */}
              <div className="form-group-vibrant">
                <label className="form-label-vibrant">
                  {activeTab === "income" ? "Categoria da receita" : "Categoria da despesa"}
                </label>

                {activeTab === "income" ? (
                  <div className="category-cards-grid-income">
                    {INCOME_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          type="button"
                          className={`cat-card-income ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedCategory(cat.id)}
                          key={cat.id}
                        >
                          <span className="cat-icon"><Icon size={20} /></span>
                          <div>
                            <strong>{cat.name}</strong>
                            <small>{cat.subtitle}</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="category-cards-grid-expense">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          type="button"
                          className={`cat-card-expense ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedCategory(cat.id)}
                          key={cat.id}
                        >
                          <span className="cat-icon" style={{ color: cat.color }}>
                            <Icon size={18} />
                          </span>
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DETALHES DINÂMICOS CONFORME A CATEGORIA */}

              {/* CASO 1: CONTAS DA CASA */}
              {activeTab === "expense" && selectedCategory === "contas_casa" && (
                <div className="dynamic-box">
                  <div className="banner-subtle teal">
                    <Droplet size={18} />
                    <div>
                      <strong>Contas da casa</strong>
                      <p>Água, energia, internet, telefone e outras contas mensais.</p>
                    </div>
                  </div>

                  <div className="form-group-vibrant">
                    <label className="form-label-vibrant">Tipo de conta</label>
                    <div className="subtypes-grid">
                      {CONTAS_CASA_TYPES.map((t) => {
                        const Icon = t.icon;
                        const active = subType === t.id;
                        return (
                          <button
                            type="button"
                            className={`subtype-btn ${active ? "active" : ""}`}
                            onClick={() => setSubType(t.id)}
                            key={t.id}
                          >
                            <Icon size={16} />
                            <span>{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 2: MORADIA */}
              {activeTab === "expense" && selectedCategory === "moradia" && (
                <div className="dynamic-box">
                  <div className="banner-subtle blue">
                    <Home size={18} />
                    <div>
                      <strong>Despesa relacionada à moradia</strong>
                      <p>Aluguel, condomínio, IPTU, manutenção, entre outras.</p>
                    </div>
                  </div>

                  <div className="form-group-vibrant">
                    <label className="form-label-vibrant">Tipo de despesa de moradia</label>
                    <div className="subtypes-grid four">
                      {MORADIA_TYPES.map((t) => {
                        const Icon = t.icon;
                        const active = subType === t.id;
                        return (
                          <button
                            type="button"
                            className={`subtype-btn ${active ? "active" : ""}`}
                            onClick={() => setSubType(t.id)}
                            key={t.id}
                          >
                            <Icon size={16} />
                            <span>{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 3: CARTÃO */}
              {activeTab === "expense" && selectedCategory === "cartao" && (
                <div className="dynamic-box">
                  <div className="banner-subtle purple">
                    <CreditCard size={18} />
                    <div>
                      <strong>Gasto no cartão de crédito</strong>
                      <p>Informe os dados da compra para controlar as parcelas.</p>
                    </div>
                  </div>

                  <div className="form-group-vibrant">
                    <label className="form-label-vibrant">Cartão</label>
                    <div className="card-select-box">
                      <div className="card-badge-color">
                        <CreditCard size={18} />
                      </div>
                      <div className="card-info-wrap">
                        <select
                          value={selectedCardId}
                          onChange={(e) => setSelectedCardId(e.target.value)}
                          className="person-select-native"
                          required
                        >
                          {cards.map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.institution || c.name} •••• {c.last_four || "0000"} — {c.holder}
                            </option>
                          ))}
                        </select>
                        <small>Titular: {selectedCard?.holder || "Família"}</small>
                      </div>
                      <ChevronDown size={16} className="select-arrow" />
                    </div>
                  </div>

                  <div className="form-group-vibrant">
                    <label className="form-label-vibrant">Tipo de pagamento</label>
                    <div className="choice-toggle-group">
                      <button
                        type="button"
                        className={`choice-btn ${cardPaymentType === "credit" ? "active" : ""}`}
                        onClick={() => setCardPaymentType("credit")}
                      >
                        <CreditCard size={16} /> Crédito
                      </button>
                      <button
                        type="button"
                        className={`choice-btn ${cardPaymentType === "debit" ? "active" : ""}`}
                        onClick={() => {
                          setCardPaymentType("debit");
                          setInstallmentsCount(1);
                        }}
                      >
                        <Wallet size={16} /> Débito
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 4: COMÉRCIO / CREDIÁRIO */}
              {activeTab === "expense" && selectedCategory === "comercio" && (
                <div className="dynamic-box">
                  <div className="banner-subtle green">
                    <Store size={18} />
                    <div>
                      <strong>Gasto em comércios ou crediários</strong>
                      <p>Registre suas compras em crediários, lojas, farmácias, etc.</p>
                    </div>
                  </div>

                  <div className="form-group-vibrant">
                    <label className="form-label-vibrant">Comércio</label>
                    <div className="card-select-box">
                      <div className="card-badge-color store">
                        <Store size={18} />
                      </div>
                      <div className="card-info-wrap">
                        <select
                          value={selectedStoreId}
                          onChange={(e) => setSelectedStoreId(e.target.value)}
                          className="person-select-native"
                          required
                        >
                          {stores.map((s) => (
                            <option value={s.id} key={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <ChevronDown size={16} className="select-arrow" />
                    </div>
                  </div>

                  {selectedStore && (
                    <div className="store-limits-card">
                      <div>
                        <small>Limite total</small>
                        <strong>{formatCurrency(selectedStore.credit_limit || 1500)}</strong>
                      </div>
                      <div>
                        <small>Utilizado</small>
                        <strong>{formatCurrency(650)}</strong>
                      </div>
                      <div>
                        <small>Disponível</small>
                        <strong className="green-text">{formatCurrency((selectedStore.credit_limit || 1500) - 650)}</strong>
                      </div>
                    </div>
                  )}

                  <div className="form-group-vibrant">
                    <label className="form-label-vibrant">Como deseja registrar esta compra?</label>
                    <div className="choice-toggle-group">
                      <button
                        type="button"
                        className={`choice-btn ${storeBuyMode === "total" ? "active" : ""}`}
                        onClick={() => setStoreBuyMode("total")}
                      >
                        <div>
                          <strong>Somente valor total</strong>
                          <small>Registro rápido</small>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`choice-btn ${storeBuyMode === "items" ? "active" : ""}`}
                        onClick={() => setStoreBuyMode("items")}
                      >
                        <div>
                          <strong>Detalhar itens</strong>
                          <small>Listar produtos da compra</small>
                        </div>
                      </button>
                    </div>
                  </div>

                  {storeBuyMode === "items" && (
                    <div className="items-table-section">
                      <label className="form-label-vibrant">Itens da compra</label>
                      {items.map((it, idx) => (
                        <div className="item-input-row" key={idx}>
                          <input
                            type="text"
                            placeholder="Nome do produto"
                            value={it.name}
                            onChange={(e) => updateItem(idx, "name", e.target.value)}
                            required
                          />
                          <input
                            type="number"
                            placeholder="Qtd."
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                            min="1"
                            style={{ width: "65px" }}
                            required
                          />
                          <input
                            type="text"
                            placeholder="R$ 0,00"
                            value={it.unitPrice}
                            onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                            required
                          />
                          {items.length > 1 && (
                            <button
                              type="button"
                              className="item-trash-btn"
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="add-item-link-btn"
                        onClick={() => setItems([...items, { name: "", quantity: "1", unitPrice: "" }])}
                      >
                        <Plus size={15} /> Adicionar outro item
                      </button>
                      <div className="items-total-preview">
                        <span>Total dos itens:</span>
                        <strong>{formatCurrency(itemTotal)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DESCRIÇÃO (OPCIONAL) */}
              <div className="form-group-vibrant">
                <label className="form-label-vibrant">
                  Descrição <span className="optional-tag">(opcional)</span>
                </label>
                <div className="input-with-counter">
                  <input
                    type="text"
                    placeholder={
                      activeTab === "income"
                        ? "Ex: Salário mensal, 13º salário, comissão..."
                        : selectedCategory === "contas_casa"
                        ? "Conta de energia elétrica - RESIDENCIAL"
                        : selectedCategory === "moradia"
                        ? "Ex: Aluguel do apartamento"
                        : "Ex: Compra de supermercado, farmácia..."
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 100))}
                  />
                  <small className="char-count">{description.length}/100</small>
                </div>
              </div>

              {/* LINHA DE VALOR E DATA */}
              <div className="form-row-two">
                {!(activeTab === "expense" && selectedCategory === "comercio" && storeBuyMode === "items") && (
                  <div className="form-group-vibrant">
                    <label className="form-label-vibrant">
                      {activeTab === "income" ? "Valor da receita *" : "Valor da despesa *"}
                    </label>
                    <div className="currency-input-wrap">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group-vibrant">
                  <label className="form-label-vibrant">
                    {activeTab === "income" ? "Data do recebimento *" : "Data de vencimento / compra *"}
                  </label>
                  <div className="date-input-wrap">
                    <CalendarDays size={18} className="date-icon" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SE CARTÃO DE CRÉDITO -> PARCELAS */}
              {activeTab === "expense" && selectedCategory === "cartao" && cardPaymentType === "credit" && (
                <div className="form-group-vibrant">
                  <label className="form-label-vibrant">Parcelas *</label>
                  <select
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                    className="styled-select"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                      <option value={n} key={n}>
                        {n}x ({formatCurrency(finalAmount / n)} por parcela)
                      </option>
                    ))}
                  </select>

                  {installmentsCount > 1 && (
                    <div className="installments-summary-card">
                      <div className="summary-col">
                        <span>Resumo da compra</span>
                        <strong>Valor total: {formatCurrency(finalAmount)}</strong>
                        <small>Parcelas: {installmentsCount}x de {formatCurrency(installmentValue)}</small>
                      </div>
                      <div className="summary-col right">
                        <small>1ª parcela: {MONTHS[monthNumber - 1]}/{year}</small>
                        <small>Última: {MONTHS[(monthNumber - 1 + installmentsCount - 1) % 12]}/{year + Math.floor((monthNumber - 1 + installmentsCount - 1) / 12)}</small>
                      </div>
                    </div>
                  )}

                  <div className="alert-box-yellow">
                    <AlertCircle size={16} />
                    <span>As parcelas serão lançadas automaticamente nos meses correspondentes.</span>
                  </div>
                </div>
              )}

              {/* LEMBRETE */}
              {(selectedCategory === "contas_casa" || selectedCategory === "moradia") && (
                <div className="reminder-toggle-card">
                  <div className="reminder-text">
                    <span className="bell-icon"><Zap size={16} /></span>
                    <div>
                      <strong>Lembrete</strong>
                      <small>Você será notificado no dia do vencimento para não esquecer.</small>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={reminder}
                      onChange={(e) => setReminder(e.target.checked)}
                    />
                    <span className="slider round" />
                  </label>
                </div>
              )}

              {/* RESUMO DO LANÇAMENTO */}
              <div className="final-summary-strip">
                <div className="summary-item">
                  <span className="summary-badge"><Receipt size={18} /></span>
                  <div>
                    <small>Resumo do lançamento</small>
                    <strong>{activeTab === "income" ? "Receita" : "Despesa"}</strong>
                  </div>
                </div>
                <div className="summary-item right">
                  <small>Valor total</small>
                  <strong className={activeTab === "income" ? "green-text" : "dark-text"}>
                    {formatCurrency(finalAmount)}
                  </strong>
                </div>
              </div>

              {/* FOOTER DE BOTÕES */}
              <footer className="sheet-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-submit-vibrant"
                  disabled={saving}
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Receipt size={17} />
                      <span>{activeTab === "income" ? "Salvar receita" : "Salvar despesa"}</span>
                    </>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
