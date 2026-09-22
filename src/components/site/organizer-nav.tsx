import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

const organizerNav = [
  { to: "/organizador", label: "Dashboard" },
  { to: "/organizador/eventos", label: "Meus eventos" },
  { to: "/organizador/inscricoes", label: "Inscrições" },
  { to: "/organizador/controle", label: "Partidas e resultados" },
  { to: "/juiz", label: "Juízes" },
  { to: "/organizador/financeiro", label: "Financeiro" },
  { to: "/organizador/plano", label: "Plano" },
  { to: "/arenas", label: "Arenas" },
  { to: "/configuracoes", label: "Perfil" },
] as const;

export function OrganizerNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4">
      <div className="flex min-w-max gap-1 pb-2">
        {organizerNav.map((item) => {
          const active = item.to === "/organizador" ? pathname === "/organizador" : pathname.startsWith(item.to);
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
  );
}
