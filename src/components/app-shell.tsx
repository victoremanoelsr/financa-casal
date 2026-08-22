"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarRange,
  ChevronDown,
  CreditCard,
  FileChartColumn,
  Goal,
  House,
  Landmark,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Repeat2,
  Settings,
  Store,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/financeiro", label: "Financeiro", icon: Landmark },
  { href: "/contas", label: "Contas", icon: ReceiptText },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/comercios", label: "Comércios", icon: Store },
  { href: "/assinaturas", label: "Assinaturas", icon: Repeat2 },
  { href: "/despesas-fixas", label: "Despesas Fixas", icon: CalendarRange },
  { href: "/metas", label: "Metas", icon: Goal },
  { href: "/relatorios", label: "Relatórios", icon: FileChartColumn },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="app-shell">
      <aside className={cn("sidebar", menuOpen && "mobile-open")}>
        <Link href="/" className="brand" aria-label="Finança Familiar — início">
          <span className="brand-mark">F</span>
          <span><strong>Finança</strong><small>Familiar</small></span>
        </Link>
        <nav aria-label="Navegação principal">
          <p className="nav-label">MENU PRINCIPAL</p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link className={cn("nav-item", active && "active")} href={href} key={href} onClick={() => setMenuOpen(false)}>
                <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
                <span className="nav-text">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="family-card">
          <span className="family-avatar">FS</span>
          <div><small>Família ativa</small><strong>Família Silva</strong></div>
          <button aria-label="Trocar família"><ChevronDown size={15} /></button>
        </div>
      </aside>

      <section className="content">
        <header className="mobile-header">
          <Link href="/" className="mobile-brand"><span className="brand-mark">F</span><strong>Finança Familiar</strong></Link>
          <button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={21} /></button>
        </header>
        {children}
      </section>
      {menuOpen && <button className="menu-overlay" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
        {navigation.slice(0, 4).map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link className={cn(active && "active")} href={href} key={href}><Icon size={20} /><span>{label}</span></Link>;
        })}
        <button onClick={() => setMenuOpen(true)}><Menu size={20} /><span>Menu</span></button>
      </nav>
      <Toaster position="top-right" richColors closeButton />
      <AlertsOnEntry />
    </main>
  );
}

function AlertsOnEntry() {
  const [open, setOpen] = useState(true);
  function close() { setOpen(false); }
  return <Modal open={open} onClose={close} title="Você possui 4 avisos" description="Organizamos os vencimentos e fechamentos mais importantes em uma única janela."><div className="alert-summary-list"><Link href="/cartoes/principal" onClick={close}><span className="alert-icon blue">▱</span><div><strong>Cartão Principal fecha amanhã</strong><small>Fechamento em 19/08/2026</small></div><b>Ver</b></Link><Link href="/contas" onClick={close}><span className="alert-icon amber">!</span><div><strong>Energia vence amanhã</strong><small>R$ 280,00 · vencimento 19/08/2026</small></div><b>Ver</b></Link><Link href="/assinaturas" onClick={close}><span className="alert-icon amber">!</span><div><strong>Plano de celular vence em 2 dias</strong><small>R$ 99,90 · pagamento por PIX</small></div><b>Ver</b></Link><Link href="/despesas-fixas" onClick={close}><span className="alert-icon red">!</span><div><strong>Internet está atrasada</strong><small>Vencimento em 15/08/2026</small></div><b>Ver</b></Link></div><div className="modal-actions"><button className="ghost-button" onClick={close}>Fechar</button><Link className="primary-button" href="/contas" onClick={close}>Ver todas as contas</Link></div></Modal>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <header className="page-topbar">
      <div><p>TERÇA-FEIRA, 18 DE AGOSTO</p><h1>{title}</h1><small>{subtitle}</small></div>
      <div className="page-top-actions">
        {action}
        <button className="icon-button has-badge" aria-label="Avisos"><Bell size={17} /></button>
        <span className="user-avatar">VS</span>
        <div className="user-name"><strong>VICTOR SILVA</strong><small>Administrador</small></div>
      </div>
    </header>
  );
}

export function PeriodFilter() {
  return <div className="period-filter"><button aria-label="Mês anterior">‹</button><span>Agosto <strong>2026</strong></span><button aria-label="Próximo mês">›</button></div>;
}

export function EmptyState({ icon: Icon = WalletCards, title, description, action }: { icon?: typeof House; title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span><Icon size={25} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
