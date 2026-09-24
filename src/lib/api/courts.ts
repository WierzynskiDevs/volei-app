/**
 * Quadras do evento — organizador (ADR 0013 §2/§8, S8a).
 *
 * Fala com `/organizer/events/{slug}/courts`. Igual a `events.ts`: schema Zod
 * na fronteira, `queryOptions` para leitura, função simples para escrita.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest, type ResourceCollection } from "./client";
import { queryKeys } from "./query-keys";

const courtSchema = z.object({
  id: z.string(),
  label: z.string(),
  position: z.number().int(),
});

export type ApiCourt = z.infer<typeof courtSchema>;

function courtsPath(slug: string): string {
  return `/organizer/events/${encodeURIComponent(slug)}/courts`;
}

async function fetchCourts(slug: string, signal?: AbortSignal): Promise<ApiCourt[]> {
  const raw = await apiRequest<ResourceCollection<unknown>>(courtsPath(slug), { signal });
  return raw.data.map((item) => courtSchema.parse(item));
}

export const courtsQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.courts.byEvent(slug),
    queryFn: ({ signal }) => fetchCourts(slug, signal),
  });

/** Substitui o conjunto inteiro de quadras do evento pelos rótulos informados. */
export async function replaceCourts(slug: string, labels: string[]): Promise<ApiCourt[]> {
  const raw = await apiRequest<ResourceCollection<unknown>>(courtsPath(slug), {
    method: "PUT",
    body: { courts: labels },
  });
  return raw.data.map((item) => courtSchema.parse(item));
}
