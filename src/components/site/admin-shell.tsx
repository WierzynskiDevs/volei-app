import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SiteFooter, Wordmark } from "@/components/site/shell";
import { UserMenu } from "@/components/site/user-menu";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const adminNav = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/financeiro", label: "Financeiro" },
  { to: "/admin/pagamentos", label: "Pagamentos" },
  { to: "/admin/reembolsos", label: "Reembolsos" },
  { to: "/admin/planos", label: "Planos" },
  { to: "/admin/usuarios", label: "Usuários" },
  { to: "/admin/organizadores", label: "Organizadores" },
  { to: "/admin/eventos", label: "Eventos" },
  { to: "/admin/arenas", label: "Arenas Parceiras" },
  { to: "/admin/publicidade", label: "Publicidade" },
  { to: "/admin/denuncias", label: "Denúncias" },
  { to: "/admin/feedbacks", label: "Feedbacks" },
  { to: "/admin/auditoria", label: "Auditoria" },
  { to: "/admin/configuracoes", label: "Configurações" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { ready, account } = useSession();

  const authorized = account?.roles.includes("SUPER_ADMIN");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Wordmark />
          <span className="hidden border border-graphite px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest sm:inline">
            Super Admin
          </span>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </div>
        <div className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5">
            {adminNav.map((item) => {
              const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground",
                    active && "bg-graphite text-background",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="flex-1">
        {!ready ? null : authorized ? (
          children
        ) : (
          <div className="mx-auto max-w-lg px-4 py-20 text-center">
            <p className="eyebrow">Acesso restrito</p>
            <h1 className="mt-2 text-3xl">Área do Super Admin</h1>
            <p className="mt-2 text-muted-foreground">
              Entre com a conta <strong>Super Admin</strong> para acessar o controle global da plataforma.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 items-center bg-accent px-6 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
            >
              Ir para o login
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <p className="eyebrow">Governança</p>
        <h1 className="mt-1 text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function AdminTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-sand-deep/40 text-left">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function StatusPill({ tone = "neutral", children }: { tone?: "ok" | "warn" | "danger" | "neutral"; children: ReactNode }) {
  const tones = {
    ok: "border-success/40 bg-success/10 text-success",
    warn: "border-warning/40 bg-warning/10 text-warning",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    neutral: "border-border bg-muted text-muted-foreground",
  } as const;
  return (
    <span className={cn("inline-flex border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest", tones[tone])}>
      {children}
    </span>
  );
}

export function AdminAction({ children, onClick, tone = "default" }: { children: ReactNode; onClick?: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest",
        tone === "danger" ? "border-destructive/50 text-destructive hover:bg-destructive/10" : "border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
