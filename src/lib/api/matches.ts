/**
 * Partidas do evento (ADR 0013 §4/§7/§8, ADR 0017/Q15 — S9).
 *
 * Dois blocos neste arquivo: a leitura PÚBLICA (`/events/{slug}/matches`, sem
 * autenticação, traduzida para o `Match` do baseline) e o CICLO DE VIDA do
 * organizador (`/organizer/events/{slug}/matches*`, autenticado). São
 * domínios com o mesmo nome mas payload/allowlist diferentes — nunca
 * compartilham schema Zod nem chave de query.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import type { Match } from "@/lib/mock-data";

import { ApiError, apiRequest, type Resource, type ResourceCollection } from "./client";
import { timeInputValue } from "./format";
import { queryKeys } from "./query-keys";

/* ------------------------------------------------------------------ *
 * Leitura pública (ADR 0017, Q15) — sem autenticação.
 * Consumidor: abas "Agenda"/"Resultados" de eventos.$slug.tsx.
 * ------------------------------------------------------------------ */

const matchSetSchema = z.object({
  id: z.string(),
  set_number: z.number().int(),
  score_a: z.number().int(),
  score_b: z.number().int(),
});

const publicMatchSchema = z.object({
  id: z.string(),
  phase: z.string(),
  status: z.enum(["PENDENTE", "ATRIBUIDA", "PRONTA", "EM_ANDAMENTO", "FINALIZADA", "CANCELADA", "ADIADA"]),
  status_label: z.string(),
  court_label: z.string().nullable(),
  team_a_name: z.string().nullable(),
  team_b_name: z.string().nullable(),
  sets: z.array(matchSetSchema),
  scheduled_at: z.string().nullable(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
});

export type ApiPublicMatch = z.infer<typeof publicMatchSchema>;

/** `Match["status"]` (baseline) não distingue os sete estados do backend. */
const STATUS_LABEL: Record<ApiPublicMatch["status"], Match["status"]> = {
  PENDENTE: "SCHEDULED",
  ATRIBUIDA: "SCHEDULED",
  PRONTA: "SCHEDULED",
  EM_ANDAMENTO: "IN_PROGRESS",
  FINALIZADA: "FINISHED",
  CANCELADA: "SCHEDULED",
  ADIADA: "SCHEDULED",
};

/**
 * Vencedor é derivado aqui só para o negrito do `MatchCard` (CLAUDE.md §15:
 * apresentação, não regra de negócio) — o backend já decidiu quem venceu ao
 * mover a partida para `FINALIZADA` (`MatchOutcome`, ADR 0013 §9); isto
 * reconta os sets que a própria API devolveu, não decide nada por conta
 * própria.
 */
function winnerOf(match: ApiPublicMatch): Match["winner"] {
  if (match.status !== "FINALIZADA") return undefined;

  let setsA = 0;
  let setsB = 0;
  for (const set of match.sets) {
    if (set.score_a > set.score_b) setsA += 1;
    else if (set.score_b > set.score_a) setsB += 1;
  }

  if (setsA === setsB) return undefined;
  return setsA > setsB ? "A" : "B";
}

function toMatchItem(match: ApiPublicMatch): Match {
  const winner = winnerOf(match);

  return {
    id: match.id,
    court: match.court_label ?? "Quadra a definir",
    time: match.scheduled_at ? timeInputValue(match.scheduled_at) : "--:--",
    phase: match.phase,
    teamA: match.team_a_name ?? "A definir",
    teamB: match.team_b_name ?? "A definir",
    sets: [...match.sets]
      .sort((a, b) => a.set_number - b.set_number)
      .map((set): [number, number] => [set.score_a, set.score_b]),
    status: STATUS_LABEL[match.status],
    ...(winner ? { winner } : {}),
  };
}

async function fetchPublicMatches(slug: string, signal?: AbortSignal): Promise<Match[]> {
  const raw = await apiRequest<ResourceCollection<unknown>>(`/events/${encodeURIComponent(slug)}/matches`, {
    signal,
  });
  return raw.data.map((item) => toMatchItem(publicMatchSchema.parse(item)));
}

/**
 * 404 antes de `BRACKET_PUBLISHED` é esperado (ADR 0011 §7/ADR 0017) — não
 * vale gastar 3 tentativas nele, só nos erros de fato inesperados.
 */
export const publicMatchesQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.publicMatches.byEvent(slug),
    queryFn: ({ signal }) => fetchPublicMatches(slug, signal),
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });

