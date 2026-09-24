import { Clock, GripVertical, Play, Repeat, Square, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  OPS_STATUS_LABEL,
  OPS_STATUS_TONE,
  opsSetsWon,
  useOperations,
  type OpsMatch,
  type OpsSet,
  type OpsStatus,
} from "@/lib/operations";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function OpsStatusPill({ status }: { status: OpsStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest",
        OPS_STATUS_TONE[status],
      )}
    >
      {OPS_STATUS_LABEL[status]}
    </span>
  );
}

const selectClass =
  "h-8 w-full border border-border bg-background px-2 font-display text-[11px] font-bold uppercase tracking-widest outline-none";

const actionClass =
  "inline-flex h-8 items-center gap-1.5 px-2.5 font-display text-[10px] font-bold uppercase tracking-widest";

export function ScoreDialog({
  match,
  open,
  onOpenChange,
  readOnlyTeams,
}: {
  match: OpsMatch;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  readOnlyTeams?: boolean;
}) {
  const { config, finishMatch } = useOperations();
  const maxSets = config.bestOf;
  const [sets, setSets] = useState<OpsSet[]>([]);

  useEffect(() => {
    if (!open) return;
    setSets(
      Array.from({ length: maxSets }, (_, i) => match.sets[i] ?? { index: i + 1, a: 0, b: 0 }),
    );
  }, [open, maxSets, match.sets]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar placar</DialogTitle>
          <DialogDescription>
            {match.phase} · {match.court ?? "sem quadra"} · melhor de {maxSets} · sets até{" "}
            {config.pointsPerSet}
            {maxSets > 1 ? ` (decisivo ${config.tiebreakPoints})` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="border border-border bg-card">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-4 py-3">
            <p className="font-display text-sm font-bold">{match.teamA}</p>
            <span className="score-num text-xl tabular-nums">{won.a}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
            <p className="font-display text-sm font-bold">{match.teamB}</p>
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
                aria-label={`${match.teamA} — set ${s.index}`}
                className="score-num h-11 w-full border border-border bg-background text-center text-xl outline-none"
              />
              <span className="text-muted-foreground">×</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={s.b}
                onChange={(e) => update(i, "b", Number(e.target.value))}
                aria-label={`${match.teamB} — set ${s.index}`}
                className="score-num h-11 w-full border border-border bg-background text-center text-xl outline-none"
              />
            </div>
          ))}
        </div>

        {readOnlyTeams ? null : (
          <p className="text-xs text-muted-foreground">
            Sets sem pontuação não são registrados. O resultado pode ser corrigido depois com
            registro de auditoria.
          </p>
        )}

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-11 border border-border px-4 font-display text-xs font-bold uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              finishMatch(match.id, sets);
              onOpenChange(false);
              toast.success("Resultado registrado", {
                description: `${match.teamA} ${won.a} × ${won.b} ${match.teamB}`,
              });
            }}
            className="h-11 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Finalizar partida
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartDialog({
  match,
  open,
  onOpenChange,
}: {
  match: OpsMatch;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { startMatch } = useOperations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Iniciar jogo</DialogTitle>
          <DialogDescription>
            {match.teamA} × {match.teamB} — {match.court ?? "sem quadra definida"}. O horário de
            início será registrado agora.
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
            onClick={() => {
              startMatch(match.id);
              onOpenChange(false);
              toast.success("Partida iniciada");
            }}
            className="h-11 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Confirmar início
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MatchOpsCard({
  match,
  draggable,
  compact,
}: {
  match: OpsMatch;
  draggable?: boolean;
  compact?: boolean;
}) {
  const { config, referees, assignCourt, assignReferee, refereeById } = useOperations();
  const [startOpen, setStartOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const won = opsSetsWon(match);
  const referee = refereeById(match.refereeId);

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
              <p className="truncate font-display text-sm font-bold">{match.teamA}</p>
              {match.sets.length ? <span className="score-num tabular-nums">{won.a}</span> : null}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">×</p>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-display text-sm font-bold">{match.teamB}</p>
              {match.sets.length ? <span className="score-num tabular-nums">{won.b}</span> : null}
            </div>
          </div>

          {match.sets.length ? (
            <p className="score-num mt-2 text-xs text-muted-foreground">
              {match.sets.map((s) => `${s.a}-${s.b}`).join(" · ")}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {match.status === "EM_ANDAMENTO" && match.startedAt
                ? `Início ${match.startedAt}`
                : match.endedAt
                  ? `Encerrada ${match.endedAt}`
                  : `Previsto ${match.scheduledTime}`}
            </span>
            <span>{match.court ?? "Sem quadra"}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {referee ? referee.name : "Sem juiz"}
            </span>
          </div>
        </div>
      </div>

      {compact ? null : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="sr-only">Quadra</span>
            <select
              value={match.court ?? ""}
              onChange={(e) => assignCourt(match.id, e.target.value || null)}
              className={selectClass}
            >
              <option value="">Sem quadra</option>
              {config.courts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Juiz</span>
            <select
              value={match.refereeId ?? ""}
              onChange={(e) => assignReferee(match.id, e.target.value || null)}
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
        {match.status === "FINALIZADO" ? (
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
                if (!match.court) {
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

      <StartDialog match={match} open={startOpen} onOpenChange={setStartOpen} />
      <ScoreDialog match={match} open={scoreOpen} onOpenChange={setScoreOpen} />
    </div>
  );
}

function Column({
  title,
  hint,
  matches,
  onDropMatch,
  tone,
}: {
  title: string;
  hint?: string | undefined;
  matches: OpsMatch[];
  onDropMatch?: (id: string) => void;
  tone?: "pending";
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
          <MatchOpsCard key={m.id} match={m} draggable />
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

export function OpsKanban({ slug }: { slug: string }) {
  const { config, matchesFor, assignCourt, refereeById } = useOperations();
  const all = matchesFor(slug);
  const [mobileCourt, setMobileCourt] = useState<string>("PENDENTES");

  const pending = all.filter((m) => !m.court);
  const byCourt = (court: string) => all.filter((m) => m.court === court);

  const mobileList = mobileCourt === "PENDENTES" ? pending : byCourt(mobileCourt);

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
          {config.courts.length} quadras · melhor de {config.bestOf} · {config.matchDurationMin} min
          por partida
        </p>
      </div>

      {/* Desktop: kanban */}
      <div className="mt-4 hidden gap-3 overflow-x-auto pb-2 md:flex">
        <Column
          title="Partidas pendentes"
          tone="pending"
          matches={pending}
          onDropMatch={(id) => assignCourt(id, null)}
        />
        {config.courts.map((court) => (
          <Column
            key={court}
            title={court}
            hint={refereeById(all.find((m) => m.court === court)?.refereeId ?? null)?.name}
            matches={byCourt(court)}
            onDropMatch={(id) => assignCourt(id, court)}
          />
        ))}
      </div>

      {/* Mobile: seletor de quadra */}
      <div className="mt-4 md:hidden">
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-1 pb-2">
            {["PENDENTES", ...config.courts].map((c) => (
              <button
                key={c}
                onClick={() => setMobileCourt(c)}
                className={cn(
                  "whitespace-nowrap border border-border px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-widest",
                  mobileCourt === c ? "bg-graphite text-background" : "text-muted-foreground",
                )}
              >
                {c === "PENDENTES" ? "Pendentes" : c}
                <span className="ml-1.5 opacity-70">
                  {(c === "PENDENTES" ? pending : byCourt(c)).length}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {mobileList.map((m) => (
            <MatchOpsCard key={m.id} match={m} />
          ))}
          {mobileList.length === 0 ? (
            <p className="border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
              Sem partidas nesta coluna. Use “Selecionar quadra” no card para mover.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
