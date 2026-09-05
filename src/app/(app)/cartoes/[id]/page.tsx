"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  MoreVertical,
  Pencil,
  Plus,
  Radio,
  ReceiptText,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  FormEvent,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type Purchase = {
  id: string;
  description: string;
  amount: number;
  date: string;
  originalDate: string;
  installmentNumber: number;
  installments: number;
  paymentType: "credit" | "debit";
  categoryId: string | null;
  category: string;
};

type Detail = {
  card: {
    id: string;
    name: string;
    institution: string;
    holder: string;
    type: "credit" | "debit" | "credit_debit";
    limit: number;
    closingDay: number | null;
    dueDay: number | null;
    lastFour: string;
    visualKey: string;
    backgroundImage: string;
    paid: number;
    used: number;
  };
  purchases: Purchase[];
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

function getCardTheme(institution: string, name: string, visualKey: string) {
  const check = (institution + " " + name).toLowerCase();
  if (check.includes("nubank")) return "theme-nubank";
  if (check.includes("atacadão") || check.includes("atacadao"))
    return "theme-atacadao";
  if (check.includes("mercado pago") || check.includes("mercadopago"))
    return "theme-mercadopago";
  if (check.includes("inter")) return "theme-inter";
  if (visualKey === "purple") return "theme-nubank";
  if (visualKey === "orange") return "theme-atacadao";
  if (visualKey === "blue") return "theme-mercadopago";
  return "theme-default";
}

export default function CardDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: account } = useAccount();

  // Period Selector State
  const currentDate = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const monthParam = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingCardModal, setEditingCardModal] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/cards/${id}?month=${monthParam}`, {
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    if (response.status === 404) setNotFound(true);
    else if (response.ok) setDetail(result);
    setLoading(false);
  }, [id, monthParam]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    const response = await fetch(`/api/cards/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: values.get("description"),
        amount: values.get("amount"),
        installments: values.get("installments"),
        purchaseDate: values.get("purchaseDate"),
        categoryId: values.get("categoryId"),
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível salvar a compra.",
      );
    form.reset();
    setOpen(false);
    await load();
    toast.success("Compra cadastrada com sucesso.");
  }

  async function editPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const values = new FormData(event.currentTarget);
    const response = await fetch(`/api/cards/${id}/purchases/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: values.get("description"),
        amount: values.get("amount"),
        date: values.get("date"),
        categoryId: values.get("categoryId"),
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível editar a compra.",
      );
    setEditing(null);
    await load();
    toast.success("Compra atualizada.");
  }

  async function deletePurchase(purchase: Purchase) {
    if (!window.confirm(`Excluir a compra “${purchase.description}”?`)) return;
    const response = await fetch(
      `/api/cards/${id}/purchases/${purchase.id}`,
      { method: "DELETE" },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível excluir a compra.",
      );
    await load();
    toast.success("Compra excluída.");
  }

  if (loading) {
    return (
      <div className="card-details-page-vibrant">
        <p>Carregando cartão...</p>
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="card-details-page-vibrant">
        <EmptyState
          icon={CreditCard}
          title="Cartão não encontrado"
          description="Volte à lista e selecione um cartão disponível."
          action={
            <Link className="primary-button" href="/cartoes">
              Voltar aos cartões
            </Link>
          }
        />
      </div>
    );
  }

  const { card, purchases } = detail;
  const used = card.type === "debit" ? 0 : card.used;
  const available = Math.max(0, card.limit - used);
  const themeClass = getCardTheme(
    card.institution,
    card.name,
    card.visualKey,
  );

  const usagePercent =
    card.type !== "debit" && card.limit > 0
      ? Math.min(100, Math.round((used / card.limit) * 100))
      : 0;

  const progressFillClass =
    usagePercent > 85 ? "danger" : usagePercent > 65 ? "warning" : "";

  return (
    <div className="card-details-page-vibrant">
      {/* TOPO DE NAVEGAÇÃO: BOTÃO VOLTAR E AÇÕES */}
      <div className="card-details-top-nav">
        <Link href="/cartoes" className="card-back-btn">
          <ArrowLeft size={18} /> Detalhes do cartão
        </Link>
        <button
          type="button"
          className="cards-notification-btn"
          onClick={() => setOpen(true)}
          aria-label="Adicionar compra"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* HERO DO CARTÃO VISUAL */}
      <div className="card-hero-container">
        <div className={`vibrant-credit-card ${themeClass}`}>
          {card.backgroundImage && (
            <div
              className="card-bg-custom"
              style={{ backgroundImage: `url(${card.backgroundImage})` }}
            />
          )}

          <div className="card-top-bar">
            <div className="card-brand-wrap">
              <span className="card-brand-logo">{card.institution}</span>
              <span className="card-type-tag">
                {card.type === "credit"
                  ? "Crédito"
                  : card.type === "debit"
                    ? "Débito"
                    : "Crédito e Débito"}
              </span>
            </div>
            <div className="card-top-right-actions">
              <Radio size={16} className="contactless-icon" />
              <button
                type="button"
                className="card-menu-btn"
                onClick={() => setEditingCardModal(true)}
                aria-label="Editar cartão"
              >
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          <div className="card-middle-bar">
            <div className="card-chip" />
            <span className="card-digits">•••• {card.lastFour}</span>
          </div>

          <div className="card-holder-row">
            <div className="card-holder-col">
              <small>Titular</small>
              <strong>{card.holder}</strong>
            </div>
            <div className="card-dates-group">
              <div className="card-date-col">
                <small>Fechamento</small>
                <strong>
                  {card.closingDay
                    ? `Dia ${String(card.closingDay).padStart(2, "0")}`
                    : "—"}
                </strong>
              </div>
              <div className="card-date-col">
                <small>Vencimento</small>
                <strong>
                  {card.dueDay
                    ? `Dia ${String(card.dueDay).padStart(2, "0")}`
                    : "—"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 MÉTRICAS: LIMITE TOTAL, UTILIZADO, DISPONÍVEL + BARRA DE PROGRESSO */}
      <div className="card-metrics-strip">
        <div className="metrics-strip-row">
          <div className="metric-strip-item">
            <span>Limite total</span>
            <strong>
              {card.type !== "debit"
                ? formatCurrency(card.limit)
                : "Débito"}
            </strong>
          </div>
          <div className="metric-strip-item">
            <span>Utilizado</span>
            <strong>{formatCurrency(used)}</strong>
          </div>
          <div className="metric-strip-item">
            <span>Disponível</span>
            <strong className="green-text">
              {card.type !== "debit" ? formatCurrency(available) : "—"}
            </strong>
          </div>
        </div>

        {card.type !== "debit" && (
          <>
            <div className="card-progress-bar-track">
              <div
                className={`card-progress-bar-fill ${progressFillClass}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className="card-usage-footer-label">
              {usagePercent}% do limite utilizado
            </span>
          </>
        )}
      </div>

      {/* CARD: INFORMAÇÕES DO CARTÃO */}
      <div className="card-info-table-card">
        <h2>Informações do cartão</h2>
        <div className="info-rows-list">
          <div className="info-data-row">
            <span>Tipo</span>
            <strong>
              {card.type === "credit"
                ? "Crédito"
                : card.type === "debit"
                  ? "Débito"
                  : "Crédito e Débito"}
            </strong>
          </div>
          <div className="info-data-row">
            <span>Banco / Instituição</span>
            <strong>{card.institution}</strong>
          </div>
          <div className="info-data-row">
            <span>Últimos 4 dígitos</span>
            <strong>•••• {card.lastFour}</strong>
          </div>
          <div className="info-data-row">
            <span>Função</span>
            <strong>
              {card.type === "credit"
                ? "Cartão de Crédito"
                : card.type === "debit"
                  ? "Cartão de Débito"
                  : "Múltiplo (Crédito/Débito)"}
            </strong>
          </div>
          <div className="info-data-row">
            <span>Dia de fechamento</span>
            <strong>
              {card.closingDay
                ? `Dia ${String(card.closingDay).padStart(2, "0")}`
                : "—"}
            </strong>
          </div>
          <div className="info-data-row">
            <span>Dia de vencimento</span>
            <strong>
              {card.dueDay
                ? `Dia ${String(card.dueDay).padStart(2, "0")}`
                : "—"}
            </strong>
          </div>
        </div>
      </div>

      {/* SEÇÃO: COMPRAS DO CARTÃO + SELETOR DE MÊS */}
      <div className="card-purchases-card">
        <div className="card-purchases-header">
          <h2>Compras do cartão</h2>
          <div className="period-dropdown-box">
            <button
              type="button"
              className="cards-period-btn"
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            >
              <span>
                {MONTH_NAMES[selectedMonth - 1]} / {selectedYear}
              </span>
              <ChevronDown size={14} />
            </button>

            {showPeriodMenu && (
              <div className="period-popover-menu">
                <div className="popover-grid">
                  <label>
                    <span>Mês</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) =>
                        setSelectedMonth(Number(e.target.value))
                      }
                    >
                      {MONTH_NAMES.map((name, i) => (
                        <option key={i + 1} value={i + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Ano</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="popover-close-btn"
                  onClick={() => setShowPeriodMenu(false)}
                >
                  Aplicar período
                </button>
              </div>
            )}
          </div>
        </div>

        {purchases.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Nenhuma compra neste período"
            description="Use o botão de adicionar para registrar compras."
          />
        ) : (
          <div className="purchases-list-vibrant">
            {purchases.map((purchase) => (
              <div className="purchase-item-vibrant" key={purchase.id}>
                <div className="purchase-left-wrap">
                  <div className="purchase-category-icon">
                    <ShoppingBag size={18} />
                  </div>
                  <div className="purchase-texts">
                    <strong>{purchase.description}</strong>
                    <small>
                      {new Intl.DateTimeFormat("pt-BR").format(
                        new Date(`${purchase.date}T12:00:00`),
                      )}{" "}
                      ·{" "}
                      {purchase.paymentType === "debit"
                        ? "Débito"
                        : "Crédito"}
                    </small>
                  </div>
                </div>

                <div className="purchase-right-wrap">
                  <div className="purchase-price-col">
                    <b>{formatCurrency(purchase.amount)}</b>
                    {purchase.installments > 1 && (
                      <span>
                        {purchase.installmentNumber}x de{" "}
                        {formatCurrency(
                          purchase.amount / purchase.installments,
                        )}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="action-icon-btn"
                    onClick={() => setEditing(purchase)}
                    aria-label="Editar compra"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="action-icon-btn delete"
                    onClick={() => void deletePurchase(purchase)}
                    aria-label="Excluir compra"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTÃO EDITAR CARTÃO NO RODAPÉ */}
      <button
        type="button"
        className="btn-card-edit-action"
        onClick={() => setEditingCardModal(true)}
      >
        <Pencil size={15} /> Editar cartão
      </button>

      {/* MODAL ADICIONAR COMPRA */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Adicionar compra"
        description="A compra ficará vinculada a este cartão."
      >
        <form className="modal-form" onSubmit={addPurchase}>
          <Field label="Descrição da compra">
            <input
              name="description"
              placeholder="Ex.: Supermercado, Farmácia"
              required
            />
          </Field>
          <div className="form-grid two">
            <Field label="Valor total (R$)">
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ex.: 150.00"
                required
              />
            </Field>
            <Field label="Número de parcelas">
              <input
                name="installments"
                type="number"
                min="1"
                max="48"
                defaultValue="1"
                required
              />
            </Field>
          </div>
          <div className="form-grid two">
            <Field label="Data da compra">
              <input
                name="purchaseDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </Field>
            <Field label="Categoria">
              <select name="categoryId">
                <option value="">Sem categoria</option>
                {account?.categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar compra"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR COMPRA */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar compra"
        description="A compra e seus lançamentos vinculados serão atualizados."
      >
        {editing && (
          <form className="modal-form" onSubmit={editPurchase}>
            <Field label="Descrição">
              <input
                name="description"
                defaultValue={editing.description}
                required
              />
            </Field>
            <div className="form-grid two">
              <Field label="Valor total">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={editing.amount}
                  required
                />
              </Field>
              <Field label="Data">
                <input
                  name="date"
                  type="date"
                  defaultValue={editing.date}
                  required
                />
              </Field>
            </div>
            <Field label="Categoria">
              <select
                name="categoryId"
                defaultValue={editing.categoryId ?? ""}
              >
                <option value="">Sem categoria</option>
                {account?.categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

