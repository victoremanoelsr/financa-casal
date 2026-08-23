import { cn } from "@/lib/cn";

export function StatusBadge({ status }: { status: "paid" | "open" | "pending" | "partial" | "overdue" | "active" }) {
  const labels = { paid: "Pago", open: "Em aberto", pending: "Pendente", partial: "Parcialmente pago", overdue: "Atrasado", active: "Ativa" };
  return <span className={cn("status-badge", status)}>{labels[status]}</span>;
}

export function ProgressBar({ value, color = "#16A085" }: { value: number; color?: string }) {
  return <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} /></div>;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}{hint && !error && <small>{hint}</small>}{error && <small className="field-error">{error}</small>}</label>;
}

export function Modal({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        <h2 id="modal-title">{title}</h2>{description && <p className="modal-description">{description}</p>}{children}
      </section>
    </div>
  );
}
