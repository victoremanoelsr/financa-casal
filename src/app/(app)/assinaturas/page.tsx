"use client";

import {
  CalendarDays,
  Plus,
  Repeat2,
  MoreVertical,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

type CardOption = {
  id: string;
  name: string;
  institution: string;
  lastFour: string;
};
type SubscriptionItem = {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  amount: number;
  dueDay: number;
  frequency: string;
  paymentMethod: string;
  card?: string;
  cardId?: string;
  cardLastFour?: string;
  status: "active" | "paused";
  imageUrl?: string | null;
  createdAt: string;
};

export default function SubscriptionsPage() {
  const { data: account } = useAccount();
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState("card");
  const [cards, setCards] = useState<CardOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">(
    "all",
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<SubscriptionItem | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/subscriptions?month=${month}`, {
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    if (response.ok) setItems(result?.subscriptions ?? []);
    else
      toast.error(
        result?.message ?? "Não foi possível carregar as assinaturas.",
      );
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void fetch("/api/cards", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setCards(result?.cards ?? []))
      .catch(() => setCards([]));
  }, [load]);

  const filtered = items.filter(
    (item) => statusFilter === "all" || item.status === statusFilter,
  );
  const active = items.filter((item) => item.status === "active");
  const monthly = active.reduce((sum, item) => sum + item.amount, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amount = Number(data.get("amount"));
    if (amount <= 0) return toast.error("Informe um valor válido.");
    const selectedCard = cards.find(
      (card) => card.id === String(data.get("card")),
    );
    if (payment === "card" && !selectedCard)
      return toast.error("Cadastre ou selecione um cartão válido.");
    setSaving(true);
    const response = await fetch(editing ? `/api/subscriptions/${editing.id}` : "/api/subscriptions", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        amount,
        dueDay: data.get("dueDay"),
        frequency: data.get("frequency"),
        categoryId: data.get("categoryId"),
        paymentMethod: payment,
        cardId: selectedCard?.id ?? null,
        imageUrl,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(
        result?.message ?? "Não foi possível salvar a assinatura.",
      );
    form.reset();
    setImageUrl(null);
    setEditing(null);
    await load();
    setOpen(false);
    toast.success("Assinatura salva no banco de dados.");
  }
  function edit(item: SubscriptionItem) {
    setEditing(item);
    setPayment(item.paymentMethod);
    setImageUrl(item.imageUrl ?? null);
    setActiveMenu(null);
    setOpen(true);
  }
  async function act(
    item: SubscriptionItem,
    action: "activate" | "deactivate" | "delete",
  ) {
    if (
      action === "delete" &&
      !window.confirm(`Deseja realmente excluir a assinatura “${item.name}”?`)
    )
      return;
    const r = await fetch(`/api/subscriptions/${item.id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ action }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok)
      return toast.error(
        j?.message ?? "Não foi possível atualizar a assinatura.",
      );
    setActiveMenu(null);
    await load();
    toast.success(
      action === "delete" ? "Assinatura excluída." : "Status atualizado.",
    );
  }

  return (
    <>
      <PageHeader
        title="Assinaturas"
        subtitle="Controle suas assinaturas e onde cada uma é paga."
      />
      <div className="toolbar">
        <PeriodFilter value={month} onChange={setMonth} />
        <button
          className="primary-button"
          onClick={() => {
            setEditing(null);
            setPayment("card");
            setImageUrl(null);
            setOpen(true);
          }}
        >
          <Plus size={16} /> Nova assinatura
        </button>
      </div>
      <section className="subscription-summary">
        <article>
          <span className="overview-icon green">
            <CalendarDays />
          </span>
          <div>
            <small>Assinaturas ativas</small>
            <strong>{active.length}</strong>
            <em>ativas</em>
          </div>
        </article>
        <article>
          <span className="overview-icon green">
            <Repeat2 />
          </span>
          <div>
            <small>Valor mensal das assinaturas</small>
            <strong>{formatCurrency(monthly)}</strong>
            <em>Somente informativo</em>
          </div>
        </article>
      </section>
      <div className="security-note subscription-info">
        <span>ⓘ</span>
        <p>
          Este valor é apenas informativo e não é lançado como despesa no
          financeiro.
        </p>
      </div>
      <section className="panel list-panel module-section">
        <div className="panel-heading">
          <div>
            <h2>Suas assinaturas</h2>
            <p>Controle e lembretes da família</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
          >
            <option value="all">Todas</option>
            <option value="active">Ativas</option>
            <option value="paused">Inativas</option>
          </select>
        </div>
        <div className="subscription-list">
          {filtered.length ? (
            filtered.map((item) => (
              <article key={item.id}>
                <span
                  className="subscription-logo"
                  style={
                    item.imageUrl
                      ? { backgroundImage: `url(${item.imageUrl})` }
                      : undefined
                  }
                >
                  {!item.imageUrl && item.name.slice(0, 1)}
                </span>
                <div>
                  <strong>{item.name}</strong>
                  <small>Vence dia {item.dueDay}</small>
                  <small>
                    {item.card
                      ? `Cartão: ${item.card}${item.cardLastFour ? ` •••• ${item.cardLastFour}` : ""}`
                      : item.paymentMethod.toUpperCase()}
                  </small>
                  <small>
                    Cadastrada em{" "}
                    {new Intl.DateTimeFormat("pt-BR").format(
                      new Date(item.createdAt),
                    )}
                  </small>
                </div>
                <b>{formatCurrency(item.amount)}</b>
                <span
                  className={`status-badge ${item.status === "active" ? "positive" : "muted"}`}
                >
                  {item.status === "active" ? "Ativa" : "Inativa"}
                </span>
                <button
                  className="icon-button"
                  aria-label="Ações"
                  onClick={() =>
                    setActiveMenu(activeMenu === item.id ? null : item.id)
                  }
                >
                  <MoreVertical size={16} />
                </button>
                {activeMenu === item.id && (
                  <div className="item-action-menu">
                    <button onClick={() => edit(item)}>
                      <Pencil /> Editar
                    </button>
                    <button
                      onClick={() =>
                        void act(
                          item,
                          item.status === "active" ? "deactivate" : "activate",
                        )
                      }
                    >
                      <Power />{" "}
                      {item.status === "active" ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      className="danger"
                      onClick={() => void act(item, "delete")}
                    >
                      <Trash2 /> Excluir
                    </button>
                  </div>
                )}
              </article>
            ))
          ) : (
            <p>Nenhuma assinatura cadastrada.</p>
          )}
        </div>
      </section>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setImageUrl(null);
        }}
        title={editing ? "Editar assinatura" : "Adicionar assinatura"}
        description="Cadastro informativo: não cria despesa, compra ou fatura."
      >
        <form className="modal-form" onSubmit={submit} key={editing?.id ?? "new"}>
          <div className="form-grid two">
            <Field label="Nome">
              <input name="name" placeholder="Ex.: Netflix" defaultValue={editing?.name} required />
            </Field>
            <Field label="Imagem / logo">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImageUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
          </div>
          <Field label="Valor">
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={editing?.amount}
              required
            />
          </Field>
          <div className="form-grid two">
            <Field label="Vencimento">
              <input name="dueDay" type="number" min="1" max="31" defaultValue={editing?.dueDay} required />
            </Field>
            <Field label="Periodicidade">
              <select name="frequency" defaultValue={editing?.frequency ?? "monthly"}>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
                <option value="weekly">Semanal</option>
              </select>
            </Field>
          </div>
          <Field label="Categoria">
            <select name="categoryId" required defaultValue={editing?.categoryId ?? ""}>
              <option value="">Selecione</option>
              {account?.categories
                .filter((category) => category.kind !== "income")
                .map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Forma de pagamento">
            <select
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            >
              <option value="card">Cartão</option>
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="bank_transfer">Transferência</option>
            </select>
          </Field>
          {payment === "card" && (
            <Field
              label="Cartão"
              hint={
                cards.length === 0
                  ? "Nenhum cartão cadastrado pela família."
                  : "Selecione um cartão cadastrado."
              }
            >
              <select name="card" required disabled={cards.length === 0} defaultValue={editing?.cardId ?? ""}>
                <option value="">
                  {cards.length === 0
                    ? "Nenhum cartão cadastrado"
                    : "Selecione"}
                </option>
                {cards.map((card) => (
                  <option value={card.id} key={card.id}>
                    {card.name} · {card.institution} · final {card.lastFour}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setOpen(false);
                setEditing(null);
                setImageUrl(null);
              }}
            >
              Cancelar
            </button>
            <button disabled={saving} className="primary-button">
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Salvar assinatura"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
