"use client";
import Link from "next/link";
import {
  CalendarDays,
  Car,
  Gift,
  Goal,
  House,
  MoreVertical,
  Plane,
  Plus,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Field, Modal, ProgressBar } from "@/components/ui";
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
const icons = [
  { id: "travel", label: "Viagem", Icon: Plane },
  { id: "reserve", label: "Reserva", Icon: ShieldCheck },
  { id: "home", label: "Casa", Icon: House },
  { id: "vehicle", label: "Veículo", Icon: Car },
  { id: "device", label: "Eletrônico", Icon: Smartphone },
  { id: "event", label: "Evento", Icon: Gift },
  { id: "target", label: "Outro", Icon: Goal },
];
const daysUntil = (date: string | null) =>
  date
    ? Math.ceil(
        (new Date(`${date}T12:00:00`).getTime() - Date.now()) / 86400000,
      )
    : null;
export default function GoalsPage() {
  const [items, setItems] = useState<GoalItem[]>([]),
    [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [selectedIcon, setSelectedIcon] = useState("travel");
  const load = useCallback(async () => {
    const r = await fetch("/api/goals", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok) setItems(j?.goals ?? []);
    else toast.error(j?.message ?? "Não foi possível carregar as metas.");
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const totalSaved = items.reduce((s, x) => s + x.saved, 0),
    totalTarget = items.reduce((s, x) => s + x.target, 0),
    overall = totalTarget
      ? Math.min(100, Math.round((totalSaved / totalTarget) * 100))
      : 0;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    setSaving(true);
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
    setSaving(false);
    if (!r.ok)
      return toast.error(j?.message ?? "Não foi possível criar a meta.");
    form.reset();
    setOpen(false);
    await load();
    toast.success("Meta criada.");
  }
  return (
    <>
      <PageHeader
        title="Metas"
        subtitle="Transforme os planos da família em objetivos claros e acompanhe cada conquista."
        action={
          <button
            className="primary-button compact-action"
            onClick={() => setOpen(true)}
          >
            <Plus /> Nova meta
          </button>
        }
      />
      <section className="goals-overview">
        <header>
          <Goal />
          <strong>Resumo das metas</strong>
        </header>
        <div>
          <small>Total guardado</small>
          <strong>{formatCurrency(totalSaved)}</strong>
        </div>
        <div>
          <small>Total necessário</small>
          <strong>{formatCurrency(totalTarget)}</strong>
        </div>
        <div>
          <small>Progresso geral</small>
          <strong>{overall}%</strong>
        </div>
        <ProgressBar value={overall} color="#16a085" />
        <p>Você já guardou {formatCurrency(totalSaved)} para suas metas.</p>
      </section>
      <div className="panel-heading goals-heading">
        <h2>Suas metas</h2>
        <span>Ordenar: mais próximas</span>
      </div>
      {items.length === 0 ? (
        <section className="panel compact-empty">
          Nenhuma meta cadastrada.
        </section>
      ) : (
        <section className="goals-grid">
          {items.map((goal) => {
            const percent = goal.target
                ? Math.min(100, (goal.saved / goal.target) * 100)
                : 0,
              remaining = Math.max(0, goal.target - goal.saved),
              days = daysUntil(goal.deadline);
            const Icon = icons.find((x) => x.id === goal.icon)?.Icon ?? Goal;
            return (
              <Link
                href={`/metas/${goal.id}`}
                className="goal-card"
                key={goal.id}
              >
                <header>
                  <span
                    style={{ color: goal.color, background: `${goal.color}16` }}
                  >
                    <Icon />
                  </span>
                  <i className="status-badge positive">
                    {goal.saved >= goal.target
                      ? "Meta alcançada"
                      : days !== null && days < 0
                        ? "Prazo encerrado"
                        : days !== null && days <= 30
                          ? "Prazo próximo"
                          : "Em andamento"}
                  </i>
                  <MoreVertical />
                </header>
                <h2>{goal.name}</h2>
                <p>
                  <CalendarDays />{" "}
                  {goal.deadline
                    ? formatDate(goal.deadline)
                    : "Sem data definida"}
                  {days !== null && days >= 0 ? ` · faltam ${days} dias` : ""}
                </p>
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
                  <span>
                    <small>Progresso</small>
                    <strong>{Math.round(percent)}%</strong>
                  </span>
                </div>
                <ProgressBar value={percent} color={goal.color} />
              </Link>
            );
          })}
        </section>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Criar nova meta"
        description="Defina um objetivo e comece a planejar sua conquista."
      >
        <form className="modal-form" onSubmit={submit}>
          <Field label="Nome da meta">
            <input
              name="name"
              placeholder="Ex.: Viagem de fim de ano"
              required
            />
          </Field>
          <div className="form-grid two">
            <Field label="Valor desejado">
              <input
                name="target"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </Field>
            <Field label="Data limite (opcional)">
              <input name="deadline" type="date" />
            </Field>
          </div>
          <Field label="Descrição (opcional)">
            <textarea name="description" maxLength={120} />
          </Field>
          <div className="goal-icon-picker">
            {icons.map(({ id, label, Icon }) => (
              <button
                type="button"
                className={selectedIcon === id ? "active" : ""}
                onClick={() => setSelectedIcon(id)}
                key={id}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="security-note">
            <ShieldCheck />
            <p>
              <strong>Controle independente</strong>Valores das metas não
              alteram saldo, receitas, despesas ou contas.
            </p>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button disabled={saving} className="primary-button">
              {saving ? "Salvando..." : "Criar meta"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
