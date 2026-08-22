"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard, History, Plus, ReceiptText } from "lucide-react";
import { FormEvent, use, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { Field, Modal, ProgressBar, StatusBadge } from "@/components/ui";
import { cards } from "@/lib/demo-data";
import { formatCurrency, splitInstallments } from "@/lib/format";

const initialPurchases = [
  { id: "p1", description: "Supermercado Carvalho", date: "16/08/2026", category: "Alimentação", installment: "1/1", amount: 385.9, status: "pending" as const },
  { id: "p2", description: "Notebook", date: "10/08/2026", category: "Compras", installment: "2/10", amount: 290, status: "pending" as const },
  { id: "p3", description: "Netflix", date: "08/08/2026", category: "Assinaturas", installment: "Recorrente", amount: 45.9, status: "pending" as const },
];

export default function CardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const card = cards.find((item) => item.id === id) ?? cards[0];
  const [purchases, setPurchases] = useState(initialPurchases);
  const [open, setOpen] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [amount, setAmount] = useState("");
  const preview = useMemo(() => { const cents = Math.round((Number(amount.replace(",", ".")) || 0) * 100); return cents > 0 ? splitInstallments(cents, installments).map((value) => value / 100) : []; }, [amount, installments]);

  function addPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const total = Number(amount.replace(",", "."));
    if (!total || total <= 0) return toast.error("Informe um valor válido.");
    const values = splitInstallments(Math.round(total * 100), installments);
    setPurchases((current) => [{ id: crypto.randomUUID(), description: String(data.get("description")), date: "18/08/2026", category: String(data.get("category")), installment: installments > 1 ? `1/${installments}` : "1/1", amount: values[0] / 100, status: "pending" as const }, ...current]);
    setOpen(false); setAmount(""); setInstallments(1); toast.success(`Compra salva em ${installments} parcela${installments > 1 ? "s" : ""}, sem duplicidade.`);
  }

  return <><PageHeader title={card.name} subtitle={`${card.bank} · final ${card.lastDigits} · ${card.holder}`} /><div className="toolbar"><Link href="/cartoes" className="back-link"><ArrowLeft size={15} /> Voltar aos cartões</Link><div className="toolbar-actions"><PeriodFilter /><button className="primary-button" onClick={() => setOpen(true)}><Plus size={16} /> Adicionar compra</button></div></div><section className="card-detail-grid"><article className={`bank-card compact ${card.color}`}><div className="bank-card-top"><span><CreditCard /><small>{card.bank}</small></span><i>{card.type}</i></div><div className="bank-card-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; {card.lastDigits}</div><div className="bank-card-holder"><span><small>TITULAR</small><strong>{card.holder}</strong></span></div></article><article className="panel card-metrics"><div><small>Limite total</small><strong>{formatCurrency(card.limit)}</strong></div><div><small>Limite utilizado</small><strong>{formatCurrency(card.used)}</strong></div><div><small>Disponível</small><strong className="positive-text">{formatCurrency(card.limit - card.used)}</strong></div><ProgressBar value={card.used / card.limit * 100} /><p><span>Fechamento: dia {card.closingDay}</span><span>Vencimento: dia {card.dueDay}</span></p></article></section><section className="panel list-panel module-section"><div className="panel-heading"><div><h2>Fatura de agosto</h2><p>Compras, parcelas e assinaturas vinculadas</p></div><strong className="invoice-total">{formatCurrency(card.statement)}</strong></div><div className="transaction-list">{purchases.map((purchase) => <article className="transaction-item" key={purchase.id}><span className="transaction-icon neutral"><ReceiptText /></span><div><strong>{purchase.description}</strong><small>{purchase.category} · {purchase.installment}</small></div><time>{purchase.date}</time><StatusBadge status={purchase.status} /><b>{formatCurrency(purchase.amount)}</b><button><History size={15} /></button></article>)}</div></section><Modal open={open} onClose={() => setOpen(false)} title="Adicionar compra" description="O valor total será dividido e cada parcela entrará apenas na competência correta."><form className="modal-form" onSubmit={addPurchase}><Field label="Descrição da compra"><input name="description" placeholder="Ex.: Notebook" required /></Field><div className="form-grid two"><Field label="Valor total"><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" required /></Field><Field label="Quantidade de parcelas"><select value={installments} onChange={(event) => setInstallments(Number(event.target.value))}>{Array.from({ length: 24 }, (_, index) => <option value={index + 1} key={index}>{index + 1}x</option>)}</select></Field></div><div className="form-grid two"><Field label="Data"><input type="date" defaultValue="2026-08-18" /></Field><Field label="Categoria"><select name="category"><option>Alimentação</option><option>Compras</option><option>Lazer</option><option>Outros</option></select></Field></div>{preview.length > 0 && <div className="installment-preview"><small>Resumo do parcelamento</small><strong>{installments}x de aproximadamente {formatCurrency(preview[0])}</strong><p>Total conferido: {formatCurrency(preview.reduce((sum, value) => sum + value, 0))}</p></div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar compra</button></div></form></Modal></>;
}
