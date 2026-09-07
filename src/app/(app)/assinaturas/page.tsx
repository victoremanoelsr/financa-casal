"use client";

import {
  CalendarDays,
  Plus,
  MoreVertical,
  Pencil,
  Power,
  Trash2,
  ChevronDown,
  Info,
  Lightbulb,
  CreditCard,
  QrCode,
  ArrowLeft,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Field, Modal } from "@/components/ui";
import { MonthYearPicker } from "@/components/month-year-picker";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type CardOption = {
  id: string;
  name: string;
  institution: string;
  lastFour: string;
  holder?: string;
};

type SubscriptionItem = {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  amount: number;
  dueDay: number;
  frequency: string;
  paymentMethod: string;
  card?: string;
  cardId?: string;
  cardLastFour?: string;
  status: "active" | "paused";
  imageUrl?: string | null;
  createdAt: string;
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

// Cores e ícones predefinidos para logos conhecidas caso o usuário não envie imagem
const BRAND_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  netflix: { bg: "#000000", color: "#e50914", label: "N" },
  spotify: { bg: "#191414", color: "#1db954", label: "S" },
  "prime video": { bg: "#00a8e1", color: "#ffffff", label: "Prime" },
  amazon: { bg: "#00a8e1", color: "#ffffff", label: "A" },
  "youtube premium": { bg: "#ff0000", color: "#ffffff", label: "▶" },
  youtube: { bg: "#ff0000", color: "#ffffff", label: "▶" },
  "hbo max": { bg: "#5822b4", color: "#ffffff", label: "HBO" },
  max: { bg: "#002be7", color: "#ffffff", label: "MAX" },
  "disney+": { bg: "#040714", color: "#ffffff", label: "D+" },
  "google one": { bg: "#ffffff", color: "#4285f4", label: "G1" },
  icloud: { bg: "#3699ff", color: "#ffffff", label: "☁" },
  "apple music": { bg: "#fa243c", color: "#ffffff", label: "♫" },
  academia: { bg: "#11222e", color: "#00c882", label: "FIT" },
};

function getBrandStyle(name: string) {
  const lower = name.toLowerCase().trim();
  for (const [key, style] of Object.entries(BRAND_STYLES)) {
    if (lower.includes(key)) return style;
  }
  return { bg: "#1e3a4c", color: "#ffffff", label: name.slice(0, 2).toUpperCase() };
}

