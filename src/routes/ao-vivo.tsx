import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, PageHeader } from "@/components/site/shell";
import { EstimateNote, LiveMatchCard, UpcomingMatchCard } from "@/components/site/live";
import { liveMatches, upcomingMatches } from "@/lib/schedule-data";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({
    meta: [
      { title: "Ao vivo — painel de partidas · BeacHub" },
      {
        name: "description",
        content:
          "Todas as partidas em andamento, sets já encerrados, set atual, quadras, horários programados e estimativas dos próximos jogos.",
      },
      { property: "og:title", content: "Ao vivo — painel de partidas · BeacHub" },
      {
        property: "og:description",
        content: "Quem está jogando, em qual quadra, o resultado de cada set e a previsão dos próximos jogos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePanelPage,
});

function LivePanelPage() {
  const live = liveMatches();
  const next = upcomingMatches(4);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeader eyebrow="Copa Areia Curitiba · Arena Norte Beach" title="Painel de partidas" />
          <Link to="/placar" className="font-display text-xs font-bold uppercase tracking-widest text-accent">
            Abrir modo telão →
          </Link>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          O placar não é ponto a ponto: cada set aparece aqui quando o responsável registra o resultado oficial.
        </p>

        <div className="mt-6 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xl">Partidas em andamento</h2>
          <span className="eyebrow">{live.length} jogos simultâneos</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {live.map((m) => (
            <LiveMatchCard key={m.id} match={m} />
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xl">Próximos jogos</h2>
          <span className="eyebrow">Próximos 4</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {next.map((m) => (
            <UpcomingMatchCard key={m.id} match={m} />
          ))}
        </div>
        <EstimateNote className="mt-4" />
      </div>
    </AppShell>
  );
}
