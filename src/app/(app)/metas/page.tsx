"use client";

import Link from "next/link";
import {
  CalendarDays,
  Car,
  ChevronRight,
  Gift,
  Goal as GoalIcon,
  House,
  MoreVertical,
  Plane,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  X,
  ArrowUp,
  ArrowDown,
  Info,
  AlertTriangle,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";

type GoalItem = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  description?: string;
  icon: string;
  color: string;
  status: string;
};

const iconCategories = [
  { id: "travel", label: "Viagem", Icon: Plane, color: "#2563eb", bg: "#eff6ff" },
  { id: "reserve", label: "Reserva", Icon: ShieldCheck, color: "#00ba78", bg: "#e8f9f2" },
  { id: "home", label: "Casa", Icon: House, color: "#8b5cf6", bg: "#f5f3ff" },
  { id: "vehicle", label: "Veículo", Icon: Car, color: "#0f8b8d", bg: "#e6f6f7" },
  { id: "device", label: "Eletrônico", Icon: Smartphone, color: "#f59e0b", bg: "#fffbeb" },
  { id: "event", label: "Evento", Icon: Gift, color: "#ec4899", bg: "#fdf2f8" },
  { id: "target", label: "Outro", Icon: Target, color: "#64748b", bg: "#f1f5f9" },
];

function getCategoryConfig(iconId: string) {
  return iconCategories.find((x) => x.id === iconId) ?? {
    id: "target",
    label: "Objetivo",
    Icon: Target,
    color: "#00ba78",
    bg: "#e8f9f2",
  };
}

