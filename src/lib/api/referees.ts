/**
 * Juízes do evento — organizador (ADR 0013 §5/§6/§8, S8b).
 *
 * Fala com `/organizer/events/{slug}/referees`. `phone` chega em claro do
 * backend porque quem lê já passou pela Policy do evento (mesmo raciocínio
 * de `RefereeResource`) — ainda assim nunca aparece fora desta tela.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest, type Resource, type ResourceCollection } from "./client";
import { queryKeys } from "./query-keys";

const refereeSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  invite_status: z.enum(["NOT_SENT", "SENT", "ACCEPTED"]),
  invite_status_label: z.string(),
  court_id: z.string().nullable(),
  invited_at: z.string().nullable(),
  accepted_at: z.string().nullable(),
});

export type ApiReferee = z.infer<typeof refereeSchema>;

function refereesPath(slug: string, suffix = ""): string {
  return `/organizer/events/${encodeURIComponent(slug)}/referees${suffix}`;
}

async function fetchReferees(slug: string, signal?: AbortSignal): Promise<ApiReferee[]> {
  const raw = await apiRequest<ResourceCollection<unknown>>(refereesPath(slug), { signal });
  return raw.data.map((item) => refereeSchema.parse(item));
}

export const refereesQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.referees.byEvent(slug),
    queryFn: ({ signal }) => fetchReferees(slug, signal),
  });

export async function addReferee(slug: string, name: string, phone: string): Promise<ApiReferee> {
  const raw = await apiRequest<Resource<unknown>>(refereesPath(slug), {
    method: "POST",
    body: { name, phone },
  });
  return refereeSchema.parse(raw.data);
}

/**
 * Único momento em que o token bruto do convite existe no cliente — a tela
 * é responsável por mostrá-lo/compartilhá-lo uma vez e descartar (ADR 0013
 * §5: nunca mais recuperável depois).
 */
export async function inviteReferee(
  slug: string,
  refereeId: string,
): Promise<{ referee: ApiReferee; inviteToken: string }> {
  const raw = await apiRequest<{ data: { referee: unknown; invite_token: string } }>(
    refereesPath(slug, `/${encodeURIComponent(refereeId)}/invite`),
    { method: "POST" },
  );
  return { referee: refereeSchema.parse(raw.data.referee), inviteToken: raw.data.invite_token };
}

export async function setRefereeCourt(
  slug: string,
  refereeId: string,
  courtId: string | null,
): Promise<ApiReferee> {
  const raw = await apiRequest<Resource<unknown>>(refereesPath(slug, `/${encodeURIComponent(refereeId)}`), {
    method: "PATCH",
    body: { court_id: courtId },
  });
  return refereeSchema.parse(raw.data);
}
