"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Car,
  ChevronLeft,
  Gift,
  Goal as GoalIcon,
  House,
  Info,
  Pencil,
  Plane,
  Plus,
  ShieldCheck,
  Smartphone,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";

type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  description: string;
  icon: string;
  color: string;
  status: string;
};

type Movement = {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  date: string;
  notes: string;
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

export default function GoalDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [mode, setMode] = useState<"deposit" | "withdrawal" | null>(null);
  const [saving, setSaving] = useState(false);
  const [movementDescLength, setMovementDescLength] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/goals/${id}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (r.ok) {
        setGoal(j.goal);
        setMovements(j.movements ?? []);
      } else {
        toast.error(j?.message ?? "Não foi possível carregar a meta.");
      }
    } catch {
      toast.error("Erro ao carregar os dados da meta.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMovementSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mode || !goal) return;
    const form = e.currentTarget;
    const d = new FormData(form);
    const amount = Number(d.get("amount"));

    if (mode === "withdrawal" && amount > goal.saved) {
      toast.error(`Você pode retirar no máximo ${formatCurrency(goal.saved)}.`);
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`/api/goals/${id}/movements`, {
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
      setMode(null);
      setMovementDescLength(0);
      await load();
      toast.success(mode === "deposit" ? "Valor adicionado à meta!" : "Valor retirado da meta!");
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!goal) {
    return (
      <div className="goals-page-vibrant">
        <div className="goals-loading-state">
          <p>Carregando meta...</p>
        </div>
      </div>
    );
  }

  const cat = getCategoryConfig(goal.icon);
  const CatIcon = cat.Icon;

  const percent = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  
  const days = goal.deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(`${goal.deadline}T12:00:00`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const monthsLeft = Math.max(1, Math.ceil((days ?? 30) / 30));
  const suggestedMonthly = remaining / monthsLeft;

  return (
    <div className="goals-page-vibrant goal-details-view">
      {/* HEADER DE NAVEGAÇÃO */}
      <div className="detail-navigation-bar">
        <Link href="/metas" className="detail-back-btn">
          <ChevronLeft size={20} />
          <span>Voltar para Metas</span>
        </Link>
      </div>

      {/* HERO CARD DA META */}
      <div className="goal-detail-hero-card">
        <div className="goal-detail-hero-top">
          <div
            className="goal-detail-hero-icon"
            style={{ backgroundColor: cat.bg, color: cat.color }}
          >
            <CatIcon size={28} strokeWidth={2.2} />
          </div>
          <div className="goal-detail-hero-info">
            <h1>{goal.name}</h1>
            <p>{goal.description || "Objetivo financeiro da família"}</p>
          </div>
        </div>

        {/* 3 MÉTRICAS PRINCIPAIS */}
        <div className="goal-detail-metrics-grid">
          <div className="goal-detail-metric-col">
            <span>Objetivo</span>
            <strong>{formatCurrency(goal.target)}</strong>
          </div>
          <div className="goal-detail-metric-col">
            <span>Guardado</span>
            <strong className="text-teal">{formatCurrency(goal.saved)}</strong>
          </div>
          <div className="goal-detail-metric-col">
            <span>Falta</span>
            <strong className="text-amber">{formatCurrency(remaining)}</strong>
          </div>
        </div>

        {/* BARRA DE PROGRESSO */}
        <div className="goal-detail-progress-wrap">
          <div className="summary-progress-bar">
            <div
              className="summary-progress-fill"
              style={{
                width: `${percent}%`,
                backgroundColor: cat.color,
              }}
            />
          </div>
          <div className="goal-detail-progress-meta">
            <b>{percent}% concluído</b>
            <span>
              {goal.deadline
                ? `${days !== null ? `${days} dias · ` : ""}${formatDate(goal.deadline)}`
                : "Sem prazo definido"}
            </span>
          </div>
        </div>
      </div>

      {/* CARDS DE ESTATÍSTICAS / ESTIMATIVAS */}
      <div className="goal-stats-row">
        <div className="goal-stat-box">
          <div className="stat-icon-wrap teal">
            <CalendarDays size={18} />
          </div>
          <div className="stat-text-wrap">
            <small>Data da meta</small>
            <strong>{goal.deadline ? formatDate(goal.deadline) : "Sem prazo"}</strong>
          </div>
        </div>

        <div className="goal-stat-box">
          <div className="stat-icon-wrap blue">
            <Target size={18} />
          </div>
          <div className="stat-text-wrap">
            <small>Dias restantes</small>
            <strong>{days !== null ? `${days} dias` : "—"}</strong>
          </div>
        </div>

        <div className="goal-stat-box">
          <div className="stat-icon-wrap purple">
            <ShieldCheck size={18} />
          </div>
          <div className="stat-text-wrap">
            <small>Aporte mensal sugerido</small>
            <strong>{formatCurrency(suggestedMonthly)}</strong>
          </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO PRINCIPAL */}
      <div className="goal-detail-action-buttons">
        <button
          type="button"
          className="btn-goal-primary-add"
          onClick={() => {
            setMovementDescLength(0);
            setMode("deposit");
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Adicionar à meta</span>
        </button>
        <button
          type="button"
          className="btn-goal-secondary-withdraw"
          onClick={() => {
            setMovementDescLength(0);
            setMode("withdrawal");
          }}
        >
          <ArrowDown size={18} strokeWidth={2.5} />
          <span>Retirar da meta</span>
        </button>
      </div>

      {/* PAINEL DE HISTÓRICO DE MOVIMENTAÇÕES */}
      <div className="goal-history-panel">
        <div className="goal-history-header">
          <h2>Histórico da meta</h2>
          <span className="goal-history-count">
            {movements.length} {movements.length === 1 ? "movimentação" : "movimentações"}
          </span>
        </div>

        {movements.length === 0 ? (
          <div className="goal-history-empty">
            <Target size={32} />
            <strong>Nenhuma movimentação registrada</strong>
            <p>Os valores guardados ou retirados aparecerão aqui.</p>
          </div>
        ) : (
          <div className="goal-movements-list">
            {movements.map((item) => {
              const isDeposit = item.type === "deposit";
              return (
                <div className="goal-movement-row" key={item.id}>
                  <div className="movement-left">
                    <div className={`movement-icon-bubble ${isDeposit ? "deposit" : "withdrawal"}`}>
                      {isDeposit ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                    </div>
                    <div className="movement-details">
                      <strong>{isDeposit ? "Valor guardado" : "Retirada"}</strong>
                      <small>
                        {formatDate(item.date)}
                        {item.notes ? ` · ${item.notes}` : " · Sem observação"}
                      </small>
                    </div>
                  </div>
                  <div className={`movement-amount ${isDeposit ? "positive" : "negative"}`}>
                    {isDeposit ? "+" : "−"} {formatCurrency(item.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL ADICIONAR VALOR À META (Fiel à Imagem media_1788714576448.png)
          ========================================================================= */}
      {mode === "deposit" && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant goals-modal">
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setMode(null)}
                aria-label="Voltar"
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>Adicionar valor à meta</h2>
                <p>Guarde mais um pouco para alcançar seu objetivo.</p>
              </div>
            </div>

            <form className="sheet-form-content" onSubmit={handleMovementSubmit}>
              <div className="goal-preview-box">
                <div
                  className="preview-cat-icon"
                  style={{
                    backgroundColor: cat.bg,
                    color: cat.color,
                  }}
                >
                  <CatIcon size={20} />
                </div>
                <div className="preview-meta-info">
                  <strong>{goal.name}</strong>
                  <p>
                    Guardado: <b>{formatCurrency(goal.saved)}</b> de <b>{formatCurrency(goal.target)}</b>
                  </p>
                </div>
              </div>

              <div className="sheet-info-banner-teal">
                <div className="banner-icon-circle">
                  <Info size={18} />
                </div>
                <div className="banner-text-block">
                  <strong>Importante</strong>
                  <p>
                    Este valor será adicionado apenas ao progresso da meta. Não será debitado do seu saldo nem registrado como despesa.
                  </p>
                </div>
              </div>

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

              <div className="sheet-actions-row">
                <button
                  type="button"
                  className="btn-sheet-cancel"
                  onClick={() => setMode(null)}
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
      {mode === "withdrawal" && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant goals-modal">
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setMode(null)}
                aria-label="Voltar"
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>Retirar da meta</h2>
                <p>Retire um valor guardado para usar no seu objetivo.</p>
              </div>
            </div>

            <form className="sheet-form-content" onSubmit={handleMovementSubmit}>
              <div className="goal-preview-box">
                <div
                  className="preview-cat-icon"
                  style={{
                    backgroundColor: cat.bg,
                    color: cat.color,
                  }}
                >
                  <CatIcon size={20} />
                </div>
                <div className="preview-meta-info">
                  <strong>{goal.name}</strong>
                  <p>
                    Guardado: <b>{formatCurrency(goal.saved)}</b> de <b>{formatCurrency(goal.target)}</b>
                  </p>
                </div>
              </div>

              <div className="sheet-info-banner-amber">
                <div className="banner-icon-circle amber">
                  <AlertTriangle size={18} />
                </div>
                <div className="banner-text-block">
                  <strong>Atenção</strong>
                  <p>
                    Você está retirando dinheiro guardado para esta meta. Isso reduzirá o progresso alcançado.
                  </p>
                </div>
              </div>

              <div className="form-grid-two-cols">
                <div className="form-field-vibrant">
                  <div className="field-label-with-counter">
                    <label>
                      Valor a retirar <span className="req">*</span>
                    </label>
                    <span className="max-val-hint">
                      Máx. {formatCurrency(goal.saved)}
                    </span>
                  </div>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      max={goal.saved}
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

              <div className="sheet-info-banner-teal">
                <div className="banner-icon-circle">
                  <Info size={18} />
                </div>
                <div className="banner-text-block">
                  <strong>Importante</strong>
                  <p>
                    Esta retirada ajusta apenas o saldo da meta. O valor NÃO será creditado automaticamente como receita no financeiro.
                  </p>
                </div>
              </div>

              <div className="sheet-actions-row">
                <button
                  type="button"
                  className="btn-sheet-cancel"
                  onClick={() => setMode(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || goal.saved <= 0}
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

