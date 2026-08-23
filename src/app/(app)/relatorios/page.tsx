"use client";

import { Download, FileChartColumn } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PeriodFilter } from "@/components/app-shell";
import { formatCurrency } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

const sources = ["Cartões", "Comércios", "Assinaturas", "Despesas Fixas"];

export default function ReportsPage() {
  const { data: account } = useAccount();
  return <>
    <PageHeader title="Relatórios" subtitle="Entenda para onde o dinheiro vai e tome decisões com mais segurança." />
    <div className="report-filters"><PeriodFilter /><select aria-label="Pessoa"><option>Todas as pessoas</option>{account?.members.map((member) => <option key={member.id}>{member.displayName}</option>)}</select><select aria-label="Categoria"><option>Todas as categorias</option>{account?.categories.map((category) => <option key={category.id}>{category.name}</option>)}</select><select aria-label="Origem"><option>Todas as origens</option><option>Financeiro</option>{sources.map((source) => <option key={source}>{source}</option>)}</select><button className="secondary-button" onClick={() => toast.info("Não há dados para exportar neste período.")}><Download size={14} /> Exportar</button></div>
    <section className="report-summary"><article><small>Total recebido</small><strong className="positive-text">{formatCurrency(0)}</strong><span>Nenhuma receita cadastrada</span></article><article><small>Total gasto</small><strong className="negative-text">{formatCurrency(0)}</strong><span>Nenhuma despesa cadastrada</span></article><article className="accent"><small>Saldo do período</small><strong>{formatCurrency(0)}</strong><span>Base por competência</span></article><article><small>Maior categoria</small><strong>—</strong><span>Sem movimentações</span></article></section>
    <section className="reports-grid"><article className="panel report-chart"><div className="panel-heading"><div><h2>Despesas por categoria</h2><p>Distribuição no período selecionado</p></div></div><div className="empty-state"><h3>Sem despesas</h3><p>O gráfico aparecerá quando você cadastrar movimentações.</p></div></article><article className="panel report-chart"><div className="panel-heading"><div><h2>Gastos por pessoa</h2><p>Responsabilidade financeira da família</p></div></div><div className="empty-state"><h3>Sem gastos</h3><p>Os dados serão separados pelos integrantes reais da família.</p></div></article></section>
    <section className="panel module-section"><div className="panel-heading"><div><h2>Resumo por origem</h2><p>Os totais serão calculados somente a partir dos seus cadastros</p></div></div><div className="source-report">{sources.map((source, index) => <article key={source}><span className={`overview-icon ${["blue", "purple", "green", "amber"][index]}`}><FileChartColumn /></span><div><strong>{source}</strong><small>Nenhum registro</small></div><b>{formatCurrency(0)}</b><em>0%</em></article>)}</div></section>
  </>;
}
