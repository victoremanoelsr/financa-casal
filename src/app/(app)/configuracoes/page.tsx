"use client";

import { Check, Clipboard, Plus, Settings, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { normalizePersonName, normalizeUsername } from "@/lib/format";
import { useAccount } from "@/lib/use-account";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const tabs = [{ id: "account", label: "Minha conta", icon: UserRound }, { id: "family", label: "Família", icon: UsersRound }, { id: "users", label: "Usuários", icon: ShieldCheck }, { id: "categories", label: "Categorias", icon: Settings }, { id: "preferences", label: "Preferências", icon: Settings }, { id: "security", label: "Segurança", icon: ShieldCheck }];

export default function SettingsPage() {
  const router = useRouter();
  const { data, loading, reload } = useAccount();
  const [tab, setTab] = useState("account");
  const [joinOpen, setJoinOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [categoryKind, setCategoryKind] = useState<"income" | "expense">("expense");
  const [preferences, setPreferences] = useState({ theme: "light" as "light" | "dark" | "system", dueSoon: true, overdue: true, cards: true, goals: true, news: true, listOrder: "newest" as "newest" | "oldest", dailySummaryTime: "20:00" });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", username: "", phone: "", contactEmail: "", birthDate: "", postalCode: "", stateCode: "PI", city: "", district: "", street: "", number: "", complement: "" });

  useEffect(() => {
    if (!data) return;
    // A resposta da conta é a fonte externa que inicializa o formulário editável.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ fullName: data.profile.fullName, username: data.username, phone: data.profile.phone, contactEmail: data.profile.contactEmail, birthDate: data.profile.birthDate, postalCode: data.address.postalCode, stateCode: data.address.stateCode, city: data.address.city, district: data.address.district, street: data.address.street, number: data.address.number, complement: data.address.complement });
    setPreferences({ theme: data.preferences.theme, ...data.preferences.notifications, listOrder: data.preferences.listOrder, dailySummaryTime: data.preferences.dailySummaryTime });
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
    const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "category", name: category, kind: categoryKind }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível adicionar.");
    setCategory(""); toast.success("Categoria adicionada."); await reload();
  }

  async function savePreferences() {
    setSaving(true);
    const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preferences", theme: preferences.theme, notifications: { dueSoon: preferences.dueSoon, overdue: preferences.overdue, cards: preferences.cards, goals: preferences.goals, news: preferences.news }, listOrder: preferences.listOrder, dailySummaryTime: preferences.dailySummaryTime }) });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível salvar as preferências.");
    document.documentElement.dataset.theme = preferences.theme;
    toast.success("Preferências salvas.");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");
    if (password.length < 8) return toast.error("A nova senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmation) return toast.error("A confirmação da senha não confere.");
    setSaving(true);
    const { error } = await createBrowserSupabaseClient().auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error("Não foi possível alterar a senha.");
    event.currentTarget.reset();
    toast.success("Senha alterada com sucesso.");
  }

  async function signOut(scope: "local" | "global") {
    if (!window.confirm(scope === "global" ? "Sair de todos os dispositivos?" : "Deseja sair da sua conta?")) return;
    await createBrowserSupabaseClient().auth.signOut({ scope });
    router.replace("/entrar");
  }

  const initials = (data?.profile.fullName || "U").split(" ").slice(0, 2).map((part) => part[0]).join("");
  return <><PageHeader title="Configurações" subtitle="Gerencie sua conta, família, integrantes e preferências do sistema." />
    <section className="settings-layout"><nav className="settings-tabs">{tabs.map(({ id, label, icon: Icon }) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}><Icon size={17} />{label}</button>)}</nav>
      <div className="settings-content">{loading && <div className="settings-card"><EmptyState title="Carregando seu cadastro" description="Buscando seus dados com segurança." /></div>}
        {!loading && data && tab === "account" && <form className="settings-card" onSubmit={saveProfile}><header><span className="settings-avatar">{initials}</span><div><h2>Informações pessoais</h2><p>Estes são os dados informados no seu cadastro.</p></div></header><div className="form-grid two"><Field label="Nome completo"><input className="uppercase-input" value={form.fullName} onChange={(event) => set("fullName", normalizePersonName(event.target.value))} required /></Field><Field label="Nome de usuário" hint="Único em todo o sistema"><input value={form.username} onChange={(event) => set("username", normalizeUsername(event.target.value))} required /></Field></div><div className="form-grid two"><Field label="Telefone / WhatsApp"><input value={form.phone} onChange={(event) => set("phone", event.target.value)} required /></Field><Field label="E-mail"><input type="email" value={form.contactEmail} onChange={(event) => set("contactEmail", event.target.value)} required /></Field></div><div className="form-grid two"><Field label="CPF"><input value={data.profile.cpfLast4 ? `***.***.***-${data.profile.cpfLast4}` : ""} disabled /></Field><Field label="Data de nascimento"><input type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} required /></Field></div><div className="settings-divider" /><h3>Endereço</h3><div className="form-grid three"><Field label="CEP"><input value={form.postalCode} onChange={(event) => set("postalCode", event.target.value)} required /></Field><Field label="Estado"><select value={form.stateCode} onChange={(event) => set("stateCode", event.target.value)}><option value="PI">PI</option><option value="MA">MA</option></select></Field><Field label="Cidade"><input value={form.city} onChange={(event) => set("city", event.target.value)} required /></Field></div><div className="form-grid two"><Field label="Bairro"><input value={form.district} onChange={(event) => set("district", event.target.value)} /></Field><Field label="Rua"><input value={form.street} onChange={(event) => set("street", event.target.value)} required /></Field></div><div className="form-grid two"><Field label="Número"><input value={form.number} onChange={(event) => set("number", event.target.value)} required /></Field><Field label="Complemento"><input value={form.complement} onChange={(event) => set("complement", event.target.value)} /></Field></div><footer><button className="primary-button" disabled={saving}><Check size={15} /> {saving ? "Salvando..." : "Salvar alterações"}</button></footer></form>}
        {!loading && data && tab === "family" && <div className="settings-card">{data.family ? <><header><span className="overview-icon green"><UsersRound /></span><div><h2>{data.family.name}</h2><p>{data.members.length} integrante(s) ativo(s)</p></div></header><div className="family-code-box"><div><small>Código exclusivo da família</small><strong>{data.family.joinCode}</strong><p>Gerado automaticamente e exclusivo desta família.</p></div><button onClick={() => { navigator.clipboard?.writeText(data.family?.joinCode ?? ""); toast.success("Código copiado."); }}><Clipboard size={16} /> Copiar código</button></div></> : <EmptyState title="Nenhuma família ativa" description="Entre em uma família usando um código válido." />}<div className="security-note"><ShieldCheck /><p><strong>Privacidade e segurança</strong>Os dados desta família são privados e separados das demais famílias.</p></div><button className="secondary-button inline" onClick={() => setJoinOpen(true)}>Entrar em outra família</button></div>}
        {!loading && data && tab === "users" && <div className="settings-card"><div className="panel-heading"><div><h2>Integrantes</h2><p>Pessoas que realmente fazem parte desta família.</p></div></div>{data.members.length ? <div className="member-list">{data.members.map((member) => <article key={member.id}><span className="user-avatar">{member.displayName.split(" ").slice(0,2).map((part) => part[0]).join("")}</span><div><strong>{member.displayName}</strong><small>{member.isCurrentUser ? "Você" : "Membro da família"}</small></div><em>{member.role === "admin" ? "Administrador" : "Membro"}</em></article>)}</div> : <EmptyState title="Nenhum integrante encontrado" description="Os integrantes aparecerão depois de entrarem na família." />}</div>}
        {!loading && data && tab === "categories" && <div className="settings-card"><div className="panel-heading"><div><h2>Categorias financeiras</h2><p>Separe categorias de entradas e despesas.</p></div></div><form className="category-create" onSubmit={addCategory}><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Nome da nova categoria" /><select value={categoryKind} onChange={(event) => setCategoryKind(event.target.value as "income" | "expense")}><option value="expense">Despesa</option><option value="income">Entrada</option></select><button className="primary-button"><Plus size={15} /> Nova categoria</button></form><h3>Categorias de despesas</h3><div className="category-chips">{data.categories.filter((item) => item.kind !== "income").map((item) => <span key={item.id}>{item.name}{!item.isSystem && <button aria-label={`Opções de ${item.name}`}>•••</button>}</span>)}</div><h3>Categorias de entradas</h3><div className="category-chips">{data.categories.filter((item) => item.kind !== "expense").map((item) => <span key={item.id}>{item.name}{!item.isSystem && <button aria-label={`Opções de ${item.name}`}>•••</button>}</span>)}</div></div>}
        {!loading && data && tab === "preferences" && <div className="settings-card"><div className="panel-heading"><h2>Preferências</h2><p>Personalize a aparência e os avisos.</p></div><div className="preference-options">{(["light", "dark", "system"] as const).map((theme) => <button type="button" key={theme} className={preferences.theme === theme ? "active" : ""} onClick={() => setPreferences((current) => ({ ...current, theme }))}>{theme === "light" ? "Tema claro" : theme === "dark" ? "Tema escuro" : "Automático"}</button>)}</div><div className="preference-list">{[["dueSoon", "Contas próximas do vencimento"], ["overdue", "Contas atrasadas"], ["cards", "Cartões próximos do vencimento"], ["goals", "Metas próximas da data limite"], ["news", "Novidades do sistema"]].map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={Boolean(preferences[key as keyof typeof preferences])} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} /></label>)}</div><div className="form-grid two"><Field label="Ordem das listas"><select value={preferences.listOrder} onChange={(event) => setPreferences((current) => ({ ...current, listOrder: event.target.value as "newest" | "oldest" }))}><option value="newest">Mais recentes primeiro</option><option value="oldest">Mais antigas primeiro</option></select></Field><Field label="Resumo diário"><input type="time" value={preferences.dailySummaryTime} onChange={(event) => setPreferences((current) => ({ ...current, dailySummaryTime: event.target.value }))} /></Field></div><div className="settings-note">Moeda: Real brasileiro (R$) · Datas no formato dd/mm/aaaa</div><button type="button" className="primary-button" disabled={saving} onClick={() => void savePreferences()}>{saving ? "Salvando..." : "Salvar preferências"}</button></div>}
        {!loading && data && tab === "security" && <div className="settings-card"><div className="panel-heading"><h2>Segurança</h2><p>Proteja o acesso à sua conta.</p></div><form className="security-password-form" onSubmit={changePassword}><Field label="Nova senha"><input name="password" type="password" minLength={8} required /></Field><Field label="Confirmar nova senha"><input name="confirmation" type="password" minLength={8} required /></Field><button className="secondary-button" disabled={saving}>{saving ? "Alterando..." : "Alterar senha"}</button></form><div className="security-actions"><button type="button" className="secondary-button" onClick={() => void signOut("global")}>Sair de todos os dispositivos</button><button type="button" className="danger-button" onClick={() => void signOut("local")}>Sair da conta</button></div></div>}
      </div></section>
    <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Entrar em uma família" description="Cole o código recebido. Se for válido, você será vinculado imediatamente."><form className="modal-form" onSubmit={joinFamily}><Field label="Código da família"><input className="family-code-input" name="code" placeholder="FAM-XXXXXX" maxLength={10} required /></Field><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setJoinOpen(false)}>Cancelar</button><button className="primary-button">Entrar na família</button></div></form></Modal></>;
}
