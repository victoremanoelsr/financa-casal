"use client";

import { Check, Clipboard, Plus, Settings, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { normalizePersonName, normalizeUsername } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

const tabs = [{ id: "account", label: "Minha conta", icon: UserRound }, { id: "family", label: "Família", icon: UsersRound }, { id: "users", label: "Usuários", icon: ShieldCheck }, { id: "categories", label: "Categorias", icon: Settings }];

export default function SettingsPage() {
  const { data, loading, reload } = useAccount();
  const [tab, setTab] = useState("account");
  const [joinOpen, setJoinOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", username: "", phone: "", contactEmail: "", birthDate: "", postalCode: "", stateCode: "PI", city: "", district: "", street: "", number: "", complement: "" });

  useEffect(() => {
    if (!data) return;
    // A resposta da conta é a fonte externa que inicializa o formulário editável.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ fullName: data.profile.fullName, username: data.username, phone: data.profile.phone, contactEmail: data.profile.contactEmail, birthDate: data.profile.birthDate, postalCode: data.address.postalCode, stateCode: data.address.stateCode, city: data.address.city, district: data.address.district, street: data.address.street, number: data.address.number, complement: data.address.complement });
  }, [data]);

  function set(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json().catch(() => null);
      if (!response.ok) return toast.error(result?.message ?? "Não foi possível salvar.");
      toast.success("Informações atualizadas no cadastro."); await reload();
    } finally { setSaving(false); }
  }

  async function joinFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const code = String(new FormData(event.currentTarget).get("code")).trim().toUpperCase();
    const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", code }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível entrar na família.");
    setJoinOpen(false); toast.success("Você entrou na família."); await reload();
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault(); if (!category.trim()) return;
    const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "category", name: category }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível adicionar.");
    setCategory(""); toast.success("Categoria adicionada."); await reload();
  }

  const initials = (data?.profile.fullName || "U").split(" ").slice(0, 2).map((part) => part[0]).join("");
  return <><PageHeader title="Configurações" subtitle="Gerencie sua conta, família, integrantes e preferências do sistema." />
    <section className="settings-layout"><nav className="settings-tabs">{tabs.map(({ id, label, icon: Icon }) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}><Icon size={17} />{label}</button>)}</nav>
      <div className="settings-content">{loading && <div className="settings-card"><EmptyState title="Carregando seu cadastro" description="Buscando seus dados com segurança." /></div>}
        {!loading && data && tab === "account" && <form className="settings-card" onSubmit={saveProfile}><header><span className="settings-avatar">{initials}</span><div><h2>Informações pessoais</h2><p>Estes são os dados informados no seu cadastro.</p></div></header><div className="form-grid two"><Field label="Nome completo"><input className="uppercase-input" value={form.fullName} onChange={(event) => set("fullName", normalizePersonName(event.target.value))} required /></Field><Field label="Nome de usuário" hint="Único em todo o sistema"><input value={form.username} onChange={(event) => set("username", normalizeUsername(event.target.value))} required /></Field></div><div className="form-grid two"><Field label="Telefone / WhatsApp"><input value={form.phone} onChange={(event) => set("phone", event.target.value)} required /></Field><Field label="E-mail"><input type="email" value={form.contactEmail} onChange={(event) => set("contactEmail", event.target.value)} required /></Field></div><div className="form-grid two"><Field label="CPF"><input value={data.profile.cpfLast4 ? `***.***.***-${data.profile.cpfLast4}` : ""} disabled /></Field><Field label="Data de nascimento"><input type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} required /></Field></div><div className="settings-divider" /><h3>Endereço</h3><div className="form-grid three"><Field label="CEP"><input value={form.postalCode} onChange={(event) => set("postalCode", event.target.value)} required /></Field><Field label="Estado"><select value={form.stateCode} onChange={(event) => set("stateCode", event.target.value)}><option value="PI">PI</option><option value="MA">MA</option></select></Field><Field label="Cidade"><input value={form.city} onChange={(event) => set("city", event.target.value)} required /></Field></div><div className="form-grid two"><Field label="Bairro"><input value={form.district} onChange={(event) => set("district", event.target.value)} /></Field><Field label="Rua"><input value={form.street} onChange={(event) => set("street", event.target.value)} required /></Field></div><div className="form-grid two"><Field label="Número"><input value={form.number} onChange={(event) => set("number", event.target.value)} required /></Field><Field label="Complemento"><input value={form.complement} onChange={(event) => set("complement", event.target.value)} /></Field></div><footer><button className="primary-button" disabled={saving}><Check size={15} /> {saving ? "Salvando..." : "Salvar alterações"}</button></footer></form>}
        {!loading && data && tab === "family" && <div className="settings-card">{data.family ? <><header><span className="overview-icon green"><UsersRound /></span><div><h2>{data.family.name}</h2><p>{data.members.length} integrante(s) ativo(s)</p></div></header><div className="family-code-box"><div><small>Código exclusivo da família</small><strong>{data.family.joinCode}</strong><p>Quem utilizar este código entrará imediatamente na família.</p></div><button onClick={() => { navigator.clipboard?.writeText(data.family?.joinCode ?? ""); toast.success("Código copiado."); }}><Clipboard size={16} /> Copiar código</button></div></> : <EmptyState title="Nenhuma família ativa" description="Entre em uma família usando um código válido." />}<div className="security-note"><ShieldCheck /><p><strong>Proteção multifamília</strong>Os dados são isolados por associação e políticas RLS.</p></div><button className="secondary-button inline" onClick={() => setJoinOpen(true)}>Entrar em outra família</button></div>}
        {!loading && data && tab === "users" && <div className="settings-card"><div className="panel-heading"><div><h2>Integrantes</h2><p>Pessoas que realmente fazem parte desta família.</p></div></div>{data.members.length ? <div className="member-list">{data.members.map((member) => <article key={member.id}><span className="user-avatar">{member.displayName.split(" ").slice(0,2).map((part) => part[0]).join("")}</span><div><strong>{member.displayName}</strong><small>{member.isCurrentUser ? "Você" : "Membro da família"}</small></div><em>{member.role === "admin" ? "Administrador" : "Membro"}</em></article>)}</div> : <EmptyState title="Nenhum integrante encontrado" description="Os integrantes aparecerão depois de entrarem na família." />}</div>}
        {!loading && data && tab === "categories" && <div className="settings-card"><div className="panel-heading"><div><h2>Categorias financeiras</h2><p>Categorias disponíveis para sua família</p></div></div><form className="category-create" onSubmit={addCategory}><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Nome da nova categoria" /><button className="primary-button"><Plus size={15} /> Adicionar</button></form><div className="category-chips">{data.categories.map((item) => <span key={item.id}>{item.name}{!item.isSystem && <button aria-label={`Opções de ${item.name}`}>•••</button>}</span>)}</div></div>}
      </div></section>
    <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Entrar em uma família" description="Cole o código recebido. Se for válido, você será vinculado imediatamente."><form className="modal-form" onSubmit={joinFamily}><Field label="Código da família"><input className="family-code-input" name="code" placeholder="FAM-XXXXXX" maxLength={10} required /></Field><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setJoinOpen(false)}>Cancelar</button><button className="primary-button">Entrar na família</button></div></form></Modal></>;
}
