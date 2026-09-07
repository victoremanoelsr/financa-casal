"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
  Menu,
  ReceiptText,
  Repeat2,
  Settings,
  Store,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";
import { cn } from "@/lib/cn";
import { useAccount } from "@/lib/use-account";

const navigationGroups = [
  {
    label: "PRINCIPAL",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/financeiro", label: "Financeiro", icon: Landmark },
      { href: "/contas", label: "Contas", icon: ReceiptText },
    ],
  },
  {
    label: "ORGANIZAÇÃO FINANCEIRA",
    items: [
      { href: "/cartoes", label: "Cartões", icon: CreditCard },
      { href: "/comercios", label: "Comércios", icon: Store },
      { href: "/assinaturas", label: "Assinaturas", icon: Repeat2 },
      { href: "/despesas-fixas", label: "Despesas Fixas", icon: CalendarRange },
    ],
  },
  {
    label: "PLANEJAMENTO",
    items: [{ href: "/metas", label: "Metas", icon: Goal }],
  },
  {
    label: "ANÁLISES",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: FileChartColumn },
    ],
  },
  {
    label: "SISTEMA",
    items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];
const navigation = navigationGroups.flatMap((group) => group.items);

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data } = useAccount();

  return (
    <main className="app-shell">
      <aside className={cn("sidebar", menuOpen && "mobile-open")}>
        <div className="drawer-brand">
          <Link
            href="/"
            className="brand"
            aria-label="Finança Familiar — início"
          >
            <span className="brand-mark">F</span>
            <span>
              <strong>Finança</strong>
              <small>Familiar</small>
            </span>
          </Link>
          <button onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
            <X />
          </button>
        </div>
        <div className="drawer-profile">
          <span className="user-avatar">
            {(data?.profile.fullName || "U")
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0])
              .join("")}
          </span>
          <div>
            <strong>{data?.profile.fullName || "Usuário"}</strong>
            <small>
              {data?.family?.name || "Família"} ·{" "}
              {data?.members.find((m) => m.isCurrentUser)?.role === "admin"
                ? "Administrador"
                : "Membro"}
            </small>
          </div>
        </div>
        <nav aria-label="Navegação principal">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    className={cn("nav-item", active && "active")}
                    href={href}
                    key={href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
                    <span className="nav-text">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button
          className="drawer-logout"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/entrar");
          }}
        >
          <LogOut /> Sair da conta
        </button>
        <div className="family-card">
          <span className="family-avatar">
            {data?.family?.name.slice(0, 2).toUpperCase() ?? "FF"}
          </span>
          <div>
            <small>Família ativa</small>
            <strong>{data?.family?.name ?? "Nenhuma família"}</strong>
          </div>
          <button aria-label="Trocar família">
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="mobile-header">
          <Link href="/" className="mobile-brand">
            <span className="brand-mark">F</span>
            <strong>Finança Familiar</strong>
          </Link>
          <button
            className="mobile-header-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
        </header>
        {children}
      </section>
      {menuOpen && (
        <button
          className="menu-overlay"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}
      <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
        {navigation.slice(0, 3).map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link className={cn(active && "active")} href={href} key={href}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          className={cn(
            !navigation
              .slice(0, 3)
              .some(({ href }) =>
                href === "/" ? pathname === "/" : pathname.startsWith(href),
              ) && "active",
          )}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={20} />
          <span>Menu</span>
        </button>
      </nav>
      <Toaster position="top-right" richColors closeButton />
    </main>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  const { data } = useAccount();
  const initials = (data?.profile.fullName || "U")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })
    .format(new Date())
    .toUpperCase();
  return (
    <header className="page-topbar">
      <div>
        <p>{today}</p>
        <h1>{title}</h1>
        <small>{subtitle}</small>
      </div>
      <div className="page-top-actions">
        {action}
        <button className="icon-button has-badge" aria-label="Avisos">
          <Bell size={17} />
        </button>
        <span className="user-avatar">{initials}</span>
      </div>
    </header>
  );
}

import { MonthYearPicker } from "@/components/month-year-picker";

export function PeriodFilter({
  value,
  onChange,
}: { value?: string; onChange?: (month: string) => void } = {}) {
  const [internal, setInternal] = useState(
    value && /^\d{4}-\d{2}$/.test(value)
      ? value
      : new Date().toISOString().slice(0, 7),
  );
  const currentVal = value ?? internal;

  return (
    <MonthYearPicker
      value={currentVal}
      onChange={(next) => {
        setInternal(next);
        onChange?.(next);
      }}
    />
  );
}

export function EmptyState({
  icon: Icon = WalletCards,
  title,
  description,
  action,
}: {
  icon?: typeof House;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
