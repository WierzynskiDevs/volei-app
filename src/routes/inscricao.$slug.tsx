import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Search, UserPlus } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/site/shell";
import { PlayerAvatar } from "@/components/site/cards";
import { ApiError } from "@/lib/api/client";
import { eventBySlugQuery } from "@/lib/api/events";
import {
  initialsOf,
  MIN_SEARCH_LENGTH,
  playerLevelLabel,
  playerSearchQuery,
} from "@/lib/api/players";
import { queryKeys } from "@/lib/api/query-keys";
import {
  createRegistration,
  type CreateRegistrationPayload,
  type PartnerMode,
} from "@/lib/api/registrations";
import { currentPlayer, players, type SkillLevel } from "@/lib/mock-data";
import { brl } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inscricao/$slug")({
  /*
   * Carregado no loader, como em `/eventos/{slug}`, porque `head()` depende do
   * dado para montar título e descrição. O valor da inscrição vem daqui em
   * centavos — a tela não recalcula nada (CLAUDE.md §7).
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
        meta: [
          { title: "Inscrição indisponível · BeacHub" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `Inscrição — ${loaderData.event.name} · BeacHub`;
    const description = `Inscreva sua dupla no ${loaderData.event.name}, ${loaderData.event.dateLabel}, em ${loaderData.event.city}/${loaderData.event.state}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: RegistrationPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl">A inscrição não pôde ser carregada</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl">Evento não encontrado</h1>
        <Link
          to="/eventos"
          className="mt-4 inline-flex font-display text-xs font-bold uppercase tracking-widest text-accent"
        >
          Ver campeonatos
        </Link>
      </div>
    </AppShell>
  ),
});

type Mode = "parceiro" | "buscar" | "individual";

const LEVEL_ORDER: SkillLevel[] = ["Iniciante", "Intermediário", "Avançado", "Open"];
function levelRank(level: SkillLevel) {
  const i = LEVEL_ORDER.indexOf(level);
  return i === -1 ? 0 : i;
}

/** Os três botões da tela → os modos que a API aceita (ADR 0001). */
const MODE_TO_API: Record<Mode, PartnerMode> = {
  parceiro: "PARTNER",
  buscar: "SEEKING",
  individual: "INDIVIDUAL",
};

