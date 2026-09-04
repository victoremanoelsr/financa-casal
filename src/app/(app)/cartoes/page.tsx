"use client";

import Link from "next/link";
import { CreditCard, Pencil, Plus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, ProgressBar } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type CardItem = {
  id: string;
  name: string;
  institution: string;
  holder: string;
  holderMemberId: string;
  type: "credit" | "debit" | "credit_debit";
  limit: number;
  closingDay: number | null;
  dueDay: number | null;
  lastFour: string;
  visualKey: string;
  backgroundImage: string;
  used: number;
};

export default function CardsPage() {
  const { data: account } = useAccount();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CardItem | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [cardType, setCardType] = useState<"credit" | "debit" | "credit_debit">("credit");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);

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
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    if (backgroundImageFile) values.set("backgroundImage", backgroundImageFile);
    else values.delete("backgroundImage");
    const response = await fetch("/api/cards", {
      method: "POST",
      body: values,
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível salvar o cartão.",
      );
    form.reset();
    setOpen(false); setBackgroundImage(""); setBackgroundImageFile(null); setCardType("credit");
    await loadCards();
    toast.success("Cartão cadastrado com sucesso.");
  }
  async function editCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const values = new FormData(event.currentTarget);
    values.set("type", editing.type);
    if (editImageFile) values.set("backgroundImage", editImageFile); else values.delete("backgroundImage");
    const response = await fetch(`/api/cards/${editing.id}`, { method: "PATCH", body: values });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível editar o cartão.");
    setEditing(null); setEditImageFile(null); setEditImagePreview(""); await loadCards(); toast.success("Cartão atualizado.");
  }

  return (
    <>
      <PageHeader
        title="Cartões"
        subtitle="Acompanhe os cartões cadastrados pela sua família."
      />
      <div className="toolbar">
        <PeriodFilter />
        <button className="primary-button" onClick={() => setOpen(true)}>
          <Plus size={16} /> Novo cartão
        </button>
      </div>
      {loading ? (
        <section className="panel module-section">
          <p>Carregando cartões...</p>
        </section>
      ) : cards.length === 0 ? (
        <section className="panel module-section">
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão cadastrado"
            description="Os cartões que você adicionar aparecerão aqui."
          />
        </section>
      ) : (
        <section className="cards-grid">
          {cards.map((card) => (
            <Link
              href={`/cartoes/${card.id}`}
              className={`bank-card ${card.visualKey} card-visual`}
              key={card.id}
            >
              <button className="card-edit-button" type="button" aria-label="Editar cartão" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setEditing(card); setEditImageFile(null); setEditImagePreview(card.backgroundImage); }}><Pencil size={14} /></button>
              {card.backgroundImage && (
                <span
                  aria-hidden="true"
                  className="bank-card-background"
                  style={{ backgroundImage: `url("${card.backgroundImage}")` }}
                />
              )}
              <div className="bank-card-top">
                <span>
                  <CreditCard size={20} />
                  <small>{card.institution}</small>
                </span>
                <i>{card.type === "credit" ? "Crédito" : card.type === "debit" ? "Débito" : "Crédito e Débito"}</i>
              </div>
              <div className="bank-card-number">
                •••• &nbsp; •••• &nbsp; •••• &nbsp; {card.lastFour}
              </div>
              <div className="bank-card-holder">
                <span>
                  <small>TITULAR</small>
                  <strong>{card.holder}</strong>
                </span>
                <span>
                  <small>FECHAMENTO</small><strong>{card.closingDay ? `DIA ${String(card.closingDay).padStart(2,"0")}` : "—"}</strong>
                </span>
                <span><small>VENCIMENTO</small><strong>{card.dueDay ? `DIA ${String(card.dueDay).padStart(2,"0")}` : "—"}</strong></span>
              </div>
              <div className="card-usage">
                <p>
                  <span><small>VALOR UTILIZADO</small><strong>{formatCurrency(card.used)}</strong></span>
                  <span><small>LIMITE TOTAL</small><strong>{card.type !== "debit" ? formatCurrency(card.limit) : "Débito"}</strong></span>
                </p>
                {card.type !== "debit" && (
                  <ProgressBar value={card.limit ? card.used / card.limit * 100 : 0} color={card.limit && card.used/card.limit > .8 ? "#ffca63" : "#49e0bd"} />
                )}
              </div>
            </Link>
          ))}
        </section>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Adicionar cartão"
        description="O cartão será salvo no cadastro da sua família."
      >
        <form className="modal-form" onSubmit={submit}>
          <div className="form-grid two">
            <Field label="Nome do cartão">
              <input name="name" placeholder="Ex.: Cartão principal" required />
            </Field>
            <Field label="Banco ou instituição">
              <input
                name="institution"
                placeholder="Ex.: Banco Inter"
                required
              />
            </Field>
          </div>
          <div className="form-grid two">
            <Field label="Titular">
              <select name="holderMemberId" required>
                <option value="">Selecione</option>
                {account?.members.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select name="type" value={cardType} onChange={(event) => setCardType(event.target.value as typeof cardType)}>
                <option value="credit">Crédito</option>
                <option value="debit">Débito</option>
                <option value="credit_debit">Crédito e Débito</option>
              </select>
            </Field>
          </div>
          <div className="form-grid two">
            <Field label="Últimos 4 números">
              <input
                name="lastFour"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="0000"
                required
              />
            </Field>
            {cardType !== "debit" && <Field label="Limite total">
              <input
                name="limit"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </Field>}
          </div>
          {cardType !== "debit" && <div className="form-grid two">
            <Field label="Dia de fechamento">
              <input
                name="closingDay"
                type="number"
                min="1"
                max="31"
                required
              />
            </Field>
            <Field label="Dia de vencimento">
              <input name="dueDay" type="number" min="1" max="31" required />
            </Field>
          </div>}
          <Field label="Imagem de fundo do cartão" hint="PNG, JPG, JPEG ou WEBP">
            <input name="backgroundImage" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setBackgroundImageFile(file); const reader = new FileReader(); reader.onload = () => setBackgroundImage(String(reader.result)); reader.readAsDataURL(file); }} />
          </Field>
          {backgroundImage && <div className="card-image-preview" style={{backgroundImage:`linear-gradient(145deg,rgba(4,25,33,.45),rgba(8,42,52,.7)),url(${backgroundImage})`}}><span>Prévia do cartão</span><button type="button" onClick={() => { setBackgroundImage(""); setBackgroundImageFile(null); }}>Remover imagem</button></div>}
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar cartão"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Editar cartão" description="Atualize os dados e a imagem do cartão.">
        {editing && <form className="modal-form" onSubmit={editCard}><div className="form-grid two"><Field label="Nome do cartão"><input name="name" defaultValue={editing.name} required /></Field><Field label="Banco ou instituição"><input name="institution" defaultValue={editing.institution} required /></Field></div><div className="form-grid two"><Field label="Titular"><select name="holderMemberId" defaultValue={editing.holderMemberId} required>{account?.members.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></Field><Field label="Tipo"><select name="type" value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as CardItem["type"] })}><option value="credit">Crédito</option><option value="debit">Débito</option><option value="credit_debit">Crédito e Débito</option></select></Field></div><div className="form-grid two"><Field label="Últimos 4 números"><input name="lastFour" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} defaultValue={editing.lastFour} required /></Field>{editing.type !== "debit" && <Field label="Limite total"><input name="limit" type="number" min="0.01" step="0.01" defaultValue={editing.limit} required /></Field>}</div>{editing.type !== "debit" && <div className="form-grid two"><Field label="Dia de fechamento"><input name="closingDay" type="number" min="1" max="31" defaultValue={editing.closingDay ?? ""} required /></Field><Field label="Dia de vencimento"><input name="dueDay" type="number" min="1" max="31" defaultValue={editing.dueDay ?? ""} required /></Field></div>}<Field label="Alterar imagem de fundo" hint="Se não escolher outra imagem, a atual será mantida."><input name="backgroundImage" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setEditImageFile(file); const reader = new FileReader(); reader.onload = () => setEditImagePreview(String(reader.result)); reader.readAsDataURL(file); }} /></Field>{editImagePreview && <div className="card-image-preview" style={{ backgroundImage: `linear-gradient(145deg,rgba(4,25,33,.18),rgba(8,42,52,.38)),url(${editImagePreview})` }}><span>Prévia da imagem</span></div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></div></form>}
      </Modal>
    </>
  );
}
