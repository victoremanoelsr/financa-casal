"use client";
import { CreditCard, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { useAccount } from "@/lib/use-account";

export default function CardsPage() {
  const { data } = useAccount();
  const [open, setOpen] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setOpen(false); toast.success("Cartão cadastrado nesta sessão."); }
  return <><PageHeader title="Cartões" subtitle="Acompanhe os cartões cadastrados pela sua família." /><div className="toolbar"><PeriodFilter /><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16}/> Adicionar cartão</button></div><section className="panel module-section"><EmptyState icon={CreditCard} title="Nenhum cartão cadastrado" description="Os cartões que você adicionar aparecerão aqui." /></section><Modal open={open} onClose={() => setOpen(false)} title="Adicionar cartão" description="Cadastre um cartão da família."><form className="modal-form" onSubmit={submit}><div className="form-grid two"><Field label="Nome do cartão"><input name="name" required /></Field><Field label="Banco ou instituição"><input name="bank" required /></Field></div><div className="form-grid two"><Field label="Titular"><select name="holder" required><option value="">Selecione</option>{data?.members.map((member) => <option key={member.id}>{member.displayName}</option>)}</select></Field><Field label="Tipo"><select name="type"><option>Crédito</option><option>Débito</option></select></Field></div><Field label="Limite"><input name="limit" type="number" min="0" step="0.01" /></Field><div className="form-grid two"><Field label="Dia de fechamento"><input name="closingDay" type="number" min="1" max="31" /></Field><Field label="Dia de vencimento"><input name="dueDay" type="number" min="1" max="31" /></Field></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar cartão</button></div></form></Modal></>;
}
