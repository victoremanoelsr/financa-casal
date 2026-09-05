"use client";

import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  MoreVertical,
  Pencil,
  Plus,
  Radio,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type CardItem = {
  id: string;
  name: string;
  institution: string;
  holder: string;
  holderMemberId: string;
  type: "credit" | "debit" | "credit_debit";
  limit: number;
  closingDay: number | null;
  dueDay: number | null;
  lastFour: string;
  visualKey: string;
  backgroundImage: string;
  used: number;
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

export default function CardsPage() {
  const { data: account } = useAccount();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CardItem | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [cardType, setCardType] = useState<"credit" | "debit" | "credit_debit">(
    "credit",
  );
  const [backgroundImage, setBackgroundImage] = useState("");
  const [backgroundImageFile, setBackgroundImageFile] =
    useState<File | null>(null);

  // Period Selector State
  const currentDate = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const monthParam = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const loadCards = useCallback(async () => {
    const response = await fetch("/api/cards", { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (response.ok) setCards(result?.cards ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  // Totals calculations
  const totalLimit = useMemo(
    () =>
      cards
        .filter((c) => c.type !== "debit")
        .reduce((sum, c) => sum + (c.limit || 0), 0),
    [cards],
  );

  const totalUsed = useMemo(
    () =>
      cards
        .filter((c) => c.type !== "debit")
        .reduce((sum, c) => sum + (c.used || 0), 0),
    [cards],
  );

  const totalAvailable = useMemo(
    () => Math.max(0, totalLimit - totalUsed),
    [totalLimit, totalUsed],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    if (backgroundImageFile) values.set("backgroundImage", backgroundImageFile);
    else values.delete("backgroundImage");
    const response = await fetch("/api/cards", {
      method: "POST",
      body: values,
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível salvar o cartão.",
      );
    form.reset();
    setOpen(false);
    setBackgroundImage("");
    setBackgroundImageFile(null);
    setCardType("credit");
    await loadCards();
    toast.success("Cartão cadastrado com sucesso.");
  }

  async function editCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const values = new FormData(event.currentTarget);
    values.set("type", editing.type);
    if (editImageFile) values.set("backgroundImage", editImageFile);
    else values.delete("backgroundImage");
    const response = await fetch(`/api/cards/${editing.id}`, {
      method: "PATCH",
      body: values,
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível editar o cartão.",
      );
    setEditing(null);
    setEditImageFile(null);
    setEditImagePreview("");
    await loadCards();
    toast.success("Cartão atualizado.");
  }

  return (
    <div className="cards-page-vibrant">
      {/* CABEÇALHO COM AVATAR, TÍTULO E SINO */}
      <header className="cards-top-header">
        <div className="cards-header-left">
          <div className="cards-user-avatar">F</div>
          <div className="cards-title-group">
            <h1>Cartões</h1>
            <p>Acompanhe seus cartões e limite disponível.</p>
          </div>
        </div>
        <button
          type="button"
          className="cards-notification-btn"
          aria-label="Notificações"
        >
          <Bell size={18} />
        </button>
      </header>

      {/* BARRA DE AÇÕES COM SELETOR DE PERÍODO COMPACTO E NOVO CARTÃO */}
      <div className="cards-toolbar-row">
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
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
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

        <button
          type="button"
          className="cards-btn-new"
          onClick={() => setOpen(true)}
        >
          <Plus size={15} /> Novo cartão
        </button>
      </div>

      {/* 3 CARDS COMPACTOS NO TOPO (Limite total, Utilizado, Disponível) */}
      <div className="cards-kpi-grid">
        <div className="cards-kpi-card">
          <div className="cards-kpi-top">
            <span className="cards-kpi-icon green">
              <CreditCard size={14} />
            </span>
            <small>Limite total</small>
          </div>
          <strong className="cards-kpi-val green">
            {formatCurrency(totalLimit)}
          </strong>
          <span>Todos os cartões</span>
        </div>

        <div className="cards-kpi-card">
          <div className="cards-kpi-top">
            <span className="cards-kpi-icon orange">
              <TrendingUp size={14} />
            </span>
            <small>Utilizado</small>
          </div>
          <strong className="cards-kpi-val orange">
            {formatCurrency(totalUsed)}
          </strong>
          <span>Total em aberto</span>
        </div>

        <div className="cards-kpi-card">
          <div className="cards-kpi-top">
            <span className="cards-kpi-icon teal">
              <CheckCircle2 size={14} />
            </span>
            <small>Disponível</small>
          </div>
          <strong className="cards-kpi-val teal">
            {formatCurrency(totalAvailable)}
          </strong>
          <span>Limite livre</span>
        </div>
      </div>

      {/* LISTAGEM DE CARTÕES REALISTAS */}
      {loading ? (
        <section className="panel module-section">
          <p>Carregando cartões...</p>
        </section>
      ) : cards.length === 0 ? (
        <section className="panel module-section">
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão cadastrado"
            description="Os cartões que você adicionar aparecerão aqui."
          />
        </section>
      ) : (
        <div className="cards-list-stack">
          {cards.map((card) => {
            const themeClass = getCardTheme(
              card.institution,
              card.name,
              card.visualKey,
            );
            const usagePercent =
              card.type !== "debit" && card.limit > 0
                ? Math.min(100, Math.round((card.used / card.limit) * 100))
                : 0;

            const progressFillClass =
              usagePercent > 85
                ? "danger"
                : usagePercent > 65
                  ? "warning"
                  : "";

            return (
              <Link
                key={card.id}
                href={`/cartoes/${card.id}?month=${monthParam}`}
                className={`vibrant-credit-card ${themeClass}`}
              >
                {card.backgroundImage && (
                  <div
                    className="card-bg-custom"
                    style={{ backgroundImage: `url(${card.backgroundImage})` }}
                  />
                )}

                {/* Topo do Cartão: Logo / Banco + Tipo + Ações */}
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditing(card);
                        setEditImageFile(null);
                        setEditImagePreview(card.backgroundImage);
                      }}
                      aria-label="Opções do cartão"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>

                {/* Meio do Cartão: Chip + Dígitos */}
                <div className="card-middle-bar">
                  <div className="card-chip" />
                  <span className="card-digits">•••• {card.lastFour}</span>
                </div>

                {/* Linha do Titular e Datas */}
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

                {/* Barra de Progresso e Limites */}
                <div className="card-progress-section">
                  <div className="card-limits-header">
                    <div className="limit-item-left">
                      <small>Utilizado</small>
                      <strong>{formatCurrency(card.used)}</strong>
                    </div>
                    <div className="limit-item-right">
                      <small>Limite total</small>
                      <strong>
                        {card.type !== "debit"
                          ? formatCurrency(card.limit)
                          : "Débito"}
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
              </Link>
            );
          })}
        </div>
      )}

      {/* MODAL ADICIONAR CARTÃO */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Adicionar cartão"
        description="O cartão será salvo no cadastro da sua família."
      >
        <form className="modal-form" onSubmit={submit}>
          <div className="form-grid two">
            <Field label="Nome do cartão">
              <input name="name" placeholder="Ex.: Nubank Principal" required />
            </Field>
            <Field label="Banco ou instituição">
              <input
                name="institution"
                placeholder="Ex.: Nubank, Itaú, Inter"
                required
              />
            </Field>
          </div>
          <div className="form-grid two">
            <Field label="Titular">
              <select name="holderMemberId" required>
                <option value="">Selecione</option>
                {account?.members.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select
                name="type"
                value={cardType}
                onChange={(event) =>
                  setCardType(event.target.value as typeof cardType)
                }
              >
                <option value="credit">Crédito</option>
                <option value="debit">Débito</option>
                <option value="credit_debit">Crédito e Débito</option>
              </select>
            </Field>
          </div>
          <div className="form-grid two">
            <Field label="Últimos 4 números">
              <input
                name="lastFour"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="0000"
                required
              />
            </Field>
            {cardType !== "debit" && (
              <Field label="Limite total (R$)">
                <input
                  name="limit"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ex.: 2500.00"
                  required
                />
              </Field>
            )}
          </div>
          {cardType !== "debit" && (
            <div className="form-grid two">
              <Field label="Dia de fechamento">
                <input
                  name="closingDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex.: 3"
                  required
                />
              </Field>
              <Field label="Dia de vencimento">
                <input
                  name="dueDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex.: 10"
                  required
                />
              </Field>
            </div>
          )}
          <Field
            label="Imagem de fundo (opcional)"
            hint="PNG, JPG, JPEG ou WEBP"
          >
            <input
              name="backgroundImage"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setBackgroundImageFile(file);
                const reader = new FileReader();
                reader.onload = () => setBackgroundImage(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
          </Field>
          {backgroundImage && (
            <div
              className="card-image-preview"
              style={{
                backgroundImage: `linear-gradient(145deg,rgba(4,25,33,.45),rgba(8,42,52,.7)),url(${backgroundImage})`,
              }}
            >
              <span>Prévia do cartão</span>
              <button
                type="button"
                onClick={() => {
                  setBackgroundImage("");
                  setBackgroundImageFile(null);
                }}
              >
                Remover imagem
              </button>
            </div>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar cartão"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR CARTÃO */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar cartão"
        description="Atualize os dados e a imagem do cartão."
      >
        {editing && (
          <form className="modal-form" onSubmit={editCard}>
            <div className="form-grid two">
              <Field label="Nome do cartão">
                <input name="name" defaultValue={editing.name} required />
              </Field>
              <Field label="Banco ou instituição">
                <input
                  name="institution"
                  defaultValue={editing.institution}
                  required
                />
              </Field>
            </div>
            <div className="form-grid two">
              <Field label="Titular">
                <select
                  name="holderMemberId"
                  defaultValue={editing.holderMemberId}
                  required
                >
                  {account?.members.map((member) => (
                    <option value={member.id} key={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo">
                <select
                  name="type"
                  value={editing.type}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      type: event.target.value as CardItem["type"],
                    })
                  }
                >
                  <option value="credit">Crédito</option>
                  <option value="debit">Débito</option>
                  <option value="credit_debit">Crédito e Débito</option>
                </select>
              </Field>
            </div>
            <div className="form-grid two">
              <Field label="Últimos 4 números">
                <input
                  name="lastFour"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  defaultValue={editing.lastFour}
                  required
                />
              </Field>
              {editing.type !== "debit" && (
                <Field label="Limite total (R$)">
                  <input
                    name="limit"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={editing.limit}
                    required
                  />
                </Field>
              )}
            </div>
            {editing.type !== "debit" && (
              <div className="form-grid two">
                <Field label="Dia de fechamento">
                  <input
                    name="closingDay"
                    type="number"
                    min="1"
                    max="31"
                    defaultValue={editing.closingDay ?? ""}
                    required
                  />
                </Field>
                <Field label="Dia de vencimento">
                  <input
                    name="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    defaultValue={editing.dueDay ?? ""}
                    required
                  />
                </Field>
              </div>
            )}
            <Field
              label="Alterar imagem de fundo"
              hint="Se não escolher outra imagem, a atual será mantida."
            >
              <input
                name="backgroundImage"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setEditImageFile(file);
                  const reader = new FileReader();
                  reader.onload = () =>
                    setEditImagePreview(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
            {editImagePreview && (
              <div
                className="card-image-preview"
                style={{
                  backgroundImage: `linear-gradient(145deg,rgba(4,25,33,.18),rgba(8,42,52,.38)),url(${editImagePreview})`,
                }}
              >
                <span>Prévia da imagem</span>
              </div>
            )}
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

