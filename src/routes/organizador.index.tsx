import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { EventStatusPill, Stat } from "@/components/site/cards";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import {
  approveRegistration,
  levelReviewQueueQuery,
  partnerName,
  rejectRegistration,
  type ApiRegistration,
} from "@/lib/api/registrations";
import { events, matches } from "@/lib/mock-data";
import { toast } from "sonner";


export const Route = createFileRoute("/organizador/")({
  head: () => ({
    meta: [
      { title: "Painel do organizador · BeacHub" },
      {
        name: "description",
        content: "Crie campeonatos, receba inscrições, gere chaves e agenda, lance resultados e feche o ranking.",
      },
      { property: "og:title", content: "Painel do organizador · BeacHub" },
      { property: "og:description", content: "Tudo para operar um campeonato de vôlei de areia do início ao fim." },
    ],
  }),
  component: OrganizerDashboard,
});

function OrganizerDashboard() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader
          eyebrow="Arena Norte Beach"
          title="Painel do organizador"
          action={
            <div className="flex gap-2">
              <Link
                to="/organizador/controle"
                className="inline-flex h-11 items-center border border-graphite px-5 font-display text-xs font-bold uppercase tracking-widest"
              >
                Controle do evento
              </Link>
              <Link
                to="/organizador/novo-evento"
                className="inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
              >
                Criar evento
              </Link>
            </div>
          }
        />

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Eventos ativos" value="3" hint="1 em andamento" />
          <Stat label="Inscrições" value="47" hint="6 aguardando aprovação" />
          <Stat label="Partidas hoje" value={matches.length} hint="1 ao vivo" />
          <Stat label="Quadras" value="4" hint="ocupação 82%" />
        </div>

        <div className="mt-6 border border-warning/40 bg-warning/10 p-4">
          <p className="font-display text-sm font-bold">2 alertas</p>
          <p className="text-sm text-muted-foreground">
            Quadra 3 com 18 min de atraso · 1 resultado pendente na Pool B.
          </p>
        </div>

        <PendingRegistrations />


        <h2 className="mt-10 text-xl">Meus eventos</h2>
        <div className="mt-3 divide-y divide-border border border-border bg-card">
          {events.slice(0, 4).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
              <div className="min-w-[200px] flex-1">
                <Link to="/eventos/$slug" params={{ slug: e.slug }} className="font-display text-base font-bold hover:text-accent">
                  {e.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {e.dateLabel} · {e.format}
                </p>
              </div>
              <span className="score-num text-sm text-muted-foreground">
                {e.teamsRegistered}/{e.maxTeams}
              </span>
              <EventStatusPill status={e.status} />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

/** Rótulos de nível: o backend manda o valor do enum, a tela mostra o texto. */
const LEVEL_TEXT: Record<string, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
  OPEN: "Open",
  A_PLUS_B: "A+B",
  FREE: "Livre",
};

const levelText = (value: string | null) => (value === null ? "não informado" : LEVEL_TEXT[value] ?? value);

function PendingRegistrations() {
  const queryClient = useQueryClient();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  /*
   * A fila vem do backend já restrita aos eventos do organizador logado — a
   * tela não envia e não teria como pedir a fila de outra pessoa (aditivo §26).
   */
  const pendingQuery = useQuery(levelReviewQueueQuery("REQUIRED"));
  const decidedQuery = useQuery(levelReviewQueueQuery("REJECTED"));

  const waiting = pendingQuery.data?.items ?? [];
  const reviewed = decidedQuery.data?.items ?? [];

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      approve ? approveRegistration(id) : rejectRegistration(id),
    onMutate: ({ id }) => setDecidingId(id),
    onSettled: () => setDecidingId(null),
    onSuccess: (_data, { approve }) => {
      // A decisão muda a fila do organizador E a lista do atleta.
      void queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });

      if (approve) toast.success("Inscrição aprovada");
      else toast("Inscrição reprovada — capitão notificado");
    },
    onError: (error) => {
      // A mensagem é a do backend: é ele quem sabe se a análise já foi
      // decidida ou se a permissão caiu (CLAUDE.md §15).
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível registrar a decisão.",
      );
    },
  });

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <h2 className="text-xl">Inscrição aguardando análise</h2>
        <span className="eyebrow">
          {pendingQuery.isPending ? "carregando" : `${waiting.length} pendente(s)`}
        </span>
      </div>
      <div className="mt-3 divide-y divide-border border border-border bg-card">
        {pendingQuery.isPending ? (
          /* Esqueleto na mesma caixa da linha — nada de layout novo. */
          <div className="h-20 animate-pulse px-4 py-4" aria-busy="true" />
        ) : pendingQuery.isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            {pendingQuery.error instanceof ApiError
              ? pendingQuery.error.message
              : "Não foi possível carregar a fila de análise."}
          </p>
        ) : null}

        {waiting.map((p: ApiRegistration) => {
          const partner = partnerName(p);
          const busy = decidingId === p.id;

          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
              <div className="min-w-[200px] flex-1">
                <p className="font-display text-base font-bold">{p.player?.name ?? "Atleta"}</p>
                <p className="text-sm text-muted-foreground">
                  Nível: {levelText(p.player_level)} · Evento: {levelText(p.event_level)}
                  {partner ? ` · dupla com ${partner}` : ""}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  disabled={busy}
                  onClick={() => decide.mutate({ id: p.id, approve: true })}
                  className="bg-accent px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
                >
                  {busy ? "Aprovando…" : "Aprovar"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => decide.mutate({ id: p.id, approve: false })}
                  className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted disabled:opacity-60"
                >
                  {busy ? "Reprovando…" : "Reprovar"}
                </button>
              </div>
            </div>
          );
        })}
        {!pendingQuery.isPending && !pendingQuery.isError && waiting.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma inscrição aguardando análise.</p>
        ) : null}
        {reviewed.map((p: ApiRegistration) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
            {p.player?.name ?? "Atleta"} — reprovada
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Reprovando, o capitão recebe a orientação para trocar de dupla ou solicitar cancelamento.
      </p>
    </div>
  );
}
