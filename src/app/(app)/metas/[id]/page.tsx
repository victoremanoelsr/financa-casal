"use client";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Goal as GoalIcon,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Field, Modal, ProgressBar } from "@/components/ui";
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
export default function GoalDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [goal, setGoal] = useState<Goal | null>(null),
    [movements, setMovements] = useState<Movement[]>([]),
    [mode, setMode] = useState<"deposit" | "withdrawal" | null>(null),
    [saving, setSaving] = useState(false),
    [now] = useState(() => Date.now());
  const load = useCallback(async () => {
    const r = await fetch(`/api/goals/${id}`, { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok) {
      setGoal(j.goal);
      setMovements(j.movements ?? []);
    } else toast.error(j?.message ?? "Não foi possível carregar a meta.");
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mode) return;
    const d = new FormData(e.currentTarget);
    setSaving(true);
    const r = await fetch(`/api/goals/${id}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: mode,
        amount: d.get("amount"),
        date: d.get("date"),
        notes: d.get("notes"),
      }),
    });
    const j = await r.json().catch(() => null);
    setSaving(false);
    if (!r.ok) return toast.error(j?.message ?? "Não foi possível salvar.");
    setMode(null);
    await load();
    toast.success(mode === "deposit" ? "Valor adicionado." : "Valor retirado.");
  }
  if (!goal)
    return (
      <section className="panel compact-empty">Carregando meta...</section>
    );
  const percent = goal.target
      ? Math.min(100, (goal.saved / goal.target) * 100)
      : 0,
    remaining = Math.max(0, goal.target - goal.saved),
    days = goal.deadline
      ? Math.max(
          0,
          Math.ceil(
            (new Date(`${goal.deadline}T12:00:00`).getTime() - now) /
              86400000,
          ),
        )
      : null;
  return (
    <>
      <div className="detail-page-header">
        <Link href="/metas">
          <ArrowLeft />
        </Link>
        <h1>Detalhes da meta</h1>
        <button aria-label="Editar meta">
          <Pencil />
        </button>
      </div>
      <section className="goal-hero">
        <span>
          <GoalIcon />
        </span>
        <div>
          <h2>{goal.name}</h2>
          <p>{goal.description || "Objetivo da família"}</p>
        </div>
        <div className="goal-values">
          <span>
            <small>Objetivo</small>
            <strong>{formatCurrency(goal.target)}</strong>
          </span>
          <span>
            <small>Guardado</small>
            <strong>{formatCurrency(goal.saved)}</strong>
          </span>
          <span>
            <small>Falta</small>
            <strong>{formatCurrency(remaining)}</strong>
          </span>
        </div>
        <ProgressBar value={percent} color="#19c998" />
        <footer>
          <b>{Math.round(percent)}% concluído</b>
          <span>
            {goal.deadline
              ? `${days} dias · ${formatDate(goal.deadline)}`
              : "Sem data definida"}
          </span>
        </footer>
      </section>
      <section className="goal-detail-stats">
        <article>
          <CalendarDays />
          <small>Data da meta</small>
          <strong>
            {goal.deadline ? formatDate(goal.deadline) : "Sem data"}
          </strong>
        </article>
        <article>
          <GoalIcon />
          <small>Dias restantes</small>
          <strong>{days ?? "—"}</strong>
        </article>
        <article>
          <ShieldCheck />
          <small>Média mensal sugerida</small>
          <strong>
            {formatCurrency(
              remaining / Math.max(1, Math.ceil((days ?? 30) / 30)),
            )}
          </strong>
        </article>
      </section>
      <div className="goal-actions">
        <button className="primary-button" onClick={() => setMode("deposit")}>
          <Plus /> Adicionar à meta
        </button>
        <button className="ghost-button" onClick={() => setMode("withdrawal")}>
          − Retirar da meta
        </button>
      </div>
      <section className="panel module-section">
        <div className="panel-heading">
          <h2>Histórico da meta</h2>
          <span>{movements.length} movimentações</span>
        </div>
        {movements.length === 0 ? (
          <p className="compact-empty">Nenhuma movimentação nesta meta.</p>
        ) : (
          <div className="goal-history">
            {movements.map((item) => (
              <article key={item.id}>
                <span className={item.type}>
                  {item.type === "deposit" ? <ArrowUp /> : <ArrowDown />}
                </span>
                <div>
                  <strong>
                    {item.type === "deposit" ? "Valor guardado" : "Retirada"}
                  </strong>
                  <small>
                    {formatDate(item.date)} · {item.notes || "Sem observação"}
                  </small>
                </div>
                <b className={item.type}>
                  {item.type === "deposit" ? "+" : "−"}{" "}
                  {formatCurrency(item.amount)}
                </b>
              </article>
            ))}
          </div>
        )}
      </section>
      <Modal
        open={Boolean(mode)}
        onClose={() => setMode(null)}
        title={
          mode === "deposit" ? "Adicionar valor à meta" : "Retirar da meta"
        }
        description={
          mode === "deposit"
            ? "Registre quanto você está guardando para este objetivo."
            : `Você pode retirar até ${formatCurrency(goal.saved)}.`
        }
      >
        <form className="modal-form" onSubmit={submit}>
          <Field label="Valor">
            <input
              name="amount"
              type="number"
              min="0.01"
              max={mode === "withdrawal" ? goal.saved : undefined}
              step="0.01"
              required
            />
          </Field>
          <Field label="Data">
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
          <Field
            label={
              mode === "deposit" ? "Observação (opcional)" : "Motivo (opcional)"
            }
          >
            <textarea name="notes" maxLength={120} />
          </Field>
          <div className="security-note">
            <ShieldCheck />
            <p>
              Esta movimentação pertence somente à meta e não altera seu saldo.
            </p>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setMode(null)}
            >
              Cancelar
            </button>
            <button disabled={saving} className="primary-button">
              {saving
                ? "Salvando..."
                : mode === "deposit"
                  ? "Adicionar valor"
                  : "Retirar valor"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
