import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { PlayerCard } from "@/components/site/cards";
import { players } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parceiros")({
  head: () => ({
    meta: [
      { title: "Encontrar parceiro de dupla · BeacHub" },
      {
        name: "description",
        content:
          "Encontre parceiros de vôlei de areia por cidade, nível, categoria e ranking. Envie o convite e inscreva a dupla.",
      },
      { property: "og:title", content: "Encontrar parceiro de dupla · BeacHub" },
      { property: "og:description", content: "Filtre por cidade, nível e disponibilidade e convide seu parceiro." },
    ],
  }),
  component: PartnersPage,
});

const cities = ["Todas", "Curitiba", "Florianópolis", "Santos", "Recife", "Natal", "Vitória"] as const;
const levels = ["Todos", "Iniciante", "Intermediário", "Avançado", "Open"] as const;

function PartnersPage() {
  const [city, setCity] = useState<(typeof cities)[number]>("Todas");
  const [level, setLevel] = useState<(typeof levels)[number]>("Todos");
  const [invited, setInvited] = useState<string[]>([]);

  const list = players.filter(
    (p) => (city === "Todas" || p.city === city) && (level === "Todos" || p.level === level),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          eyebrow="Comunidade"
          title="Encontrar parceiro"
          description="A dupla é uma relação temporária: escolha um parceiro por evento, sem criar time permanente."
        />

        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <Chip key={c} active={city === c} onClick={() => setCity(c)}>
                {c}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {levels.map((l) => (
              <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                {l}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {list.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              action={
                <button
                  onClick={() => setInvited((v) => [...new Set([...v, p.id])])}
                  className={cn(
                    "h-9 shrink-0 px-3 font-display text-[10px] font-bold uppercase tracking-widest",
                    invited.includes(p.id) ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground",
                  )}
                >
                  {invited.includes(p.id) ? "Convite enviado" : "Convidar"}
                </button>
              }
            />
          ))}
        </div>

        {list.length === 0 ? (
          <p className="mt-8 border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum jogador com esses filtros. Tente ampliar a cidade ou o nível.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest",
        active ? "border-graphite bg-graphite text-background" : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
