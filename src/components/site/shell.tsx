import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, Home, Menu, Trophy, User, Volleyball } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserMenu } from "@/components/site/user-menu";
import { useSession } from "@/lib/session";

const nav = [
  { to: "/eventos", label: "Eventos" },
  { to: "/ao-vivo", label: "Ao vivo" },
  { to: "/parceiros", label: "Parceiros" },

  { to: "/ranking", label: "Ranking" },
  { to: "/arenas", label: "Arenas" },
  { to: "/organizador", label: "Organizador" },
] as const;

const mobileNav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/meus-jogos", label: "Meus jogos", icon: Volleyball },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/jogadores/$playerId", label: "Perfil", icon: User },
] as const;

export function BeacHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" className="fill-graphite" />
      <path d="M20 6a14 14 0 0 1 13 9c-6-3-13-2-18 3-3 3-4 7-3 11A14 14 0 0 1 20 6Z" className="fill-teal" />
      <path d="M34 20a14 14 0 0 1-20 12.6c5 0 9-2 12-6 3-4 3-9 1-13a14 14 0 0 1 7 6.4Z" className="fill-accent" />
      <circle cx="15.5" cy="13.5" r="1.5" className="fill-sand" />
      <circle cx="12" cy="19" r="1.1" className="fill-sand" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      <BeacHubMark className="h-8 w-8" />
      <span className="font-display text-lg font-extrabold tracking-tight">
        Beac<span className="text-accent">Hub</span>
      </span>
    </Link>
  );
}


export function SiteHeader() {
  const { account } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const visibleNav = nav.filter(
    (item) => item.to !== "/organizador" || !account || account.roles.includes("ORGANIZER"),
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Wordmark />
        <nav className="hidden items-center gap-6 md:flex">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
                pathname.startsWith(item.to) && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/notificacoes"
            aria-label="Notificações"
            className="relative flex h-9 w-9 items-center justify-center border border-border bg-card"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
          </Link>
          <UserMenu />
          <Sheet>
            <SheetTrigger
              aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center border border-border bg-card md:hidden"
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="mt-8 flex flex-col gap-1 px-4">
                {visibleNav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="border-b border-border py-3 font-display text-base font-bold"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link to="/placar" className="border-b border-border py-3 font-display text-base font-bold">
                  Modo Telão
                </Link>
                {account?.roles.includes("SUPER_ADMIN") ? (
                  <Link to="/admin" className="border-b border-border py-3 font-display text-base font-bold text-accent">
                    Super Admin
                  </Link>
                ) : null}
                <Link to="/configuracoes" className="border-b border-border py-3 font-display text-base font-bold">
                  Configurações
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { account } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden">
      {mobileNav.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to.split("/").slice(0, 2).join("/"));
        return (
          <Link
            key={item.to}
            to={item.to}
            params={{ playerId: account?.playerId ?? "ana-ribeiro" }}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide",
              active ? "text-accent" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-graphite text-background/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <span className="font-display text-sm font-extrabold tracking-tight text-background">
          Beac<span className="text-accent">Hub</span> · Organiza · Inscreve · Opera
        </span>
        <span className="text-xs">Protótipo de produto · dados fictícios</span>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileNav />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
