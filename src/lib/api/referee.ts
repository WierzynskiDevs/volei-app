/**
 * Sessão e ciclo de vida do juiz por token (ADR 0013 §5/§7/§8).
 *
 * Autenticação por Bearer token, nunca cookie (`referee-session` no backend
 * é deliberadamente separado de `auth:sanctum` — ver `EnsureRefereeSession`).
 * Por isso este módulo não reaproveita o fluxo de CSRF/cookie do resto da
 * API: cada chamada carrega o token explicitamente no header `Authorization`.
 *
 * Reaproveita `organizerMatchSchema`/`ApiOrganizerMatch` de `./matches`: o
 * backend devolve o juiz com o mesmo `MatchResource` do organizador (o juiz
 * está operando a própria partida, tem direito ao mesmo nível de detalhe).
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest, type Resource, type ResourceCollection } from "./client";
import { organizerMatchSchema, type ApiOrganizerMatch } from "./matches";

export type { ApiOrganizerMatch };
import { queryKeys } from "./query-keys";

const invitationSchema = z.object({
  referee_name: z.string(),
  event_name: z.string().nullable(),
  court_label: z.string().nullable(),
  already_accepted: z.boolean(),
});

export type RefereeInvitation = z.infer<typeof invitationSchema>;

/** `GET /referee-invitations/{token}` — pública, sem sessão. */
export async function fetchRefereeInvitation(token: string): Promise<RefereeInvitation> {
  const raw = await apiRequest<Resource<unknown>>(
    `/referee-invitations/${encodeURIComponent(token)}`,
  );
  return invitationSchema.parse(raw.data);
}

const acceptedSchema = z.object({
  referee_name: z.string(),
  accepted_at: z.string().nullable(),
  session_token: z.string(),
});

export type AcceptedRefereeInvitation = z.infer<typeof acceptedSchema>;

/**
 * `POST /referee-invitations/{token}/accept` — o `session_token` só aparece
 * nesta resposta, nunca mais recuperável depois (mesma regra do `apiKey` de
 * subconta Asaas). Quem chama é responsável por persistir.
 */
export async function acceptRefereeInvitation(token: string): Promise<AcceptedRefereeInvitation> {
  const raw = await apiRequest<Resource<unknown>>(
    `/referee-invitations/${encodeURIComponent(token)}/accept`,
    { method: "POST" },
  );
  return acceptedSchema.parse(raw.data);
}

function authHeader(sessionToken: string): Record<string, string> {
  return { Authorization: `Bearer ${sessionToken}` };
}

async function fetchRefereeMatches(
  sessionToken: string,
  signal?: AbortSignal,
): Promise<ApiOrganizerMatch[]> {
  const raw = await apiRequest<ResourceCollection<unknown>>("/referee/matches", {
    signal,
    headers: authHeader(sessionToken),
  });
  return raw.data.map((item) => organizerMatchSchema.parse(item));
}

export const refereeMatchesQuery = (sessionToken: string) =>
  queryOptions({
    queryKey: queryKeys.refereeMatches.mine(sessionToken),
    queryFn: ({ signal }) => fetchRefereeMatches(sessionToken, signal),
    enabled: sessionToken !== "",
  });

/** Exige `idempotencyKey` — gerada uma vez por tentativa de início (CLAUDE.md §8). */
export async function startRefereeMatch(
  sessionToken: string,
  matchId: string,
  idempotencyKey: string,
): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(`/referee/matches/${matchId}/start`, {
    method: "POST",
    headers: { ...authHeader(sessionToken), "Idempotency-Key": idempotencyKey },
  });
  return organizerMatchSchema.parse(raw.data);
}

/** Um set por chamada — placar final, nunca ponto a ponto (ATA §17). */
export async function recordRefereeMatchSet(
  sessionToken: string,
  matchId: string,
  setNumber: number,
  scoreA: number,
  scoreB: number,
): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(`/referee/matches/${matchId}/sets`, {
    method: "PUT",
    body: { set_number: setNumber, score_a: scoreA, score_b: scoreB },
    headers: authHeader(sessionToken),
  });
  return organizerMatchSchema.parse(raw.data);
}

/** Exige `idempotencyKey`. Backend recusa (422) se os sets não decidem a partida ainda. */
export async function finishRefereeMatch(
  sessionToken: string,
  matchId: string,
  idempotencyKey: string,
): Promise<ApiOrganizerMatch> {
  const raw = await apiRequest<Resource<unknown>>(`/referee/matches/${matchId}/finish`, {
    method: "POST",
    headers: { ...authHeader(sessionToken), "Idempotency-Key": idempotencyKey },
  });
  return organizerMatchSchema.parse(raw.data);
}
