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
import { useAccount } from "@/lib/use-account";

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
  const { data } = useAccount();

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
          <span className="family-avatar">{data?.family?.name.slice(0, 2).toUpperCase() ?? "FF"}</span>
          <div><small>Família ativa</small><strong>{data?.family?.name ?? "Nenhuma família"}</strong></div>
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
    </main>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  const { data } = useAccount();
  const initials = (data?.profile.fullName || "U").split(" ").slice(0, 2).map((part) => part[0]).join("");
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()).toUpperCase();
  return (
    <header className="page-topbar">
      <div><p>{today}</p><h1>{title}</h1><small>{subtitle}</small></div>
      <div className="page-top-actions">
        {action}
        <button className="icon-button has-badge" aria-label="Avisos"><Bell size={17} /></button>
        <span className="user-avatar">{initials}</span>
      </div>
    </header>
  );
}

export function PeriodFilter({ value, onChange }: { value?: string; onChange?: (month: string) => void } = {}) {
  const current = value && /^\d{4}-\d{2}$/.test(value) ? new Date(`${value}-01T12:00:00`) : new Date();
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(current);
  const move = (offset: number) => { const next = new Date(current); next.setMonth(next.getMonth() + offset); onChange?.(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`); };
  return <div className="period-filter"><button aria-label="Mês anterior" onClick={() => move(-1)}>‹</button><span>{label.charAt(0).toUpperCase() + label.slice(1)} <strong>{current.getFullYear()}</strong></span><button aria-label="Próximo mês" onClick={() => move(1)}>›</button></div>;
}

export function EmptyState({ icon: Icon = WalletCards, title, description, action }: { icon?: typeof House; title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span><Icon size={25} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
