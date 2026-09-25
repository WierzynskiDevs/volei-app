/**
 * Área do juiz, ligada à API real (ADR 0013 §5/§7/§8 — lacuna fechada em
 * 25/09/2026, ver docs/DIVERGENCES.md).
 *
 * Diferença deliberada em relação ao mock que esta tela usava
 * (`useOperations()`): não existe mais seletor "você está operando como" —
 * aquilo era um artefato de demonstração (trocar de identidade à vontade).
 * Com sessão real por token, só existe UM juiz por sessão, o dono do link de
 * convite. A tela também ganha ações de verdade (iniciar, registrar set,
 * finalizar) que o mock nunca teve — eram só cartões de leitura.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell, PageHeader } from "@/components/site/shell";
import { RatingCard } from "@/components/site/ratings";
import { ApiError } from "@/lib/api/client";
import {
  acceptRefereeInvitation,
  finishRefereeMatch,
  recordRefereeMatchSet,
  refereeMatchesQuery,
  startRefereeMatch,
  type ApiOrganizerMatch,
} from "@/lib/api/referee";
import { queryKeys } from "@/lib/api/query-keys";
import {
  clearRefereeSession,
  loadRefereeSession,
  saveRefereeSession,
  type StoredRefereeSession,
} from "@/lib/referee-session";

const searchSchema = z.object({
  convite: z.string().optional(),
});

export const Route = createFileRoute("/juiz")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Área do juiz · BeacHub" },
      {
        name: "description",
        content:
          "Visão simplificada da arbitragem: apenas as partidas autorizadas, com início, placar e resultado.",
      },
      { property: "og:title", content: "Área do juiz · BeacHub" },
      {
        property: "og:description",
        content: "Meus jogos, placar por set e finalização direto da quadra.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RefereePage,
});

function reportError(error: unknown) {
  toast.error(error instanceof ApiError ? error.message : "Não foi possível concluir a ação.");
}

function RefereePage() {
  const { convite } = Route.useSearch();
  const navigate = useNavigate({ from: "/juiz" });
  const [session, setSession] = useState<StoredRefereeSession | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "no-session">("loading");

  const accept = useMutation({
    mutationFn: (token: string) => acceptRefereeInvitation(token),
    onSuccess: (result) => {
      const next: StoredRefereeSession = {
        token: result.session_token,
        refereeName: result.referee_name,
      };
      saveRefereeSession(next);
      setSession(next);
      setPhase("ready");
      void navigate({ search: {}, replace: true });
    },
    onError: (error) => {
      reportError(error);
      setPhase("no-session");
    },
  });

  useEffect(() => {
    if (convite) {
      accept.mutate(convite);
      return;
    }

    const stored = loadRefereeSession();
    if (stored) {
      setSession(stored);
      setPhase("ready");
    } else {
      setPhase("no-session");
    }
    // Só na primeira leitura do link/armazenamento — `accept` muda de
    // identidade a cada render e não deve re-disparar o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convite]);

  function signOutReferee() {
    clearRefereeSession();
    setSession(null);
    setPhase("no-session");
  }

  if (phase === "loading" || accept.isPending) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center text-sm text-muted-foreground">
          Abrindo sua sessão de arbitragem…
        </div>
      </AppShell>
    );
  }

  if (phase === "no-session" || session === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl">Sem sessão de arbitragem</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Abra o link de convite enviado pelo organizador para acessar suas partidas.
          </p>
        </div>
      </AppShell>
    );
  }

  return <RefereeMatches session={session} onSignOut={signOutReferee} />;
}

function RefereeMatches({
  session,
  onSignOut,
}: {
  session: StoredRefereeSession;
  onSignOut: () => void;
}) {
  const query = useQuery(refereeMatchesQuery(session.token));

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      toast.error("Sua sessão de arbitragem expirou. Abra o link de convite novamente.");
      onSignOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.error]);

  const matches = query.data ?? [];
  const open = matches.filter((m) => m.status !== "FINALIZADA" && m.status !== "CANCELADA");
  const done = matches.filter((m) => m.status === "FINALIZADA");

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader
          eyebrow="Arbitragem"
          title="Meus jogos"
          description="Você vê somente as partidas autorizadas para você. Financeiro e configurações do evento não ficam disponíveis nesta visão."
        />

        <div className="mt-4 flex items-center justify-between border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Operando como <strong className="text-foreground">{session.refereeName}</strong>
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline"
          >
            Sair
          </button>
        </div>

        <h2 className="mt-8 text-xl">Partidas autorizadas</h2>
        <div className="mt-3 space-y-3">
          {query.isLoading ? (
            <p className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Carregando…
            </p>
          ) : null}
          {!query.isLoading && open.length === 0 ? (
            <p className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma partida aberta para você agora.
            </p>
          ) : null}
          {open.map((m) => (
            <RefereeMatchCard key={m.id} sessionToken={session.token} match={m} />
          ))}
        </div>

        {done.length ? (
          <>
            <h2 className="mt-8 text-xl">Encerradas</h2>
            <div className="mt-3 space-y-3">
              {done.map((m) => (
                <RefereeMatchCard key={m.id} sessionToken={session.token} match={m} />
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-8">
          <RatingCard
            eyebrow="Após a partida"
            title="Avaliação da arbitragem"
            description="As duplas avaliam a arbitragem assim que a partida é finalizada. Esta é a prévia do que elas veem."
          />
        </div>
      </div>
    </AppShell>
  );
}

const STATUS_LABEL: Record<ApiOrganizerMatch["status"], string> = {
  PENDENTE: "Pendente",
  ATRIBUIDA: "Atribuída",
  PRONTA: "Pronta",
  EM_ANDAMENTO: "Em andamento",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  ADIADA: "Adiada",
};

function RefereeMatchCard({
  sessionToken,
  match,
}: {
  sessionToken: string;
  match: ApiOrganizerMatch;
}) {
  const queryClient = useQueryClient();
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.refereeMatches.mine(sessionToken) });
  }

  const start = useMutation({
    mutationFn: () => startRefereeMatch(sessionToken, match.id, crypto.randomUUID()),
    onSuccess: () => {
      invalidate();
      toast.success("Partida iniciada");
    },
    onError: reportError,
  });

  const recordSet = useMutation({
    mutationFn: () =>
      recordRefereeMatchSet(sessionToken, match.id, match.sets.length + 1, scoreA, scoreB),
    onSuccess: () => {
      invalidate();
      setScoreA(0);
      setScoreB(0);
      toast.success("Set registrado");
    },
    onError: reportError,
  });

  const finish = useMutation({
    mutationFn: () => finishRefereeMatch(sessionToken, match.id, crypto.randomUUID()),
    onSuccess: () => {
      invalidate();
      toast.success("Partida finalizada");
    },
    onError: reportError,
  });

  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{STATUS_LABEL[match.status]}</span>
        <span className="text-xs text-muted-foreground">{match.court_label ?? "sem quadra"}</span>
      </div>

      <p className="mt-2 font-display text-sm font-bold">
        {match.team_a_name ?? "Dupla A"} × {match.team_b_name ?? "Dupla B"}
      </p>
      {match.phase ? <p className="text-xs text-muted-foreground">{match.phase}</p> : null}

      {match.sets.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {[...match.sets]
            .sort((a, b) => a.set_number - b.set_number)
            .map((set) => (
              <span
                key={set.id}
                className="score-num border border-border px-2 py-1 text-sm tabular-nums"
              >
                {set.score_a}-{set.score_b}
              </span>
            ))}
        </div>
      ) : null}

      {match.status === "PRONTA" ? (
        <button
          type="button"
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className="mt-3 h-10 w-full bg-accent font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
        >
          {start.isPending ? "Iniciando…" : "Iniciar partida"}
        </button>
      ) : null}

      {match.status === "EM_ANDAMENTO" ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="eyebrow w-16">Set {match.sets.length + 1}</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={scoreA}
              onChange={(e) => setScoreA(Math.max(0, Number(e.target.value)))}
              aria-label={`${match.team_a_name ?? "Dupla A"} — set ${match.sets.length + 1}`}
              className="score-num h-10 w-full border border-border bg-background text-center text-lg outline-none"
            />
            <span className="text-muted-foreground">×</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={scoreB}
              onChange={(e) => setScoreB(Math.max(0, Number(e.target.value)))}
              aria-label={`${match.team_b_name ?? "Dupla B"} — set ${match.sets.length + 1}`}
              className="score-num h-10 w-full border border-border bg-background text-center text-lg outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => recordSet.mutate()}
              disabled={recordSet.isPending}
              className="h-10 flex-1 border border-border font-display text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {recordSet.isPending ? "Registrando…" : "Registrar set"}
            </button>
            <button
              type="button"
              onClick={() => finish.mutate()}
              disabled={finish.isPending || match.sets.length === 0}
              className="h-10 flex-1 bg-accent font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
            >
              {finish.isPending ? "Finalizando…" : "Finalizar partida"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
