"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Pill,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  User,
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
import { formatCurrency, formatDate } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total?: number;
};

type Purchase = {
  id: string;
  description: string;
  date: string;
  total: number;
  status: "paid" | "open" | "partial" | "overdue";
  paid: number;
  remaining: number;
  items: Item[];
};

type Detail = {
  store: {
    id: string;
    name: string;
    holder: string;
    limit: number;
    used: number;
    available: number;
    type: string;
    address: string;
    phone: string;
    dueDateNote: string;
    backgroundImage: string;
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

function getPurchaseCategoryIcon(description: string) {
  const check = description.toLowerCase();
  if (
    check.includes("medicamento") ||
    check.includes("remedio") ||
    check.includes("farmacia")
  ) {
    return (
      <div className="store-purchase-icon green">
        <ShoppingBag size={18} />
      </div>
    );
  }
  if (check.includes("dipirona") || check.includes("comprimido")) {
    return (
      <div className="store-purchase-icon blue">
        <Pill size={18} />
      </div>
    );
  }
  if (check.includes("higiene") || check.includes("creme") || check.includes("dental")) {
    return (
      <div className="store-purchase-icon purple">
        <ShoppingBag size={18} />
      </div>
    );
  }
  return (
    <div className="store-purchase-icon red">
      <Plus size={18} />
    </div>
  );
}

export default function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingStoreModal, setEditingStoreModal] = useState(false);
  const [items, setItems] = useState<Item[]>([
    { id: "1", name: "", quantity: 1, unitPrice: 0 },
  ]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/stores/${id}?month=${monthParam}`, {
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    if (response.ok) setDetail(result);
    else setDetail(null);
    setLoading(false);
  }, [id, monthParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  function updateItem(
    itemId: string,
    key: "name" | "quantity" | "unitPrice",
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [key]: value } : item,
      ),
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const values = new FormData(event.currentTarget);
    const response = await fetch(`/api/stores/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: values.get("date"), items }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível salvar a compra.",
      );
    setItems([{ id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0 }]);
    setOpen(false);
    await load();
    toast.success("Compra salva no comércio e no Financeiro.");
  }

  if (loading) {
    return (
      <div className="store-details-page-vibrant">
        <p>Carregando comércio...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="store-details-page-vibrant">
        <EmptyState
          icon={Store}
          title="Comércio não encontrado"
          description="Volte à lista e selecione um comércio disponível."
          action={
            <Link className="primary-button" href="/comercios">
              Voltar aos comércios
            </Link>
          }
        />
      </div>
    );
  }

  const { store, purchases } = detail;
  const percent = store.limit
    ? Math.min(100, Math.round((store.used / store.limit) * 100))
    : 0;

  return (
    <div className="store-details-page-vibrant">
      {/* TOPO DE NAVEGAÇÃO: BOTÃO VOLTAR E MENU DE 3 PONTINHOS */}
      <div className="card-details-top-nav">
        <Link href="/comercios" className="card-back-btn">
          <ArrowLeft size={18} /> Detalhes do comércio
        </Link>
        <button
          type="button"
          className="cards-notification-btn"
          onClick={() => setEditingStoreModal(true)}
          aria-label="Opções"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* HERO COVER DO COMÉRCIO (ESTILO FARMÁCIA SÃO JOÃO / CAPITINHA) */}
      <div className="store-details-hero-card">
        {store.backgroundImage && (
          <div
            className="store-details-hero-bg"
            style={{ backgroundImage: `url(${store.backgroundImage})` }}
          />
        )}

        <div className="store-details-hero-content">
          <div className="store-details-hero-top">
            <div className="store-details-hero-brand">
              <div className="store-details-logo-wrap">
                {store.backgroundImage ? (
                  <img src={store.backgroundImage} alt={store.name} />
                ) : store.name.includes("Farmácia") ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#00ba78",
                        fontSize: "26px",
                        fontWeight: "900",
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                    <span
                      style={{
                        color: "#0f4235",
                        fontSize: "7px",
                        fontWeight: "900",
                        textAlign: "center",
                        lineHeight: 1,
                        marginTop: 2,
                      }}
                    >
                      FARMÁCIA
                      <br />
                      SÃO JOÃO
                    </span>
                  </div>
                ) : store.name.includes("Capitinha") ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#0f8b8d",
                        fontSize: "14px",
                        fontWeight: "900",
                      }}
                    >
                      CAP
                    </span>
                  </div>
                ) : (
                  <ShoppingBag size={24} color="#00ba78" />
                )}
              </div>

              <div className="store-details-hero-text">
                <h1>{store.name}</h1>
                <small>{store.type || "Crediário"}</small>
                <p>
                  <User size={13} style={{ display: "inline" }} />
                  Titular: <strong>{store.holder}</strong>
                </p>
              </div>
            </div>

            <div className="store-details-store-badge-icon">
              <Store size={18} />
            </div>
          </div>

          {/* CAIXA BRANCA DE MÉTRICAS */}
          <div className="store-details-metrics-box">
            <div className="store-details-metrics-row">
              <div className="store-details-metric-col">
                <span>Limite total</span>
                <strong>{formatCurrency(store.limit)}</strong>
              </div>
              <div className="store-details-metric-col">
                <span>Utilizado</span>
                <strong>{formatCurrency(store.used)}</strong>
              </div>
              <div className="store-details-metric-col">
                <span>Disponível</span>
                <strong className="green-val">
                  {formatCurrency(Math.max(0, store.limit - store.used))}
                </strong>
              </div>
            </div>

            <div className="store-details-progress-bar">
              <div
                className="store-details-progress-fill"
                style={{ width: `${percent}%` }}
              />
            </div>

            <span className="store-details-usage-label">
              {percent}% do limite utilizado
            </span>
          </div>
        </div>
      </div>

      {/* CARD: INFORMAÇÕES DO COMÉRCIO */}
      <div className="store-details-info-card">
        <h2>Informações do comércio</h2>
        <div className="store-info-list">
          <div className="store-info-item">
            <div className="store-info-label-group">
              <Calendar size={15} />
              <span>Data limite</span>
            </div>
            <strong className="store-info-value">
              {store.dueDateNote || "Não possui data de vencimento"}
            </strong>
          </div>

          <div className="store-info-item">
            <div className="store-info-label-group">
              <User size={15} />
              <span>Titular</span>
            </div>
            <strong className="store-info-value">{store.holder}</strong>
          </div>

          <div className="store-info-item">
            <div className="store-info-label-group">
              <Store size={15} />
              <span>Tipo</span>
            </div>
            <strong className="store-info-value">
              {store.type || "Crediário"}
            </strong>
          </div>

          <div className="store-info-item">
            <div className="store-info-label-group">
              <MapPin size={15} />
              <span>Endereço</span>
            </div>
            <strong className="store-info-value">
              {store.address || "Rua das Flores, 123 - Centro"}
            </strong>
          </div>

          <div className="store-info-item">
            <div className="store-info-label-group">
              <Phone size={15} />
              <span>Telefone</span>
            </div>
            <strong className="store-info-value">
              {store.phone || "(48) 3333-4444"}
            </strong>
          </div>
        </div>
      </div>

      {/* SEÇÃO: COMPRAS DO COMÉRCIO COM SELETOR DE MÊS */}
      <div className="store-details-purchases-card">
        <div className="store-purchases-head">
          <h2>Compras do comércio</h2>
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
            icon={ShoppingBag}
            title="Nenhuma compra neste período"
            description="Use o botão de adicionar para registrar compras."
          />
        ) : (
          <div className="store-purchases-list">
            {purchases.map((purchase) => {
              const isExpanded = expanded === purchase.id;
              const statusPillClass =
                purchase.status === "paid"
                  ? "paid"
                  : purchase.status === "partial"
                    ? "partial"
                    : purchase.status === "overdue"
                      ? "overdue"
                      : "open";
              const statusPillText =
                purchase.status === "paid"
                  ? "Paga"
                  : purchase.status === "partial"
                    ? "Parcial"
                    : purchase.status === "overdue"
                      ? "Atrasada"
                      : "Em aberto";

              return (
                <div className="store-purchase-row-card" key={purchase.id}>
                  <div className="store-purchase-main-line">
                    <div className="store-purchase-icon-title">
                      {getPurchaseCategoryIcon(purchase.description)}
                      <div className="store-purchase-meta">
                        <strong>{purchase.description}</strong>
                        <small>
                          {formatDate(purchase.date)} ·{" "}
                          {purchase.items.length || 0} itens
                        </small>
                      </div>
                    </div>

                    <div className="store-purchase-right-area">
                      <span
                        className={`purchase-status-pill ${statusPillClass}`}
                      >
                        {statusPillText}
                      </span>
                      <strong className="store-purchase-price">
                        {formatCurrency(purchase.total)}
                      </strong>
                      <button
                        type="button"
                        className="action-icon-btn"
                        onClick={() =>
                          setExpanded(isExpanded ? null : purchase.id)
                        }
                        aria-label="Expandir itens"
                      >
                        {isExpanded ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn"
                        onClick={() => setOpen(true)}
                        aria-label="Mais opções"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>

                  {/* CAIXA DE DETALHAMENTO QUANDO É PARCIAL OU EXPANDIDO */}
                  {purchase.status === "partial" && !isExpanded && (
                    <div className="store-purchase-expand-details">
                      <div className="store-purchase-breakdown-row">
                        <span>
                          Total da compra:{" "}
                          <b>{formatCurrency(purchase.total)}</b>
                        </span>
                        <span>
                          Pago: <b>{formatCurrency(purchase.paid)}</b>
                        </span>
                        <span style={{ color: "#d97706" }}>
                          Restante: <b>{formatCurrency(purchase.remaining)}</b>
                        </span>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="store-purchase-expand-details">
                      <div className="store-purchase-breakdown-row">
                        <span>
                          Total da compra:{" "}
                          <strong>{formatCurrency(purchase.total)}</strong>
                        </span>
                        <span>
                          Pago: <strong>{formatCurrency(purchase.paid)}</strong>
                        </span>
                        <span style={{ color: "#d97706" }}>
                          Restante:{" "}
                          <strong>{formatCurrency(purchase.remaining)}</strong>
                        </span>
                      </div>

                      {purchase.items.length > 0 && (
                        <div className="store-purchase-items-accordion">
                          {purchase.items.map((item) => (
                            <div
                              className="store-purchase-item-line"
                              key={item.id}
                            >
                              <span>
                                {item.name} ({item.quantity}x{" "}
                                {formatCurrency(item.unitPrice)})
                              </span>
                              <strong>
                                {formatCurrency(
                                  item.total ?? item.quantity * item.unitPrice,
                                )}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BANNER DE OBSERVAÇÃO */}
      <div className="stores-info-banner" style={{ marginBottom: 18 }}>
        <Info size={20} />
        <span>
          Todas as compras deste comércio são vinculadas ao seu limite e ficam
          disponíveis em Contas para pagamento.
        </span>
      </div>

      {/* BOTÃO EDITAR COMÉRCIO OUTLINE */}
      <button
        type="button"
        className="btn-edit-store-outline"
        onClick={() => setEditingStoreModal(true)}
      >
        <Pencil size={15} /> Editar comércio
      </button>

      {/* MODAL ADICIONAR COMPRA COM ITENS */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Adicionar compra no comércio"
        description="Os produtos e o valor total serão vinculados ao comércio e ao Financeiro."
      >
        <form className="modal-form" onSubmit={save}>
          <Field label="Data da compra">
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
          <div className="purchase-items">
            {items.map((item, index) => (
              <div className="purchase-item-form" key={item.id}>
                <b>{index + 1}</b>
                <Field label="Produto">
                  <input
                    value={item.name}
                    onChange={(event) =>
                      updateItem(item.id, "name", event.target.value)
                    }
                    placeholder="Nome do produto"
                    required
                  />
                </Field>
                <Field label="Qtd.">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(
                        item.id,
                        "quantity",
                        Number(event.target.value),
                      )
                    }
                    required
                  />
                </Field>
                <Field label="Valor unitário (R$)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(event) =>
                      updateItem(
                        item.id,
                        "unitPrice",
                        Number(event.target.value),
                      )
                    }
                    required
                  />
                </Field>
                <button
                  type="button"
                  aria-label="Remover produto"
                  onClick={() =>
                    setItems((current) =>
                      current.filter(
                        (currentItem) => currentItem.id !== item.id,
                      ),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="add-row-button"
            onClick={() =>
              setItems((current) => [
                ...current,
                { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0 },
              ])
            }
          >
            <Plus size={15} /> Adicionar produto
          </button>
          <div className="purchase-total">
            <span>Total da compra</span>
            <strong>{formatCurrency(total)}</strong>
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
    </div>
  );
}

