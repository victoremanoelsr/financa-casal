"use client";

import {
  CalendarDays,
  Plus,
  MoreVertical,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Droplet,
  Wifi,
  Home,
  Zap,
  ShoppingBag,
  CreditCard,
  Building2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Field, Modal } from "@/components/ui";
import { MonthYearPicker } from "@/components/month-year-picker";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type Payment = {
  id: string;
  amount: number;
  date: string;
  createdAt: string;
  note: string;
  method: string;
  responsible: string;
  cardName?: string;
  cardLastFour?: string;
  installmentCount?: number;
};

type PurchaseItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Purchase = {
  id: string;
  description: string;
  date: string;
  amount: number;
  items: PurchaseItem[];
};

type Bill = {
  id: string;
  type: "card" | "store" | "subscription" | "fixed" | "housing";
  sourceId: string;
  name: string;
  origin: string;
  originalDate: string;
  closingDate?: string;
  dueDate: string;
  amount: number;
  originalAmount: number;
  paid: number;
  remaining: number;
  status: "open" | "pending" | "paid" | "overdue";
  payments: Payment[];
  purchases: Purchase[];
  originMonth: string;
  carried: boolean;
};

type BillData = {
  bills: Bill[];
  groups: {
    cards: number;
    stores: number;
    subscriptions: number;
    fixed: number;
  };
};

const EMPTY: BillData = {
  bills: [],
  groups: { cards: 0, stores: 0, subscriptions: 0, fixed: 0 },
};

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  bank_transfer: "Transferência",
  credit: "Cartão de Crédito",
  debit: "Débito",
  other: "Outro",
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

function getBillIcon(name: string, type: string) {
  const lower = name.toLowerCase();
  if (lower.includes("água") || lower.includes("agua") || lower.includes("sanepar") || lower.includes("sabesp")) {
    return { icon: Droplet, bg: "#e8f4fd", color: "#1971c2" };
  }
  if (lower.includes("internet") || lower.includes("vivo") || lower.includes("claro") || lower.includes("fibra") || lower.includes("oi")) {
    return { icon: Wifi, bg: "#fef3e6", color: "#f97316" };
  }
  if (lower.includes("energia") || lower.includes("luz") || lower.includes("copel") || lower.includes("enel") || lower.includes("cemig")) {
    return { icon: Zap, bg: "#fef9e7", color: "#f59e0b" };
  }
  if (lower.includes("aluguel") || lower.includes("condomínio") || lower.includes("moradia") || type === "housing") {
    return { icon: Home, bg: "#e8faf3", color: "#00ba78" };
  }
  if (type === "card" || lower.includes("cartão") || lower.includes("nubank") || lower.includes("atacadão") || lower.includes("mercado pago")) {
    if (lower.includes("nubank")) return { icon: CreditCard, bg: "#5822b4", color: "#ffffff", brand: "nu" };
    if (lower.includes("atacadão") || lower.includes("atacadao")) return { icon: CreditCard, bg: "#dc2626", color: "#ffffff", brand: "A" };
    return { icon: CreditCard, bg: "#1e293b", color: "#ffffff" };
  }
  if (type === "store" || lower.includes("farmácia") || lower.includes("comércio") || lower.includes("loja")) {
    return { icon: ShoppingBag, bg: "#fdf0f0", color: "#e11d48" };
  }
  return { icon: Building2, bg: "#f1f5f9", color: "#475569" };
}

