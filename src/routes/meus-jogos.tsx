import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Star } from "lucide-react";
import { useState } from "react";

import { RatingCard } from "@/components/site/ratings";
import { AppShell, PageHeader } from "@/components/site/shell";
import { EmptyState, PlayerAvatar } from "@/components/site/cards";
import { EstimateNote, LiveMatchCard, UpcomingMatchCard } from "@/components/site/live";
import { players } from "@/lib/mock-data";
import {
  NOW,
  conflictRisks,
  currentSet,
  delayMinutes,
  estimateFor,
  humanDuration,
  matchesForPlayer,
  toMinutes,
} from "@/lib/schedule-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meus-jogos")({
  head: () => ({
    meta: [
      { title: "Meus jogos — horários e estimativas · BeacHub" },
      {
        name: "description",
        content:
          "Seu próximo jogo, quadra, horário programado, previsão de início, alertas de atraso e avaliações pendentes.",
      },
      { property: "og:title", content: "Meus jogos — horários e estimativas · BeacHub" },
      {
        property: "og:description",
        content: "Quando você joga, em qual quadra, contra quem e qual a previsão atual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyGamesPage,
});

const ME = "José Almeida";

function MyGamesPage() {
  const [rated, setRated] = useState<string[]>([]);
  const mine = matchesForPlayer(ME);
  const liveNow = mine.find((m) => m.status === "LIVE") ?? null;
  const upcoming = mine.filter((m) => m.status === "SCHEDULED");
  const nextMatch = upcoming[0] ?? null;
  const nextEst = nextMatch ? estimateFor(nextMatch.id) : null;
  const risks = conflictRisks(ME);
  const courtDelay = liveNow ? delayMinutes(liveNow) : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader eyebrow="Copa Areia Curitiba · em andamento" title="Meus jogos" />

        {nextMatch ? (
          <div className="mt-6 border border-graphite bg-graphite p-6 text-background">
            <p className="eyebrow text-background/60">Seu próximo jogo</p>
            <p className="mt-2 font-display text-2xl font-extrabold">
              {nextMatch.teamA} <span className="text-accent">×</span> {nextMatch.teamB}
            </p>
            <p className="mt-1 text-background/70">
              {nextMatch.court} · {nextMatch.phase}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-background/20 pt-4">
              <div>
                <p className="eyebrow text-background/60">Horário programado</p>
                <p className="score-num text-3xl">{nextMatch.scheduledStartAt}</p>
              </div>
              <div>
                <p className="eyebrow text-accent">Previsão de início</p>
                <p className="score-num text-3xl text-accent">
                  {nextEst?.estimated ?? nextMatch.scheduledStartAt}
                </p>
              </div>
            </div>
            <p className="mt-3 text-background/80">
              Começa em aproximadamente{" "}
              {humanDuration(
                toMinutes(nextEst?.estimated ?? nextMatch.scheduledStartAt) - toMinutes(NOW),
              )}
              .
            </p>
            <p className="mt-1 text-xs text-background/60">
              Horário estimado. Pode sofrer alterações conforme a duração das partidas anteriores.
            </p>

            {nextEst && nextEst.delta > 0 ? (
              <p className="mt-4 flex items-start gap-2 border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Seu próximo jogo pode atrasar. Motivo: partidas anteriores na {nextMatch.court}{" "}
                estão atrasadas
                {courtDelay > 0 ? ` (+${courtDelay} min)` : ""}.
              </p>
            ) : null}

            <div className="mt-5 flex gap-2">
              <Link
                to="/ao-vivo"
                className="flex h-12 flex-1 items-center justify-center bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground"
              >
                Painel ao vivo
              </Link>
              <Link
                to="/eventos/$slug"
                params={{ slug: "copa-areia-curitiba" }}
                className="flex h-12 flex-1 items-center justify-center border border-background/30 font-display text-sm font-bold uppercase tracking-widest"
              >
                Ver chave
              </Link>
            </div>
          </div>
        ) : null}

        {risks.length > 0 ? (
          <div className="mt-4 border border-warning bg-warning/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-display font-bold uppercase tracking-widest text-warning">
              <AlertTriangle className="h-4 w-4" /> Atenção · dois jogos próximos
            </p>
            {risks.map((r) => (
              <p key={r.second.id} className="mt-2 text-muted-foreground">
                Jogo 1: {r.first.scheduledStartAt} · {r.first.court} — Jogo 2:{" "}
                {r.second.scheduledStartAt} · {r.second.court}. Folga estimada de{" "}
                {Math.max(0, r.gap)} min entre eles.
              </p>
            ))}
          </div>
        ) : null}

        {liveNow ? (
          <>
            <h2 className="mt-10 text-xl">Sua partida em andamento</h2>
            <p className="text-sm text-muted-foreground">
              Set atual:{" "}
              {currentSet(liveNow) ? `Set ${currentSet(liveNow)!.index} em andamento` : "—"}
            </p>
            <div className="mt-3">
              <LiveMatchCard match={liveNow} />
            </div>
          </>
        ) : null}

        <h2 className="mt-10 text-xl">Seus próximos jogos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {upcoming.map((m) => (
            <UpcomingMatchCard key={m.id} match={m} />
          ))}
        </div>
        <EstimateNote className="mt-3" />

        <h2 className="mt-10 text-xl">Avaliações liberadas</h2>
        <p className="text-sm text-muted-foreground">
          Circuito Litoral — Etapa 3 foi finalizado. Avalie quem jogou com e contra você.
        </p>
        <div className="mt-3 space-y-3">
          {players.slice(1, 4).map((p) => (
            <div key={p.id} className="flex items-center gap-3 border border-border bg-card p-4">
              <PlayerAvatar initials={p.initials} size="sm" />
              <div className="flex-1">
                <p className="font-display text-sm font-bold">{p.name}</p>
                <p className="text-xs text-muted-foreground">Adversário · Semifinal</p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setRated((r) => [...new Set([...r, p.id])])}
                    aria-label={`${i + 1} estrelas`}
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        rated.includes(p.id)
                          ? "fill-warning text-warning"
                          : "text-border hover:text-warning",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-xl">Avaliações</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <RatingCard
            eyebrow="Após a partida"
            title="Avaliação da arbitragem"
            description="Como foi a arbitragem da sua última partida na Quadra 1?"
          />
          <RatingCard
            eyebrow="Após o evento"
            title="Avaliação da organização"
            description="Estrutura, pontualidade e comunicação da Copa Areia Curitiba."
          />
        </div>

        <h2 className="mt-10 text-xl">Inscrições futuras</h2>
        <div className="mt-3">
          <EmptyState
            title="Você ainda não tem próximos eventos confirmados"
            description="Há 3 campeonatos com inscrições abertas na sua região nas próximas semanas."
            action={
              <Link
                to="/eventos"
                className="inline-flex h-11 items-center bg-graphite px-5 font-display text-xs font-bold uppercase tracking-widest text-background"
              >
                Encontrar campeonato
              </Link>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
