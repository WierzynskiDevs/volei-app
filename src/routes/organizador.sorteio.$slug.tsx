import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import { BracketTree } from "@/components/site/bracket-tree";
import { EmptyState } from "@/components/site/cards";
import { AppShell, PageHeader } from "@/components/site/shell";
import { ApiError } from "@/lib/api/client";
import {
  bracketQuery,
  placeGroupInSlot,
  publishBracket,
  randomizeDraw,
  startDraw,
} from "@/lib/api/draws";
import { organizerEventBySlugQuery } from "@/lib/api/events";
import { queryKeys } from "@/lib/api/query-keys";
import { publishedBracketRounds } from "@/lib/bracket";

/**
 * Sorteio/chaveamento inicial (ADR 0011) — não existe no baseline
 * (docs/DIVERGENCES.md §24): "eu tenho uma tela e um botão para sortear as
 * duplas ou eu posso selecionar a dupla e encaixar ela".
 *
 * Escopo desta tela, de propósito: só a posição inicial de cada dupla numa
 * chave eliminatória simples. Avanço de rodada, partida e placar são S9,
 * ainda Fase 2 — por isso a chave publicada mostra a 1ª rodada de verdade e
 * "a definir" nas demais.
 */
export const Route = createFileRoute("/organizador/sorteio/$slug")({
  head: () => ({
    meta: [
      { title: "Sorteio da chave · Organizador BeacHub" },
      {
        name: "description",
        content: "Sorteie as duplas confirmadas na chave ou encaixe manualmente cada uma.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DrawPage,
});

function DrawPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();

  const eventQuery = useQuery(organizerEventBySlugQuery(slug));
  const bracket = useQuery(bracketQuery(slug));
  const data = bracket.data;

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.draws.detail(slug) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizerEvents.all });
  }

  function reportError(e: unknown) {
    if (e instanceof ApiError) toast.error(e.message);
    else toast.error("Não foi possível concluir a operação. Tente novamente.");
  }

  const start = useMutation({
    mutationFn: () => startDraw(slug),
    onSuccess: invalidate,
    onError: reportError,
  });
  const randomize = useMutation({
    mutationFn: () => randomizeDraw(slug),
    onSuccess: () => {
      invalidate();
      toast.success("Duplas sorteadas");
    },
    onError: reportError,
  });
  const publish = useMutation({
    mutationFn: () => publishBracket(slug),
    onSuccess: () => {
      invalidate();
      toast.success("Chave publicada");
    },
    onError: reportError,
  });
  const place = useMutation({
    mutationFn: (args: { position: number; groupId: string | null }) =>
      placeGroupInSlot(slug, args.position, args.groupId),
    onSuccess: invalidate,
    onError: reportError,
  });

  const publishedRounds = useMemo(
    () => (data ? publishedBracketRounds(data.slots, data.bracket_size) : []),
    [data],
  );

  const ev = eventQuery.data;
  const status = data?.event_status;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/organizador/eventos" className="eyebrow hover:text-foreground">
          ← Meus eventos
        </Link>
        <PageHeader
          eyebrow="Sorteio"
          title={ev?.name ?? "Sorteio da chave"}
          description="Sorteie as duplas confirmadas nas posições da chave, ou encaixe manualmente cada uma."
        />

        {bracket.isPending ? (
          <div className="mt-6 h-40 animate-pulse border border-border bg-card" aria-busy="true" />
        ) : bracket.isError ? (
          <div className="mt-6">
            <EmptyState
              title="Não foi possível carregar o sorteio"
              description={bracket.error.message}
            />
          </div>
        ) : !data ? null : status === "BRACKET_PUBLISHED" ? (
          <div className="mt-6">
            <div className="border border-success/40 bg-success/10 p-4">
              <p className="font-display text-sm font-bold">Chave publicada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Avanço de rodada e placar ainda não estão disponíveis nesta fase — as demais rodadas
                aparecem como "a definir".
              </p>
            </div>
            <div className="mt-5">
              <BracketTree rounds={publishedRounds} />
            </div>
          </div>
        ) : status === "AWAITING_DRAW" ? (
          <div className="mt-6">
            {data.eligible_groups.length > 0 ? (
              <div className="border border-dashed border-border bg-card p-4">
                <p className="eyebrow">Duplas confirmadas sem posição</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {data.eligible_groups.map((g) => (
                    <li key={g.id} className="border border-border px-2 py-1 text-xs">
                      {g.display_name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => randomize.mutate()}
                disabled={randomize.isPending}
                className="inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
              >
                {randomize.isPending ? "Sorteando…" : "Sortear duplas"}
              </button>
              <button
                onClick={() => publish.mutate()}
                disabled={publish.isPending}
                className="inline-flex h-11 items-center border border-graphite px-5 font-display text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              >
                {publish.isPending ? "Publicando…" : "Publicar chave"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.slots.map((slot) => (
                <div
                  key={slot.position}
                  className="flex items-center gap-4 border border-border bg-card p-4"
                >
                  <span className="score-num w-8 text-lg text-muted-foreground">
                    {slot.position + 1}
                  </span>
                  <select
                    value={slot.registration_group?.id ?? ""}
                    onChange={(e) =>
                      place.mutate({ position: slot.position, groupId: e.target.value || null })
                    }
                    className="flex-1 bg-transparent font-display text-base font-bold outline-none"
                  >
                    <option value="">— vazia —</option>
                    {slot.registration_group ? (
                      <option value={slot.registration_group.id}>
                        {slot.registration_group.display_name}
                      </option>
                    ) : null}
                    {data.eligible_groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : status === "REGISTRATION_CLOSED" ? (
          <div className="mt-6">
            <EmptyState
              title="Pronto para sortear"
              description={`${data.eligible_groups.length} dupla(s) confirmada(s). É preciso de pelo menos 2 para iniciar o sorteio.`}
              action={
                <button
                  onClick={() => start.mutate()}
                  disabled={start.isPending || data.eligible_groups.length < 2}
                  className="inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:bg-muted disabled:text-muted-foreground"
                >
                  {start.isPending ? "Iniciando…" : "Iniciar sorteio"}
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Sorteio disponível depois de encerrar as inscrições"
              description="Encerre as inscrições do evento para liberar o sorteio da chave."
              action={
                <Link
                  to="/organizador/alterar-evento/$slug"
                  params={{ slug }}
                  className="inline-flex h-11 items-center border border-graphite px-5 font-display text-xs font-bold uppercase tracking-widest"
                >
                  Ver evento
                </Link>
              }
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
