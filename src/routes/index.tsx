import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Search, Trophy } from "lucide-react";

import { AppShell } from "@/components/site/shell";
import { EventCard, PlayerAvatar, SponsorBanner, Tag } from "@/components/site/cards";
import { eventsQuery } from "@/lib/api/events";
import { players } from "@/lib/mock-data";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BeacHub — A plataforma do vôlei de areia brasileiro" },
      {
        name: "description",
        content:
          "Encontre campeonatos de vôlei de areia, forme duplas, acompanhe partidas ao vivo e construa seu ranking de performance e reputação.",
      },
      { property: "og:title", content: "BeacHub — A plataforma do vôlei de areia brasileiro" },
      {
        property: "og:description",
        content:
          "Campeonatos, duplas, chaves, resultados e ranking. Aqui é onde o vôlei de areia acontece.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { account } = useSession();

  // Vitrine da home: só o que está com inscrição aberta, os três primeiros por
  // data. O recorte é feito pelo servidor — a home não filtra lista paginada.
  const { data: openEventsData } = useQuery(
    eventsQuery({ status: "REGISTRATION_OPEN", per_page: 3 }),
  );
  const openEvents = openEventsData?.items ?? [];
  const top = [...players].sort((a, b) => a.rankPosition - b.rankPosition).slice(0, 5);

  return (
    <AppShell>
      <section className="sand-grain border-b border-border bg-sand">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="eyebrow">Vôlei de areia · Brasil</p>
            <h1 className="mt-3 text-5xl leading-[0.95] md:text-7xl">
              Aqui é onde
              <br />o vôlei de areia
              <br />
              <span className="text-accent">acontece.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Campeonatos, duplas, chaves, resultados e ranking em um só lugar — para quem joga e
              para quem organiza.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/eventos"
                className="inline-flex h-12 items-center gap-2 bg-graphite px-6 font-display text-sm font-bold uppercase tracking-widest text-background"
              >
                Encontrar campeonato <ArrowRight className="h-4 w-4" />
              </Link>
              {!account || account.roles.includes("ORGANIZER") ? (
                <Link
                  to="/organizador"
                  className="inline-flex h-12 items-center border border-graphite px-6 font-display text-sm font-bold uppercase tracking-widest"
                >
                  {account ? "Painel do organizador" : "Sou organizador"}
                </Link>
              ) : null}
            </div>
            <div className="mt-8 flex gap-8 border-t border-border pt-5">
              {[
                { v: "1.284", l: "Jogadores" },
                { v: "96", l: "Campeonatos" },
                { v: "41", l: "Arenas" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="score-num text-2xl">{s.v}</p>
                  <p className="eyebrow">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="border border-graphite bg-graphite p-1">
              <div className="border border-background/20 p-5 text-background">
                <p className="eyebrow text-background/60">Em andamento · Quadra 2</p>
                <p className="mt-1 font-display text-xs uppercase tracking-widest text-accent">
                  Copa Areia Curitiba · Gold · Quartas
                </p>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span className="font-display text-lg font-bold">José / Marcos</span>
                  <span className="score-num text-center text-2xl">(1) × (1)</span>
                  <span className="text-right font-display text-lg font-bold">Cleber / Zeca</span>
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  {[
                    { s: "Set 1", r: "21 × 15" },
                    { s: "Set 2", r: "22 × 24" },
                    { s: "Set 3", r: "Em andamento" },
                  ].map((row) => (
                    <div
                      key={row.s}
                      className="flex justify-between border-b border-background/15 pb-1"
                    >
                      <span className="font-display text-xs uppercase tracking-widest text-background/60">
                        {row.s}
                      </span>
                      <span className="score-num">{row.r}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-1 w-full court-line" />
                <Link
                  to="/ao-vivo"
                  className="mt-5 inline-flex font-display text-xs font-bold uppercase tracking-widest text-accent"
                >
                  Ver painel de partidas →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        <section>
          <div className="flex items-end justify-between border-b border-border pb-4">
            <div>
              <p className="eyebrow">Inscrições abertas</p>
              <h2 className="mt-1 text-2xl">Próximos campeonatos</h2>
            </div>
            <Link
              to="/eventos"
              className="font-display text-xs font-bold uppercase tracking-widest text-accent"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {openEvents.length === 0
              ? /* Esqueleto nas mesmas caixas do grid enquanto a lista chega. */
                [0, 1, 2].map((i) => (
                  <div key={i} className="h-64 animate-pulse border border-border bg-card" />
                ))
              : openEvents.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </section>

        <SponsorBanner />

        <section className="grid gap-6 md:grid-cols-2">
          <div className="border border-border bg-card p-6">
            <Search className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-2xl">Encontre um parceiro</h2>
            <p className="mt-2 text-muted-foreground">
              Filtre por cidade, nível, categoria e ranking. Convide, combine e inscreva a dupla em
              minutos.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Tag>Curitiba</Tag>
              <Tag>Intermediário</Tag>
              <Tag>Misto</Tag>
              <Tag>Fim de semana</Tag>
            </div>
            <Link
              to="/parceiros"
              className="mt-6 inline-flex h-11 items-center bg-graphite px-5 font-display text-xs font-bold uppercase tracking-widest text-background"
            >
              Buscar parceiros
            </Link>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-accent" />
                <h2 className="text-2xl">Ranking geral</h2>
              </div>
              <Link
                to="/ranking"
                className="font-display text-xs font-bold uppercase tracking-widest text-accent"
              >
                Ver ranking
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {top.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span className="score-num w-7 text-lg text-muted-foreground">
                    {p.rankPosition}
                  </span>
                  <PlayerAvatar initials={p.initials} size="sm" />
                  <Link
                    to="/jogadores/$playerId"
                    params={{ playerId: p.id }}
                    className="flex-1 font-display text-sm font-bold hover:text-accent"
                  >
                    {p.name}
                  </Link>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {p.state}
                  </span>
                  <span className="score-num w-12 text-right">{p.performancePoints}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
