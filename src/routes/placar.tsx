import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { LiveMatchCard, UpcomingMatchCard } from "@/components/site/live";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTIMATE_DISCLAIMER, COURTS, liveMatches, upcomingMatches } from "@/lib/schedule-data";

const searchSchema = z.object({
  quadra: z.enum(["TODAS", ...COURTS] as [string, ...string[]]).optional().default("TODAS"),
});

export const Route = createFileRoute("/placar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Modo telão — painel de partidas · BeacHub" },
      {
        name: "description",
        content: "Todas as partidas em andamento por quadra, sets oficiais e próximos jogos, em tela cheia para a arena.",
      },
      { property: "og:title", content: "Modo telão — painel de partidas · BeacHub" },
      { property: "og:description", content: "Sets oficiais, set atual e próximos jogos da arena." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScoreboardPage,
});

function ScoreboardPage() {
  const { quadra } = Route.useSearch();
  const navigate = useNavigate({ from: "/placar" });

  const allLive = liveMatches();
  const allNext = upcomingMatches(4);

  const live = quadra === "TODAS" ? allLive : allLive.filter((m) => m.court === quadra);
  const next = quadra === "TODAS" ? allNext : allNext.filter((m) => m.court === quadra);

  const title = quadra === "TODAS" ? "Todas as quadras" : quadra;

  return (
    <div className="min-h-screen bg-graphite px-6 py-8 text-background">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-background/20 pb-4">
          <div>
            <span className="font-display text-xl font-extrabold tracking-tight">
              Beac<span className="text-accent">Hub</span>
            </span>
            <span className="eyebrow ml-3 text-background/60">Copa Areia Curitiba · Arena Norte Beach</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="eyebrow text-background/60">Exibir</span>
            <Select
              value={quadra}
              onValueChange={(value) =>
                navigate({ search: (prev) => ({ ...prev, quadra: value }) })
              }
            >
              <SelectTrigger className="w-44 border-background/20 bg-background/10 text-background focus:ring-accent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-background/20 bg-graphite text-background">
                <SelectItem value="TODAS">Todas as quadras</SelectItem>
                {COURTS.map((court) => (
                  <SelectItem key={court} value={court}>
                    {court}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="eyebrow mt-8 text-accent">{title} — Partidas em andamento</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {live.map((m) => (
            <LiveMatchCard key={m.id} match={m} dark />
          ))}
          {live.length === 0 ? (
            <p className="text-background/60">Nenhuma partida em andamento para {title.toLowerCase()}.</p>
          ) : null}
        </div>

        <p className="eyebrow mt-10 text-background/60">{title} — Próximos jogos</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {next.map((m) => (
            <UpcomingMatchCard key={m.id} match={m} dark />
          ))}
          {next.length === 0 ? (
            <p className="text-background/60">Nenhum próximo jogo para {title.toLowerCase()}.</p>
          ) : null}
        </div>
        <p className="mt-4 text-xs text-background/60">{ESTIMATE_DISCLAIMER}</p>
      </div>
    </div>
  );
}

