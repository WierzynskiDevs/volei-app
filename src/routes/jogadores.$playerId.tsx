import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/site/shell";
import { PlayerAvatar, ReputationBadge, Stat } from "@/components/site/cards";
import { getPlayer, performanceHistory, players, pointTransactions, reviews } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jogadores/$playerId")({
  loader: ({ params }) => {
    const player = getPlayer(params.playerId);
    if (!player) throw notFound();
    return { player };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Jogador não encontrado · BeacHub" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.player;
    const title = `${p.name} — ranking #${p.rankPosition} · BeacHub`;
    const description = `Perfil de ${p.name}, ${p.level}, ${p.city}/${p.state}. ${p.performancePoints} pontos de performance, reputação ${p.reputation.toFixed(1)} em ${p.validReviews} avaliações válidas.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PlayerPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl">Não foi possível carregar o perfil</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl">Jogador não encontrado</h1>
        <Link to="/ranking" className="mt-4 inline-flex font-display text-xs font-bold uppercase tracking-widest text-accent">
          Ver ranking
        </Link>
      </div>
    </AppShell>
  ),
});

const tabs = ["Histórico", "Extrato de pontos", "Avaliações", "Parceiros"] as const;

function PlayerPage() {
  const { player } = Route.useLoaderData();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Histórico");

  return (
    <AppShell>
      <section className="sand-grain border-b border-border bg-sand">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-4 py-8">
          <PlayerAvatar initials={player.initials} size="lg" />
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl">{player.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {player.city}/{player.state} · {player.level} · {player.events} participações
            </p>
            {player.bio ? <p className="mt-2 max-w-lg text-sm">{player.bio}</p> : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-l-4 border-graphite bg-card p-5">
            <p className="eyebrow">Performance</p>
            <div className="mt-2 flex items-baseline gap-4">
              <span className="score-num text-4xl">#{player.rankPosition}</span>
              <span className="score-num text-2xl text-accent">{player.performancePoints} pts</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Resultado competitivo: {player.wins}V / {player.losses}D · {player.podiums} pódios
            </p>
          </div>
          <div className="border-l-4 border-warning bg-card p-5">
            <p className="eyebrow">Reputação</p>
            <div className="mt-2">
              <ReputationBadge score={player.reputation} reviews={player.validReviews} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {player.validReviews < 5
                ? "Poucas avaliações válidas — confiança ainda baixa."
                : "Percepção da comunidade. Não altera o ranking competitivo."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Participações" value={player.events} />
          <Stat label="Vitórias" value={player.wins} />
          <Stat label="Derrotas" value={player.losses} />
          <Stat label="Pódios" value={player.podiums} />
        </div>

        <div className="mt-8 flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-3 font-display text-xs font-bold uppercase tracking-widest",
                tab === t ? "border-accent text-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "Histórico" ? <HistoryTab /> : null}
          {tab === "Extrato de pontos" ? <LedgerTab /> : null}
          {tab === "Avaliações" ? <ReviewsTab /> : null}
          {tab === "Parceiros" ? <PartnersTab /> : null}
        </div>
      </div>
    </AppShell>
  );
}

function HistoryTab() {
  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-sand text-left">
            {["Evento", "Data", "Parceiro", "Formato", "J", "V", "D", "Colocação", "Pontos"].map((h) => (
              <th key={h} className="px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {performanceHistory.map((row) => (
            <tr key={row.event} className="border-b border-border last:border-0">
              <td className="px-3 py-3 font-semibold">
                <Link to="/eventos/$slug" params={{ slug: row.slug }} className="hover:text-accent">
                  {row.event}
                </Link>
              </td>
              <td className="px-3 py-3 text-muted-foreground">{row.date}</td>
              <td className="px-3 py-3">{row.partner}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.format}</td>
              <td className="score-num px-3 py-3">{row.matches}</td>
              <td className="score-num px-3 py-3">{row.wins}</td>
              <td className="score-num px-3 py-3">{row.losses}</td>
              <td className="px-3 py-3 font-semibold">{row.position}</td>
              <td className="score-num px-3 py-3 text-accent">+{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerTab() {
  const total = pointTransactions.reduce((acc, t) => acc + t.points, 0);
  return (
    <div className="border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-sand px-4 py-3">
        <div>
          <p className="eyebrow">Copa Areia Curitiba</p>
          <p className="text-sm text-muted-foreground">Cada movimento é registrado e auditável.</p>
        </div>
        <span className="score-num text-2xl text-accent">+{total}</span>
      </div>
      <ul className="divide-y divide-border">
        {pointTransactions.map((t) => (
          <li key={t.id} className="flex items-center gap-4 px-4 py-3">
            <span
              className={cn(
                "score-num w-10 text-lg",
                t.points > 0 ? "text-success" : t.points < 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {t.points > 0 ? `+${t.points}` : t.points}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.description}</p>
              <p className="text-xs text-muted-foreground">
                {t.type} · {t.event} · {t.date}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Regra vigente (v1): vitória +2, derrota −1, derrota na final 0, vice +1, campeão +4.
      </p>
    </div>
  );
}

function ReviewsTab() {
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <PlayerAvatar initials={r.initials} size="sm" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-sm font-bold">{r.reviewer}</p>
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn("h-3.5 w-3.5", i < r.rating ? "fill-warning text-warning" : "text-border")}
                    />
                  ))}
                </span>
                {!r.valid ? (
                  <span className="border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Não conta para reputação
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{r.event}</p>
              <p className="mt-2 text-sm">{r.comment}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                {[
                  ["Técnica", r.criteria.technical],
                  ["Espírito esportivo", r.criteria.sportsmanship],
                  ["Trabalho em equipe", r.criteria.teamwork],
                  ["Comprometimento", r.criteria.commitment],
                ].map(([label, v]) => (
                  <div key={label as string} className="border border-border px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="score-num">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Avaliações de jogadores com menos de 4 participações concluídas ficam registradas, mas não influenciam a nota
        de reputação.
      </p>
    </div>
  );
}

function PartnersTab() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {players.slice(1, 5).map((p) => (
        <Link
          key={p.id}
          to="/jogadores/$playerId"
          params={{ playerId: p.id }}
          className="flex items-center gap-3 border border-border bg-card p-4 hover:border-graphite"
        >
          <PlayerAvatar initials={p.initials} size="sm" />
          <div>
            <p className="font-display text-sm font-bold">{p.name}</p>
            <p className="text-xs text-muted-foreground">Parceria em 2 eventos · último em ago 2026</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
