import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { PlayerAvatar, ReputationBadge } from "@/components/site/cards";
import { players } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking de performance e reputação · BeacHub" },
      {
        name: "description",
        content:
          "Ranking nacional de vôlei de areia: pontos de performance conquistados em quadra e reputação avaliada pela comunidade.",
      },
      { property: "og:title", content: "Ranking de performance e reputação · BeacHub" },
      {
        property: "og:description",
        content: "Duas métricas independentes: resultado competitivo e reputação.",
      },
    ],
  }),
  component: RankingPage,
});

const contexts = ["Geral", "Masculino", "Feminino", "Misto", "Temporada 2026"] as const;

function RankingPage() {
  const [mode, setMode] = useState<"performance" | "reputacao">("performance");
  const [context, setContext] = useState<(typeof contexts)[number]>("Geral");

  const list = [...players]
    .filter((p) =>
      context === "Masculino" ? p.gender === "M" : context === "Feminino" ? p.gender === "F" : true,
    )
    .sort((a, b) =>
      mode === "performance"
        ? b.performancePoints - a.performancePoints
        : b.reputation - a.reputation,
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          eyebrow="Duas métricas independentes"
          title="Ranking"
          description="Performance mede o que aconteceu na areia. Reputação mede como a comunidade percebe o jogador. Uma nunca altera a outra."
        />

        <div className="mt-6 grid grid-cols-2 border border-graphite">
          {(
            [
              ["performance", "Performance"],
              ["reputacao", "Reputação"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                "py-3 font-display text-xs font-bold uppercase tracking-widest",
                mode === key ? "bg-graphite text-background" : "bg-card",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {contexts.map((c) => (
            <button
              key={c}
              onClick={() => setContext(c)}
              className={cn(
                "border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest",
                context === c
                  ? "border-graphite bg-graphite text-background"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <ul className="mt-6 divide-y divide-border border border-border bg-card">
          {list.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="score-num w-8 text-lg text-muted-foreground">{i + 1}</span>
              <PlayerAvatar initials={p.initials} size="sm" />
              <div className="min-w-0 flex-1">
                <Link
                  to="/jogadores/$playerId"
                  params={{ playerId: p.id }}
                  className="font-display text-sm font-bold hover:text-accent"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {p.city}/{p.state} · {p.level}
                </p>
              </div>
              {mode === "performance" ? (
                <div className="text-right">
                  <p className="score-num text-lg">{p.performancePoints}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.wins}V · {p.losses}D
                  </p>
                </div>
              ) : (
                <ReputationBadge score={p.reputation} reviews={p.validReviews} compact />
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-muted-foreground">
          Ranking de performance versão 1: vitória +2, derrota −1, derrota na final 0, vice +1,
          campeão +4. Cada ponto possui uma transação auditável vinculada à partida.
        </p>
      </div>
    </AppShell>
  );
}
