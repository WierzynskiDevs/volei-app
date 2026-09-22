import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, PageHeader } from "@/components/site/shell";
import { EventStatusPill, EmptyState } from "@/components/site/cards";
import { OrganizerNav } from "@/components/site/organizer-nav";
import { organizerEventsQuery } from "@/lib/api/events";
import { financeByEventId, organizerFinanceQuery } from "@/lib/api/finance";
import { brl } from "@/lib/finance-data";
import type { EventStatus } from "@/lib/mock-data";
import { useSession } from "@/lib/session";

/** ADR 0011: o sorteio só faz sentido a partir de inscrições encerradas. */
const DRAW_ENABLED_STATUSES: readonly EventStatus[] = [
  "INSCRICOES_ENCERRADAS",
  "AGUARDANDO_SORTEIO",
  "CHAVE_PUBLICADA",
];

export const Route = createFileRoute("/organizador/eventos")({
  head: () => ({
    meta: [
      { title: "Meus eventos · Organizador BeacHub" },
      { name: "description", content: "Todos os seus campeonatos com status de inscrições, arrecadação e alterações comunicadas." },
      { property: "og:title", content: "Meus eventos · Organizador BeacHub" },
      { property: "og:description", content: "Operação e arrecadação de cada campeonato em um só lugar." },
    ],
  }),
  component: OrganizerEvents,
});

function OrganizerEvents() {
  const { account } = useSession();

  /*
   * A lista vem do backend já restrita ao organizador logado — a tela não
   * envia `organizer_id` e não teria como pedir os eventos de outra pessoa
   * (a Policy compara a FK da sessão, CLAUDE.md §10).
   *
   * O financeiro de cada linha vem do mesmo endpoint que alimenta
   * /organizador/financeiro — uma chamada para a lista inteira, nunca uma por
   * evento.
   */
  const { data, isPending, isError, error } = useQuery(organizerEventsQuery());
  const finance = useQuery(organizerFinanceQuery());

  const events = data?.items ?? [];
  const financeByEvent = financeByEventId(finance.data);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <OrganizerNav />
        <PageHeader
          eyebrow={account?.organizerName ?? "Organizador"}
          title="Meus eventos"
          action={
            <Link
              to="/organizador/novo-evento"
              className="inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
            >
              Criar evento
            </Link>
          }
        />

        {isPending ? (
          <div className="mt-6 divide-y divide-border border border-border bg-card" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse px-4 py-4" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-6">
            <EmptyState title="Não foi possível carregar seus eventos" description={error.message} />
          </div>
        ) : events.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Você ainda não criou nenhum campeonato"
              description="Crie o primeiro evento, publique e o link de inscrição fica pronto para compartilhar."
              action={
                <Link
                  to="/organizador/novo-evento"
                  className="inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
                >
                  Criar evento
                </Link>
              }
            />
          </div>
        ) : (
        <div className="mt-6 divide-y divide-border border border-border bg-card">
          {events.map((e) => {
            const money = financeByEvent[e.id];
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <div className="min-w-[220px] flex-1">
                  <Link to="/eventos/$slug" params={{ slug: e.slug }} className="font-display text-base font-bold hover:text-accent">
                    {e.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {e.dateLabel} · {e.venue}
                  </p>

                </div>
                <div className="text-right">
                  <p className="score-num text-sm tabular-nums">{brl(money?.gross_cents ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {money?.paid_count ?? 0} pagas · {money?.pending_count ?? 0} pendentes
                  </p>
                </div>
                <EventStatusPill status={e.status} />
                <div className="flex gap-1.5">
                  <Link
                    to="/eventos/$slug"
                    params={{ slug: e.slug }}
                    className="bg-accent px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-accent-foreground"
                  >
                    Operacional
                  </Link>
                  <Link
                    to="/organizador/alterar-evento/$slug"
                    params={{ slug: e.slug }}
                    className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
                  >
                    Alterar
                  </Link>
                  {DRAW_ENABLED_STATUSES.includes(e.status) ? (
                    <Link
                      to="/organizador/sorteio/$slug"
                      params={{ slug: e.slug }}
                      className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
                    >
                      Sorteio
                    </Link>
                  ) : null}
                  <Link
                    to="/organizador/financeiro"
                    className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
                  >
                    Financeiro
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Alterações de data, horário ou local exigem justificativa e podem gerar obrigação de reembolso aos inscritos.
        </p>

        {/*
          * Histórico de alterações: toda edição de evento publicado é gravada
          * na trilha de auditoria com a justificativa (`EVENT_UPDATED`), mas
          * ainda não existe endpoint que devolva essa trilha para o
          * organizador — só o super admin a lê hoje. Enquanto não existir, a
          * seção diz isso, em vez de listar alterações inventadas.
          */}
        <div className="mt-8">
          <h2 className="text-xl">Alterações recentes</h2>
          <div className="mt-3 border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Cada alteração de evento publicado é registrada com a sua justificativa. A consulta desse
            histórico pelo organizador ainda não está disponível.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
