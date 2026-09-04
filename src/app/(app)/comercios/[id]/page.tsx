"use client";

import Link from "next/link";
import { ArrowLeft, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";
import { FormEvent, use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app-shell";
import { Field, Modal, ProgressBar } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

type Item = { id: string; name: string; quantity: number; unitPrice: number; total?: number };
type Purchase = { id: string; date: string; total: number; items: Item[] };
type Detail = { store: { id: string; name: string; holder: string; limit: number; used: number; backgroundImage: string }; purchases: Purchase[] };

export default function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([{ id: "1", name: "", quantity: 1, unitPrice: 0 }]);
  const load = useCallback(async () => { const response = await fetch(`/api/stores/${id}`, { cache: "no-store" }); const result = await response.json().catch(() => null); if (response.ok) setDetail(result); else setDetail(null); setLoading(false); }, [id]);
  useEffect(() => {
    // Carrega o comércio e seu histórico persistido.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);
  function updateItem(itemId: string, key: "name" | "quantity" | "unitPrice", value: string | number) { setItems((current) => current.map((item) => item.id === itemId ? { ...item, [key]: value } : item)); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const values = new FormData(event.currentTarget);
    const response = await fetch(`/api/stores/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: values.get("date"), items }) });
    const result = await response.json().catch(() => null); setSaving(false);
    if (!response.ok) return toast.error(result?.message ?? "Não foi possível salvar a compra.");
    setItems([{ id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0 }]); setOpen(false); await load(); toast.success("Compra salva no comércio e no Financeiro.");
  }
  if (loading) return <><PageHeader title="Comércio" subtitle="Carregando histórico..." /><section className="panel module-section"><p>Carregando...</p></section></>;
  if (!detail) return <><PageHeader title="Comércio não encontrado" subtitle="O comércio não existe ou não pertence à sua família." /><section className="panel module-section"><EmptyState icon={Store} title="Não foi possível abrir este comércio" description="Volte à lista e selecione um comércio disponível." action={<Link className="primary-button" href="/comercios">Voltar aos comércios</Link>} /></section></>;
  const { store, purchases } = detail;
  const percent = store.limit ? store.used / store.limit * 100 : 0;
  return <>
    <PageHeader title={store.name} subtitle={`${store.holder} · histórico de compras do comércio`} />
    <div className="toolbar"><Link href="/comercios" className="back-link"><ArrowLeft size={15} /> Voltar aos comércios</Link><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16} /> Adicionar compra</button></div>
    <section className="store-detail-live">
      <article className={`store-card store-detail-cover ${store.backgroundImage ? "store-card-with-image" : ""}`}>{store.backgroundImage && <span aria-hidden="true" className="store-card-background" style={{ backgroundImage: `url("${store.backgroundImage}")` }} />}<div className="store-card-content"><div className="store-card-head"><span><Store /></span><div><small>Comércio</small><h2>{store.name}</h2></div></div><p className="store-holder">Titular <strong>{store.holder}</strong></p></div></article>
      <article className="panel store-detail-limits">
        <div><small>Limite total</small><strong>{formatCurrency(store.limit)}</strong></div>
        <div><small>Limite utilizado</small><strong>{formatCurrency(store.used)}</strong></div>
        <div><small>Limite disponível</small><strong className="positive-text">{formatCurrency(Math.max(0, store.limit - store.used))}</strong></div>
        <ProgressBar value={percent} color={percent > 80 ? "#f59e0b" : "#16a085"} />
        <p><span>{Math.round(percent)}% utilizado</span><span>{purchases.length} compras cadastradas</span></p>
      </article>
    </section>
    <section className="panel module-section"><div className="panel-heading"><div><h2>Histórico de compras</h2><p>Clique em uma compra para visualizar seus produtos</p></div><strong className="invoice-total">{formatCurrency(store.used)}</strong></div>{purchases.length === 0 ? <EmptyState icon={ShoppingBag} title="Nenhuma compra cadastrada" description="Adicione uma compra por esta tela ou pela janela Financeiro." /> : <div className="store-purchase-list">{purchases.map((purchase) => <article key={purchase.id}><button type="button" onClick={() => setExpanded((current) => current === purchase.id ? null : purchase.id)}><span className="overview-icon green"><ShoppingBag /></span><div><strong>Compra realizada no {store.name}</strong><small>{formatDate(purchase.date)} · {purchase.items.length} produtos</small></div><b>{formatCurrency(purchase.total)}</b><span>{expanded === purchase.id ? "Ocultar itens ↑" : "Ver itens ↓"}</span></button>{expanded === purchase.id && <div className="store-purchase-items">{purchase.items.length ? purchase.items.map((item) => <p key={item.id}><span>{item.name}<small>{item.quantity} × {formatCurrency(item.unitPrice)}</small></span><strong>{formatCurrency(item.total ?? item.quantity * item.unitPrice)}</strong></p>) : <p><span>Compra cadastrada pelo valor total no Financeiro</span><strong>{formatCurrency(purchase.total)}</strong></p>}</div>}</article>)}</div>}</section>
    <Modal open={open} onClose={() => setOpen(false)} title="Adicionar compra" description="Os produtos e o valor total serão vinculados ao comércio e ao Financeiro."><form className="modal-form" onSubmit={save}><Field label="Data da compra"><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field><div className="purchase-items">{items.map((item, index) => <div className="purchase-item-form" key={item.id}><b>{index + 1}</b><Field label="Produto"><input value={item.name} onChange={(event) => updateItem(item.id, "name", event.target.value)} placeholder="Nome do produto" required /></Field><Field label="Qtd."><input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", Number(event.target.value))} required /></Field><Field label="Valor unitário"><input type="number" min="0" step="0.01" value={item.unitPrice || ""} onChange={(event) => updateItem(item.id, "unitPrice", Number(event.target.value))} required /></Field><button type="button" aria-label="Remover produto" onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}><Trash2 size={15} /></button></div>)}</div><button type="button" className="add-row-button" onClick={() => setItems((current) => [...current, { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0 }])}><Plus size={15} /> Adicionar produto</button><div className="purchase-total"><span>Total da compra</span><strong>{formatCurrency(total)}</strong></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar compra"}</button></div></form></Modal>
  </>;
}