function RegistrationPage() {
  const { event } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("parceiro");
  const [invited, setInvited] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerQuery, setPartnerQuery] = useState("");

  const partnerSearch = useQuery(playerSearchQuery(partnerQuery));

  /*
   * Aviso de nível: é feedback de UX, não decisão. Quem determina se a
   * inscrição vai para análise é o backend, comparando o nível do perfil com a
   * categoria do evento (aditivo §17). A tela só antecipa a informação.
   */
  const levelMismatch = levelRank(currentPlayer.level) > levelRank(event.level);

  const register = useMutation({
    mutationFn: () => {
      const payload: CreateRegistrationPayload = {
        partner_mode: MODE_TO_API[mode],
        accept_rules: true,
      };

      // O parceiro só vai no modo que forma dupla — a API recusa nos outros.
      if (mode === "parceiro" && invited !== null) payload.partner_user_id = invited;

      return createRegistration(event.slug, payload);
    },
    onMutate: () => setError(null),
    onSuccess: (registration) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      // O contador de vagas do evento muda junto (ADR 0003).
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });

      /*
       * Evento pago segue para o checkout; gratuito já nasce confirmado e a
       * tela mostra a confirmação. Quem decide isso é o status que o backend
       * devolveu — nunca o valor lido no cliente.
       */
      if (registration.status === "PENDING_PAYMENT") {
        void navigate({ to: "/checkout/$slug", params: { slug: event.slug } });
        return;
      }

      setSent(true);
    },
    onError: (e) => {
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível concluir a inscrição. Tente novamente em instantes.",
      );
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/eventos/$slug"
          params={{ slug: event.slug }}
          className="eyebrow hover:text-foreground"
        >
          ← {event.name}
        </Link>
        <h1 className="mt-3 text-3xl">Inscrição</h1>
        <p className="mt-1 text-muted-foreground">
          {event.dateLabel} · {event.venue} · {event.fee}
        </p>

        {levelMismatch ? (
          <div className="mt-6 border border-warning bg-warning/10 p-4">
            <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-warning">
              <AlertTriangle className="h-4 w-4" /> Atenção
            </p>
            <p className="mt-1 text-sm">
              Seu nível está acima da categoria selecionada. Sua inscrição poderá ser analisada pelo
              organizador.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Seu nível: {currentPlayer.level} · categoria do evento: {event.level}. A inscrição
              segue normalmente — nada é bloqueado automaticamente.
            </p>
          </div>
        ) : null}

        {sent ? (
          <div className="mt-8 border border-accent bg-card p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center bg-accent">
              <Check className="h-6 w-6 text-accent-foreground" />
            </span>
            <h2 className="mt-4 text-2xl">Inscrição enviada</h2>
            <p className="mt-2 text-muted-foreground">
              {mode === "parceiro"
                ? "Seu parceiro recebeu o convite. A dupla só entra na lista após o aceite e a aprovação do organizador."
                : mode === "buscar"
                  ? "Você entrou na lista de jogadores procurando parceiro para este evento."
                  : "Você entrou na lista individual. O organizador fará o sorteio das duplas."}
            </p>
            <p className="mt-3 eyebrow">Status: aguardando aprovação</p>
            <Link
              to="/meus-jogos"
              className="mt-6 inline-flex h-11 items-center bg-graphite px-5 font-display text-xs font-bold uppercase tracking-widest text-background"
            >
              Ver meus jogos
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-3">
              {(
                [
                  {
                    key: "parceiro",
                    title: "Já tenho parceiro",
                    desc: "Convide alguém que já está na plataforma.",
                  },
                  {
                    key: "buscar",
                    title: "Encontrar parceiro",
                    desc: "Entre na lista de quem procura dupla.",
                  },
                  {
                    key: "individual",
                    title: "Participar individualmente",
                    desc: "Sorteio ou formato rotativo.",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setMode(opt.key)}
                  className={cn(
                    "border p-4 text-left transition-colors",
                    mode === opt.key ? "border-graphite bg-card" : "border-border bg-card/60",
                  )}
                >
                  <p className="font-display text-base font-bold">{opt.title}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>

            {mode === "parceiro" ? (
              <div className="mt-6 border border-border bg-card p-4">
                <p className="eyebrow">Escolha o parceiro</p>
                <label className="mt-3 flex items-center gap-2 border border-border bg-background px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={partnerQuery}
                    onChange={(e) => setPartnerQuery(e.target.value)}
                    placeholder="Pesquisar jogador"
                    aria-label="Pesquisar jogador"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>
                <div className="mt-3 divide-y divide-border">
                  {partnerSearch.isPending && partnerQuery.trim().length >= MIN_SEARCH_LENGTH ? (
                    <div className="h-14 animate-pulse" aria-busy="true" />
                  ) : null}

                  {(partnerSearch.data ?? []).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-3">
                      <PlayerAvatar initials={initialsOf(p.name)} size="sm" />
                      <div className="flex-1">
                        <p className="font-display text-sm font-bold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {playerLevelLabel(p.level)}
                          {p.city ? ` · ${p.city}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => setInvited(p.id)}
                        className={cn(
                          "flex h-9 items-center gap-1.5 px-3 font-display text-[10px] font-bold uppercase tracking-widest",
                          invited === p.id
                            ? "bg-accent text-accent-foreground"
                            : "border border-border",
                        )}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {invited === p.id ? "Selecionado" : "Convidar"}
                      </button>
                    </div>
                  ))}

                  {partnerQuery.trim().length < MIN_SEARCH_LENGTH ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Digite ao menos {MIN_SEARCH_LENGTH} letras do nome do parceiro.
                    </p>
                  ) : !partnerSearch.isPending && (partnerSearch.data ?? []).length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Nenhum jogador encontrado.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-6 border border-border bg-sand p-4 text-sm text-muted-foreground">
              Ao se inscrever você aceita o regulamento v1.0 e a política de privacidade v2.0. Seu
              telefone e e-mail nunca aparecem publicamente.
            </div>

            {error ? (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {event.feeCents ? (
              <>
                <div className="mt-4 flex items-center justify-between border border-border bg-card px-4 py-3">
                  <span className="eyebrow">Inscrição por dupla</span>
                  <span className="score-num text-xl tabular-nums">{brl(event.feeCents)}</span>
                </div>
                <button
                  disabled={(mode === "parceiro" && !invited) || register.isPending}
                  onClick={() => register.mutate()}
                  className="mt-4 flex h-12 w-full items-center justify-center bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground disabled:bg-muted disabled:text-muted-foreground"
                >
                  {register.isPending
                    ? "Reservando vaga…"
                    : mode === "parceiro" && !invited
                      ? "Selecione um parceiro"
                      : "Ir para o pagamento"}
                </button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  A inscrição só é confirmada após a confirmação do pagamento.
                </p>
              </>
            ) : (
              <button
                disabled={(mode === "parceiro" && !invited) || register.isPending}
                onClick={() => register.mutate()}
                className="mt-6 flex h-12 w-full items-center justify-center bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground disabled:bg-muted disabled:text-muted-foreground"
              >
                {register.isPending
                  ? "Confirmando…"
                  : mode === "parceiro" && !invited
                    ? "Selecione um parceiro"
                    : "Confirmar inscrição gratuita"}
              </button>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
