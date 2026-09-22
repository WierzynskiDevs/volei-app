import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/site/shell";
import { ROLE_LABEL } from "@/lib/accounts";
import { homeForRole, useSession } from "@/lib/session";

export const Route = createFileRoute("/escolher-perfil")({
  head: () => ({
    meta: [
      { title: "Como deseja acessar? · BeacHub" },
      { name: "description", content: "Escolha entre a experiência de jogador e a de organizador de campeonatos de vôlei de areia." },
      { property: "og:title", content: "Como deseja acessar? · BeacHub" },
      { property: "og:description", content: "Seletor de perfil para contas com múltiplos papéis." },
    ],
  }),
  component: RoleChooserPage,
});

function RoleChooserPage() {
  const { account, setActiveRole } = useSession();
  const navigate = useNavigate();
  const roles = account?.roles ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="eyebrow">{account ? account.name : "Sessão"}</p>
        <h1 className="mt-1 text-4xl">Como você deseja acessar?</h1>
        {roles.length < 2 ? (
          <p className="mt-3 text-muted-foreground">
            Esta conta possui apenas um papel — o seletor só aparece para quem tem múltiplos acessos.
          </p>
        ) : null}
        <div className="mt-8 grid gap-3">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => {
                setActiveRole(role);
                navigate({ to: homeForRole(role) });
              }}
              className="flex items-center gap-4 border border-border bg-card p-5 text-left hover:border-accent"
            >
              <span className="text-2xl">{role === "ORGANIZER" ? "🏆" : role === "SUPER_ADMIN" ? "🛡️" : "🏐"}</span>
              <span className="font-display text-lg font-bold">{ROLE_LABEL[role]}</span>
              <span className="ml-auto font-display text-[10px] font-bold uppercase tracking-widest text-accent">Acessar</span>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
