"use client";
import { Plus, Store } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { useAccount } from "@/lib/use-account";

export default function StoresPage() {
  const { data } = useAccount(); const [open, setOpen] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setOpen(false); toast.success("Comércio cadastrado nesta sessão."); }
  return <><PageHeader title="Comércios" subtitle="Controle os crediários cadastrados pela família." /><div className="toolbar"><PeriodFilter/><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16}/> Adicionar comércio</button></div><section className="panel module-section"><EmptyState icon={Store} title="Nenhum comércio cadastrado" description="Seus crediários aparecerão aqui depois do cadastro." /></section><Modal open={open} onClose={() => setOpen(false)} title="Adicionar comércio" description="Cadastre um crediário da família."><form className="modal-form" onSubmit={submit}><Field label="Nome do comércio"><input name="name" required /></Field><div className="form-grid two"><Field label="Titular"><select name="holder" required><option value="">Selecione</option>{data?.members.map((member) => <option key={member.id}>{member.displayName}</option>)}</select></Field><Field label="Limite total"><input name="limit" type="number" min="0.01" step="0.01" required /></Field></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar comércio</button></div></form></Modal></>;
}