const daysUntil = (date: string | null) => {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00`).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

export default function GoalsPage() {
  const [items, setItems] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [depositGoal, setDepositGoal] = useState<GoalItem | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<GoalItem | null>(null);

  // Form states
  const [saving, setSaving] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("travel");
  const [descLength, setDescLength] = useState(0);
  const [movementDescLength, setMovementDescLength] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/goals", { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (r.ok) {
        setItems(j?.goals ?? []);
      } else {
        toast.error(j?.message ?? "Não foi possível carregar as metas.");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalSaved = useMemo(() => items.reduce((s, x) => s + x.saved, 0), [items]);
  const totalTarget = useMemo(() => items.reduce((s, x) => s + x.target, 0), [items]);
  const overallPercent = totalTarget ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);

    setSaving(true);
    try {
      const r = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.get("name"),
          target: d.get("target"),
          deadline: d.get("deadline"),
          description: d.get("description"),
          icon: selectedIcon,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(j?.message ?? "Não foi possível criar a meta.");
        return;
      }
      form.reset();
      setCreateModalOpen(false);
      setDescLength(0);
      await load();
      toast.success("Meta criada com sucesso!");
    } catch {
      toast.error("Erro ao salvar meta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMovementSubmit(e: FormEvent<HTMLFormElement>, mode: "deposit" | "withdrawal", goal: GoalItem) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const amount = Number(d.get("amount"));

    if (mode === "withdrawal" && amount > goal.saved) {
      toast.error(`Você pode retirar no máximo ${formatCurrency(goal.saved)}.`);
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`/api/goals/${goal.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          amount,
          date: d.get("date"),
          notes: d.get("notes"),
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(j?.message ?? "Não foi possível salvar a movimentação.");
        return;
      }
      form.reset();
      setDepositGoal(null);
      setWithdrawGoal(null);
      setMovementDescLength(0);
      await load();
      toast.success(mode === "deposit" ? "Valor adicionado à meta!" : "Valor retirado da meta!");
    } catch {
      toast.error("Erro ao registrar movimentação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="goals-page-vibrant">
      {/* HEADER PRINCIPAL */}
      <div className="goals-top-header">
        <div className="goals-title-group">
          <h1>Metas</h1>
          <p>Transforme os planos da família em objetivos claros e acompanhe cada conquista.</p>
        </div>
        <button
          type="button"
          className="btn-new-goal"
          onClick={() => {
            setSelectedIcon("travel");
            setDescLength(0);
            setCreateModalOpen(true);
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nova meta</span>
        </button>
      </div>

      {/* CARD RESUMO DAS METAS (IDÊNTICO AO MOCKUP) */}
      <div className="goals-summary-card">
        <div className="summary-card-header">
          <div className="summary-icon-badge">
            <Target size={18} strokeWidth={2.5} />
          </div>
          <strong>Resumo das metas</strong>
        </div>

        <div className="summary-metrics-grid">
          <div className="summary-metric-col">
            <span>Total guardado</span>
            <strong className="text-teal">{formatCurrency(totalSaved)}</strong>
          </div>
          <div className="summary-metric-col">
            <span>Total necessário</span>
            <strong>{formatCurrency(totalTarget)}</strong>
          </div>
          <div className="summary-metric-col">
            <span>Progresso geral</span>
            <strong>{overallPercent}%</strong>
          </div>
        </div>

        <div className="summary-progress-wrap">
          <div className="summary-progress-bar">
            <div
              className="summary-progress-fill"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <p className="summary-footer-note">
            Você já guardou <b>{formatCurrency(totalSaved)}</b> para suas metas.
          </p>
        </div>
      </div>

      {/* CABEÇALHO DA LISTAGEM COM ORDENAÇÃO */}
      <div className="goals-section-header">
        <h2>Suas metas</h2>
        <span className="goals-sort-badge">Ordenar: mais próximas</span>
      </div>

      {/* LISTA DE CARDS DE METAS */}
      {loading ? (
        <div className="goals-loading-state">
          <p>Carregando metas...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="goals-empty-card">
          <Target size={36} />
          <strong>Nenhuma meta criada ainda</strong>
          <p>Clique em "+ Nova meta" para começar seu planejamento financeiro.</p>
        </div>
      ) : (
        <div className="goals-cards-list">
          {items.map((goal) => {
            const cat = getCategoryConfig(goal.icon);
            const Icon = cat.Icon;
            const percent = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
            const remaining = Math.max(0, goal.target - goal.saved);
            const days = daysUntil(goal.deadline);

            const isAchieved = goal.saved >= goal.target;
            const isOverdue = days !== null && days < 0 && !isAchieved;
            const isNear = days !== null && days >= 0 && days <= 65 && !isAchieved;

            let statusText = "Em andamento";
            let statusClass = "in-progress";

            if (isAchieved) {
              statusText = "Meta alcançada";
              statusClass = "achieved";
            } else if (isOverdue) {
              statusText = "Prazo encerrado";
              statusClass = "overdue";
            } else if (isNear) {
              statusText = "Prazo próximo";
              statusClass = "near";
            }

            return (
              <div className="goal-item-card" key={goal.id}>
                {/* TOPO DO CARD: Ícone da categoria, Status Badge e Menu */}
                <div className="goal-card-top-row">
                  <div
                    className="goal-category-icon-box"
                    style={{ backgroundColor: cat.bg, color: cat.color }}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </div>

                  <div className="goal-top-right-group">
                    <span className={`goal-status-badge ${statusClass}`}>
                      {statusText}
                    </span>
                    <Link
                      href={`/metas/${goal.id}`}
                      className="goal-card-options-btn"
                      title="Ver detalhes"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>

                {/* TÍTULO E PRAZO */}
                <Link href={`/metas/${goal.id}`} className="goal-title-link">
                  <h3 className="goal-title-text">{goal.name}</h3>
                </Link>

                <div className="goal-deadline-row">
                  <CalendarDays size={14} />
                  <span>
                    {goal.deadline ? formatDate(goal.deadline) : "Sem prazo definido"}
                    {days !== null && days >= 0 ? ` · faltam ${days} dias` : ""}
                  </span>
                </div>

                {/* 4 MÉTRICAS: Objetivo, Guardado, Falta, Progresso */}
                <div className="goal-metrics-strip">
                  <div className="goal-metric-strip-item">
                    <small>Objetivo</small>
                    <strong>{formatCurrency(goal.target)}</strong>
                  </div>
                  <div className="goal-metric-strip-item">
                    <small>Guardado</small>
                    <strong>{formatCurrency(goal.saved)}</strong>
                  </div>
                  <div className="goal-metric-strip-item">
                    <small>Falta</small>
                    <strong>{formatCurrency(remaining)}</strong>
                  </div>
                  <div className="goal-metric-strip-item">
                    <small>Progresso</small>
                    <strong>{percent}%</strong>
                  </div>
                </div>

                {/* BARRA DE PROGRESSO COLORIDA */}
                <div className="goal-card-progress-bar">
                  <div
                    className="goal-card-progress-fill"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>

                {/* BOTÕES DE AÇÃO RÁPIDA NO CARD */}
                <div className="goal-card-action-bar">
                  <button
                    type="button"
                    className="goal-quick-btn deposit"
                    onClick={() => {
                      setMovementDescLength(0);
                      setDepositGoal(goal);
                    }}
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                  <button
                    type="button"
                    className="goal-quick-btn withdraw"
                    onClick={() => {
                      setMovementDescLength(0);
                      setWithdrawGoal(goal);
                    }}
                  >
                    <ArrowDown size={14} /> Retirar
                  </button>
                  <Link href={`/metas/${goal.id}`} className="goal-quick-btn details">
                    Detalhes
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL CRIAR NOVA META (Fiel à Imagem media_1788714576340.png)
          ========================================================================= */}
      {createModalOpen && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant goals-modal">
            {/* TOPO COM VOLTAR E FECHAR */}
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Voltar"
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>Criar nova meta</h2>
                <p>Defina um objetivo e comece a planejar sua conquista.</p>
              </div>
            </div>

            <form className="sheet-form-content" onSubmit={handleCreateSubmit}>
              {/* NOME DA META */}
              <div className="form-field-vibrant">
                <label>
                  Nome da meta <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Ex.: Viagem de fim de ano"
                  required
                  className="input-text-vibrant"
                  autoFocus
                />
              </div>

              {/* VALOR DESEJADO E DATA LIMITE */}
              <div className="form-grid-two-cols">
                <div className="form-field-vibrant">
                  <label>
                    Valor desejado <span className="req">*</span>
                  </label>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input
                      type="number"
                      name="target"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      required
                      className="input-text-vibrant with-prefix"
                    />
                  </div>
                </div>

                <div className="form-field-vibrant">
                  <label>Data limite (opcional)</label>
                  <input
                    type="date"
                    name="deadline"
                    className="input-text-vibrant"
                  />
                </div>
              </div>

              {/* CATEGORIA / ÍCONE */}
              <div className="form-field-vibrant">
                <label>
                  Categoria / Ícone <span className="req">*</span>
                </label>
                <div className="goal-icon-grid-selector">
                  {iconCategories.map((item) => {
                    const CatIcon = item.Icon;
                    const isSelected = selectedIcon === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`icon-grid-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedIcon(item.id)}
                      >
                        <div
                          className="icon-grid-circle"
                          style={{
                            backgroundColor: isSelected ? item.color : item.bg,
                            color: isSelected ? "#ffffff" : item.color,
                          }}
                        >
                          <CatIcon size={18} strokeWidth={2.2} />
                        </div>
                        <span className="icon-grid-label">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DESCRIÇÃO COM CONTADOR 0/120 */}
              <div className="form-field-vibrant">
                <div className="field-label-with-counter">
                  <label>Descrição (opcional)</label>
                  <span className="char-counter">{descLength}/120</span>
                </div>
                <textarea
                  name="description"
                  maxLength={120}
                  placeholder="Ex.: Economizar para as passagens e hospedagem"
                  className="textarea-vibrant"
                  rows={2}
                  onChange={(e) => setDescLength(e.target.value.length)}
                />
              </div>

              {/* BANNER INFORMATIVO "IMPORTANTE" */}
              <div className="sheet-info-banner-teal">
                <div className="banner-icon-circle">
                  <ShieldCheck size={18} />
                </div>
                <div className="banner-text-block">
                  <strong>Controle independente</strong>
                  <p>
                    O valor guardado nas metas não altera o saldo da conta, nem é
                    contabilizado como despesa do mês.
                  </p>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="sheet-actions-row">
                <button
                  type="button"
                  className="btn-sheet-cancel"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-sheet-submit"
                >
                  {saving ? "Criando..." : "Criar meta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL ADICIONAR VALOR À META (Fiel à Imagem media_1788714576448.png)
          ========================================================================= */}
      {depositGoal && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant goals-modal">
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setDepositGoal(null)}
                aria-label="Voltar"
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>Adicionar valor à meta</h2>
                <p>Guarde mais um pouco para alcançar seu objetivo.</p>
              </div>
            </div>

            <form
              className="sheet-form-content"
              onSubmit={(e) => handleMovementSubmit(e, "deposit", depositGoal)}
            >
              {/* CARD DE PREVIEW DA META */}
              <div className="goal-preview-box">
                <div
                  className="preview-cat-icon"
                  style={{
                    backgroundColor: getCategoryConfig(depositGoal.icon).bg,
                    color: getCategoryConfig(depositGoal.icon).color,
                  }}
                >
                  {(() => {
                    const PreviewIcon = getCategoryConfig(depositGoal.icon).Icon;
                    return <PreviewIcon size={20} />;
                  })()}
                </div>
                <div className="preview-meta-info">
                  <strong>{depositGoal.name}</strong>
                  <p>
                    Guardado: <b>{formatCurrency(depositGoal.saved)}</b> de{" "}
                    <b>{formatCurrency(depositGoal.target)}</b>
                  </p>
                </div>
              </div>

              {/* BANNER "IMPORTANTE" */}
              <div className="sheet-info-banner-teal">
                <div className="banner-icon-circle">
                  <Info size={18} />
                </div>
                <div className="banner-text-block">
                  <strong>Importante</strong>
                  <p>
                    Este valor será adicionado apenas ao progresso da meta. Não
                    será debitado do seu saldo nem registrado como despesa.
                  </p>
                </div>
              </div>

              {/* VALOR A ADICIONAR E DATA */}
              <div className="form-grid-two-cols">
                <div className="form-field-vibrant">
                  <label>
                    Valor a adicionar <span className="req">*</span>
                  </label>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      required
                      className="input-text-vibrant with-prefix"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-field-vibrant">
                  <label>
                    Data <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                    className="input-text-vibrant"
                  />
                </div>
              </div>

              {/* OBSERVAÇÃO */}
              <div className="form-field-vibrant">
                <div className="field-label-with-counter">
                  <label>Observação (opcional)</label>
                  <span className="char-counter">{movementDescLength}/120</span>
                </div>
                <textarea
                  name="notes"
                  maxLength={120}
                  placeholder="Ex.: Sobrou do mês, renda extra, etc."
                  className="textarea-vibrant"
                  rows={2}
                  onChange={(e) => setMovementDescLength(e.target.value.length)}
                />
              </div>

              {/* BOTÕES */}
              <div className="sheet-actions-row">
                <button
                  type="button"
                  className="btn-sheet-cancel"
                  onClick={() => setDepositGoal(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-sheet-submit"
                >
                  {saving ? "Salvando..." : "+ Adicionar valor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL RETIRAR DA META (Fiel à Imagem media_1788714576408.png)
          ========================================================================= */}
      {withdrawGoal && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant goals-modal">
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setWithdrawGoal(null)}
                aria-label="Voltar"
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>Retirar da meta</h2>
                <p>Retire um valor guardado para usar no seu objetivo.</p>
              </div>
            </div>

            <form
              className="sheet-form-content"
              onSubmit={(e) => handleMovementSubmit(e, "withdrawal", withdrawGoal)}
            >
              {/* CARD DE PREVIEW DA META */}
              <div className="goal-preview-box">
                <div
                  className="preview-cat-icon"
                  style={{
                    backgroundColor: getCategoryConfig(withdrawGoal.icon).bg,
                    color: getCategoryConfig(withdrawGoal.icon).color,
                  }}
                >
                  {(() => {
                    const PreviewIcon = getCategoryConfig(withdrawGoal.icon).Icon;
                    return <PreviewIcon size={20} />;
                  })()}
                </div>
                <div className="preview-meta-info">
                  <strong>{withdrawGoal.name}</strong>
                  <p>
                    Guardado: <b>{formatCurrency(withdrawGoal.saved)}</b> de{" "}
                    <b>{formatCurrency(withdrawGoal.target)}</b>
                  </p>
                </div>
              </div>

              {/* BANNER "ATENÇÃO" AMARELO */}
              <div className="sheet-info-banner-amber">
                <div className="banner-icon-circle amber">
                  <AlertTriangle size={18} />
                </div>
                <div className="banner-text-block">
                  <strong>Atenção</strong>
                  <p>
                    Você está retirando dinheiro guardado para esta meta. Isso
                    reduzirá o progresso alcançado.
                  </p>
                </div>
              </div>

              {/* VALOR A RETIRAR E DATA */}
              <div className="form-grid-two-cols">
                <div className="form-field-vibrant">
                  <div className="field-label-with-counter">
                    <label>
                      Valor a retirar <span className="req">*</span>
                    </label>
                    <span className="max-val-hint">
                      Máx. {formatCurrency(withdrawGoal.saved)}
                    </span>
                  </div>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      max={withdrawGoal.saved}
                      placeholder="0,00"
                      required
                      className="input-text-vibrant with-prefix"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-field-vibrant">
                  <label>
                    Data <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                    className="input-text-vibrant"
                  />
                </div>
              </div>

              {/* MOTIVO */}
              <div className="form-field-vibrant">
                <div className="field-label-with-counter">
                  <label>Motivo (opcional)</label>
                  <span className="char-counter">{movementDescLength}/120</span>
                </div>
                <textarea
                  name="notes"
                  maxLength={120}
                  placeholder="Ex.: Pagamento da entrada, compra de passagem, etc."
                  className="textarea-vibrant"
                  rows={2}
                  onChange={(e) => setMovementDescLength(e.target.value.length)}
                />
              </div>

              {/* BANNER "IMPORTANTE" INFORMATIVO */}
              <div className="sheet-info-banner-teal">
                <div className="banner-icon-circle">
                  <Info size={18} />
                </div>
                <div className="banner-text-block">
                  <strong>Importante</strong>
                  <p>
                    Esta retirada ajusta apenas o saldo da meta. O valor NÃO será
                    creditado automaticamente como receita no financeiro.
                  </p>
                </div>
              </div>

              {/* BOTÕES */}
              <div className="sheet-actions-row">
                <button
                  type="button"
                  className="btn-sheet-cancel"
                  onClick={() => setWithdrawGoal(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || withdrawGoal.saved <= 0}
                  className="btn-sheet-submit danger"
                >
                  {saving ? "Salvando..." : "- Retirar valor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

