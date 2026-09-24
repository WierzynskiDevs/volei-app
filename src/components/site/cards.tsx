import { Link } from "@tanstack/react-router";
import { MapPin, Star, Users } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  EVENT_STATUS_LABEL,
  type EventItem,
  type EventStatus,
  type Match,
  type Player,
} from "@/lib/mock-data";

const statusTone: Record<EventStatus, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  PUBLICADO: "bg-muted text-foreground",
  INSCRICOES_ABERTAS: "bg-accent text-accent-foreground",
  INSCRICOES_ENCERRADAS: "bg-graphite text-background",
  AGUARDANDO_SORTEIO: "bg-warning/20 text-foreground",
  CHAVE_PUBLICADA: "bg-graphite text-background",
  EM_ANDAMENTO: "bg-success/15 text-success",
  FINALIZADO: "bg-muted text-muted-foreground",
  CANCELADO: "bg-destructive/15 text-destructive",
};

export function EventStatusPill({ status }: { status: EventStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 font-display text-[10px] font-bold uppercase tracking-widest",
        statusTone[status],
      )}
    >
      {status === "EM_ANDAMENTO" ? (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success" />
      ) : null}
      {EVENT_STATUS_LABEL[status]}
    </span>
  );
}

export function Meta({ children }: { children: ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>;
}

export function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      to="/eventos/$slug"
      params={{ slug: event.slug }}
      className="group block border border-border bg-card transition-colors hover:border-graphite"
    >
      <div className="sand-grain flex items-center justify-between border-b border-border bg-sand px-4 py-2.5">
        <EventStatusPill status={event.status} />
        <span className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {event.modality} · {event.category}
        </span>
      </div>
      <div className="p-4">
        <p className="eyebrow">{event.dateLabel}</p>
        <h3 className="mt-1 text-xl leading-tight group-hover:text-accent">{event.name}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {event.venue} · {event.city}/{event.state}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Tag>{event.format}</Tag>
          <Tag>{event.level}</Tag>
          <Tag>{event.fee}</Tag>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <strong className="score-num">{event.teamsRegistered}</strong>
            <span className="text-muted-foreground">
              {event.maxTeams === null ? "duplas · sem limite" : `/ ${event.maxTeams} duplas`}
            </span>
          </span>
          <span className="font-display text-xs font-bold uppercase tracking-widest text-accent">
            Ver evento
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

export function PlayerAvatar({
  initials,
  size = "md",
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-graphite font-display font-extrabold text-background",
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-11 w-11 text-sm",
        size === "lg" && "h-20 w-20 text-2xl",
      )}
    >
      {initials}
    </span>
  );
}

export function ReputationBadge({
  score,
  reviews,
  compact = false,
}: {
  score: number;
  reviews: number;
  compact?: boolean;
}) {
  const lowConfidence = reviews < 5;
  return (
    <div className={cn("flex items-baseline gap-2", compact && "gap-1.5")}>
      <span className="score-num flex items-center gap-1 text-lg">
        {score.toFixed(1)}
        <Star className="h-4 w-4 fill-warning text-warning" />
      </span>
      <span className={cn("text-xs", lowConfidence ? "text-warning" : "text-muted-foreground")}>
        {reviews} {reviews === 1 ? "avaliação válida" : "avaliações válidas"}
      </span>
    </div>
  );
}

export function PlayerCard({ player, action }: { player: Player; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border border-border bg-card p-4">
      <PlayerAvatar initials={player.initials} />
      <div className="min-w-0 flex-1">
        <Link
          to="/jogadores/$playerId"
          params={{ playerId: player.id }}
          className="font-display text-base font-bold hover:text-accent"
        >
          {player.name}
        </Link>
        <p className="text-sm text-muted-foreground">
          {player.city}/{player.state} · {player.level}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="eyebrow">Ranking</span>{" "}
            <strong className="score-num">#{player.rankPosition}</strong>
          </span>
          <ReputationBadge score={player.reputation} reviews={player.validReviews} compact />
        </div>
      </div>
      {action}
    </div>
  );
}

export function MatchCard({ match, highlight = false }: { match: Match; highlight?: boolean }) {
  const live = match.status === "IN_PROGRESS";
  return (
    <div className={cn("border bg-card", highlight ? "border-accent" : "border-border")}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="eyebrow">{match.phase}</span>
        <span className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest">
          {live ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> : null}
          {match.court} · {match.time}
        </span>
      </div>
      <div className="divide-y divide-border">
        {[
          { name: match.teamA, side: "A" as const },
          { name: match.teamB, side: "B" as const },
        ].map((team) => (
          <div key={team.side} className="flex items-center justify-between px-4 py-3">
            <span
              className={cn(
                "font-display text-base font-bold",
                match.winner === team.side ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {team.name}
            </span>
            <span className="flex gap-2">
              {match.sets.length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                match.sets.map((set, i) => (
                  <span
                    key={i}
                    className={cn(
                      "score-num w-8 text-center text-lg",
                      (team.side === "A" ? set[0] > set[1] : set[1] > set[0])
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {team.side === "A" ? set[0] : set[1]}
                  </span>
                ))
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="mx-auto mb-4 h-8 w-8 court-line" />
      <h3 className="text-lg">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="eyebrow">{label}</p>
      <p className="score-num mt-1 text-2xl">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SponsorBanner({ label = "Patrocinador oficial" }: { label?: string }) {
  return (
    <div className="flex items-center justify-between border border-border bg-graphite px-4 py-3 text-background">
      <span className="eyebrow text-background/60">{label}</span>
      <span className="font-display text-lg font-extrabold tracking-tight">
        AREIA<span className="text-accent">WEAR</span>
      </span>
    </div>
  );
}
