"use client";

import Link from "next/link";
import { Pencil, Plus, Store } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, ProgressBar } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type StoreItem = { id: string; name: string; credit_limit: number; used: number; available: number; holder: string; holderId: string; backgroundImage: string };

export default function StoresPage() {
  const { data: account } = useAccount();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/stores", { cache: "no-store" }); const result = await response.json().catch(() => null); if (response.ok) setItems(result?.stores ?? []); }, []);
  useEffect(() => {
    // Carrega os comércios reais da família.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const form = event.currentTarget; const data = new FormData(form);
    if (imageFile) data.set("backgroundImage", imageFile); else data.delete("backgroundImage");
    const response = await fetch("/api/stores", { method: "POST", body: data });
    const result = await response.json().catch(() => null); setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível salvar.");
    form.reset(); setImageFile(null); setImagePreview(""); setOpen(false); await load(); toast.success("Comércio cadastrado com sucesso.");
  }
  async function editStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const values = new FormData(event.currentTarget);
    if (editImageFile) values.set("backgroundImage", editImageFile); else values.delete("backgroundImage");
    const response = await fetch(`/api/stores/${editing.id}`, { method: "PATCH", body: values });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível editar o comércio.");
    setEditing(null); setEditImageFile(null); setEditImagePreview(""); await load(); toast.success("Comércio atualizado.");
  }
  return <>
    <PageHeader title="Comércios" subtitle="Controle os estabelecimentos e crediários da família." />
    <div className="toolbar"><PeriodFilter /><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16} /> Adicionar comércio</button></div>
    {items.length === 0 ? <section className="panel module-section"><EmptyState icon={Store} title="Nenhum comércio cadastrado" description="Cadastre um comércio para utilizá-lo nos lançamentos." /></section> : <section className="store-grid">{items.map((item) => {
      const percent = item.credit_limit ? item.used / item.credit_limit * 100 : 0;
      return <Link href={`/comercios/${item.id}`} className={`store-card ${item.backgroundImage ? "store-card-with-image" : ""}`} key={item.id}>
        <button className="store-edit-button" type="button" title="Editar comércio" aria-label={`Editar ${item.name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setEditing(item); setEditImageFile(null); setEditImagePreview(item.backgroundImage); }}><Pencil size={14} /></button>
        {item.backgroundImage && <span aria-hidden="true" className="store-card-background" style={{ backgroundImage: `url("${item.backgroundImage}")` }} />}
        <div className="store-card-content"><div className="store-card-head"><span><Store /></span><div><small>Comércio</small><h2>{item.name}</h2></div></div><p className="store-holder">Titular <strong>{item.holder}</strong></p><div className="store-numbers store-limit-numbers two-values"><span><small>Limite utilizado</small><strong>{formatCurrency(item.used)}</strong></span><span><small>Limite total</small><strong>{formatCurrency(item.credit_limit)}</strong></span></div><ProgressBar value={percent} color={percent > 80 ? "#ffca63" : "#49e0bd"} /><footer><span>{Math.round(percent)}% utilizado</span><strong>Abrir histórico →</strong></footer></div>
      </Link>;
    })}</section>}
    <Modal open={open} onClose={() => setOpen(false)} title="Adicionar comércio" description="Ele aparecerá automaticamente no lançamento de despesas."><form className="modal-form" onSubmit={submit}><Field label="Nome do comércio"><input name="name" required /></Field><div className="form-grid two"><Field label="Titular"><select name="holderId" required><option value="">Selecione</option>{account?.members.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></Field><Field label="Limite total"><input name="limit" type="number" min="0.01" step="0.01" required /></Field></div><Field label="Imagem de fundo do comércio" hint="PNG, JPG, JPEG ou WEBP"><input name="backgroundImage" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setImageFile(file); const reader = new FileReader(); reader.onload = () => setImagePreview(String(reader.result)); reader.readAsDataURL(file); }} /></Field>{imagePreview && <div className="card-image-preview" style={{ backgroundImage: `linear-gradient(145deg,rgba(4,25,33,.18),rgba(8,42,52,.38)),url(${imagePreview})` }}><span>Prévia do comércio</span><button type="button" onClick={() => { setImageFile(null); setImagePreview(""); }}>Remover imagem</button></div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar comércio"}</button></div></form></Modal>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Editar comércio" description="Atualize os dados e a imagem do comércio.">{editing && <form className="modal-form" onSubmit={editStore}><Field label="Nome do comércio"><input name="name" defaultValue={editing.name} required /></Field><div className="form-grid two"><Field label="Titular"><select name="holderId" defaultValue={editing.holderId} required>{account?.members.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></Field><Field label="Limite total"><input name="limit" type="number" min="0.01" step="0.01" defaultValue={editing.credit_limit} required /></Field></div><Field label="Alterar imagem de fundo" hint="Se não escolher outra imagem, a atual será mantida."><input name="backgroundImage" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setEditImageFile(file); const reader = new FileReader(); reader.onload = () => setEditImagePreview(String(reader.result)); reader.readAsDataURL(file); }} /></Field>{editImagePreview && <div className="card-image-preview" style={{ backgroundImage: `linear-gradient(145deg,rgba(4,25,33,.18),rgba(8,42,52,.38)),url(${editImagePreview})` }}><span>Prévia da imagem</span></div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></div></form>}</Modal>
  </>;
}
