"use client";

import Link from "next/link";
import { ChevronRight, Plus, ShoppingBag, Store } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, ProgressBar } from "@/components/ui";
import { stores as initialStores } from "@/lib/demo-data";
import { formatCurrency, normalizePersonName } from "@/lib/format";

export default function StoresPage() {
  const [items, setItems] = useState(initialStores); const [open, setOpen] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const limit = Number(data.get("limit")); if (limit <= 0) return toast.error("Informe um limite válido."); setItems((current) => [...current, { id: crypto.randomUUID(), name: String(data.get("name")), holder: normalizePersonName(String(data.get("holder"))), limit, used: 0, purchases: 0, color: "#16A085" }]); setOpen(false); toast.success("Comércio cadastrado com sucesso."); }
  return <><PageHeader title="Comércios" subtitle="Controle crediários, limites e compras realizadas em cada estabelecimento." /><div className="toolbar"><PeriodFilter /><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16} /> Adicionar comércio</button></div><section className="store-grid">{items.map((store) => { const usage = store.used / store.limit * 100; return <Link className="store-card" href={`/comercios/${store.id}`} key={store.id}><div className="store-card-head"><span style={{ background: `${store.color}18`, color: store.color }}><Store /></span><div><small>Crediário</small><h2>{store.name}</h2></div><ChevronRight /></div><p className="store-holder">Titular <strong>{store.holder}</strong></p><div className="store-numbers"><span><small>Limite total</small><strong>{formatCurrency(store.limit)}</strong></span><span><small>Utilizado</small><strong>{formatCurrency(store.used)}</strong></span><span><small>Disponível</small><strong>{formatCurrency(store.limit - store.used)}</strong></span></div><ProgressBar value={usage} color={store.color} /><footer><span>{Math.round(usage)}% utilizado</span><span><ShoppingBag size={13} /> {store.purchases} compras no período</span></footer></Link>; })}</section><Modal open={open} onClose={() => setOpen(false)} title="Adicionar comércio" description="Cadastre um crediário ou estabelecimento com limite para compras."><form className="modal-form" onSubmit={submit}><Field label="Nome do comércio"><input name="name" required placeholder="Ex.: Armazém Carvalho" /></Field><div className="form-grid two"><Field label="Titular"><select name="holder"><option>VICTOR SILVA</option><option>EMILY SILVA</option></select></Field><Field label="Limite total"><input type="number" min="0.01" step="0.01" name="limit" required placeholder="0,00" /></Field></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar comércio</button></div></form></Modal></>;
}
