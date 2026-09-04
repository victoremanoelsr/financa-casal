"use client";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Field, Modal } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAccount } from "@/lib/use-account";
type Entry = {
  id: string;
  title: string;
  person: string;
  category: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  source: "card" | "store" | "direct";
  editable?: boolean;
};
type Card = {
  id: string;
  name: string;
  institution: string;
  last_four: string | null;
  card_type: string;
  holder: string;
};
type Store = { id: string; name: string; credit_limit: number };
type Item = { name: string; quantity: string; unitPrice: string };
export default function FinancePage() {
  const { data: account } = useAccount();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState({ previousBalance: 0, income: 0, expenses: 0, balance: 0 });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [paymentType, setPaymentType] = useState("credit");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [registrationMode, setRegistrationMode] = useState<"detailed" | "total">("total");
  const [items, setItems] = useState<Item[]>([
    { name: "", quantity: "1", unitPrice: "" },
  ]);
  const load = useCallback(async () => {
    const response = await fetch(`/api/finance?month=${month}`, { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (response.ok) {
      setEntries(result.entries ?? []);
      setCards(result.cards ?? []);
      setStores(result.stores ?? []);
      setSummary(result.summary ?? { previousBalance: 0, income: 0, expenses: 0, balance: 0 });
    }
    setLoading(false);
  }, [month]);
  useEffect(() => {
    // Carrega os dados persistidos ao abrir o módulo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const incomeNames = new Set(["Salário", "Investimentos", "Renda Extra", "Outros"]);
  const expenseNames = new Set(["Alimentação", "Comércio", "Cartão", "Moradia", "Saúde", "Transporte", "Educação", "Lazer", "Água", "Energia", "Internet", "Celular", "Assinaturas", "Compras", "Outros"]);
  const categories = type === "income"
    ? (account?.categories.filter((category) => incomeNames.has(category.name)) ?? [])
    : [{ id: "__card", name: "Cartão", kind: "expense" as const, isSystem: true }, ...(account?.categories.filter((category) => expenseNames.has(category.name) && category.name !== "Cartão") ?? [])];
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const categoryName = selectedCategory?.name.toLocaleLowerCase("pt-BR") ?? "";
  const origin =
    categoryName === "cartão" ||
    categoryName === "cartoes" ||
    categoryName === "cartões"
      ? "card"
      : categoryName === "comércio" || categoryName === "comercio"
        ? "store"
        : "direct";
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const itemTotal = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );
  const visible = useMemo(
    () =>
      entries.filter(
        (item) =>
          (filter === "all" || item.type === filter) &&
          item.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [entries, filter, query],
  );
  function updateItem(index: number, field: keyof Item, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        origin,
        memberId: data.get("memberId"),
        categoryId,
        cardId: data.get("cardId"),
        storeId: data.get("storeId"),
        paymentType,
        installmentCount: origin === "store" ? 1 : data.get("installmentCount"),
        registrationMode,
        description: data.get("description"),
        amount: data.get("amount"),
        date: data.get("date"),
        items,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok)
      return toast.error(result?.message ?? "Não foi possível salvar.");
    form.reset();
    setItems([{ name: "", quantity: "1", unitPrice: "" }]);
    setCategoryId("");
    setSelectedCardId("");
    setOpen(false);
    await load();
    toast.success("Lançamento salvo e relacionado com sucesso.");
  }
  async function editEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const values = new FormData(event.currentTarget);
    setSaving(true);
    const response = await fetch(`/api/finance/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: values.get("description"), amount: values.get("amount"), date: values.get("date"), categoryId: editing.source === "card" ? editing.categoryId : values.get("categoryId") }) });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível editar.");
    setEditing(null); await load(); toast.success("Lançamento atualizado.");
  }
  async function deleteEntry(item: Entry) {
    if (!window.confirm(`Excluir o lançamento “${item.title}”?`)) return;
    const response = await fetch(`/api/finance/${item.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível excluir.");
    await load(); toast.success("Lançamento excluído.");
  }
  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Registre e acompanhe todas as receitas e despesas da família."
      />
      <div className="toolbar finance-toolbar">
        <label className="finance-period">Período
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        <button className="primary-button" onClick={() => setOpen(true)}>
          <Plus size={16} /> Novo lançamento
        </button>
      </div>
      <section className="summary-grid finance-summary">
        <article className="summary-card balance">
          <div className="summary-icon">
            <CircleDollarSign />
          </div>
          <div>
            <small>Saldo</small>
            <strong>{formatCurrency(summary.balance)}</strong>
          </div>
          <span className="trend positive">Atualizado</span>
        </article>
        <article className="summary-card">
          <div className="summary-icon income">
            <ArrowDownLeft />
          </div>
          <div>
            <small>Entradas</small>
            <strong>{formatCurrency(summary.income)}</strong>
          </div>
          <span className="trend positive">
            Recebidas no período
          </span>
        </article>
        <article className="summary-card">
          <div className="summary-icon expense">
            <ArrowUpRight />
          </div>
          <div>
            <small>Saídas</small>
            <strong>{formatCurrency(summary.expenses)}</strong>
          </div>
          <span className="trend negative">
            {entries.filter((entry) => entry.type === "expense").length} lançamentos
          </span>
        </article>
      </section>
      <section className="panel list-panel module-section">
        <div className="list-toolbar">
          <div className="segmented-control">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Todos
            </button>
            <button
              className={filter === "income" ? "active" : ""}
              onClick={() => setFilter("income")}
            >
              Receitas
            </button>
            <button
              className={filter === "expense" ? "active" : ""}
              onClick={() => setFilter("expense")}
            >
              Despesas
            </button>
          </div>
          <div className="search-box">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lançamento"
            />
            <button>
              <SlidersHorizontal size={15} />
            </button>
          </div>
        </div>
        <div className="transaction-list">
          {loading ? (
            <p>Carregando...</p>
          ) : visible.length === 0 ? (
            <p>Nenhum lançamento encontrado.</p>
          ) : (
            visible.map((item) => (
              <article className="transaction-item" key={item.id}>
                <span className={`transaction-icon ${item.type}`}>
                  {item.type === "income" ? (
                    <ArrowDownLeft />
                  ) : (
                    <ArrowUpRight />
                  )}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.person}</small>
                </div>
                <span className="transaction-category">{item.category}</span>
                <time>{formatDate(item.date)}</time>
                <b className={item.type}>
                  {item.type === "income" ? "+ " : "− "}
                  {formatCurrency(item.amount)}
                </b>
                {item.editable !== false && <span className="row-actions"><button type="button" onClick={() => setEditing(item)} aria-label="Editar lançamento"><Pencil size={14} /></button><button type="button" onClick={() => void deleteEntry(item)} aria-label="Excluir lançamento"><Trash2 size={14} /></button></span>}
              </article>
            ))
          )}
        </div>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={type === "income" ? "Nova receita" : "Nova despesa"}
        description={type === "income" ? "Registre uma entrada de dinheiro." : origin === "card" ? "Registre seu gasto no cartão de crédito." : origin === "store" ? "Registre seus gastos em comércios ou crediários." : "Registre seu gasto de forma rápida."}
      >
        <form className="modal-form" onSubmit={submit}>
          <div className="segmented-control full">
            <button
              type="button"
              className={type === "income" ? "active" : ""}
              onClick={() => {
                setType("income");
                setCategoryId("");
              }}
            >
              Receita
            </button>
            <button
              type="button"
              className={type === "expense" ? "active danger" : ""}
              onClick={() => {
                setType("expense");
                setCategoryId("");
              }}
            >
              Despesa
            </button>
          </div>
          <div className="form-grid two">
            <Field label={type === "income" ? "De quem é esta receita?" : "Quem realizou este gasto?"}>
              <select name="memberId" defaultValue={account?.members.find((member) => member.isCurrentUser)?.id ?? ""} required>
                <option value="">Selecione</option>
                {account?.members.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={type === "income" ? "Categoria da receita" : "Categoria da despesa"}>
              <div className="finance-category-grid" role="group" aria-label="Categorias">
                {categories.map((c) => <button type="button" key={c.id} className={categoryId === c.id ? "selected" : ""} onClick={() => { setCategoryId(c.id); setRegistrationMode("total"); setPaymentType("credit"); setItems([{ name: "", quantity: "1", unitPrice: "" }]); }}><CircleDollarSign size={15}/><span>{c.name === "Comércio" ? "Comércio / Crediário" : c.name}</span></button>)}
              </div>
              <input type="hidden" name="categoryId" value={categoryId} required />
            </Field>
          </div>
          {origin === "card" && (
            <>
              <div className="form-grid two">
                <Field label="Cartão">
                  <select name="cardId" value={selectedCardId} onChange={(event) => { setSelectedCardId(event.target.value); const card = cards.find((item) => item.id === event.target.value); if (card?.card_type === "debit") setPaymentType("debit"); }} required>
                    <option value="">Selecione o cartão</option>
                    {cards.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.institution} • final {c.last_four} • {c.holder}
                      </option>
                    ))}
                  </select>
                </Field>
                  <Field label="Forma de pagamento">
                  <div className="finance-choice-grid"><button type="button" className={paymentType === "credit" ? "selected" : ""} onClick={() => setPaymentType("credit")}>Crédito</button><button type="button" className={paymentType === "debit" ? "selected" : ""} onClick={() => setPaymentType("debit")}>Débito</button></div>
                </Field>
              </div>
              {paymentType === "credit" && (
                <Field label="Parcelas">
                  <input
                    name="installmentCount"
                    type="number"
                    min="1"
                    max="48"
                    defaultValue="1"
                    required
                  />
                </Field>
              )}
              {selectedCard?.card_type === "debit" && <p className="field-hint">Este cartão é de débito; a saída será registrada imediatamente.</p>}
            </>
          )}
          {origin === "store" && (
            <>
              <Field label="Comércio">
                <select name="storeId" required>
                  <option value="">Selecione o comércio</option>
                  {stores.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {origin !== "direct" && <div className="purchase-mode"><span>Como deseja registrar esta compra?</span><div className="segmented-control full"><button type="button" className={registrationMode === "detailed" ? "active" : ""} onClick={() => setRegistrationMode("detailed")}>Detalhar itens</button><button type="button" className={registrationMode === "total" ? "active" : ""} onClick={() => setRegistrationMode("total")}>Somente valor total</button></div></div>}
          {origin !== "direct" && registrationMode === "detailed" && (
            <div className="purchase-items">
              <strong>Itens da compra</strong>
              {items.map((item, index) => (
                <div className="form-grid purchase-item-row" key={index}>
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    placeholder="Nome do item"
                    required
                  />
                  <strong className="item-subtotal">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</strong>
                  <input
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="Qtd."
                    required
                  />
                  <input
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, "unitPrice", e.target.value)
                    }
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Valor unitário"
                    required
                  />
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary-button inline"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { name: "", quantity: "1", unitPrice: "" },
                  ])
                }
              >
                <Plus size={14} /> Adicionar item
              </button>
              <p className="installment-preview">
                <span>Total da compra</span>
                <strong>{formatCurrency(itemTotal)}</strong>
              </p>
            </div>
          )}
          <Field label={`Descrição${origin === "direct" ? " (opcional)" : " da compra (opcional)"}`}>
            <input name="description" />
          </Field>
          {(origin === "direct" || registrationMode === "total") && (
            <Field label={origin === "direct" ? "Valor" : "Valor total da compra"}>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </Field>
          )}
          <Field label="Data">
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar lançamento"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Editar lançamento" description="A alteração será aplicada ao histórico relacionado.">
        {editing && <form className="modal-form" onSubmit={editEntry}><Field label="Descrição"><input name="description" defaultValue={editing.title} required /></Field><div className="form-grid two"><Field label="Valor"><input name="amount" type="number" min="0.01" step="0.01" defaultValue={editing.amount} required /></Field><Field label="Data"><input name="date" type="date" defaultValue={editing.date} required /></Field></div><Field label="Categoria"><select name="categoryId" defaultValue={editing.categoryId ?? ""} disabled={editing.source === "card"}>{editing.source === "card" && <option value={editing.categoryId ?? ""}>Cartões</option>}{editing.source !== "card" && <><option value="">Sem categoria</option>{account?.categories.filter((category) => category.kind === editing.type || category.kind === "both").map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</>}</select></Field><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></div></form>}
      </Modal>
    </>
  );
}
