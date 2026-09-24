import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { EventCard, EmptyState } from "@/components/site/cards";
import { eventsQuery, GENDER_VALUE, LEVEL_VALUE } from "@/lib/api/events";
import type { Category, SkillLevel } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/eventos/")({
  head: () => ({
    meta: [
      { title: "Campeonatos de vôlei de areia · BeacHub" },
      {
        name: "description",
        content:
          "Busque campeonatos de vôlei de areia por cidade, categoria, nível e formato. Inscrições abertas em todo o Brasil.",
      },
      { property: "og:title", content: "Campeonatos de vôlei de areia · BeacHub" },
      {
        property: "og:description",
        content: "Encontre torneios 2x2, americanos, blind draw e ligas perto de você.",
      },
    ],
  }),
  component: EventsPage,
});

const categories = ["Todas", "Masculino", "Feminino", "Misto", "Open"] as const;
const levels = ["Todos", "Iniciante", "Intermediário", "Avançado", "Open", "Livre"] as const;

function EventsPage() {
  const [category, setCategory] = useState<(typeof categories)[number]>("Todas");
  const [level, setLevel] = useState<(typeof levels)[number]>("Todos");
  const [query, setQuery] = useState("");

  /*
   * Os filtros vão para o servidor, não são aplicados em memória: a lista é
   * paginada no backend (CLAUDE.md §6) e filtrar só a página carregada mentiria
   * na contagem "N eventos encontrados".
   */
  const { data, isPending, isError, error, refetch } = useQuery(
    eventsQuery({
      q: query.trim() || undefined,
      gender_category: category === "Todas" ? undefined : GENDER_VALUE[category as Category],
      level_category: level === "Todos" ? undefined : LEVEL_VALUE[level as SkillLevel],
    }),
  );

  const filtered = data?.items ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader
          eyebrow="Descobrir"
          title="Campeonatos"
          description="Torneios, americanos e ligas de vôlei de areia abertos para inscrição."
        />

        <div className="mt-6 space-y-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, cidade, arena ou formato"
            className="h-12 w-full border border-border bg-card px-4 text-base outline-none focus:border-graphite"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
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

        <p className="eyebrow mt-6">
          {isPending ? "Carregando eventos" : `${data?.total ?? 0} eventos encontrados`}
        </p>

        {isPending ? (
          /* Esqueleto com as mesmas caixas do grid — nada de layout novo. */
          <div className="mt-4 grid gap-4 md:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse border border-border bg-card" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-4">
            <EmptyState
              title="Não foi possível carregar os campeonatos"
              description={error.message}
              action={
                <button
                  onClick={() => void refetch()}
                  className="inline-flex h-11 items-center bg-graphite px-5 font-display text-xs font-bold uppercase tracking-widest text-background"
                >
                  Tentar de novo
                </button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Não existem eventos com esses filtros"
              description="Tente ampliar a categoria ou o nível, ou avise seu organizador local que existe demanda por aqui."
              action={
                <Link
                  to="/organizador/novo-evento"
                  className="inline-flex h-11 items-center bg-graphite px-5 font-display text-xs font-bold uppercase tracking-widest text-background"
                >
                  Criar um evento
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest transition-colors",
        active
          ? "border-graphite bg-graphite text-background"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
