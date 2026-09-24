/**
 * Sorteio/chaveamento inicial (ADR 0011).
 *
 * Fala com `/organizer/events/{slug}/bracket*` (organizador, autenticado) e,
 * mais abaixo, com `/events/{slug}/bracket` (público, ADR 0017/Q15). Igual a
 * `events.ts`/`registrations.ts`: schema Zod na fronteira, `queryOptions`
 * para leitura, função simples para escrita — a mutação em si fica na rota.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { ApiError, apiRequest, type Resource } from "./client";
import { queryKeys } from "./query-keys";

const registrationGroupSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  members: z.array(z.string()),
});

export type ApiBracketGroup = z.infer<typeof registrationGroupSchema>;

const slotSchema = z.object({
  position: z.number().int(),
  is_bye: z.boolean(),
  registration_group: registrationGroupSchema.nullable(),
});

const bracketSchema = z.object({
  event_status: z
    .enum(["REGISTRATION_CLOSED", "AWAITING_DRAW", "BRACKET_PUBLISHED"])
    .or(z.string()),
  bracket_size: z.number().int(),
  slots: z.array(slotSchema),
  eligible_groups: z.array(registrationGroupSchema),
});

export type ApiBracketSlot = z.infer<typeof slotSchema>;
export type ApiBracket = z.infer<typeof bracketSchema>;

function bracketPath(slug: string, suffix = ""): string {
  return `/organizer/events/${encodeURIComponent(slug)}/bracket${suffix}`;
}

async function fetchBracket(slug: string, signal?: AbortSignal): Promise<ApiBracket> {
  const raw = await apiRequest<Resource<ApiBracket>>(bracketPath(slug), { signal });
  return bracketSchema.parse(raw.data);
}

export const bracketQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.draws.detail(slug),
    queryFn: ({ signal }) => fetchBracket(slug, signal),
  });

async function post(slug: string, suffix: string): Promise<ApiBracket> {
  const raw = await apiRequest<Resource<ApiBracket>>(bracketPath(slug, suffix), { method: "POST" });
  return bracketSchema.parse(raw.data);
}

export const startDraw = (slug: string) => post(slug, "/start-draw");
export const randomizeDraw = (slug: string) => post(slug, "/randomize");
export const publishBracket = (slug: string) => post(slug, "/publish");

/** `registrationGroupId` nulo limpa a posição. */
export async function placeGroupInSlot(
  slug: string,
  position: number,
  registrationGroupId: string | null,
): Promise<ApiBracket> {
  const raw = await apiRequest<Resource<ApiBracket>>(bracketPath(slug, `/slots/${position}`), {
    method: "PATCH",
    body: { registration_group_id: registrationGroupId },
  });
  return bracketSchema.parse(raw.data);
}

/* ------------------------------------------------------------------ *
 * Chave pública do evento (ADR 0017, Q15)
 *
 * Allowlist deliberadamente mais estrita que a versão do organizador acima:
 * nunca `members` (lista de nomes completos) nem `eligible_groups` (dado de
 * trabalho do sorteio). Consumidor: aba "Chaveamento" de `eventos.$slug.tsx`.
 * ------------------------------------------------------------------ */

const publicRegistrationGroupSchema = z.object({
  id: z.string(),
  display_name: z.string(),
});

const publicSlotSchema = z.object({
  position: z.number().int(),
  is_bye: z.boolean(),
  registration_group: publicRegistrationGroupSchema.nullable(),
});

const publicBracketSchema = z.object({
  event_status: z.string(),
  bracket_size: z.number().int(),
  slots: z.array(publicSlotSchema),
});

export type ApiPublicBracket = z.infer<typeof publicBracketSchema>;

async function fetchPublicBracket(slug: string, signal?: AbortSignal): Promise<ApiPublicBracket> {
  const raw = await apiRequest<Resource<ApiPublicBracket>>(
    `/events/${encodeURIComponent(slug)}/bracket`,
    {
      signal,
    },
  );
  return publicBracketSchema.parse(raw.data);
}

/**
 * 404 antes de `BRACKET_PUBLISHED` é esperado (chave em rascunho, ADR 0011
 * §7) — não vale gastar 3 tentativas nele, só nos erros de fato inesperados.
 */
export const publicBracketQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.publicBracket.detail(slug),
    queryFn: ({ signal }) => fetchPublicBracket(slug, signal),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
