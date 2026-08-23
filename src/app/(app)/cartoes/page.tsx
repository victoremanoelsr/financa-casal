"use client";

import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, ProgressBar } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type CardItem = { id: string; name: string; institution: string; holder: string; type: "credit" | "debit"; limit: number; closingDay: number | null; dueDay: number | null; lastFour: string; visualKey: string };

export default function CardsPage() {
  const { data: account } = useAccount();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const loadCards = useCallback(async () => {
    const response = await fetch("/api/cards", { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (response.ok) setCards(result?.cards ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Sincroniza a tela com os cartões persistidos ao abrir a página.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCards();
  }, [loadCards]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const form = event.currentTarget; const values = new FormData(form);
    const response = await fetch("/api/cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.get("name"), institution: values.get("institution"), holderMemberId: values.get("holderMemberId"), type: values.get("type"), limit: values.get("limit"), closingDay: values.get("closingDay"), dueDay: values.get("dueDay"), lastFour: values.get("lastFour") }) });
    const result = await response.json().catch(() => null); setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível salvar o cartão.");
    form.reset(); setOpen(false); await loadCards(); toast.success("Cartão cadastrado com sucesso.");
  }

  return <>
    <PageHeader title="Cartões" subtitle="Acompanhe os cartões cadastrados pela sua família." />
    <div className="toolbar"><PeriodFilter /><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16}/> Adicionar cartão</button></div>
    {loading ? <section className="panel module-section"><p>Carregando cartões...</p></section> : cards.length === 0 ? <section className="panel module-section"><EmptyState icon={CreditCard} title="Nenhum cartão cadastrado" description="Os cartões que você adicionar aparecerão aqui." /></section> : <section className="cards-grid">{cards.map((card) => <Link href={`/cartoes/${card.id}`} className={`bank-card ${card.visualKey}`} key={card.id}><div className="bank-card-top"><span><CreditCard size={20}/><small>{card.institution}</small></span><i>{card.type === "credit" ? "Crédito" : "Débito"}</i></div><div className="bank-card-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; {card.lastFour}</div><div className="bank-card-holder"><span><small>TITULAR</small><strong>{card.holder}</strong></span><span><small>VENCIMENTO</small><strong>{card.dueDay ? `DIA ${card.dueDay}` : "—"}</strong></span></div><div className="card-usage"><p><span>Limite</span><strong>{card.type === "credit" ? formatCurrency(card.limit) : "Débito"}</strong></p>{card.type === "credit" && <ProgressBar value={0} color="#FFFFFF" />}</div><div className="card-statement"><span>{card.name}</span><strong>{formatCurrency(0)}</strong></div></Link>)}</section>}
    <Modal open={open} onClose={() => setOpen(false)} title="Adicionar cartão" description="O cartão será salvo no cadastro da sua família."><form className="modal-form" onSubmit={submit}><div className="form-grid two"><Field label="Nome do cartão"><input name="name" placeholder="Ex.: Cartão principal" required /></Field><Field label="Banco ou instituição"><input name="institution" placeholder="Ex.: Banco Inter" required /></Field></div><div className="form-grid two"><Field label="Titular"><select name="holderMemberId" required><option value="">Selecione</option>{account?.members.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></Field><Field label="Tipo"><select name="type"><option value="credit">Crédito</option><option value="debit">Débito</option></select></Field></div><div className="form-grid two"><Field label="Últimos 4 números"><input name="lastFour" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="0000" required /></Field><Field label="Limite do cartão"><input name="limit" type="number" min="0.01" step="0.01" required /></Field></div><div className="form-grid two"><Field label="Dia de fechamento"><input name="closingDay" type="number" min="1" max="31" required /></Field><Field label="Dia de vencimento"><input name="dueDay" type="number" min="1" max="31" required /></Field></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar cartão"}</button></div></form></Modal>
  </>;
}