/* ------------------------------------------------------------------ *
 * Ciclo de vida da partida — organizador (ADR 0013 §4/§7/§8).
 * Consumidor: kanban de /organizador/controle/$slug.
 * ------------------------------------------------------------------ */

/**
 * `court_label`/`referee_name`/`team_*_name`/`sets` vêm de relações que o
 * backend só carrega quando `whenLoaded()` foi satisfeito (`MatchResource`).
 * `POST .../matches` (criação) devolve a partida sem relação nenhuma
 * carregada — a CHAVE inteira some do JSON (Laravel omite, não manda
 * `null`), diferente de `GET .../matches` (index/detalhe), que sempre
 * carrega tudo. Por isso `.optional()` aqui, e não só `.nullable()`.
 */
const organizerMatchSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  phase: z.string().nullable(),
  status: z.enum(["PENDENTE", "ATRIBUIDA", "PRONTA", "EM_ANDAMENTO", "FINALIZADA", "CANCELADA", "ADIADA"]),
  status_label: z.string(),
  court_id: z.string().nullable(),
  court_label: z.string().nullable().optional(),
  referee_id: z.string().nullable(),
  referee_name: z.string().nullable().optional(),
  team_a_id: z.string(),
  team_a_name: z.string().nullable().optional(),
  team_b_id: z.string(),
  team_b_name: z.string().nullable().optional(),
  sets: z.array(matchSetSchema).default([]),
  scheduled_at: z.string().nullable(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
});

export type ApiOrganizerMatch = z.infer<typeof organizerMatchSchema>;

function organizerMatchesPath(slug: string, suffix = ""): string {
  return `/organizer/events/${encodeURIComponent(slug)}/matches${suffix}`;
}

async function fetchOrganizerMatches(slug: string, signal?: AbortSignal): Promise<ApiOrganizerMatch[]> {
  const raw = await apiRequest<ResourceCollection<unknown>>(organizerMatchesPath(slug), { signal });
  return raw.data.map((item) => organizerMatchSchema.parse(item));
}

export const organizerMatchesQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.organizerMatches.byEvent(slug),
    queryFn: ({ signal }) => fetchOrganizerMatches(slug, signal),
  });

export async function createMatch(
  slug: string,
  teamAId: string,
  teamBId: string,
  phase?: string,
): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(organizerMatchesPath(slug), {
    method: "POST",
    body: { team_a_id: teamAId, team_b_id: teamBId, phase },
  });
  return organizerMatchSchema.parse(raw.data);
}

export async function assignMatchCourt(
  slug: string,
  matchId: string,
  courtId: string | null,
): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(organizerMatchesPath(slug, `/${matchId}/court`), {
    method: "POST",
    body: { court_id: courtId },
  });
  return organizerMatchSchema.parse(raw.data);
}

export async function assignMatchReferee(
  slug: string,
  matchId: string,
  refereeId: string | null,
): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(organizerMatchesPath(slug, `/${matchId}/referee`), {
    method: "POST",
    body: { referee_id: refereeId },
  });
  return organizerMatchSchema.parse(raw.data);
}

/** Exige `idempotencyKey` — gerada uma vez por tentativa de início (CLAUDE.md §8). */
export async function startMatch(slug: string, matchId: string, idempotencyKey: string): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(organizerMatchesPath(slug, `/${matchId}/start`), {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return organizerMatchSchema.parse(raw.data);
}

/** Um set por chamada — placar final, nunca ponto a ponto (ATA §17). */
export async function recordMatchSet(
  slug: string,
  matchId: string,
  setNumber: number,
  scoreA: number,
  scoreB: number,
): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(organizerMatchesPath(slug, `/${matchId}/sets`), {
    method: "PUT",
    body: { set_number: setNumber, score_a: scoreA, score_b: scoreB },
  });
  return organizerMatchSchema.parse(raw.data);
}

/** Exige `idempotencyKey` — gerada uma vez por tentativa de finalização (CLAUDE.md §8). */
export async function finishMatch(slug: string, matchId: string, idempotencyKey: string): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(organizerMatchesPath(slug, `/${matchId}/finish`), {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return organizerMatchSchema.parse(raw.data);
}

export async function cancelMatch(slug: string, matchId: string): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(organizerMatchesPath(slug, `/${matchId}/cancel`), {
    method: "POST",
  });
  return organizerMatchSchema.parse(raw.data);
}
