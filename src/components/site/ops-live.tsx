/**
 * Kanban operacional do organizador, ligado à API real (ADR 0013 §4/§7/§8,
 * S9). Mesmo vocabulário visual de `components/site/ops.tsx` (o componente
 * ligado ao mock, que `/juiz` ainda usa — não tocado nesta fatia), mas
 * dirigido por `useQuery`/`useMutation` em vez de `useOperations()`.
 *
 * Diferença de fluxo deliberada em relação ao mock: lá, `finishMatch` grava
 * todos os sets e finaliza numa única chamada de contexto. O backend real
 * exige um `PUT .../sets` por set (resultado por set, nunca ponto a ponto) e
 * um `POST .../finish` separado — `ScoreDialog` aqui faz as duas coisas em
 * sequência dentro de uma mutação só, para o clique continuar sendo um único
 * gesto do organizador.
 */

import { Clock, GripVertical, Play, Repeat, Square, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { courtsQuery, type ApiCourt } from "@/lib/api/courts";
import {
  assignMatchCourt,
  assignMatchReferee,
  createMatch,
  finishMatch,
  organizerMatchesQuery,
  recordMatchSet,
  startMatch,
  type ApiOrganizerMatch,
} from "@/lib/api/matches";
import { queryKeys } from "@/lib/api/query-keys";
import { refereesQuery, type ApiReferee } from "@/lib/api/referees";
import { eventRegistrationsQuery } from "@/lib/api/registrations";
import { cn } from "@/lib/utils";

type MatchStatus = ApiOrganizerMatch["status"];

const STATUS_LABEL: Record<MatchStatus, string> = {
  PENDENTE: "Pendente",
  ATRIBUIDA: "Atribuída",
  PRONTA: "Pronta",
  EM_ANDAMENTO: "Em andamento",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  ADIADA: "Adiada",
};

const STATUS_TONE: Record<MatchStatus, string> = {
  PENDENTE: "bg-muted text-muted-foreground",
  ATRIBUIDA: "bg-sand text-foreground",
  PRONTA: "bg-graphite text-background",
  EM_ANDAMENTO: "bg-success/15 text-success",
  FINALIZADA: "bg-muted text-foreground",
  CANCELADA: "bg-destructive/15 text-destructive",
  ADIADA: "bg-warning/20 text-foreground",
};

export function OpsStatusPill({ status }: { status: MatchStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest",
        STATUS_TONE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const selectClass =
  "h-8 w-full border border-border bg-background px-2 font-display text-[11px] font-bold uppercase tracking-widest outline-none";

const actionClass =
  "inline-flex h-8 items-center gap-1.5 px-2.5 font-display text-[10px] font-bold uppercase tracking-widest";

function setsWonOf(match: ApiOrganizerMatch) {
  let a = 0;
  let b = 0;
  for (const s of match.sets) {
    if (s.score_a > s.score_b) a += 1;
    else if (s.score_b > s.score_a) b += 1;
  }
  return { a, b };
}

function reportError(e: unknown) {
  if (e instanceof ApiError) toast.error(e.message);
  else toast.error("Não foi possível concluir a operação. Tente novamente.");
}

function ScoreDialog({
  slug,
  match,
  bestOfSets,
  pointsPerSet,
  tiebreakPoints,
  open,
  onOpenChange,
}: {
  slug: string;
  match: ApiOrganizerMatch;
  bestOfSets: number;
  pointsPerSet: number;
  tiebreakPoints: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [sets, setSets] = useState<{ index: number; a: number; b: number }[]>([]);

  useEffect(() => {
    if (!open) return;
    setSets(
      Array.from({ length: bestOfSets }, (_, i) => {
        const existing = match.sets.find((s) => s.set_number === i + 1);
        return { index: i + 1, a: existing?.score_a ?? 0, b: existing?.score_b ?? 0 };
      }),
    );
  }, [open, bestOfSets, match.sets]);

  const won = (() => {
    let a = 0;
    let b = 0;
    for (const s of sets) {
      if (s.a === 0 && s.b === 0) continue;
      if (s.a > s.b) a += 1;
      else if (s.b > s.a) b += 1;
    }
    return { a, b };
  })();

  const update = (i: number, side: "a" | "b", value: number) =>
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [side]: Math.max(0, value) } : s)));

  const submit = useMutation({
    mutationFn: async () => {
      const filled = sets.filter((s) => s.a !== 0 || s.b !== 0);
      for (const s of filled) {
        await recordMatchSet(slug, match.id, s.index, s.a, s.b);
      }
      if (match.status !== "FINALIZADA") {
        await finishMatch(slug, match.id, crypto.randomUUID());
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizerMatches.byEvent(slug) });
      onOpenChange(false);
      toast.success("Resultado registrado", {
        description: `${match.team_a_name ?? "Dupla A"} ${won.a} × ${won.b} ${match.team_b_name ?? "Dupla B"}`,
      });
    },
    onError: reportError,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar placar</DialogTitle>
          <DialogDescription>
            {match.phase} · {match.court_label ?? "sem quadra"} · melhor de {bestOfSets} · sets até{" "}
            {pointsPerSet}
            {bestOfSets > 1 ? ` (decisivo ${tiebreakPoints})` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="border border-border bg-card">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-4 py-3">
            <p className="font-display text-sm font-bold">{match.team_a_name ?? "Dupla A"}</p>
            <span className="score-num text-xl tabular-nums">{won.a}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
            <p className="font-display text-sm font-bold">{match.team_b_name ?? "Dupla B"}</p>
            <span className="score-num text-xl tabular-nums">{won.b}</span>
          </div>
        </div>

        <div className="space-y-2">
          {sets.map((s, i) => (
            <div
              key={s.index}
              className="flex items-center gap-3 border border-border bg-card px-3 py-2"
            >
              <span className="eyebrow w-12">Set {s.index}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={s.a}
                onChange={(e) => update(i, "a", Number(e.target.value))}
                aria-label={`${match.team_a_name ?? "Dupla A"} — set ${s.index}`}
                className="score-num h-11 w-full border border-border bg-background text-center text-xl outline-none"
              />
              <span className="text-muted-foreground">×</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={s.b}
                onChange={(e) => update(i, "b", Number(e.target.value))}
                aria-label={`${match.team_b_name ?? "Dupla B"} — set ${s.index}`}
                className="score-num h-11 w-full border border-border bg-background text-center text-xl outline-none"
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Sets sem pontuação não são registrados. O resultado pode ser corrigido depois com registro
          de auditoria.
        </p>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-11 border border-border px-4 font-display text-xs font-bold uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="h-11 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
          >
            {submit.isPending ? "Registrando…" : "Finalizar partida"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartDialog({
  slug,
  match,
  open,
  onOpenChange,
}: {
  slug: string;
  match: ApiOrganizerMatch;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const start = useMutation({
    mutationFn: () => startMatch(slug, match.id, crypto.randomUUID()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizerMatches.byEvent(slug) });
      onOpenChange(false);
      toast.success("Partida iniciada");
    },
    onError: reportError,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Iniciar jogo</DialogTitle>
          <DialogDescription>
            {match.team_a_name ?? "Dupla A"} × {match.team_b_name ?? "Dupla B"} —{" "}
            {match.court_label ?? "sem quadra definida"}. O horário de início será registrado agora.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-11 border border-border px-4 font-display text-xs font-bold uppercase tracking-widest"
          >
            Voltar
          </button>
          <button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="h-11 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
          >
            {start.isPending ? "Iniciando…" : "Confirmar início"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MatchOpsCard({
  slug,
  match,
  courts,
  referees,
  bestOfSets,
  pointsPerSet,
  tiebreakPoints,
  draggable,
  compact,
}: {
  slug: string;
  match: ApiOrganizerMatch;
  courts: ApiCourt[];
  referees: ApiReferee[];
  bestOfSets: number;
  pointsPerSet: number;
  tiebreakPoints: number;
  draggable?: boolean;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [startOpen, setStartOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const won = setsWonOf(match);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizerMatches.byEvent(slug) });
  }

  const setCourt = useMutation({
    mutationFn: (courtId: string | null) => assignMatchCourt(slug, match.id, courtId),
    onSuccess: invalidate,
    onError: reportError,
  });
  const setReferee = useMutation({
    mutationFn: (refereeId: string | null) => assignMatchReferee(slug, match.id, refereeId),
    onSuccess: invalidate,
    onError: reportError,
  });

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", match.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "border border-border bg-card p-3",
        match.status === "EM_ANDAMENTO" && "border-success/50",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-2">
        {draggable ? (
          <GripVertical className="mt-0.5 hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <OpsStatusPill status={match.status} />
            <span className="eyebrow">{match.phase}</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-display text-sm font-bold">
                {match.team_a_name ?? "Dupla A"}
              </p>
              {match.sets.length ? <span className="score-num tabular-nums">{won.a}</span> : null}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">×</p>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-display text-sm font-bold">
                {match.team_b_name ?? "Dupla B"}
              </p>
              {match.sets.length ? <span className="score-num tabular-nums">{won.b}</span> : null}
            </div>
          </div>

          {match.sets.length ? (
            <p className="score-num mt-2 text-xs text-muted-foreground">
              {match.sets.map((s) => `${s.score_a}-${s.score_b}`).join(" · ")}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {match.status === "EM_ANDAMENTO" && match.started_at
                ? `Início ${match.started_at.slice(11, 16)}`
                : match.finished_at
                  ? `Encerrada ${match.finished_at.slice(11, 16)}`
                  : (match.scheduled_at?.slice(11, 16) ?? "Sem horário")}
            </span>
            <span>{match.court_label ?? "Sem quadra"}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {match.referee_name ?? "Sem juiz"}
            </span>
          </div>
        </div>
      </div>

      {compact ? null : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="sr-only">Quadra</span>
            <select
              value={match.court_id ?? ""}
              onChange={(e) => setCourt.mutate(e.target.value || null)}
              disabled={setCourt.isPending}
              className={selectClass}
            >
              <option value="">Sem quadra</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Juiz</span>
            <select
              value={match.referee_id ?? ""}
              onChange={(e) => setReferee.mutate(e.target.value || null)}
              disabled={setReferee.isPending}
              className={selectClass}
            >
              <option value="">Sem juiz</option>
              {referees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {match.status === "FINALIZADA" ? (
          <button
            onClick={() => setScoreOpen(true)}
            className={cn(actionClass, "border border-border")}
          >
            <Repeat className="h-3.5 w-3.5" /> Corrigir placar
          </button>
        ) : match.status === "EM_ANDAMENTO" ? (
          <>
            <button
              onClick={() => setScoreOpen(true)}
              className={cn(actionClass, "bg-accent text-accent-foreground")}
            >
              <Square className="h-3.5 w-3.5" /> Finalizar jogo
            </button>
            <button
              onClick={() => setScoreOpen(true)}
              className={cn(actionClass, "border border-border")}
            >
              Registrar placar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                if (!match.court_id) {
                  toast.error("Defina a quadra antes de iniciar.");
                  return;
                }
                setStartOpen(true);
              }}
              className={cn(actionClass, "bg-graphite text-background")}
            >
              <Play className="h-3.5 w-3.5" /> Iniciar jogo
            </button>
            <button
              onClick={() => setScoreOpen(true)}
              className={cn(actionClass, "border border-border")}
            >
              <UserCheck className="h-3.5 w-3.5" /> Registrar placar
            </button>
          </>
        )}
      </div>

      <StartDialog slug={slug} match={match} open={startOpen} onOpenChange={setStartOpen} />
      <ScoreDialog
        slug={slug}
        match={match}
        bestOfSets={bestOfSets}
        pointsPerSet={pointsPerSet}
        tiebreakPoints={tiebreakPoints}
        open={scoreOpen}
        onOpenChange={setScoreOpen}
      />
    </div>
  );
}

type ColumnCardProps = {
  slug: string;
  courts: ApiCourt[];
  referees: ApiReferee[];
  bestOfSets: number;
  pointsPerSet: number;
  tiebreakPoints: number;
};

function Column({
  title,
  hint,
  matches,
  onDropMatch,
  tone,
  cardProps,
}: {
  title: string;
  hint?: string | undefined;
  matches: ApiOrganizerMatch[];
  onDropMatch?: (id: string) => void;
  tone?: "pending";
  cardProps: ColumnCardProps;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (!onDropMatch) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!onDropMatch) return;
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropMatch(id);
      }}
      className={cn(
        "flex min-w-[260px] flex-1 flex-col border border-border bg-background",
        over && "border-accent",
      )}
    >
      <div
        className={cn(
          "border-b border-border px-3 py-2",
          tone === "pending" ? "bg-muted" : "bg-sand",
        )}
      >
        <p className="font-display text-xs font-bold uppercase tracking-widest">{title}</p>
        <p className="text-[11px] text-muted-foreground">
          {matches.length} partida{matches.length === 1 ? "" : "s"}
          {hint ? ` · ${hint}` : ""}
        </p>
      </div>
      <div className="flex-1 space-y-2 p-2">
        {matches.map((m) => (
          <MatchOpsCard key={m.id} match={m} draggable {...cardProps} />
        ))}
        {matches.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            {onDropMatch ? "Arraste uma partida para cá" : "Sem partidas"}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * "Nova partida": não existe no baseline (o mock nunca criava partida pela
 * UI, só chegava com o estado pré-semeado) — sem isto o kanban real ficaria
 * permanentemente vazio, então é adição necessária, não redesenho. Duplas
 * vêm de `eventRegistrationsQuery`, deduplicadas por `group.id`
 * (`GroupStatus.COMPLETE`, mesmo filtro que o sorteio usa).
 */
function NewMatchForm({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const registrations = useQuery(eventRegistrationsQuery(slug, { status: "CONFIRMED" }));
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [phase, setPhase] = useState("");

  const teams = (() => {
    const seen = new Map<string, string>();
    for (const r of registrations.data?.items ?? []) {
      if (r.group && r.group.status === "COMPLETE" && !seen.has(r.group.id)) {
        seen.set(r.group.id, r.group.display_name);
      }
    }
    return Array.from(seen, ([id, label]) => ({ id, label }));
  })();

  const create = useMutation({
    mutationFn: () => createMatch(slug, teamA, teamB, phase.trim() || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizerMatches.byEvent(slug) });
      setTeamA("");
      setTeamB("");
      setPhase("");
      toast.success("Partida criada");
    },
    onError: reportError,
  });

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 border border-dashed border-border bg-card p-3">
      <label className="block">
        <span className="eyebrow">Dupla A</span>
        <select
          value={teamA}
          onChange={(e) => setTeamA(e.target.value)}
          className={cn(selectClass, "mt-1 w-48")}
        >
          <option value="">Selecione</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="eyebrow">Dupla B</span>
        <select
          value={teamB}
          onChange={(e) => setTeamB(e.target.value)}
          className={cn(selectClass, "mt-1 w-48")}
        >
          <option value="">Selecione</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="eyebrow">Fase (opcional)</span>
        <input
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          placeholder="Ex.: Semifinal"
          className="mt-1 h-8 w-40 border border-border bg-background px-2 font-display text-[11px] font-bold uppercase tracking-widest outline-none"
        />
      </label>
      <button
        onClick={() => {
          if (!teamA || !teamB) {
            toast.error("Selecione as duas duplas.");
            return;
          }
          if (teamA === teamB) {
            toast.error("As duas duplas precisam ser diferentes.");
            return;
          }
          create.mutate();
        }}
        disabled={create.isPending}
        className="inline-flex h-8 items-center bg-accent px-3 font-display text-[10px] font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
      >
        {create.isPending ? "Criando…" : "Criar partida"}
      </button>
    </div>
  );
}

export function OpsKanban({
  slug,
  bestOfSets,
  pointsPerSet,
  tiebreakPoints,
}: {
  slug: string;
  bestOfSets: number;
  pointsPerSet: number;
  tiebreakPoints: number;
}) {
  const queryClient = useQueryClient();
  const matchesQuery = useQuery(organizerMatchesQuery(slug));
  const courtsQ = useQuery(courtsQuery(slug));
  const refereesQ = useQuery(refereesQuery(slug));
  const [mobileCourt, setMobileCourt] = useState<string>("PENDENTES");

  const all = matchesQuery.data ?? [];
  const courts = courtsQ.data ?? [];
  const referees = refereesQ.data ?? [];

  const setCourtOnDrop = useMutation({
    mutationFn: (args: { matchId: string; courtId: string | null }) =>
      assignMatchCourt(slug, args.matchId, args.courtId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizerMatches.byEvent(slug) });
    },
    onError: reportError,
  });

  const pending = all.filter((m) => !m.court_id);
  const byCourt = (courtId: string) => all.filter((m) => m.court_id === courtId);

  const mobileList = mobileCourt === "PENDENTES" ? pending : byCourt(mobileCourt);

  if (matchesQuery.isPending || courtsQ.isPending || refereesQ.isPending) {
    return (
      <div className="h-40 animate-pulse border border-border bg-background" aria-busy="true" />
    );
  }

  const cardProps: ColumnCardProps = {
    slug,
    courts,
    referees,
    bestOfSets,
    pointsPerSet,
    tiebreakPoints,
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Operacional</h2>
          <p className="text-sm text-muted-foreground">
            Arraste as partidas pendentes para a quadra. O sistema não sorteia — quem decide é o
            organizador.
          </p>
        </div>
        <p className="eyebrow">
          {courts.length} quadras · melhor de {bestOfSets}
        </p>
      </div>

      <div className="mt-4">
        <NewMatchForm slug={slug} />
      </div>

      {/* Desktop: kanban */}
      <div className="mt-4 hidden gap-3 overflow-x-auto pb-2 md:flex">
        <Column
          title="Partidas pendentes"
          tone="pending"
          matches={pending}
          onDropMatch={(id) => setCourtOnDrop.mutate({ matchId: id, courtId: null })}
          cardProps={cardProps}
        />
        {courts.map((court) => (
          <Column
            key={court.id}
            title={court.label}
            hint={all.find((m) => m.court_id === court.id)?.referee_name ?? undefined}
            matches={byCourt(court.id)}
            onDropMatch={(id) => setCourtOnDrop.mutate({ matchId: id, courtId: court.id })}
            cardProps={cardProps}
          />
        ))}
      </div>

      {/* Mobile: seletor de quadra */}
      <div className="mt-4 md:hidden">
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-1 pb-2">
            {["PENDENTES", ...courts.map((c) => c.id)].map((c) => (
              <button
                key={c}
                onClick={() => setMobileCourt(c)}
                className={cn(
                  "whitespace-nowrap border border-border px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-widest",
                  mobileCourt === c ? "bg-graphite text-background" : "text-muted-foreground",
                )}
              >
                {c === "PENDENTES" ? "Pendentes" : courts.find((court) => court.id === c)?.label}
                <span className="ml-1.5 opacity-70">
                  {(c === "PENDENTES" ? pending : byCourt(c)).length}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {mobileList.map((m) => (
            <MatchOpsCard key={m.id} match={m} {...cardProps} />
          ))}
          {mobileList.length === 0 ? (
            <p className="border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
              Sem partidas nesta coluna. Use "Selecionar quadra" no card para mover.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
