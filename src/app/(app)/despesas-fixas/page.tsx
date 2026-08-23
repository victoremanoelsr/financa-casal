"use client";
import { Plus, Receipt } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { useAccount } from "@/lib/use-account";

export default function FixedExpensesPage() {
  const { data } = useAccount(); const [open, setOpen] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setOpen(false); toast.success("Despesa cadastrada nesta sessão."); }
  return <><PageHeader title="Despesas Fixas" subtitle="Acompanhe as contas recorrentes da sua família." /><div className="toolbar"><PeriodFilter/><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16}/> Adicionar despesa</button></div><section className="panel module-section"><EmptyState icon={Receipt} title="Nenhuma despesa fixa" description="As contas que você cadastrar aparecerão aqui." /></section><Modal open={open} onClose={() => setOpen(false)} title="Adicionar despesa fixa" description="Cadastre uma conta recorrente."><form className="modal-form" onSubmit={submit}><div className="form-grid two"><Field label="Nome"><input name="name" required /></Field><Field label="Categoria"><select name="category" required><option value="">Selecione</option>{data?.categories.map((category) => <option key={category.id}>{category.name}</option>)}</select></Field></div><div className="form-grid two"><Field label="Valor"><input name="amount" type="number" min="0.01" step="0.01" required /></Field><Field label="Vencimento"><input name="dueDay" type="number" min="1" max="31" required /></Field></div><Field label="Responsável"><select name="responsible" required><option value="">Selecione</option>{data?.members.map((member) => <option key={member.id}>{member.displayName}</option>)}</select></Field><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar despesa</button></div></form></Modal></>;
}
