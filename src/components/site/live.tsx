import { AlertTriangle, Clock, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ESTIMATE_DISCLAIMER,
  actualDuration,
  currentSet,
  delayMinutes,
  estimateFor,
  setsWon,
  type ScheduledMatch,
} from "@/lib/schedule-data";

export function EstimateNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {ESTIMATE_DISCLAIMER}
    </p>
  );
}

export function DelayPill({ minutes }: { minutes: number }) {
  if (minutes <= 0) {
    return (
      <span className="border border-border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        No horário
      </span>
    );
  }
  return (
    <span className="border border-warning bg-warning/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-warning">
      +{minutes} min
    </span>
  );
}

export function SetLine({ match }: { match: ScheduledMatch }) {
  return (
    <ul className="space-y-1">
      {match.sets.map((s) => (
        <li key={s.index} className="flex items-center justify-between text-sm">
          <span className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Set {s.index}
          </span>
          {s.status === "OFFICIAL" ? (
            <span className="score-num text-base">
              {s.a} <span className="text-muted-foreground">×</span> {s.b}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-widest text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Em andamento
            </span>
          )}
        </li>
      ))}
      {match.sets.length === 0 ? <li className="text-sm text-muted-foreground">Nenhum set iniciado</li> : null}
    </ul>
  );
}

export function LiveMatchCard({ match, dark = false }: { match: ScheduledMatch; dark?: boolean }) {
  const w = setsWon(match);
  const delay = delayMinutes(match);
  const cur = currentSet(match);

  return (
    <div className={cn("border", dark ? "border-background/20" : "border-border bg-card")}>
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-2",
          dark ? "border-background/20" : "border-border",
        )}
      >
        <span className={cn("eyebrow", dark && "text-background/60")}>{match.phase}</span>
        <span className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Ao vivo
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
        <p className={cn("font-display font-bold", dark ? "text-2xl md:text-3xl" : "text-lg")}>{match.teamA}</p>
        <p className="score-num text-center text-2xl md:text-3xl">
          ({w.a}) <span className="text-muted-foreground">×</span> ({w.b})
        </p>
        <p className={cn("text-right font-display font-bold", dark ? "text-2xl md:text-3xl" : "text-lg")}>
          {match.teamB}
        </p>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs",
          dark ? "border-background/20 text-background/70" : "border-border text-muted-foreground",
        )}
      >
        <span className="font-display font-bold uppercase tracking-widest text-accent">{match.court}</span>
        <span>Programado {match.scheduledStartAt}</span>
        {match.actualStartAt ? <span>Início real {match.actualStartAt}</span> : null}
        {delay > 0 ? <DelayPill minutes={delay} /> : null}
        {cur ? <span>Set {cur.index} em andamento</span> : null}
      </div>

      <div className={cn("border-t px-4 py-3", dark ? "border-background/20" : "border-border")}>
        <SetLine match={match} />
      </div>
    </div>
  );
}

export function UpcomingMatchCard({ match, dark = false }: { match: ScheduledMatch; dark?: boolean }) {
  const est = estimateFor(match.id);

  return (
    <div className={cn("border p-4", dark ? "border-background/20" : "border-border bg-card")}>
      <p className={cn("eyebrow", dark && "text-background/60")}>{match.category}</p>
      <p className="mt-2 font-display text-base font-bold">{match.teamA}</p>
      <p className="text-sm text-muted-foreground">× {match.teamB}</p>
      <div className={cn("mt-3 border-t pt-3", dark ? "border-background/20" : "border-border")}>
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Programado</span>
          <span className="score-num text-lg">{match.scheduledStartAt}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="eyebrow text-accent">Estimado</span>
          <span className="score-num text-lg text-accent">{est?.estimated ?? match.scheduledStartAt}</span>
        </div>
        <p className="mt-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {match.court} · {match.phase}
        </p>
        {est && est.delta > 0 ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" /> Estimativa {est.delta} min após o programado
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CourtRow({
  court,
  live,
  delay,
  next,
  nextEstimated,
  nextDelta,
}: {
  court: string;
  live: ScheduledMatch | null;
  delay: number;
  next: ScheduledMatch | null;
  nextEstimated: string | null;
  nextDelta: number;
}) {
  const dur = live ? actualDuration(live) : null;
  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-extrabold">{court}</p>
        <DelayPill minutes={delay} />
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {live ? (
          <>
            <p className="font-display font-bold">
              {live.teamA} <span className="text-muted-foreground">×</span> {live.teamB}
            </p>
            <p className="text-muted-foreground">
              Programado {live.scheduledStartAt} · Início real {live.actualStartAt ?? "—"}
              {dur ? ` · ${dur} min` : ""}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Sem partida em andamento</p>
        )}
      </div>
      <div className="mt-3 border-t border-border pt-3 text-sm">
        {next ? (
          <>
            <p className="eyebrow">Próximo</p>
            <p className="font-display font-bold">
              {next.teamA} <span className="text-muted-foreground">×</span> {next.teamB}
            </p>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Programado {next.scheduledStartAt} · Estimado{" "}
              <span className={cn("score-num", nextDelta > 0 && "text-warning")}>
                {nextEstimated ?? next.scheduledStartAt}
              </span>
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Sem próximos jogos nesta quadra</p>
        )}
      </div>
    </div>
  );
}
