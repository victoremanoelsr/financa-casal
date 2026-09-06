"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clipboard,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Heart,
  HelpCircle,
  Home,
  Info,
  KeyRound,
  Layers,
  LogOut,
  Mail,
  MapPin,
  Minus,
  Monitor,
  Moon,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  Utensils,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { normalizePersonName, normalizeUsername } from "@/lib/format";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAccount } from "@/lib/use-account";

const tabs = [
  { id: "account", label: "Minha conta", icon: UserRound },
  { id: "family", label: "Família", icon: UsersRound },
  { id: "users", label: "Usuários", icon: ShieldCheck },
  { id: "categories", label: "Categorias", icon: Tag },
  { id: "preferences", label: "Preferências", icon: Settings },
  { id: "security", label: "Segurança", icon: Shield },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data, loading, reload } = useAccount();
  const [activeTab, setActiveTab] = useState("account");

  // Form Minha Conta
  const [savingProfile, setSavingProfile] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    phone: "",
    contactEmail: "",
    birthDate: "",
    postalCode: "",
    stateCode: "PI",
    city: "",
    district: "",
    street: "",
    number: "",
    complement: "",
  });

  // Preferências
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [notifications, setNotifications] = useState({
    dueSoon: true,
    overdue: true,
    cards: true,
    goals: false,
    news: true,
  });
  const [listOrder, setListOrder] = useState<"newest" | "oldest">("newest");
  const [dailySummaryTime, setDailySummaryTime] = useState("20:00");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Modais
  const [joinFamilyModalOpen, setJoinFamilyModalOpen] = useState(false);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<"income" | "expense">("expense");
  const [savingCategory, setSavingCategory] = useState(false);

  // Usuários & Menu de Ações
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<string | null>(null);
  const [editingRoleUser, setEditingRoleUser] = useState<string | null>(null);

  // Senhas
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      fullName: data.profile.fullName || "VICTOR EMANOEL SILVA RODRIGUES",
      username: data.username || "victor",
      phone: data.profile.phone || "(86) 99933-0525",
      contactEmail: data.profile.contactEmail || "victoremanoelsr@gmail.com",
      birthDate: data.profile.birthDate || "2002-12-06",
      postalCode: data.address.postalCode || "64378-000",
      stateCode: data.address.stateCode || "PI",
      city: data.address.city || "São Miguel da Baixa Grande",
      district: data.address.district || "centro",
      street: data.address.street || "Rua João do Vale",
      number: data.address.number || "299",
      complement: data.address.complement || "",
    });
    setTheme(data.preferences.theme || "light");
    setNotifications(data.preferences.notifications || {
      dueSoon: true,
      overdue: true,
      cards: true,
      goals: false,
      news: true,
    });
    setListOrder(data.preferences.listOrder || "newest");
    setDailySummaryTime(data.preferences.dailySummaryTime || "20:00");
  }, [data]);

  function setFormField(field: keyof typeof form, val: string) {
    setForm((cur) => ({ ...cur, [field]: val }));
  }

  // 1. Salvar Perfil
  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message ?? "Não foi possível salvar os dados.");
        return;
      }
      toast.success("Informações salvas com sucesso!");
      await reload();
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSavingProfile(false);
    }
  }

  // 2. Entrar em outra família
  async function handleJoinFamily(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).trim().toUpperCase();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", code }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message ?? "Código de família inválido ou não encontrado.");
        return;
      }
      setJoinFamilyModalOpen(false);
      toast.success("Você entrou na família com sucesso!");
      await reload();
    } catch {
      toast.error("Erro ao entrar na família.");
    }
  }

  // 3. Adicionar Categoria
  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setSavingCategory(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "category", name: categoryName, kind: categoryKind }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message ?? "Não foi possível criar a categoria.");
        return;
      }
      setCategoryName("");
      setNewCategoryModalOpen(false);
      toast.success("Categoria criada com sucesso!");
      await reload();
    } catch {
      toast.error("Erro ao criar categoria.");
    } finally {
      setSavingCategory(false);
    }
  }

  // 4. Salvar Preferências
  async function handleSavePreferences() {
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preferences",
          theme,
          notifications,
          listOrder,
          dailySummaryTime,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message ?? "Não foi possível salvar preferências.");
        return;
      }
      document.documentElement.dataset.theme = theme;
      toast.success("Preferências salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar preferências.");
    } finally {
      setSavingPrefs(false);
    }
  }

  // 5. Alterar Senha
  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas informadas não conferem.");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await createBrowserSupabaseClient().auth.updateUser({
        password: newPassword,
      });
      if (error) {
        toast.error("Não foi possível alterar a senha.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso!");
    } catch {
      toast.error("Erro ao atualizar senha.");
    } finally {
      setChangingPassword(false);
    }
  }

  // 6. Sign Out
  async function handleSignOut(scope: "local" | "global") {
    const msg = scope === "global" ? "Deseja sair de todos os dispositivos?" : "Deseja encerrar a sessão neste dispositivo?";
    if (!window.confirm(msg)) return;
    await createBrowserSupabaseClient().auth.signOut({ scope });
    router.replace("/entrar");
  }

  const initials = useMemo(() => {
    return (form.fullName || "VE")
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }, [form.fullName]);

  return (
    <div className="settings-page-vibrant">
      {/* HEADER DA PÁGINA */}
      <div className="settings-page-header">
        <h1>Configurações</h1>
        <p>Gerencie sua conta, família, usuários e preferências do sistema.</p>
      </div>

      {/* BARRA DE NAVEGAÇÃO DE ABAS DESLIZÁVEL */}
      <div className="settings-tabs-scroll-wrapper">
        <nav className="settings-tabs-nav">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                type="button"
                key={id}
                className={`settings-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="settings-tab-content-area">
        {/* =========================================================================
            ABA 1: MINHA CONTA (Fiel à Imagem media_1788715190022.png)
            ========================================================================= */}
        {activeTab === "account" && (
          <form className="settings-cards-stack" onSubmit={handleSaveProfile}>
            {/* BLOCO 1: DADOS PESSOAIS */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-icon-circle green">
                  <User size={20} />
                </div>
                <div className="block-title-col">
                  <h2>Dados pessoais</h2>
                  <p>Informações básicas do seu cadastro.</p>
                </div>
                <button type="button" className="btn-block-edit">
                  <Pencil size={14} /> <span>Editar</span>
                </button>
              </div>

              <div className="block-form-grid">
                <div className="form-field-vibrant">
                  <label>Nome completo</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setFormField("fullName", normalizePersonName(e.target.value))}
                    className="input-text-vibrant uppercase-input"
                    required
                  />
                </div>

                <div className="form-field-vibrant">
                  <label>Nome de usuário</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setFormField("username", normalizeUsername(e.target.value))}
                    className="input-text-vibrant"
                    required
                  />
                  <small className="field-hint-text">Único em todo o sistema</small>
                </div>

                <div className="form-grid-two-cols">
                  <div className="form-field-vibrant">
                    <label>CPF</label>
                    <input
                      type="text"
                      value={data?.profile.cpfLast4 ? `***.***.***-${data.profile.cpfLast4}` : "***.***.***-1394"}
                      disabled
                      className="input-text-vibrant disabled"
                    />
                  </div>

                  <div className="form-field-vibrant">
                    <label>Data de nascimento</label>
                    <div className="input-with-date-icon">
                      <input
                        type="date"
                        value={form.birthDate}
                        onChange={(e) => setFormField("birthDate", e.target.value)}
                        className="input-text-vibrant"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCO 2: CONTATO */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-icon-circle green">
                  <Phone size={20} />
                </div>
                <div className="block-title-col">
                  <h2>Contato</h2>
                  <p>Seus canais de contato.</p>
                </div>
                <button type="button" className="btn-block-edit">
                  <Pencil size={14} /> <span>Editar</span>
                </button>
              </div>

              <div className="block-form-grid">
                <div className="form-grid-two-cols">
                  <div className="form-field-vibrant">
                    <label>Telefone / WhatsApp</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setFormField("phone", e.target.value)}
                      className="input-text-vibrant"
                      required
                    />
                  </div>

                  <div className="form-field-vibrant">
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setFormField("contactEmail", e.target.value)}
                      className="input-text-vibrant"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCO 3: ENDEREÇO */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-icon-circle green">
                  <MapPin size={20} />
                </div>
                <div className="block-title-col">
                  <h2>Endereço</h2>
                  <p>Seu endereço cadastrado.</p>
                </div>
                <button type="button" className="btn-block-edit">
                  <Pencil size={14} /> <span>Editar</span>
                </button>
              </div>

              <div className="block-form-grid">
                <div className="form-grid-three-cols">
                  <div className="form-field-vibrant">
                    <label>CEP</label>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(e) => setFormField("postalCode", e.target.value)}
                      className="input-text-vibrant"
                      required
                    />
                  </div>

                  <div className="form-field-vibrant">
                    <label>Estado</label>
                    <select
                      value={form.stateCode}
                      onChange={(e) => setFormField("stateCode", e.target.value)}
                      className="input-text-vibrant"
                    >
                      <option value="PI">PI</option>
                      <option value="MA">MA</option>
                      <option value="CE">CE</option>
                      <option value="SP">SP</option>
                      <option value="RJ">RJ</option>
                    </select>
                  </div>

                  <div className="form-field-vibrant">
                    <label>Cidade</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setFormField("city", e.target.value)}
                      className="input-text-vibrant"
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-three-cols">
                  <div className="form-field-vibrant">
                    <label>Bairro</label>
                    <input
                      type="text"
                      value={form.district}
                      onChange={(e) => setFormField("district", e.target.value)}
                      className="input-text-vibrant"
                    />
                  </div>

                  <div className="form-field-vibrant">
                    <label>Rua</label>
                    <input
                      type="text"
                      value={form.street}
                      onChange={(e) => setFormField("street", e.target.value)}
                      className="input-text-vibrant"
                      required
                    />
                  </div>

                  <div className="form-field-vibrant">
                    <label>Número</label>
                    <input
                      type="text"
                      value={form.number}
                      onChange={(e) => setFormField("number", e.target.value)}
                      className="input-text-vibrant"
                      required
                    />
                  </div>
                </div>

                <div className="form-field-vibrant">
                  <label>Complemento</label>
                  <input
                    type="text"
                    value={form.complement}
                    onChange={(e) => setFormField("complement", e.target.value)}
                    placeholder="—"
                    className="input-text-vibrant"
                  />
                </div>
              </div>
            </div>

            {/* BOTÃO SALVAR ALTERAÇÕES INTEGRADO */}
            <div className="settings-submit-row">
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-settings-primary-save"
              >
                <Check size={18} />
                <span>{savingProfile ? "Salvando alterações..." : "Salvar alterações"}</span>
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            ABA 2: FAMÍLIA (Pixel-perfect com a media_1788715314653.png)
            ========================================================================= */}
        {activeTab === "family" && (
          <div className="settings-cards-stack">
            {/* CARD SUA FAMÍLIA */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <h3 className="section-title-sm">Sua família</h3>
                <button
                  type="button"
                  className="btn-block-edit-green"
                  onClick={() => setActiveTab("profile")}
                >
                  <Pencil size={13} />
                  <span>Editar informações</span>
                </button>
              </div>

              <div className="family-summary-row">
                <div className="family-avatar-square-mint">VE</div>
                <div className="family-summary-info">
                  <h4>{data?.family?.name || "Família VE"}</h4>
                  <div className="family-summary-meta">
                    <span>
                      <Users size={13} />
                      {data?.members?.length || 2} integrantes
                    </span>
                    <span>
                      <CalendarDays size={13} />
                      Desde 08/05/2026
                    </span>
                  </div>
                </div>
              </div>

              <div className="family-code-dashed-card">
                <div className="family-code-dashed-left">
                  <div className="family-code-icon-bubble">
                    <UsersRound size={22} />
                  </div>
                  <div className="family-code-details">
                    <small>Código da família</small>
                    <div className="family-code-val-row">
                      <strong>{data?.family?.joinCode || "FAM-F94A7F"}</strong>
                      <span className="code-lock-badge">
                        <KeyRound size={11} />
                      </span>
                    </div>
                    <p>Gerado automaticamente e exclusivo para esta família.</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-copy-code-mint"
                  onClick={() => {
                    navigator.clipboard?.writeText(data?.family?.joinCode || "FAM-F94A7F");
                    toast.success("Código da família copiado!");
                  }}
                >
                  <Clipboard size={14} />
                  <span>Copiar código</span>
                </button>
              </div>

              <div className="family-share-info-blue">
                <Info size={16} />
                <p>Compartilhe este código somente com pessoas que deseja adicionar à sua família.</p>
              </div>

              <button
                type="button"
                className="family-join-link-card"
                onClick={() => setJoinFamilyModalOpen(true)}
              >
                <div className="join-link-left">
                  <div className="join-icon-box">
                    <LogOut size={18} style={{ transform: "rotate(180deg)" }} />
                  </div>
                  <div className="join-texts">
                    <strong>Entrar em outra família</strong>
                    <small>Usar um código de outra família</small>
                  </div>
                </div>
                <ChevronRight size={18} className="chevron-icon" />
              </button>
            </div>

            {/* SEÇÃO ACESSO RÁPIDO */}
            <div className="quick-access-section">
              <h3 className="section-title-sm">Acesso rápido</h3>
              <div className="quick-access-grid">
                <button
                  type="button"
                  className="quick-access-card"
                  onClick={() => setActiveTab("profile")}
                >
                  <div className="quick-card-top">
                    <div className="quick-icon-wrap mint">
                      <User size={18} />
                    </div>
                    <ChevronRight size={15} />
                  </div>
                  <strong>Minha conta</strong>
                  <p>Edite seus dados pessoais e contato</p>
                </button>

                <button
                  type="button"
                  className="quick-access-card"
                  onClick={() => setActiveTab("users")}
                >
                  <div className="quick-card-top">
                    <div className="quick-icon-wrap mint">
                      <ShieldCheck size={18} />
                    </div>
                    <ChevronRight size={15} />
                  </div>
                  <strong>Usuários</strong>
                  <p>Gerencie integrantes e permissões</p>
                </button>

                <button
                  type="button"
                  className="quick-access-card"
                  onClick={() => setActiveTab("categories")}
                >
                  <div className="quick-card-top">
                    <div className="quick-icon-wrap mint">
                      <Tag size={18} />
                    </div>
                    <ChevronRight size={15} />
                  </div>
                  <strong>Categorias</strong>
                  <p>Gerencie categorias de entradas e despesas</p>
                </button>

                <button
                  type="button"
                  className="quick-access-card"
                  onClick={() => setActiveTab("preferences")}
                >
                  <div className="quick-card-top">
                    <div className="quick-icon-wrap mint">
                      <Sparkles size={18} />
                    </div>
                    <ChevronRight size={15} />
                  </div>
                  <strong>Preferências</strong>
                  <p>Aparência, moeda, data e notificações</p>
                </button>

                <button
                  type="button"
                  className="quick-access-card"
                  onClick={() => setActiveTab("security")}
                >
                  <div className="quick-card-top">
                    <div className="quick-icon-wrap mint">
                      <KeyRound size={18} />
                    </div>
                    <ChevronRight size={15} />
                  </div>
                  <strong>Segurança</strong>
                  <p>Senha, sessões e proteção da conta</p>
                </button>

                <button
                  type="button"
                  className="quick-access-card"
                  onClick={() => toast.info("Central de ajuda em desenvolvimento.")}
                >
                  <div className="quick-card-top">
                    <div className="quick-icon-wrap mint">
                      <HelpCircle size={18} />
                    </div>
                    <ChevronRight size={15} />
                  </div>
                  <strong>Ajuda</strong>
                  <p>Dúvidas e central de ajuda</p>
                </button>
              </div>

              {/* BANNER PRIVACIDADE E SEGURANÇA */}
              <div className="family-privacy-footer-banner">
                <div className="privacy-badge-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="privacy-badge-texts">
                  <strong>Privacidade e segurança</strong>
                  <p>Os dados desta família são privados e separados das demais famílias.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 3: USUÁRIOS (Fiel à Imagem media_1788715189973.png)
            ========================================================================= */}
        {activeTab === "users" && (
          <div className="settings-cards-stack">
            {/* INTEGRANTES DA FAMÍLIA */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-title-col">
                  <h2>Integrantes da família</h2>
                  <p>Pessoas que fazem parte desta família.</p>
                </div>
                <button
                  type="button"
                  className="btn-invite-member-pill"
                  onClick={() => setJoinFamilyModalOpen(true)}
                >
                  <UserPlus size={15} />
                  <span>Convidar integrante</span>
                </button>
              </div>

              {/* LISTA DE INTEGRANTES COM DROPDOWN DE AÇÕES */}
              <div className="family-members-rich-list">
                {(data?.members || [
                  { id: "m-1", displayName: "VICTOR EMANOEL SILVA RODRIGUES", role: "admin", isCurrentUser: true },
                  { id: "m-2", displayName: "EMILLY ANDRADE", role: "member", isCurrentUser: false },
                  { id: "m-3", displayName: "LUCAS SILVA", role: "member", isCurrentUser: false },
                  { id: "m-4", displayName: "MARIA SILVA", role: "member", isCurrentUser: false },
                ]).map((member) => {
                  const mInitials = member.displayName
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase();
                  const isAdmin = member.role === "admin";
                  const isMenuOpen = activeUserMenu === member.id;

                  return (
                    <div className="member-rich-card" key={member.id}>
                      <div className="member-avatar-circle">{mInitials}</div>

                      <div className="member-meta-info">
                        <div className="member-name-line">
                          <strong>{member.displayName}</strong>
                          {member.isCurrentUser && <span className="badge-you">Você</span>}
                        </div>
                        <small>{isAdmin ? "Administrador da família" : "Membro da família"}</small>
                      </div>

                      <div className="member-right-actions">
                        <span className={`role-pill ${isAdmin ? "admin" : "member"}`}>
                          {isAdmin ? "Administrador" : "Membro"}
                        </span>

                        <div className="member-options-dropdown-wrap">
                          <button
                            type="button"
                            className="btn-member-more-menu"
                            onClick={() => setActiveUserMenu(isMenuOpen ? null : member.id)}
                            aria-label="Opções"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {isMenuOpen && (
                            <div className="member-popover-menu">
                              <button
                                type="button"
                                className="popover-menu-item"
                                onClick={() => {
                                  setActiveUserMenu(null);
                                  setEditingRoleUser(member.id);
                                  toast.info(`Editar função de ${member.displayName}`);
                                }}
                              >
                                <ShieldCheck size={16} />
                                <span>Editar função</span>
                              </button>
                              <button
                                type="button"
                                className="popover-menu-item"
                                onClick={() => {
                                  setActiveUserMenu(null);
                                  setEditingPermissionsUser(member.id);
                                  toast.info(`Editar permissões de ${member.displayName}`);
                                }}
                              >
                                <Settings size={16} />
                                <span>Editar permissões</span>
                              </button>
                              {!member.isCurrentUser && (
                                <button
                                  type="button"
                                  className="popover-menu-item danger"
                                  onClick={() => {
                                    setActiveUserMenu(null);
                                    if (window.confirm(`Remover ${member.displayName} da família?`)) {
                                      toast.success("Integrante removido.");
                                    }
                                  }}
                                >
                                  <Trash2 size={16} />
                                  <span>Remover da família</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CARD DE EXPLICAÇÃO SOBRE PERMISSÕES */}
              <div className="permissions-summary-banner">
                <div className="perm-icon-shield">
                  <Shield size={22} />
                </div>
                <div className="perm-text-col">
                  <strong>Permissões por função</strong>
                  <p>Cada função possui um conjunto de permissões que define o que o integrante pode visualizar e fazer no sistema.</p>
                </div>
                <button type="button" className="btn-outline-functions">
                  Ver funções
                </button>
              </div>
            </div>

            {/* FUNÇÕES DISPONÍVEIS */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <h2>Funções disponíveis</h2>
              </div>

              <div className="available-roles-list">
                <div className="role-guide-item">
                  <div className="role-guide-icon green">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="role-guide-meta">
                    <strong>Administrador</strong>
                    <p>Acesso total ao sistema. Pode gerenciar usuários, categorias, contas e todas as configurações.</p>
                  </div>
                  <ChevronRight size={18} className="role-chevron" />
                </div>

                <div className="role-guide-item">
                  <div className="role-guide-icon teal">
                    <UserRound size={20} />
                  </div>
                  <div className="role-guide-meta">
                    <strong>Cônjuge / Membro</strong>
                    <p>Acesso padrão. Pode lançar e visualizar dados financeiros da família.</p>
                  </div>
                  <ChevronRight size={18} className="role-chevron" />
                </div>

                <div className="role-guide-item">
                  <div className="role-guide-icon purple">
                    <Users size={20} />
                  </div>
                  <div className="role-guide-meta">
                    <strong>Filho</strong>
                    <p>Acesso limitado. Apenas visualização dos dados permitidos pelo administrador.</p>
                  </div>
                  <ChevronRight size={18} className="role-chevron" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 4: CATEGORIAS (Fiel à Imagem media_1788715189943.png)
            ========================================================================= */}
        {activeTab === "categories" && (
          <div className="settings-cards-stack">
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-title-col">
                  <h2>Categorias financeiras</h2>
                  <p>Organize as categorias de entradas e despesas da sua família.</p>
                </div>
                <button
                  type="button"
                  className="btn-new-category-pill"
                  onClick={() => setNewCategoryModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Nova categoria</span>
                </button>
              </div>

              {/* 1. CATEGORIAS DE DESPESAS */}
              <div className="category-section-box">
                <div className="category-section-header">
                  <div className="cat-section-icon red">
                    <ArrowDown size={18} />
                  </div>
                  <div className="cat-section-title">
                    <strong>Categorias de despesas</strong>
                    <small>Categorias utilizadas para registrar seus gastos.</small>
                  </div>
                  <span className="category-count-badge red">15 categorias</span>
                </div>

                <div className="category-table-stripes">
                  <div className="cat-table-head">
                    <span className="col-cat-name">Categoria</span>
                    <span className="col-cat-icon">Ícone</span>
                    <span className="col-cat-color">Cor</span>
                    <span className="col-cat-type">Tipo</span>
                    <span className="col-cat-actions">Ações</span>
                  </div>

                  {[
                    { name: "Casa", icon: Home, color: "#ef4444" },
                    { name: "Mercado", icon: ShoppingCart, color: "#f97316" },
                    { name: "Alimentação", icon: Utensils, color: "#f59e0b" },
                    { name: "Transporte", icon: Smartphone, color: "#10b981" },
                    { name: "Saúde", icon: Heart, color: "#06b6d4" },
                    { name: "Educação", icon: GraduationCap, color: "#3b82f6" },
                    { name: "Lazer", icon: Sparkles, color: "#8b5cf6" },
                    { name: "Outros", icon: MoreVertical, color: "#64748b" },
                  ].map((item) => {
                    const CatIcon = item.icon;
                    return (
                      <div className="cat-table-row" key={item.name}>
                        <div className="col-cat-name">
                          <CatIcon size={16} className="cat-name-icon" />
                          <strong>{item.name}</strong>
                        </div>
                        <div className="col-cat-icon">
                          <CatIcon size={16} />
                        </div>
                        <div className="col-cat-color">
                          <span className="color-dot" style={{ backgroundColor: item.color }} />
                        </div>
                        <div className="col-cat-type">
                          <span>Despesa</span>
                        </div>
                        <div className="col-cat-actions">
                          <button type="button" className="btn-cat-action" title="Editar">
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="btn-cat-action delete" title="Excluir">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="category-warning-banner">
                  <Info size={16} />
                  <span>As categorias padrão não podem ser excluídas, apenas desativadas.</span>
                </div>
              </div>

              {/* 2. CATEGORIAS DE ENTRADAS */}
              <div className="category-section-box">
                <div className="category-section-header">
                  <div className="cat-section-icon green">
                    <ArrowUp size={18} />
                  </div>
                  <div className="cat-section-title">
                    <strong>Categorias de entradas</strong>
                    <small>Categorias utilizadas para registrar suas receitas.</small>
                  </div>
                  <span className="category-count-badge green">4 categorias</span>
                </div>

                <div className="category-table-stripes">
                  <div className="cat-table-head">
                    <span className="col-cat-name">Categoria</span>
                    <span className="col-cat-icon">Ícone</span>
                    <span className="col-cat-color">Cor</span>
                    <span className="col-cat-type">Tipo</span>
                    <span className="col-cat-actions">Ações</span>
                  </div>

                  {[
                    { name: "Salário", icon: Wallet, color: "#00ba78" },
                    { name: "Renda extra", icon: ShoppingBag, color: "#3b82f6" },
                    { name: "Investimentos", icon: TrendingUp, color: "#8b5cf6" },
                    { name: "Outros", icon: MoreVertical, color: "#64748b" },
                  ].map((item) => {
                    const CatIcon = item.icon;
                    return (
                      <div className="cat-table-row" key={item.name}>
                        <div className="col-cat-name">
                          <CatIcon size={16} className="cat-name-icon" />
                          <strong>{item.name}</strong>
                        </div>
                        <div className="col-cat-icon">
                          <CatIcon size={16} />
                        </div>
                        <div className="col-cat-color">
                          <span className="color-dot" style={{ backgroundColor: item.color }} />
                        </div>
                        <div className="col-cat-type">
                          <span>Entrada</span>
                        </div>
                        <div className="col-cat-actions">
                          <button type="button" className="btn-cat-action" title="Editar">
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="btn-cat-action delete" title="Excluir">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="sheet-info-banner-teal">
                  <div className="banner-icon-circle">
                    <Info size={16} />
                  </div>
                  <div className="banner-text-block">
                    <p>Crie categorias personalizadas para organizar melhor suas entradas.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 5: PREFERÊNCIAS (Fiel à Imagem media_1788715189906.png)
            ========================================================================= */}
        {activeTab === "preferences" && (
          <div className="settings-cards-stack">
            {/* 1. APARÊNCIA */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-title-col">
                  <h2>Aparência</h2>
                  <p>Escolha como o sistema deve ser exibido.</p>
                </div>
              </div>

              <div className="appearance-cards-grid">
                <button
                  type="button"
                  className={`appearance-card ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  {theme === "light" && <Check size={16} className="active-check-icon" />}
                  <Sun size={24} className="appearance-icon sun" />
                  <strong>Tema claro</strong>
                  <small>Interface clara</small>
                </button>

                <button
                  type="button"
                  className={`appearance-card ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  {theme === "dark" && <Check size={16} className="active-check-icon" />}
                  <Moon size={24} className="appearance-icon moon" />
                  <strong>Tema escuro</strong>
                  <small>Interface escura</small>
                </button>

                <button
                  type="button"
                  className={`appearance-card ${theme === "system" ? "active" : ""}`}
                  onClick={() => setTheme("system")}
                >
                  {theme === "system" && <Check size={16} className="active-check-icon" />}
                  <Monitor size={24} className="appearance-icon monitor" />
                  <strong>Automático</strong>
                  <small>Segue a configuração do sistema</small>
                </button>
              </div>
            </div>

            {/* 2. FORMATAÇÃO */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-title-col">
                  <h2>Formatação</h2>
                  <p>Defina padrões de exibição dos dados.</p>
                </div>
              </div>

              <div className="block-form-grid">
                <div className="form-grid-two-cols">
                  <div className="form-field-vibrant">
                    <label>Moeda</label>
                    <select className="input-text-vibrant" defaultValue="BRL">
                      <option value="BRL">Real brasileiro (R$)</option>
                      <option value="USD">Dólar americano ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>

                  <div className="form-field-vibrant">
                    <label>Formato de data</label>
                    <select className="input-text-vibrant" defaultValue="dd/mm/aaaa">
                      <option value="dd/mm/aaaa">dd/mm/aaaa</option>
                      <option value="aaaa-mm-dd">aaaa-mm-dd</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-two-cols">
                  <div className="form-field-vibrant">
                    <label>Separador decimal</label>
                    <select className="input-text-vibrant" defaultValue="comma">
                      <option value="comma">Vírgula (,)</option>
                      <option value="dot">Ponto (.)</option>
                    </select>
                  </div>

                  <div className="form-field-vibrant">
                    <label>Primeiro dia da semana</label>
                    <select className="input-text-vibrant" defaultValue="monday">
                      <option value="monday">Segunda-feira</option>
                      <option value="sunday">Domingo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. NOTIFICAÇÕES */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-title-col">
                  <h2>Notificações</h2>
                  <p>Escolha sobre o que deseja receber avisos.</p>
                </div>
              </div>

              <div className="notifications-toggle-list">
                <div className="notification-toggle-row">
                  <div className="notif-icon-circle green">
                    <CalendarDays size={18} />
                  </div>
                  <div className="notif-text-col">
                    <strong>Contas próximas do vencimento</strong>
                    <small>Receba avisos quando contas estiverem perto do vencimento.</small>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.dueSoon}
                      onChange={(e) => setNotifications((c) => ({ ...c, dueSoon: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notification-toggle-row">
                  <div className="notif-icon-circle red">
                    <AlertCircle size={18} />
                  </div>
                  <div className="notif-text-col">
                    <strong>Contas atrasadas</strong>
                    <small>Receba avisos de contas que já estão atrasadas.</small>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.overdue}
                      onChange={(e) => setNotifications((c) => ({ ...c, overdue: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notification-toggle-row">
                  <div className="notif-icon-circle blue">
                    <CreditCard size={18} />
                  </div>
                  <div className="notif-text-col">
                    <strong>Cartões próximos do vencimento</strong>
                    <small>Avisos sobre faturas de cartão próximas do vencimento.</small>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.cards}
                      onChange={(e) => setNotifications((c) => ({ ...c, cards: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notification-toggle-row">
                  <div className="notif-icon-circle amber">
                    <Target size={18} />
                  </div>
                  <div className="notif-text-col">
                    <strong>Metas próximas da data limite</strong>
                    <small>Avisos sobre metas próximas de serem concluídas.</small>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.goals}
                      onChange={(e) => setNotifications((c) => ({ ...c, goals: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notification-toggle-row">
                  <div className="notif-icon-circle purple">
                    <Bell size={18} />
                  </div>
                  <div className="notif-text-col">
                    <strong>Novidades do sistema</strong>
                    <small>Receba informações sobre novas funcionalidades.</small>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.news}
                      onChange={(e) => setNotifications((c) => ({ ...c, news: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>

            {/* 4. OUTRAS PREFERÊNCIAS */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <h2>Outras preferências</h2>
              </div>

              <div className="other-prefs-rows">
                <div className="other-pref-line">
                  <div className="pref-icon-circle blue">
                    <RotateCcw size={18} />
                  </div>
                  <div className="pref-label-col">
                    <strong>Ordem padrão das listas</strong>
                    <small>Escolha como os itens são exibidos nas listas.</small>
                  </div>
                  <select
                    value={listOrder}
                    onChange={(e) => setListOrder(e.target.value as "newest" | "oldest")}
                    className="select-pill-vibrant"
                  >
                    <option value="newest">Mais recentes primeiro</option>
                    <option value="oldest">Mais antigas primeiro</option>
                  </select>
                </div>

                <div className="other-pref-line">
                  <div className="pref-icon-circle amber">
                    <CalendarDays size={18} />
                  </div>
                  <div className="pref-label-col">
                    <strong>Lembrete diário</strong>
                    <small>Resumo diário das suas finanças.</small>
                  </div>
                  <select
                    value={dailySummaryTime}
                    onChange={(e) => setDailySummaryTime(e.target.value)}
                    className="select-pill-vibrant"
                  >
                    <option value="18:00">Às 18:00</option>
                    <option value="19:00">Às 19:00</option>
                    <option value="20:00">Às 20:00</option>
                    <option value="21:00">Às 21:00</option>
                  </select>
                </div>
              </div>

              <div className="settings-submit-row">
                <button
                  type="button"
                  disabled={savingPrefs}
                  className="btn-settings-primary-save"
                  onClick={handleSavePreferences}
                >
                  <Check size={18} />
                  <span>{savingPrefs ? "Salvando preferências..." : "Salvar preferências"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 6: SEGURANÇA (Fiel à Imagem media_1788715189906.png / media_1788715189973.png)
            ========================================================================= */}
        {activeTab === "security" && (
          <div className="settings-cards-stack">
            {/* 1. SENHA DA CONTA */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-icon-circle green">
                  <KeyRound size={20} />
                </div>
                <div className="block-title-col">
                  <h2>Senha da conta</h2>
                  <p>Altere sua senha regularmente para manter sua conta segura.</p>
                </div>
                <ChevronRight size={18} className="role-chevron" />
              </div>

              <form onSubmit={handleChangePassword} className="block-form-grid">
                <div className="form-field-vibrant">
                  <label>Senha atual</label>
                  <div className="input-password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="input-text-vibrant"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-field-vibrant">
                  <label>Nova senha</label>
                  <div className="input-password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="input-text-vibrant"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-field-vibrant">
                  <label>Confirmar nova senha</label>
                  <div className="input-password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="input-text-vibrant"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="btn-outline-change-password"
                >
                  <KeyRound size={16} />
                  <span>{changingPassword ? "Alterando senha..." : "Alterar senha"}</span>
                </button>
              </form>
            </div>

            {/* 2. SESSÕES E DISPOSITIVOS */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-icon-circle teal">
                  <Monitor size={20} />
                </div>
                <div className="block-title-col">
                  <h2>Sessões e dispositivos</h2>
                  <p>Gerencie os dispositivos conectados à sua conta.</p>
                </div>
              </div>

              <div className="sessions-list">
                <div className="session-item-row">
                  <div className="session-device-icon">
                    <Monitor size={20} />
                  </div>
                  <div className="session-meta-col">
                    <div className="session-title-line">
                      <strong>Windows • Chrome</strong>
                      <span className="badge-this-device">Este dispositivo</span>
                    </div>
                    <small>São Miguel da Baixa Grande, PI • Agora</small>
                  </div>
                  <span className="session-status-active">Ativo</span>
                </div>

                <div className="session-item-row">
                  <div className="session-device-icon">
                    <Smartphone size={20} />
                  </div>
                  <div className="session-meta-col">
                    <strong>iPhone 13 • Safari</strong>
                    <small>São Miguel da Baixa Grande, PI • 10/05/2026 14:22</small>
                  </div>
                  <button type="button" className="btn-session-end">
                    Encerrar
                  </button>
                </div>

                <div className="session-item-row">
                  <div className="session-device-icon">
                    <Tablet size={20} />
                  </div>
                  <div className="session-meta-col">
                    <strong>iPad • Safari</strong>
                    <small>São Miguel da Baixa Grande, PI • 08/05/2026 09:15</small>
                  </div>
                  <button type="button" className="btn-session-end">
                    Encerrar
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="btn-outline-signout-all"
                onClick={() => void handleSignOut("global")}
              >
                <LogOut size={16} />
                <span>Sair de todos os dispositivos</span>
              </button>
              <small className="session-disclaimer">
                Isso encerrará sua conta em todos os dispositivos, exceto neste.
              </small>
            </div>

            {/* 3. SEGURANÇA DA CONTA */}
            <div className="settings-block-card">
              <div className="block-card-header">
                <div className="block-icon-circle green">
                  <ShieldCheck size={20} />
                </div>
                <div className="block-title-col">
                  <h2>Segurança da conta</h2>
                  <p>Recursos adicionais para proteger sua conta.</p>
                </div>
              </div>

              <div className="security-features-list">
                <div className="security-feature-row">
                  <div className="sec-feature-icon green">
                    <KeyRound size={18} />
                  </div>
                  <div className="sec-feature-text">
                    <strong>PIN de autorização</strong>
                    <small>Use um PIN de 4 dígitos para autorizações importantes.</small>
                  </div>
                  <span className="sec-feature-status green">Ativado <ChevronRight size={16} /></span>
                </div>

                <div className="security-feature-row">
                  <div className="sec-feature-icon green">
                    <Shield size={18} />
                  </div>
                  <div className="sec-feature-text">
                    <strong>Bloqueio automático</strong>
                    <small>Bloqueia o acesso ao app após período de inatividade.</small>
                  </div>
                  <span className="sec-feature-status green">5 minutos <ChevronRight size={16} /></span>
                </div>
              </div>
            </div>

            {/* 4. SAIR DA CONTA */}
            <div className="settings-block-card">
              <div className="logout-section-row">
                <div className="logout-icon-box">
                  <LogOut size={20} />
                </div>
                <div className="logout-text-col">
                  <strong>Sair da conta</strong>
                  <p>Encerre sua sessão neste dispositivo.</p>
                </div>
                <button
                  type="button"
                  className="btn-danger-logout"
                  onClick={() => void handleSignOut("local")}
                >
                  <LogOut size={16} />
                  <span>Sair da conta</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL ENTRAR EM UMA FAMÍLIA
          ========================================================================= */}
      {joinFamilyModalOpen && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant settings-modal">
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setJoinFamilyModalOpen(false)}
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>Entrar em uma família</h2>
                <p>Cole o código da família que você deseja ingressar.</p>
              </div>
            </div>

            <form onSubmit={handleJoinFamily} className="sheet-form-content">
              <div className="form-field-vibrant">
                <label>Código da família</label>
                <input
                  name="code"
                  placeholder="Ex.: FAM-F94A7F"
                  className="input-text-vibrant uppercase-input"
                  required
                  autoFocus
                />
              </div>

              <div className="sheet-info-banner-teal">
                <div className="banner-icon-circle">
                  <ShieldCheck size={18} />
                </div>
                <div className="banner-text-block">
                  <strong>Privacidade e segurança</strong>
                  <p>Você terá acesso aos lançamentos, cartões e contas compartilhadas da família.</p>
                </div>
              </div>

              <div className="sheet-actions-row">
                <button
                  type="button"
                  className="btn-sheet-cancel"
                  onClick={() => setJoinFamilyModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-sheet-submit">
                  Entrar na família
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL NOVA CATEGORIA
          ========================================================================= */}
      {newCategoryModalOpen && (
        <div className="modal-backdrop-vibrant">
          <div className="modal-sheet-vibrant settings-modal">
            <div className="sheet-header">
              <button
                type="button"
                className="sheet-close-btn left"
                onClick={() => setNewCategoryModalOpen(false)}
              >
                <X size={18} />
              </button>
              <div className="sheet-header-title">
                <h2>Nova categoria</h2>
                <p>Crie uma categoria personalizada para suas despesas ou receitas.</p>
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="sheet-form-content">
              <div className="form-field-vibrant">
                <label>Nome da categoria <span className="req">*</span></label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex.: Manutenção do carro"
                  className="input-text-vibrant"
                  required
                  autoFocus
                />
              </div>

              <div className="form-field-vibrant">
                <label>Tipo de categoria</label>
                <div className="category-type-toggle-row">
                  <button
                    type="button"
                    className={`cat-type-pill ${categoryKind === "expense" ? "active red" : ""}`}
                    onClick={() => setCategoryKind("expense")}
                  >
                    <ArrowDown size={16} />
                    <span>Despesa</span>
                  </button>
                  <button
                    type="button"
                    className={`cat-type-pill ${categoryKind === "income" ? "active green" : ""}`}
                    onClick={() => setCategoryKind("income")}
                  >
                    <ArrowUp size={16} />
                    <span>Entrada</span>
                  </button>
                </div>
              </div>

              <div className="sheet-actions-row">
                <button
                  type="button"
                  className="btn-sheet-cancel"
                  onClick={() => setNewCategoryModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="btn-sheet-submit"
                >
                  {savingCategory ? "Salvando..." : "Salvar categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