export default function SubscriptionsPage() {
  const { data: account } = useAccount();
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState("card");
  const [cards, setCards] = useState<CardOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">(
    "all",
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [periodOpen, setPeriodOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<SubscriptionItem | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const [currentYear, currentMonthNum] = month.split("-").map(Number);

  const load = useCallback(async () => {
    const response = await fetch(`/api/subscriptions?month=${month}`, {
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    if (response.ok) setItems(result?.subscriptions ?? []);
    else
      toast.error(
        result?.message ?? "Não foi possível carregar as assinaturas.",
      );
  }, [month]);

  useEffect(() => {
    void load();
    void fetch("/api/cards", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setCards(result?.cards ?? []))
      .catch(() => setCards([]));
  }, [load]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = items.filter(
    (item) => statusFilter === "all" || item.status === statusFilter,
  );
  const active = items.filter((item) => item.status === "active");
  const monthly = active.reduce((sum, item) => sum + item.amount, 0);

  const handlePeriodSelect = (selectedMonth: number, selectedYear: number) => {
    const formatted = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    setMonth(formatted);
    setPeriodOpen(false);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amount = Number(data.get("amount"));
    if (amount <= 0) return toast.error("Informe um valor válido.");
    const selectedCard = cards.find(
      (card) => card.id === String(data.get("card")),
    );
    if (payment === "card" && !selectedCard)
      return toast.error("Cadastre ou selecione um cartão válido.");
    setSaving(true);
    const response = await fetch(
      editing ? `/api/subscriptions/${editing.id}` : "/api/subscriptions",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          amount,
          dueDay: data.get("dueDay"),
          frequency: data.get("frequency") || "monthly",
          categoryId: data.get("categoryId"),
          paymentMethod: payment,
          cardId: selectedCard?.id ?? null,
          imageUrl,
          startOption: data.get("startOption") || "current",
        }),
      },
    );
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível salvar a assinatura.",
      );
    form.reset();
    setImageUrl(null);
    setEditing(null);
    await load();
    setOpen(false);
    toast.success("Assinatura salva com sucesso!");
  }

  function edit(item: SubscriptionItem) {
    setEditing(item);
    setPayment(item.paymentMethod);
    setImageUrl(item.imageUrl ?? null);
    setActiveMenu(null);
    setOpen(true);
  }

  async function act(
    item: SubscriptionItem,
    action: "activate" | "deactivate" | "delete",
  ) {
    if (
      action === "delete" &&
      !window.confirm(`Deseja realmente excluir a assinatura “${item.name}”?`)
    )
      return;
    const r = await fetch(`/api/subscriptions/${item.id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ action }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok)
      return toast.error(
        j?.message ?? "Não foi possível atualizar a assinatura.",
      );
    setActiveMenu(null);
    await load();
    toast.success(
      action === "delete" ? "Assinatura excluída." : "Status atualizado.",
    );
  }

  return (
    <div className="sub-page-vibrant">
      {/* CABEÇALHO COM BOTÃO VOLTAR E SELETOR DE PERÍODO COMPACTO */}
      <header className="sub-top-header">
        <div className="sub-header-left">
          <Link href="/menu" className="sub-back-btn" title="Voltar ao menu">
            <ArrowLeft size={20} />
          </Link>
          <div className="sub-title-group">
            <h1>Assinaturas</h1>
            <p>Gerencie suas assinaturas e onde cada uma é paga.</p>
          </div>
        </div>

        <MonthYearPicker
          value={month}
          onChange={(newMonth) => setMonth(newMonth)}
        />
      </header>

      {/* BOTÃO NOVA ASSINATURA */}
      <div className="sub-action-row">
        <button
          type="button"
          className="sub-btn-new"
          onClick={() => {
            setEditing(null);
            setPayment("card");
            setImageUrl(null);
            setOpen(true);
          }}
        >
          <Plus size={18} />
          <span>Nova assinatura</span>
        </button>
      </div>

      {/* DOIS CARDS COMPACTOS: ASSINATURAS ATIVAS E VALOR MENSAL */}
      <section className="sub-kpis-grid">
        <article className="sub-kpi-card">
          <div className="sub-kpi-icon green">
            <CalendarDays size={20} />
          </div>
          <div className="sub-kpi-data">
            <small>Assinaturas ativas</small>
            <strong>{active.length}</strong>
            <span>Total de assinaturas neste mês</span>
          </div>
        </article>

        <article className="sub-kpi-card">
          <div className="sub-kpi-icon green">
            <DollarSign size={20} />
          </div>
          <div className="sub-kpi-data">
            <small>Valor mensal das assinaturas</small>
            <strong className="emerald-val">{formatCurrency(monthly)}</strong>
            <span>Valor total, não incluso nas despesas</span>
          </div>
        </article>
      </section>

      {/* AVISO AZUL INFORMATIVO */}
      <div className="sub-info-banner-blue">
        <Info size={18} />
        <p>Este valor é apenas informativo e não é lançado como despesa.</p>
      </div>

      {/* SEÇÃO PRINCIPAL: SUAS ASSINATURAS */}
      <section className="sub-main-panel">
        <div className="sub-panel-header">
          <h2>Suas assinaturas</h2>
          <div className="sub-filter-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="paused">Inativas</option>
            </select>
            <ChevronDown size={14} className="select-arrow-icon" />
          </div>
        </div>

        {/* LISTA DE CARDS DE ASSINATURA */}
        <div className="sub-cards-list">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const brand = getBrandStyle(item.name);
              return (
                <article key={item.id} className="sub-item-card">
                  {/* LOGO OU ÍCONE */}
                  <div
                    className="sub-card-logo"
                    style={
                      item.imageUrl
                        ? { backgroundImage: `url(${item.imageUrl})` }
                        : { backgroundColor: brand.bg, color: brand.color }
                    }
                  >
                    {!item.imageUrl && <span>{brand.label}</span>}
                  </div>

                  {/* INFORMAÇÕES PRINCIPAIS */}
                  <div className="sub-card-body">
                    <div className="sub-card-title-row">
                      <div className="sub-card-title-col">
                        <strong>{item.name}</strong>
                        <small className="sub-category-tag">
                          {item.category || "Entretenimento"}
                        </small>
                      </div>

                      <div className="sub-card-due-col">
                        <span className="due-day-label">
                          <CalendarDays size={12} />
                          Vence dia <b>{String(item.dueDay).padStart(2, "0")}</b>
                        </span>
                        <span className="sub-amount-label">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>

                      <div className="sub-card-status-col">
                        <span
                          className={`sub-badge ${item.status === "active" ? "active" : "inactive"}`}
                        >
                          {item.status === "active" ? "Ativa" : "Inativa"}
                        </span>
                        <div className="sub-menu-wrap" ref={menuRef}>
                          <button
                            type="button"
                            className="sub-dots-btn"
                            aria-label="Ações"
                            onClick={() =>
                              setActiveMenu(
                                activeMenu === item.id ? null : item.id,
                              )
                            }
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenu === item.id && (
                            <div className="sub-action-dropdown">
                              <button
                                type="button"
                                onClick={() => edit(item)}
                              >
                                <Pencil size={14} />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void act(
                                    item,
                                    item.status === "active"
                                      ? "deactivate"
                                      : "activate",
                                  )
                                }
                              >
                                <Power size={14} />
                                {item.status === "active"
                                  ? "Desativar"
                                  : "Ativar"}
                              </button>
                              <button
                                type="button"
                                className="danger-opt"
                                onClick={() => void act(item, "delete")}
                              >
                                <Trash2 size={14} />
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* LINHA INFERIOR COM FORMA DE PAGAMENTO E DATA CADASTRO */}
                    <div className="sub-card-footer-row">
                      <div className="sub-payment-pill">
                        {item.paymentMethod === "card" ? (
                          <>
                            <CreditCard size={13} />
                            <span>
                              Cartão: {item.card || "Principal"}{" "}
                              {item.cardLastFour ? `•••• ${item.cardLastFour}` : ""}
                            </span>
                          </>
                        ) : (
                          <>
                            <QrCode size={13} />
                            <span>Pagamento: {item.paymentMethod.toUpperCase()}</span>
                          </>
                        )}
                      </div>

                      <span className="sub-date-info">
                        Cadastrada em{" "}
                        {new Intl.DateTimeFormat("pt-BR").format(
                          new Date(item.createdAt),
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="sub-empty-state">
              <CalendarDays size={36} />
              <strong>Nenhuma assinatura cadastrada</strong>
              <p>Adicione suas assinaturas para controlar os vencimentos.</p>
            </div>
          )}
        </div>
      </section>

      {/* AVISO DE CONTROLE AMARELO INFORMATIVO */}
      <div className="sub-info-banner-yellow">
        <Lightbulb size={20} />
        <p>
          Assinaturas são apenas para controle e lembrete. Elas não são
          lançadas como despesa no financeiro e não aparecem nos relatórios.
        </p>
      </div>

      {/* MODAL / BOTTOM SHEET DE CADASTRO / EDIÇÃO */}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setImageUrl(null);
        }}
        title={editing ? "Editar assinatura" : "Nova assinatura"}
        description="Cadastro informativo: controle datas e forma de pagamento sem duplicar faturas."
      >
        <form
          className="modal-form"
          onSubmit={submit}
          key={editing?.id ?? "new"}
        >
          <div className="form-grid two">
            <Field label="Nome da assinatura">
              <input
                name="name"
                placeholder="Ex.: Netflix, Spotify, Prime..."
                defaultValue={editing?.name}
                required
              />
            </Field>
            <Field label="Imagem ou Logo (opcional)">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImageUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
          </div>

          <div className="form-grid two">
            <Field label="Valor mensal">
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                defaultValue={editing?.amount}
                required
              />
            </Field>
            <Field label="Dia do vencimento">
              <input
                name="dueDay"
                type="number"
                min="1"
                max="31"
                placeholder="Ex.: 15"
                defaultValue={editing?.dueDay}
                required
              />
            </Field>
          </div>

          <div className="form-grid two">
            <Field label="Categoria">
              <select
                name="categoryId"
                defaultValue={editing?.categoryId ?? ""}
              >
                <option value="">Selecione (ex: Entretenimento)</option>
                {account?.categories
                  .filter((category) => category.kind !== "income")
                  .map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Onde costuma pagar?">
              <select
                value={payment}
                onChange={(event) => setPayment(event.target.value)}
              >
                <option value="card">Cartão</option>
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="bank_transfer">Transferência</option>
                <option value="other">Outro</option>
              </select>
            </Field>
          </div>

          {!editing && (
            <Field label="Primeira cobrança desta assinatura">
              <select name="startOption" defaultValue="current">
                <option value="current">
                  Cobrar a partir deste mês ({MONTH_NAMES[currentMonthNum - 1]}/{currentYear})
                </option>
                <option value="next">
                  Cobrar apenas a partir do próximo mês ({MONTH_NAMES[currentMonthNum % 12]}/{currentMonthNum === 12 ? currentYear + 1 : currentYear})
                </option>
              </select>
            </Field>
          )}

          {payment === "card" && (
            <Field
              label="Qual cartão?"
              hint={
                cards.length === 0
                  ? "Nenhum cartão cadastrado na família."
                  : "Selecione o cartão de onde costuma pagar."
              }
            >
              <select
                name="card"
                required
                disabled={cards.length === 0}
                defaultValue={editing?.cardId ?? ""}
              >
                <option value="">
                  {cards.length === 0
                    ? "Nenhum cartão cadastrado"
                    : "Selecione o cartão"}
                </option>
                {cards.map((card) => (
                  <option value={card.id} key={card.id}>
                    {card.name} •••• {card.lastFour}{" "}
                    {card.holder ? `— ${card.holder}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setOpen(false);
                setEditing(null);
                setImageUrl(null);
              }}
            >
              Cancelar
            </button>
            <button disabled={saving} className="primary-button">
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar alterações"
                  : "Cadastrar assinatura"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

