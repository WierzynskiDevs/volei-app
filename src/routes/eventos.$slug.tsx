import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Pencil, Share2, Trophy, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BracketTree } from "@/components/site/bracket-tree";
import { AppShell } from "@/components/site/shell";
import {
  EmptyState,
  EventStatusPill,
  MatchCard,
  SponsorBanner,
  Tag,
} from "@/components/site/cards";
import { RefereesPanel } from "@/components/site/ops-referees";
import { ApiError } from "@/lib/api/client";
import { publicBracketQuery } from "@/lib/api/draws";
import { eventBySlugQuery } from "@/lib/api/events";
import { publicMatchesQuery } from "@/lib/api/matches";
import { publishedBracketRounds } from "@/lib/bracket";
import { buildStandings, useOperations } from "@/lib/operations";
import { useSession } from "@/lib/session";
import { pools, teams } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/eventos/$slug")({
  /*
   * Carregado no loader, e não em `useQuery`, porque `head()` depende do dado
   * para montar título e descrição: a página do evento é a que se compartilha
   * por link, e meta tag preenchida só depois da hidratação não serve para
   * prévia de link nem para busca.
   *
   * Chaveamento/Agenda/Resultados já consomem a API real (ADR 0017, Q15):
   * cada aba busca por conta própria via `useQuery`, não pelo loader, porque
   * um 404 (chave ainda não publicada) é estado normal de tela, não erro de
   * navegação. Duplas/Tabela continuam em mock: fase de grupos e avanço de
   * chave são motor de competição, Fase 2 (docs/PHASE-2.md).
   */
  loader: async ({ params, context }) => {
    try {
      return { event: await context.queryClient.ensureQueryData(eventBySlugQuery(params.slug)) };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) throw notFound();
      throw e;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Evento indisponível · BeacHub" }, { name: "robots", content: "noindex" }],
      };
    }
    const { event } = loaderData;
    const title = `${event.name} · ${event.city}/${event.state} · BeacHub`;
    const description = `${event.dateLabel} — ${event.format}, ${event.modality} ${event.category}, nível ${event.level}, no ${event.venue}. Inscrições, chaves e resultados ao vivo.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: EventPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl">Não foi possível carregar este evento</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Link
          to="/eventos"
          className="mt-6 inline-flex font-display text-xs font-bold uppercase tracking-widest text-accent"
        >
          Voltar para campeonatos
        </Link>
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl">Campeonato não encontrado</h1>
        <p className="mt-2 text-muted-foreground">
          O link pode ter expirado ou o organizador removeu o evento da vitrine pública.
        </p>
        <Link
          to="/eventos"
          className="mt-6 inline-flex font-display text-xs font-bold uppercase tracking-widest text-accent"
        >
          Ver campeonatos abertos
        </Link>
      </div>
    </AppShell>
  ),
});

const publicTabs = [
  "Informações",
  "Duplas",
  "Chaveamento",
  "Agenda",
  "Tabela",
  "Resultados",
] as const;
const organizerTabs = ["Juízes"] as const;
type TabName = (typeof publicTabs)[number] | (typeof organizerTabs)[number];

function EventPage() {
  const { event } = Route.useLoaderData();
  const { account, activeRole } = useSession();
  const isOrganizer = activeRole === "ORGANIZER" || account?.roles.includes("SUPER_ADMIN") === true;
  const tabs: TabName[] = isOrganizer ? [...organizerTabs, ...publicTabs] : [...publicTabs];
  const [tab, setTab] = useState<TabName>("Informações");

  return (
    <AppShell>
      <section className="sand-grain border-b border-border bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link to="/eventos" className="eyebrow hover:text-foreground">
            ← Campeonatos
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
            <div>
              <EventStatusPill status={event.status} />
              <h1 className="mt-3 text-4xl md:text-5xl">{event.name}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {event.dateLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.venue} · {event.city}/{event.state}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {event.maxTeams === null
                    ? `${event.teamsRegistered} duplas · sem limite`
                    : `${event.teamsRegistered}/${event.maxTeams} duplas`}
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4" />
                  {event.prize}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Tag>{event.format}</Tag>
                <Tag>{event.modality}</Tag>
                <Tag>{event.category}</Tag>
                <Tag>{event.level}</Tag>
                <Tag>{event.eventType}</Tag>
              </div>
            </div>
            <div className="w-full max-w-xs border border-graphite bg-card p-4">
              <p className="eyebrow">Inscrição</p>
              <p className="score-num mt-1 text-2xl">{event.fee}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Encerra em {event.registrationClose}
              </p>
              <Link
                to="/inscricao/$slug"
                params={{ slug: event.slug }}
                className="mt-4 flex h-12 w-full items-center justify-center bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground"
              >
                Inscrever dupla
              </Link>
              <button className="mt-2 flex h-11 w-full items-center justify-center gap-2 border border-border font-display text-xs font-bold uppercase tracking-widest">
                <Share2 className="h-4 w-4" /> Compartilhar link
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Página pública — não é necessário ter conta para visualizar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-14 z-30 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-3 font-display text-xs font-bold uppercase tracking-widest",
                tab === t
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {tab === "Juízes" ? <RefereesPanel slug={event.slug} /> : null}
        {tab === "Informações" ? (
          <InfoTab rules={event.rules} organizer={event.organizer} courts={event.courts} />
        ) : null}
        {tab === "Duplas" ? <TeamsTab slug={event.slug} canEdit={isOrganizer} /> : null}
        {tab === "Chaveamento" ? <BracketTab slug={event.slug} /> : null}
        {tab === "Agenda" ? <ScheduleTab slug={event.slug} /> : null}
        {tab === "Tabela" ? <StandingsTab slug={event.slug} /> : null}
        {tab === "Resultados" ? <ResultsTab slug={event.slug} /> : null}
        <SponsorBanner label="Patrocinador do evento" />
      </div>
    </AppShell>
  );
}

function InfoTab({
  rules,
  organizer,
  courts,
}: {
  rules: string[];
  organizer: string;
  courts: number;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="border border-border bg-card p-6">
        <h2 className="text-xl">Regulamento</h2>
        <ul className="mt-4 space-y-3">
          {rules.map((r) => (
            <li key={r} className="flex gap-3 text-sm">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
          Regulamento versionado (v1.0). Alterações após a publicação da chave ficam registradas no
          log de auditoria e não afetam eventos já finalizados.
        </p>
      </div>
      <div className="space-y-4">
        <div className="border border-border bg-card p-5">
          <p className="eyebrow">Organizador</p>
          <p className="mt-1 font-display text-lg font-bold">{organizer}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contato disponível após a inscrição confirmada.
          </p>
        </div>
        <div className="border border-border bg-card p-5">
          <p className="eyebrow">Estrutura</p>
          <p className="mt-1 font-display text-lg font-bold">{courts} quadras</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Iluminação, vestiário e hidratação inclusos.
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamsTab({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const { guests, addGuest } = useOperations();
  const [names, setNames] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">Duplas inscritas</h2>
        {canEdit ? <p className="eyebrow">Evento {slug}</p> : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {teams.map((t) => {
          const label = names[t.id] ?? t.name;
          return (
            <div key={t.id} className="flex items-center gap-4 border border-border bg-card p-4">
              <span className="score-num w-8 text-lg text-muted-foreground">{t.seed}</span>
              <div className="min-w-0 flex-1">
                {editing === t.id ? (
                  <input
                    autoFocus
                    value={label}
                    onChange={(e) => setNames((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    onBlur={() => {
                      if (!(names[t.id] ?? "").trim())
                        setNames((prev) => ({ ...prev, [t.id]: t.name }));
                      setEditing(null);
                      toast.success("Representação da dupla atualizada");
                    }}
                    className="w-full border border-border bg-background px-2 py-1 font-display text-base font-bold outline-none"
                  />
                ) : (
                  <p className="truncate font-display text-base font-bold">{label}</p>
                )}
                <p className="truncate text-sm text-muted-foreground">
                  {t.a} · {t.b}
                </p>
              </div>
              {canEdit ? (
                <button
                  onClick={() => setEditing(t.id)}
                  aria-label={`Editar representação de ${label}`}
                  className="flex h-9 w-9 items-center justify-center border border-border"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
        {guests.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-4 border border-dashed border-border bg-card p-4"
          >
            <span className="score-num w-8 text-lg text-muted-foreground">–</span>
            <div>
              <p className="font-display text-base font-bold">{g.name}</p>
              <p className="text-sm text-warning">Jogador convidado — sem cadastro na plataforma</p>
            </div>
          </div>
        ))}
      </div>

      {canEdit ? (
        <div className="mt-6 border border-border bg-card p-5">
          <p className="eyebrow">Adicionar jogador convidado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use quando o capitão chegar com outro parceiro no dia. O nome aparece na dupla, na
            tabela, no placar e no chaveamento — nenhum perfil completo é criado.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Nome do jogador"
              className="h-11 flex-1 border border-border bg-background px-3 outline-none"
            />
            <button
              onClick={() => {
                if (!guestName.trim()) {
                  toast.error("Informe o nome do jogador convidado.");
                  return;
                }
                addGuest(guestName.trim());
                setGuestName("");
                toast.success("Jogador convidado autorizado");
              }}
              className="inline-flex h-11 items-center gap-2 bg-graphite px-5 font-display text-xs font-bold uppercase tracking-widest text-background"
            >
              <UserPlus className="h-4 w-4" /> Adicionar convidado
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Chaveamento público (ADR 0017, Q15). Substitui, de propósito, a fase de
 * grupos + chave Gold/Silver do baseline: aquela marcação ilustrava um motor
 * de pools e avanço de chave que nunca existiu no backend (é Fase 2,
 * `docs/PHASE-2.md`) — mostrar dado fabricado ao lado da chave real seria
 * pior do que não mostrar. `BracketTree` é o mesmo componente já aprovado
 * para a tela de sorteio do organizador: 1ª rodada real, demais "a definir",
 * sem placar (o placar mora na aba "Resultados"). Divergência registrada em
 * `docs/DIVERGENCES.md` §32.
 */
function BracketTab({ slug }: { slug: string }) {
  const bracket = useQuery(publicBracketQuery(slug));
  const rounds = useMemo(
    () =>
      bracket.data ? publishedBracketRounds(bracket.data.slots, bracket.data.bracket_size) : [],
    [bracket.data],
  );

  if (bracket.isPending) {
    return <div className="h-40 animate-pulse border border-border bg-card" aria-busy="true" />;
  }

  if (bracket.isError) {
    const notPublished = bracket.error instanceof ApiError && bracket.error.status === 404;
    return (
      <EmptyState
        title={notPublished ? "Chave ainda não publicada" : "Não foi possível carregar a chave"}
        description={
          notPublished
            ? "O organizador ainda não sorteou ou publicou a chave deste evento."
            : bracket.error.message
        }
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl">Chave eliminatória</h2>
        <span className="eyebrow">{bracket.data.bracket_size} posições · eliminação simples</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Avanço de rodada e placar ainda não estão disponíveis nesta fase — acompanhe os resultados
        na aba "Resultados".
      </p>
      <div className="mt-5">
        <BracketTree rounds={rounds} />
      </div>
    </div>
  );
}

function ScheduleTab({ slug }: { slug: string }) {
  const matchesQuery = useQuery(publicMatchesQuery(slug));

  if (matchesQuery.isPending) {
    return (
      <div className="mt-4 h-40 animate-pulse border border-border bg-card" aria-busy="true" />
    );
  }

  if (matchesQuery.isError) {
    const notPublished =
      matchesQuery.error instanceof ApiError && matchesQuery.error.status === 404;
    return (
      <EmptyState
        title={notPublished ? "Agenda ainda não disponível" : "Não foi possível carregar a agenda"}
        description={
          notPublished
            ? "A agenda aparece assim que o organizador publicar a chave."
            : matchesQuery.error.message
        }
      />
    );
  }

  const items = matchesQuery.data;
  const courts = [...new Set(items.map((m) => m.court))];

  return (
    <div>
      <h2 className="text-xl">Agenda</h2>
      {courts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma partida agendada ainda.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {courts.map((court) => (
            <div key={court} className="border border-border bg-card">
              <p className="border-b border-border bg-sand px-3 py-2 font-display text-xs font-bold uppercase tracking-widest">
                {court}
              </p>
              <div className="divide-y divide-border">
                {items
                  .filter((m) => m.court === court)
                  .map((m) => (
                    <div key={m.id} className="px-3 py-3">
                      <p className="score-num text-sm">{m.time}</p>
                      <p className="text-sm font-semibold">{m.teamA}</p>
                      <p className="text-sm text-muted-foreground">vs {m.teamB}</p>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StandingsTab({ slug }: { slug: string }) {
  const { config, matchesFor } = useOperations();
  const live = buildStandings(matchesFor(slug), config.scoring);

  return (
    <div className="space-y-6">
      <div className="border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-sand px-4 py-2">
          <p className="font-display text-xs font-bold uppercase tracking-widest">
            Tabela geral do evento
          </p>
          <p className="text-[11px] text-muted-foreground">
            Vitória {config.scoring.win} · derrota {config.scoring.loss} pts
          </p>
        </div>
        {live.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["#", "Dupla", "J", "V", "D", "Sets", "Pts"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {live.map((s, i) => (
                <tr
                  key={s.team}
                  className={cn("border-b border-border last:border-0", i < 2 && "bg-sand/60")}
                >
                  <td className="score-num px-3 py-2.5">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold">{s.team}</td>
                  <td className="score-num px-3 py-2.5">{s.games}</td>
                  <td className="score-num px-3 py-2.5">{s.wins}</td>
                  <td className="score-num px-3 py-2.5">{s.losses}</td>
                  <td className="score-num px-3 py-2.5">
                    {s.setsWon}/{s.setsLost}
                  </td>
                  <td className="score-num px-3 py-2.5">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            A tabela é preenchida conforme os resultados forem registrados no operacional.
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {pools.map((pool) => (
          <div key={pool.name} className="border border-border bg-card">
            <p className="border-b border-border bg-sand px-4 py-2 font-display text-xs font-bold uppercase tracking-widest">
              {pool.name}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Dupla", "J", "V", "D", "Sets", "Pts"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pool.standings.map((s, i) => (
                  <tr
                    key={s.team}
                    className={cn("border-b border-border last:border-0", i < 2 && "bg-sand/60")}
                  >
                    <td className="px-3 py-2.5 font-semibold">{s.team}</td>
                    <td className="score-num px-3 py-2.5">{s.j}</td>
                    <td className="score-num px-3 py-2.5">{s.v}</td>
                    <td className="score-num px-3 py-2.5">{s.d}</td>
                    <td className="score-num px-3 py-2.5">
                      {s.setsWon}/{s.setsLost}
                    </td>
                    <td className="score-num px-3 py-2.5">{s.classificationPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Top 2 avançam para a Gold · critérios: vitórias, pontos, saldo de sets, saldo de
              pontos, confronto direto.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsTab({ slug }: { slug: string }) {
  const matchesQuery = useQuery(publicMatchesQuery(slug));

  if (matchesQuery.isPending) {
    return (
      <div className="mt-4 h-40 animate-pulse border border-border bg-card" aria-busy="true" />
    );
  }

  if (matchesQuery.isError) {
    const notPublished =
      matchesQuery.error instanceof ApiError && matchesQuery.error.status === 404;
    return (
      <EmptyState
        title={
          notPublished
            ? "Resultados ainda não disponíveis"
            : "Não foi possível carregar os resultados"
        }
        description={
          notPublished
            ? "Os resultados aparecem assim que o organizador publicar a chave e iniciar as partidas."
            : matchesQuery.error.message
        }
      />
    );
  }

  const items = matchesQuery.data;

  return (
    <div>
      <h2 className="text-xl">Resultados</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma partida iniciada ainda.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((m) => (
            <MatchCard key={m.id} match={m} highlight={m.status === "IN_PROGRESS"} />
          ))}
        </div>
      )}
    </div>
  );
}