export default function BillsPage() {
  const { data: account } = useAccount();
  const [data, setData] = useState<BillData>(EMPTY);
  const [selected, setSelected] = useState<Bill | null>(null);
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [periodOpen, setPeriodOpen] = useState(false);
  const [method, setMethod] = useState("pix");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [newBillOpen, setNewBillOpen] = useState(false);

  const [cards, setCards] = useState<
    Array<{
      id: string;
      name: string;
      lastFour: string;
      type: string;
      holder: string;
    }>
  >([]);

  const [currentYear, currentMonthNum] = month.split("-").map(Number);

  const load = useCallback(async () => {
    const response = await fetch(`/api/bills?month=${month}`, {
      cache: "no-store",
    });
    setData(response.ok ? await response.json() : EMPTY);
  }, [month]);

  useEffect(() => {
    void load();
    void fetch("/api/cards", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setCards(result?.cards ?? []))
      .catch(() => setCards([]));
  }, [load]);

  const handlePeriodSelect = (selectedMonth: number, selectedYear: number) => {
    const formatted = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    setMonth(formatted);
    setPeriodOpen(false);
  };

  const openDetails = (bill: Bill) => {
    setSelected(bill);
    setAmount(bill.remaining);
    setPaymentMode(false);
  };

  const openPayment = (bill: Bill) => {
    setSelected(bill);
    setAmount(bill.remaining);
    setPaymentMode(true);
  };

  const pending = data.bills.reduce((sum, item) => sum + item.remaining, 0);
  const paid = data.bills.reduce((sum, item) => sum + item.paid, 0);
  const totalAmount = data.bills.reduce((sum, item) => sum + item.originalAmount, 0);

  // Status inteligente com regras combinadas (ex: Parcial + Atrasado)
  const getStatusInfo = (bill: Bill) => {
    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = bill.dueDate < today && bill.remaining > 0;
    const isPaid = bill.remaining <= 0;
    const isPartial = bill.paid > 0 && bill.remaining > 0;

    if (isPaid) return { label: "Pago", color: "paid", badgeClass: "badge-paid" };
    if (isPartial && isOverdue) return { label: "Parcial • Atrasado", color: "overdue", badgeClass: "badge-overdue" };
    if (isPartial) return { label: "Parcial", color: "partial", badgeClass: "badge-partial" };
    if (isOverdue) return { label: "Atrasado", color: "overdue", badgeClass: "badge-overdue" };
    if (bill.status === "pending") return { label: "Pendente", color: "pending", badgeClass: "badge-pending" };
    return { label: "Em aberto", color: "open", badgeClass: "badge-open" };
  };

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (!(amount > 0))
      return toast.error("O pagamento precisa ser maior que R$ 0,00.");
    if (amount > selected.remaining)
      return toast.error(
        `O valor informado é maior que o saldo pendente de ${formatCurrency(selected.remaining)}.`,
      );
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(
      `/api/bills/${encodeURIComponent(selected.id)}/payments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          paymentDate: form.get("paymentDate"),
          note: form.get("note"),
          method,
          cardId: form.get("cardId"),
          installmentCount: form.get("installmentCount"),
        }),
      },
    );
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível registrar o pagamento.",
      );
    setSelected(null);
    await load();
    toast.success(
      amount === selected.remaining
        ? "Conta quitada com sucesso!"
        : "Pagamento parcial registrado com sucesso!",
    );
  }

  async function createFixedBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amountVal = Number(data.get("amount"));
    if (!(amountVal > 0)) return toast.error("Informe um valor válido.");
    setSaving(true);
    const defaultMember = account?.members?.find((m) => m.isCurrentUser)?.id ?? account?.members?.[0]?.id;
    const response = await fetch("/api/fixed-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        amount: amountVal,
        dueDay: Number(data.get("dueDay")),
        categoryId: data.get("categoryId"),
        responsibleMemberId: defaultMember,
        notes: data.get("notes") || "",
        startOption: data.get("startOption") || "current",
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(result?.message ?? "Não foi possível salvar a conta.");
    setNewBillOpen(false);
    form.reset();
    await load();
    toast.success("Conta cadastrada com sucesso!");
  }

  async function reverse(payment: Payment) {
    if (
      !selected ||
      !confirm(`Estornar o pagamento de ${formatCurrency(payment.amount)}?`)
    )
      return;
    const response = await fetch(
      `/api/bills/${encodeURIComponent(selected.id)}/payments/${payment.id}/reverse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Estorno confirmado pelo usuário" }),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok)
      return toast.error(result?.message ?? "Não foi possível estornar.");
    setSelected(null);
    await load();
    toast.success("Pagamento estornado e saldo restaurado.");
  }

  // Separação em grupos conforme especificação
  const carriedBills = data.bills.filter((bill) => bill.carried && bill.remaining > 0);
  const currentMonthBills = data.bills.filter((bill) => !bill.carried);

  const cardBills = currentMonthBills.filter((bill) => bill.type === "card");
  const storeBills = currentMonthBills.filter((bill) => bill.type === "store");
  const houseBills = currentMonthBills.filter(
    (bill) => bill.type === "fixed" || bill.type === "housing" || bill.type === "subscription",
  );

  return (
    <div className="bills-page-vibrant">
      {/* CABEÇALHO COM AVATAR, TÍTULO E SINO */}
      <header className="bills-top-header">
        <div className="bills-header-user">
          <div className="bills-avatar">F</div>
          <div className="bills-title-text">
            <h1>Contas</h1>
            <p>Todas as suas contas e obrigações a pagar.</p>
          </div>
        </div>

        <button type="button" className="bills-bell-btn" title="Notificações">
          <Bell size={18} />
          <span className="bell-dot" />
        </button>
      </header>

      {/* BARRA DE SELETOR DE PERÍODO E BOTÃO NOVA CONTA */}
      <div className="bills-toolbar-row">
        <MonthYearPicker
          value={month}
          onChange={(newMonth) => setMonth(newMonth)}
        />

        <button
          type="button"
          className="bills-btn-new"
          onClick={() => setNewBillOpen(true)}
        >
          <Plus size={16} />
          <span>Nova conta</span>
        </button>
      </div>

      {/* 3 CARDS COMPACTOS: EM ABERTO, PAGO NO PERÍODO, RESTANTE */}
      <section className="bills-kpi-grid">
        <article className="bills-kpi-card">
          <div className="bills-kpi-top">
            <span className="bills-kpi-icon red">
              <AlertCircle size={16} />
            </span>
            <small>Em aberto</small>
          </div>
          <strong className="bills-kpi-val red">{formatCurrency(totalAmount)}</strong>
          <span>{data.bills.length} contas</span>
        </article>

        <article className="bills-kpi-card">
          <div className="bills-kpi-top">
            <span className="bills-kpi-icon green">
              <CheckCircle2 size={16} />
            </span>
            <small>Pago no período</small>
          </div>
          <strong className="bills-kpi-val green">{formatCurrency(paid)}</strong>
          <span>{data.bills.filter((b) => b.paid > 0).length} contas</span>
        </article>

        <article className="bills-kpi-card">
          <div className="bills-kpi-top">
            <span className="bills-kpi-icon amber">
              <Clock size={16} />
            </span>
            <small>Restante</small>
          </div>
          <strong className="bills-kpi-val amber">{formatCurrency(pending)}</strong>
          <span>{data.bills.filter((b) => b.remaining > 0).length} contas</span>
        </article>
      </section>

      {/* SEÇÃO: PENDÊNCIAS ANTERIORES */}
      {carriedBills.length > 0 && (
        <section className="bills-section-group">
          <div className="bills-section-header">
            <div className="section-title-wrap">
              <h2>Pendências anteriores</h2>
              <span className="section-count-badge red">{carriedBills.length}</span>
            </div>
            <button type="button" className="bills-view-all">
              Ver todas <ChevronRight size={14} />
            </button>
          </div>

          <div className="bills-items-list">
            {carriedBills.map((bill) => {
              const iconInfo = getBillIcon(bill.name, bill.type);
              const statusInfo = getStatusInfo(bill);
              return (
                <article
                  key={bill.id}
                  className="bill-card-vibrant"
                  onClick={() => openDetails(bill)}
                >
                  <div
                    className="bill-avatar-icon"
                    style={{ backgroundColor: iconInfo.bg, color: iconInfo.color }}
                  >
                    <iconInfo.icon size={20} />
                  </div>

                  <div className="bill-content-wrap">
                    <div className="bill-top-row">
                      <div className="bill-info-left">
                        <strong>{bill.name}</strong>
                        <small className="bill-sub-text">
                          Compra original: {formatDate(bill.originalDate)}
                        </small>
                        <span className="bill-due-tag">
                          <CalendarDays size={12} />
                          Vencimento: {formatDate(bill.dueDate)}
                        </span>
                      </div>

                      <div className="bill-info-right">
                        <strong className="bill-value-red">
                          {formatCurrency(bill.remaining)}
                        </strong>
                        <span className={`bill-status-badge ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* SEÇÃO: CARTÕES */}
      {cardBills.length > 0 && (
        <section className="bills-section-group">
          <div className="bills-section-header">
            <div className="section-title-wrap">
              <h2>Cartões</h2>
              <span className="section-count-badge blue">{cardBills.length}</span>
            </div>
            <Link href="/cartoes" className="bills-view-all">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>

          <div className="bills-items-list">
            {cardBills.map((bill) => {
              const iconInfo = getBillIcon(bill.name, bill.type);
              const statusInfo = getStatusInfo(bill);
              const pct = bill.originalAmount > 0 ? (bill.paid / bill.originalAmount) * 100 : 0;
              return (
                <article
                  key={bill.id}
                  className="bill-card-vibrant card-bill"
                  onClick={() => openDetails(bill)}
                >
                  <div className="bill-card-main-row">
                    <div
                      className="bill-avatar-icon brand-logo"
                      style={{ backgroundColor: iconInfo.bg, color: iconInfo.color }}
                    >
                      {iconInfo.brand ? (
                        <span className="brand-badge-text">{iconInfo.brand}</span>
                      ) : (
                        <iconInfo.icon size={20} />
                      )}
                    </div>

                    <div className="bill-content-wrap">
                      <div className="bill-top-row">
                        <div className="bill-info-left">
                          <strong>{bill.name}</strong>
                          <small className="bill-sub-text">
                            Fatura {MONTH_NAMES[currentMonthNum - 1]?.toLowerCase()}
                          </small>
                          <span className="bill-due-tag">
                            <CalendarDays size={12} />
                            Vencimento: {formatDate(bill.dueDate)}
                          </span>
                        </div>

                        <div className="bill-info-right">
                          <strong className="bill-value-dark">
                            {formatCurrency(bill.originalAmount)}
                          </strong>
                          <span className={`bill-status-badge ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE PROGRESSO E VALORES PAGO / RESTANTE */}
                  <div className="bill-card-progress-footer">
                    <div className="progress-labels">
                      <span>Pago: {formatCurrency(bill.paid)}</span>
                      <span>Falta: {formatCurrency(bill.remaining)}</span>
                    </div>
                    <div className="bill-progress-track">
                      <div
                        className="bill-progress-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: iconInfo.brand === "nu" ? "#5822b4" : "#dc2626",
                        }}
                      />
                    </div>
                  </div>

                  {bill.remaining > 0 && (
                    <div className="bill-card-actions">
                      <button
                        type="button"
                        className="bills-btn-pay"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPayment(bill);
                        }}
                      >
                        Pagar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* SEÇÃO: CONTAS DA CASA & MORADIA */}
      {houseBills.length > 0 && (
        <section className="bills-section-group">
          <div className="bills-section-header">
            <div className="section-title-wrap">
              <h2>Contas da casa</h2>
              <span className="section-count-badge blue">{houseBills.length}</span>
            </div>
            <button type="button" className="bills-view-all">
              Ver todas <ChevronRight size={14} />
            </button>
          </div>

          <div className="bills-items-list">
            {houseBills.map((bill) => {
              const iconInfo = getBillIcon(bill.name, bill.type);
              const statusInfo = getStatusInfo(bill);
              return (
                <article
                  key={bill.id}
                  className="bill-card-vibrant simple-bill"
                  onClick={() => openDetails(bill)}
                >
                  <div
                    className="bill-avatar-icon"
                    style={{ backgroundColor: iconInfo.bg, color: iconInfo.color }}
                  >
                    <iconInfo.icon size={20} />
                  </div>

                  <div className="bill-content-wrap">
                    <div className="bill-top-row">
                      <div className="bill-info-left">
                        <strong>{bill.name}</strong>
                        <small className="bill-sub-text">
                          {bill.type === "housing"
                            ? `Referente a ${MONTH_NAMES[currentMonthNum - 1]?.toLowerCase()}`
                            : "Conta mensal"}
                        </small>
                        <span className="bill-due-tag">
                          <CalendarDays size={12} />
                          Vencimento: {formatDate(bill.dueDate)}
                        </span>
                      </div>

                      <div className="bill-info-right action-inline">
                        <strong className="bill-value-dark">
                          {formatCurrency(bill.remaining)}
                        </strong>
                        <span className={`bill-status-badge ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                        {bill.remaining > 0 && (
                          <button
                            type="button"
                            className="bills-btn-pay-compact"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPayment(bill);
                            }}
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* SEÇÃO: COMÉRCIOS / CREDIÁRIOS */}
      {storeBills.length > 0 && (
        <section className="bills-section-group">
          <div className="bills-section-header">
            <div className="section-title-wrap">
              <h2>Comércios / Crediários</h2>
              <span className="section-count-badge amber">{storeBills.length}</span>
            </div>
            <Link href="/comercios" className="bills-view-all">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>

          <div className="bills-items-list">
            {storeBills.map((bill) => {
              const iconInfo = getBillIcon(bill.name, bill.type);
              const statusInfo = getStatusInfo(bill);
              return (
                <article
                  key={bill.id}
                  className="bill-card-vibrant simple-bill"
                  onClick={() => openDetails(bill)}
                >
                  <div
                    className="bill-avatar-icon"
                    style={{ backgroundColor: iconInfo.bg, color: iconInfo.color }}
                  >
                    <iconInfo.icon size={20} />
                  </div>

                  <div className="bill-content-wrap">
                    <div className="bill-top-row">
                      <div className="bill-info-left">
                        <strong>{bill.name}</strong>
                        <small className="bill-sub-text">
                          Compra original: {formatDate(bill.originalDate)}
                        </small>
                        <span className="bill-due-tag">
                          <CalendarDays size={12} />
                          Vencimento: {formatDate(bill.dueDate)}
                        </span>
                      </div>

                      <div className="bill-info-right action-inline">
                        <strong className="bill-value-dark">
                          {formatCurrency(bill.remaining)}
                        </strong>
                        <span className={`bill-status-badge ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                        {bill.remaining > 0 && (
                          <button
                            type="button"
                            className="bills-btn-pay-compact"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPayment(bill);
                            }}
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* MODAL DE PAGAMENTO / DETALHES */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={paymentMode ? "Registrar pagamento" : "Detalhes da conta"}
        description={selected?.name ?? ""}
      >
        {selected && (
          <div className="bill-payment-modal-vibrant">
            <div className="payment-summary-box">
              <div className="summary-val-row">
                <span>Valor original</span>
                <strong>{formatCurrency(selected.originalAmount)}</strong>
              </div>
              <div className="summary-val-row">
                <span>Total pago</span>
                <strong className="green-val">{formatCurrency(selected.paid)}</strong>
              </div>
              <div className="summary-val-row remaining">
                <span>Restante</span>
                <strong className="amber-val">{formatCurrency(selected.remaining)}</strong>
              </div>
            </div>

            {paymentMode && selected.remaining > 0 && (
              <form className="modal-form" onSubmit={pay}>
                <Field label="Quanto deseja pagar?">
                  <input
                    type="number"
                    min="0.01"
                    max={selected.remaining}
                    step="0.01"
                    value={amount || ""}
                    onChange={(event) => setAmount(Number(event.target.value))}
                    required
                  />
                </Field>

                <div className="form-grid two">
                  <Field label="Data do pagamento">
                    <input
                      name="paymentDate"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </Field>
                  <Field label="Forma de pagamento">
                    <select
                      name="method"
                      value={method}
                      onChange={(event) => setMethod(event.target.value)}
                    >
                      <option value="pix">PIX</option>
                      <option value="cash">Dinheiro</option>
                      <option value="debit">Débito</option>
                      <option value="credit">Cartão de Crédito</option>
                      <option value="bank_transfer">Transferência</option>
                      <option value="other">Outro</option>
                    </select>
                  </Field>
                </div>

                {method === "credit" && (
                  <div className="form-grid two">
                    <Field label="Qual cartão?">
                      <select name="cardId" required>
                        <option value="">Selecione o cartão</option>
                        {cards
                          .filter((card) => card.type !== "debit")
                          .map((card) => (
                            <option value={card.id} key={card.id}>
                              {card.name} •••• {card.lastFour} — {card.holder}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Parcelas">
                      <select name="installmentCount" defaultValue="1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={n}>
                            {n}x de {formatCurrency(amount / n)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}

                <Field label="Observação" hint="Opcional">
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Ex.: Pagamento parcial em dinheiro."
                  />
                </Field>

                <div className="payment-preview-box">
                  <span>
                    Pagamento agora: <strong>{formatCurrency(amount)}</strong>
                  </span>
                  <span>
                    Saldo restante após pagamento:{" "}
                    <strong>{formatCurrency(Math.max(0, selected.remaining - amount))}</strong>
                  </span>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setSelected(null)}
                  >
                    Cancelar
                  </button>
                  <button className="primary-button" disabled={saving}>
                    {saving ? "Salvando..." : "Confirmar pagamento"}
                  </button>
                </div>
              </form>
            )}

            {!paymentMode && selected.remaining > 0 && (
              <button
                type="button"
                className="primary-button full-width-btn"
                onClick={() => setPaymentMode(true)}
              >
                {selected.paid > 0 ? "Pagar restante" : "Pagar conta"}
              </button>
            )}

            <div className="payment-history-section">
              <h3>Histórico de pagamentos</h3>
              {selected.payments.length === 0 ? (
                <p className="no-payments-text">Nenhum pagamento registrado ainda.</p>
              ) : (
                selected.payments.map((payment) => (
                  <article key={payment.id} className="payment-history-item">
                    <div>
                      <strong>{formatCurrency(payment.amount)}</strong>
                      <small>
                        {formatDate(payment.date)} · {payment.responsible} ·{" "}
                        {METHOD_LABELS[payment.method] ?? "Outro"}
                      </small>
                      {payment.note && <p>{payment.note}</p>}
                    </div>
                    <button
                      type="button"
                      className="reverse-btn"
                      onClick={() => void reverse(payment)}
                      title="Estornar pagamento"
                    >
                      <RotateCcw size={14} /> Estornar
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DE NOVA CONTA DA CASA */}
      <Modal
        open={newBillOpen}
        onClose={() => setNewBillOpen(false)}
        title="Nova conta da casa"
        description="Cadastre uma conta recorrente com dia de vencimento."
      >
        <form className="modal-form" onSubmit={createFixedBill}>
          <div className="form-grid two">
            <Field label="Nome da conta">
              <input
                name="name"
                placeholder="Ex.: Água, Internet, Aluguel, Luz..."
                required
              />
            </Field>
            <Field label="Valor previsto">
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                required
              />
            </Field>
          </div>

          <div className="form-grid two">
            <Field label="Dia do vencimento">
              <input
                name="dueDay"
                type="number"
                min="1"
                max="31"
                placeholder="Ex.: 10"
                required
              />
            </Field>
            <Field label="Categoria">
              <select name="categoryId" required>
                <option value="">Selecione a categoria</option>
                {account?.categories
                  .filter((c) => c.kind !== "income")
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          <Field label="Primeiro vencimento desta conta">
            <select name="startOption" defaultValue="current">
              <option value="current">Cobrar a partir deste mês ({MONTH_NAMES[currentMonthNum - 1]}/{currentYear})</option>
              <option value="next">
                Cobrar apenas a partir do próximo mês ({MONTH_NAMES[currentMonthNum % 12]}/{currentMonthNum === 12 ? currentYear + 1 : currentYear})
              </option>
            </select>
          </Field>

          <Field label="Observação (opcional)">
            <textarea name="notes" rows={2} placeholder="Ex.: Referente ao mês vigente." />
          </Field>

          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setNewBillOpen(false)}
            >
              Cancelar
            </button>
            <button disabled={saving} className="primary-button">
              {saving ? "Salvando..." : "Salvar conta"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

