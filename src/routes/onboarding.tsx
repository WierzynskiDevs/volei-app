import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/site/shell";
import { homeForRole, useSession } from "@/lib/session";
import type { Role } from "@/lib/accounts";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Como você participa? · BeacHub" },
      {
        name: "description",
        content:
          "Defina se você usa o BeacHub como jogador, organizador de campeonatos ou os dois.",
      },
      { property: "og:title", content: "Como você participa? · BeacHub" },
      { property: "og:description", content: "Personalize sua experiência no vôlei de areia." },
    ],
  }),
  component: OnboardingPage,
});

const options: {
  key: "PLAYER" | "ORGANIZER" | "BOTH";
  icon: string;
  title: string;
  desc: string;
}[] = [
  {
    key: "PLAYER",
    icon: "🏐",
    title: "Jogador",
    desc: "Disputo campeonatos, procuro parceiro e acompanho meu ranking.",
  },
  {
    key: "ORGANIZER",
    icon: "🏆",
    title: "Organizador",
    desc: "Crio campeonatos, recebo inscrições e opero o dia do evento.",
  },
  {
    key: "BOTH",
    icon: "🏐🏆",
    title: "Os dois",
    desc: "Jogo e também organizo. Tenho acesso aos dois módulos.",
  },
];

function OnboardingPage() {
  const [choice, setChoice] = useState<"PLAYER" | "ORGANIZER" | "BOTH">("PLAYER");
  const navigate = useNavigate();
  const { setActiveRole } = useSession();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="eyebrow">Onboarding</p>
        <h1 className="mt-1 text-4xl">Como você participa do vôlei de areia?</h1>
        <p className="mt-2 text-muted-foreground">
          Isso define o seu menu e as telas iniciais. Dá para mudar depois.
        </p>

        <div className="mt-8 grid gap-3">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setChoice(o.key)}
              className={`flex items-start gap-4 border p-5 text-left transition-colors ${
                choice === o.key
                  ? "border-accent bg-accent/5"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <span className="text-2xl">{o.icon}</span>
              <span>
                <span className="block font-display text-lg font-bold">{o.title}</span>
                <span className="block text-sm text-muted-foreground">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const role: Role = choice === "ORGANIZER" ? "ORGANIZER" : "PLAYER";
            setActiveRole(role);
            navigate({ to: choice === "BOTH" ? "/escolher-perfil" : homeForRole(role) });
          }}
          className="mt-8 h-11 w-full bg-accent font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
        >
          Continuar
        </button>
      </div>
    </AppShell>
  );
}
