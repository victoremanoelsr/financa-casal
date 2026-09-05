"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Info,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type StoreItem = {
  id: string;
  name: string;
  credit_limit: number;
  used: number;
  available: number;
  holder: string;
  holderId: string;
  backgroundImage: string;
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function getStoreTheme(name: string) {
  const check = name.toLowerCase();
  if (check.includes("capitinha")) return "theme-green";
  if (check.includes("farmácia") || check.includes("farmacia") || check.includes("são joão") || check.includes("sao joao"))
    return "theme-blue";
  if (check.includes("loja") || check.includes("center") || check.includes("roupa"))
    return "theme-purple";
  return "theme-green";
}

export default function StoresPage() {
  const { data: account } = useAccount();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  // Period Selector State
  const currentDate = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const monthParam = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const load = useCallback(async () => {
    const response = await fetch("/api/stores", { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (response.ok) setItems(result?.stores ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    if (imageFile) data.set("backgroundImage", imageFile);
    else data.delete("backgroundImage");
    const response = await fetch("/api/stores", { method: "POST", body: data });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(result?.message ?? "Não foi possível salvar.");
    form.reset();
    setImageFile(null);
    setImagePreview("");
    setOpen(false);
    await load();
    toast.success("Comércio cadastrado com sucesso.");
  }

  async function editStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const values = new FormData(event.currentTarget);
    if (editImageFile) values.set("backgroundImage", editImageFile);
    else values.delete("backgroundImage");
    const response = await fetch(`/api/stores/${editing.id}`, {
      method: "PATCH",
      body: values,
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível editar o comércio.",
      );
    setEditing(null);
    setEditImageFile(null);
    setEditImagePreview("");
    await load();
    toast.success("Comércio atualizado.");
  }

  return (
    <div className="stores-page-vibrant">
      {/* CABEÇALHO COM AVATAR, TÍTULO E SINO */}
      <header className="stores-top-header">
        <div className="stores-header-left">
          <div className="stores-user-avatar">F</div>
          <div className="stores-title-group">
            <h1>Comércios</h1>
            <p>Controle os estabelecimentos e crediários da família.</p>
          </div>
        </div>
        <button
          type="button"
          className="cards-notification-btn"
          aria-label="Notificações"
        >
          <Bell size={18} />
        </button>
      </header>

      {/* BARRA DE AÇÕES COM SELETOR DE PERÍODO E NOVO COMÉRCIO */}
      <div className="cards-toolbar-row">
        <div className="period-dropdown-box">
          <button
            type="button"
            className="cards-period-btn"
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
          >
            <span>
              {MONTH_NAMES[selectedMonth - 1]} / {selectedYear}
            </span>
            <ChevronDown size={14} />
          </button>

          {showPeriodMenu && (
            <div className="period-popover-menu">
              <div className="popover-grid">
                <label>
                  <span>Mês</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Ano</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className="popover-close-btn"
                onClick={() => setShowPeriodMenu(false)}
              >
                Aplicar período
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="cards-btn-new"
          onClick={() => setOpen(true)}
        >
          <Plus size={15} /> Novo comércio
        </button>
      </div>

      {/* LISTAGEM DE CARDS DE COMÉRCIO */}
      {loading ? (
        <section className="panel module-section">
          <p>Carregando comércios...</p>
        </section>
      ) : items.length === 0 ? (
        <section className="panel module-section">
          <EmptyState
            icon={Store}
            title="Nenhum comércio cadastrado"
            description="Cadastre um comércio para utilizá-lo nos lançamentos."
          />
        </section>
      ) : (
        <div className="stores-list-stack">
          {items.map((item) => {
            const percent = item.credit_limit
              ? Math.min(100, Math.round((item.used / item.credit_limit) * 100))
              : 0;
            const themeClass = getStoreTheme(item.name);
            const fillTheme =
              themeClass === "theme-blue"
                ? "blue"
                : themeClass === "theme-purple"
                  ? "purple"
                  : "";

            return (
              <Link
                href={`/comercios/${item.id}?month=${monthParam}`}
                className={`vibrant-store-card ${themeClass}`}
                key={item.id}
              >
                {/* TOPO DO CARD: LOGO / ÍCONE + TEXTO + BOTÃO EDITAR */}
                <div className="store-card-hero-head">
                  <div className="store-hero-left">
                    <div className="store-logo-circle">
                      {item.backgroundImage ? (
                        <img
                          src={item.backgroundImage}
                          alt={item.name}
                        />
                      ) : (
                        <div className="store-logo-placeholder">
                          {item.name.includes("Farmácia") ? (
                            <span style={{ color: "#e53935", fontSize: "22px" }}>+</span>
                          ) : item.name.includes("Capitinha") ? (
                            <span style={{ color: "#00897b", fontSize: "16px" }}>CAP</span>
                          ) : (
                            <ShoppingBag size={24} color="#5e35b1" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="store-hero-text">
                      <small>Comércio</small>
                      <h2>{item.name}</h2>
                      <p>
                        Titular: <strong>{item.holder}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="store-edit-icon-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditing(item);
                      setEditImageFile(null);
                      setEditImagePreview(item.backgroundImage);
                    }}
                    aria-label="Editar comércio"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                {/* CAIXA BRANCA INTERNA COM AS 3 MÉTRICAS E BARRA DE PROGRESSO */}
                <div className="store-metrics-box-white">
                  <div className="store-metrics-row">
                    <div className="store-metric-item">
                      <span>Utilizado</span>
                      <strong>{formatCurrency(item.used)}</strong>
                    </div>
                    <div className="store-metric-item">
                      <span>Limite total</span>
                      <strong>{formatCurrency(item.credit_limit)}</strong>
                    </div>
                    <div className="store-metric-item">
                      <span>Disponível</span>
                      <strong className="green-text">
                        {formatCurrency(item.available)}
                      </strong>
                    </div>
                  </div>

                  <div className="store-progress-track">
                    <div
                      className={`store-progress-fill ${fillTheme}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="store-card-footer-action">
                    <span>{percent}% utilizado</span>
                    <strong>Abrir histórico →</strong>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* BANNER INFORMATIVO NA PARTE INFERIOR */}
      <div className="stores-info-banner">
        <Info size={20} />
        <span>
          As compras lançadas no Financeiro são vinculadas aos comércios
          automaticamente e atualizam os limites.
        </span>
      </div>

      {/* MODAL ADICIONAR COMÉRCIO */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Adicionar comércio"
        description="Ele aparecerá automaticamente no lançamento de despesas."
      >
        <form className="modal-form" onSubmit={submit}>
          <Field label="Nome do comércio">
            <input
              name="name"
              placeholder="Ex.: Farmácia São João, Capitinha"
              required
            />
          </Field>
          <div className="form-grid two">
            <Field label="Titular">
              <select name="holderId" required>
                <option value="">Selecione</option>
                {account?.members.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Limite total (R$)">
              <input
                name="limit"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ex.: 2000.00"
                required
              />
            </Field>
          </div>
          <Field
            label="Imagem de fundo / Logo (opcional)"
            hint="PNG, JPG, JPEG ou WEBP"
          >
            <input
              name="backgroundImage"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImageFile(file);
                const reader = new FileReader();
                reader.onload = () => setImagePreview(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
          </Field>
          {imagePreview && (
            <div
              className="card-image-preview"
              style={{
                backgroundImage: `linear-gradient(145deg,rgba(4,25,33,.18),rgba(8,42,52,.38)),url(${imagePreview})`,
              }}
            >
              <span>Prévia do comércio</span>
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview("");
                }}
              >
                Remover imagem
              </button>
            </div>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar comércio"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR COMÉRCIO */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar comércio"
        description="Atualize os dados e a imagem do comércio."
      >
        {editing && (
          <form className="modal-form" onSubmit={editStore}>
            <Field label="Nome do comércio">
              <input name="name" defaultValue={editing.name} required />
            </Field>
            <div className="form-grid two">
              <Field label="Titular">
                <select name="holderId" defaultValue={editing.holderId} required>
                  {account?.members.map((member) => (
                    <option value={member.id} key={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Limite total (R$)">
                <input
                  name="limit"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={editing.credit_limit}
                  required
                />
              </Field>
            </div>
            <Field
              label="Alterar imagem de fundo"
              hint="Se não escolher outra imagem, a atual será mantida."
            >
              <input
                name="backgroundImage"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setEditImageFile(file);
                  const reader = new FileReader();
                  reader.onload = () =>
                    setEditImagePreview(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
            {editImagePreview && (
              <div
                className="card-image-preview"
                style={{
                  backgroundImage: `linear-gradient(145deg,rgba(4,25,33,.18),rgba(8,42,52,.38)),url(${editImagePreview})`,
                }}
              >
                <span>Prévia da imagem</span>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

