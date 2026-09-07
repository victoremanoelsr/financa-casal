"use client";
import { Plus, Receipt } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, StatusBadge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type Item = { id: string; name: string; amount: number; dueDay: number; category: string; responsible: string; status: "active" };
export default function FixedExpensesPage() {
  const { data } = useAccount(); const [items, setItems] = useState<Item[]>([]); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { const response = await fetch("/api/fixed-expenses", { cache: "no-store" }); const result = await response.json().catch(() => null); if (response.ok) setItems(result?.fixedExpenses ?? []); else toast.error(result?.message ?? "Não foi possível carregar as despesas fixas."); setLoading(false); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    const response = await fetch("/api/fixed-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.get("name"),
        amount: values.get("amount"),
        dueDay: values.get("dueDay"),
        categoryId: values.get("categoryId"),
        responsibleMemberId: values.get("responsibleMemberId"),
        notes: values.get("notes"),
        startOption: values.get("startOption") || "current",
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível salvar.");
    form.reset();
    setOpen(false);
    await load();
    toast.success("Despesa fixa salva no banco de dados.");
  }
  return (
    <>
      <PageHeader title="Despesas Fixas" subtitle="Acompanhe as contas recorrentes da sua família." />
      <div className="toolbar">
        <PeriodFilter />
        <button className="primary-button" onClick={() => setOpen(true)}>
          <Plus size={16} /> Adicionar despesa
        </button>
      </div>
      <section className="panel module-section">
        {loading ? (
          <p>Carregando...</p>
        ) : items.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma despesa fixa" description="As contas que você cadastrar aparecerão aqui." />
        ) : (
          <div className="subscription-list">
            {items.map((item) => (
              <article key={item.id}>
                <span className="overview-icon amber"><Receipt /></span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.category} · {item.responsible}</small>
                </div>
                <span>
                  <small>Vencimento</small>
                  <strong>Dia {item.dueDay}</strong>
                </span>
                <b>{formatCurrency(item.amount)}</b>
                <StatusBadge status={item.status} />
              </article>
            ))}
          </div>
        )}
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar despesa fixa" description="O cadastro ficará salvo para a família.">
        <form className="modal-form" onSubmit={submit}>
          <div className="form-grid two">
            <Field label="Nome"><input name="name" required /></Field>
            <Field label="Categoria">
              <select name="categoryId" required>
                <option value="">Selecione</option>
                {data?.categories.filter((category) => category.kind !== "income").map((category) => (
                  <option value={category.id} key={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-grid two">
            <Field label="Valor"><input name="amount" type="number" min="0.01" step="0.01" required /></Field>
            <Field label="Vencimento"><input name="dueDay" type="number" min="1" max="31" required /></Field>
          </div>
          <Field label="Primeiro vencimento desta conta">
            <select name="startOption" defaultValue="current">
              <option value="current">Cobrar a partir deste mês</option>
              <option value="next">Cobrar apenas a partir do próximo mês</option>
            </select>
          </Field>
          <Field label="Responsável">
            <select name="responsibleMemberId" required>
              <option value="">Selecione</option>
              {data?.members.map((member) => (
                <option value={member.id} key={member.id}>{member.displayName}</option>
              ))}
            </select>
          </Field>
          <Field label="Observação"><textarea name="notes" /></Field>
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button>
            <button disabled={saving} className="primary-button">{saving ? "Salvando..." : "Salvar despesa"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
