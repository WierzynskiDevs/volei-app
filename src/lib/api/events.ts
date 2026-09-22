/**
 * Módulo de eventos da camada de API.
 *
 * Duas responsabilidades, e só estas:
 *
 *  1. Falar com `/api/v1/events` e `/api/v1/organizer/events`.
 *  2. Traduzir o contrato da API (enums em inglês, ISO 8601, centavos) para o
 *     formato que as telas já consomem (`EventItem`), preservando exatamente os
 *     textos do baseline.
 *
 * A tradução mora aqui de propósito: assim nenhum componente visual precisou
 * mudar para passar a exibir dado real. Rótulo é apresentação (CLAUDE.md §15) —
 * regra de negócio continua toda no backend.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import type { Category, EventItem, EventStatus, SkillLevel } from "@/lib/mock-data";

import { apiRequest, type Paginated, type Resource } from "./client";
import { eventDateLabel, deadlineLabel, feeLabel } from "./format";
import { queryKeys, type EventListFilters } from "./query-keys";

/* ------------------------------------------------------------------ *
 * Contrato da API
 * ------------------------------------------------------------------ */

/**
 * Validação de fronteira com Zod (CLAUDE.md §15).
 *
 * Evento é fronteira crítica: dele saem preço, vagas e prazo. Uma resposta
 * inesperada precisa falhar visivelmente aqui, e não virar `undefined` que a
 * tela renderiza como se fosse dado.
 */
const eventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  organizer: z.object({ id: z.string(), name: z.string(), slug: z.string() }).nullish(),
  venue_name: z.string(),
  city: z.string(),
  state: z.string(),
  timezone: z.string(),
  start_at: z.string(),
  end_at: z.string(),
  registration_open_at: z.string().nullable(),
  registration_close_at: z.string().nullable(),
  registration_fee_cents: z.number().int(),
  max_teams: z.number().int().nullable(),
  teams_registered_count: z.number().int(),
  remaining_team_slots: z.number().int().nullable(),
  courts: z.number().int(),
  min_games: z.number().int(),
  format: z.string().nullable(),
  modality: z.enum(["TWO_VS_TWO", "TWO_VS_TWO_ROTATING", "FOUR_VS_FOUR"]),
  gender_category: z.enum(["MALE", "FEMALE", "MIXED", "OPEN"]),
  level_category: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "OPEN", "A_PLUS_B", "FREE"]),
  age_category: z.enum(["ADULT", "TEEN", "CHILD"]),
  event_type: z.enum(["COMPETITIVE", "SOCIAL", "RANKING", "FRIENDLY", "LEAGUE", "SPECIAL"]),
  prize_description: z.string().nullable(),
  rules: z.array(z.string()),
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "REGISTRATION_OPEN",
    "REGISTRATION_CLOSED",
    "AWAITING_DRAW",
    "BRACKET_PUBLISHED",
    "IN_PROGRESS",
    "FINISHED",
    "CANCELLED",
  ]),
  published_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  created_at: z.string().nullable(),
});

export type ApiEvent = z.infer<typeof eventSchema>;

/* ------------------------------------------------------------------ *
 * Tradução enum → rótulo do baseline
 *
 * Os enums do backend seguem o BRIEF (docs/DIVERGENCES.md §3); a UI exibe os
 * rótulos em português que sempre exibiu. Nenhum pixel muda.
 * ------------------------------------------------------------------ */

const STATUS_LABEL: Record<ApiEvent["status"], EventStatus> = {
  DRAFT: "RASCUNHO",
  PUBLISHED: "PUBLICADO",
  REGISTRATION_OPEN: "INSCRICOES_ABERTAS",
  REGISTRATION_CLOSED: "INSCRICOES_ENCERRADAS",
  AWAITING_DRAW: "AGUARDANDO_SORTEIO",
  BRACKET_PUBLISHED: "CHAVE_PUBLICADA",
  IN_PROGRESS: "EM_ANDAMENTO",
  FINISHED: "FINALIZADO",
  CANCELLED: "CANCELADO",
};

const GENDER_LABEL: Record<ApiEvent["gender_category"], Category> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  MIXED: "Misto",
  OPEN: "Open",
};

const LEVEL_LABEL: Record<ApiEvent["level_category"], SkillLevel> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
  OPEN: "Open",
  A_PLUS_B: "A+B",
  FREE: "Livre",
};

const MODALITY_LABEL: Record<ApiEvent["modality"], string> = {
  TWO_VS_TWO: "2x2",
  TWO_VS_TWO_ROTATING: "2x2 rotativo",
  FOUR_VS_FOUR: "4x4",
};

const TYPE_LABEL: Record<ApiEvent["event_type"], EventItem["eventType"]> = {
  COMPETITIVE: "COMPETITIVO",
  SOCIAL: "SOCIAL",
  RANKING: "RANKING",
  FRIENDLY: "AMISTOSO",
  LEAGUE: "LIGA",
  SPECIAL: "ESPECIAL",
};

/** Caminho inverso: o que a tela oferece → o que a API aceita. */
export const GENDER_VALUE: Record<Category, ApiEvent["gender_category"]> = {
  Masculino: "MALE",
  Feminino: "FEMALE",
  Misto: "MIXED",
  Open: "OPEN",
};

export const LEVEL_VALUE: Record<SkillLevel, ApiEvent["level_category"]> = {
  Iniciante: "BEGINNER",
  Intermediário: "INTERMEDIATE",
  Avançado: "ADVANCED",
  Open: "OPEN",
  "A+B": "A_PLUS_B",
  Livre: "FREE",
};

/**
 * Converte o recurso da API no formato que os componentes já consomem.
 *
 * `dateLabel`, `fee` e `registrationClose` deixam de ser dado e voltam a ser o
 * que sempre deveriam ter sido: texto derivado (docs/DIVERGENCES.md §8).
 */
/**
 * O `EventItem` do baseline guarda o preço só como texto (`fee: "R$ 130 / jogador"`),
 * porque no protótipo ele nunca precisou ser número. As telas de inscrição e
 * pagamento precisam do valor em **centavos** (CLAUDE.md §7), então ele viaja
 * junto como campo extra — sem alterar o tipo do baseline nem os mocks.
 */
export type EventItemWithFee = EventItem & { feeCents: number };

export function toEventItem(event: ApiEvent): EventItemWithFee {
  return {
    feeCents: event.registration_fee_cents,
    id: event.id,
    slug: event.slug,
    name: event.name,
    organizer: event.organizer?.name ?? "",
    city: event.city,
    state: event.state,
    venue: event.venue_name,
    date: event.start_at.slice(0, 10),
    dateLabel: eventDateLabel(event.start_at),
    format: event.format ?? "",
    modality: MODALITY_LABEL[event.modality],
    category: GENDER_LABEL[event.gender_category],
    level: LEVEL_LABEL[event.level_category],
    status: STATUS_LABEL[event.status],
    eventType: TYPE_LABEL[event.event_type],
    fee: feeLabel(event.registration_fee_cents),
    prize: event.prize_description ?? "",
    teamsRegistered: event.teams_registered_count,
    maxTeams: event.max_teams,
    courts: event.courts,
    registrationClose: deadlineLabel(event.registration_close_at),
    rules: event.rules,
  };
}

/* ------------------------------------------------------------------ *
 * Leitura
 * ------------------------------------------------------------------ */

const listSchema = z.object({
  data: z.array(eventSchema),
  meta: z.object({
    current_page: z.number(),
    last_page: z.number(),
    per_page: z.number(),
    total: z.number(),
  }),
});

export type EventList = { items: EventItem[]; total: number };

async function fetchEvents(filters: EventListFilters, signal?: AbortSignal): Promise<EventList> {
  const raw = await apiRequest<Paginated<ApiEvent>>("/events", { query: filters, signal });
  const parsed = listSchema.parse(raw);

  return { items: parsed.data.map(toEventItem), total: parsed.meta.total };
}

/** Vitrine pública. Os filtros vão para o servidor — a lista é paginada lá. */
export const eventsQuery = (filters: EventListFilters = {}) =>
  queryOptions({
    queryKey: queryKeys.events.list(filters),
    queryFn: ({ signal }) => fetchEvents(filters, signal),
  });

export const eventBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.events.detail(slug),
    queryFn: async ({ signal }) => {
      const raw = await apiRequest<Resource<ApiEvent>>(`/events/${encodeURIComponent(slug)}`, {
        signal,
      });
      return toEventItem(eventSchema.parse(raw.data));
    },
  });

/** Painel do organizador: inclui rascunho, que a vitrine nunca mostra. */
export const organizerEventsQuery = (status?: string) =>
  queryOptions({
    queryKey: queryKeys.organizerEvents.list(status),
    queryFn: async ({ signal }) => {
      const raw = await apiRequest<Paginated<ApiEvent>>("/organizer/events", {
        query: { status, per_page: 50 },
        signal,
      });
      const parsed = listSchema.parse(raw);

      return { items: parsed.data.map(toEventItem), total: parsed.meta.total };
    },
  });

/* ------------------------------------------------------------------ *
 * Escrita
 * ------------------------------------------------------------------ */

/** Corpo aceito por `POST /organizer/events` (espelha o SaveEventRequest). */
export type SaveEventPayload = {
  name: string;
  description?: string | null | undefined;
  venue_name: string;
  city: string;
  state: string;
  date: string;
  start_time: string;
  end_time: string;
  registration_open_at?: string | null | undefined;
  registration_close_at?: string | null | undefined;
  registration_fee_cents: number;
  max_teams: number | null;
  courts: number;
  min_games: number;
  format?: string | null | undefined;
  modality: ApiEvent["modality"];
  gender_category: ApiEvent["gender_category"];
  level_category: ApiEvent["level_category"];
  event_type: ApiEvent["event_type"];
  prize_description?: string | null | undefined;
  rules?: string[] | undefined;
  justification?: string | undefined;
};

/**
 * O evento do organizador **cru**, sem passar pelo adaptador do baseline.
 *
 * Consumidor: `/organizador/alterar-evento/{slug}`. O formulário precisa dos
 * campos como a API os define — modalidade, categorias, quadras, valor — porque
 * a atualização reenvia o payload inteiro. `toEventItem()` é bom para exibir e
 * ruim para reeditar: ele já traduziu tudo para o vocabulário da tela, e
 * traduzir de volta perderia informação.
 */
export const organizerEventBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.organizerEvents.detail(slug),
    queryFn: async ({ signal }) => {
      const raw = await apiRequest<Resource<ApiEvent>>(
        `/organizer/events/${encodeURIComponent(slug)}`,
        { signal },
      );
      return eventSchema.parse(raw.data);
    },
  });

export async function createEvent(payload: SaveEventPayload): Promise<EventItem> {
  const raw = await apiRequest<Resource<ApiEvent>>("/organizer/events", {
    method: "POST",
    body: payload,
  });
  return toEventItem(eventSchema.parse(raw.data));
}

export async function updateEvent(slug: string, payload: SaveEventPayload): Promise<EventItem> {
  const raw = await apiRequest<Resource<ApiEvent>>(
    `/organizer/events/${encodeURIComponent(slug)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
  return toEventItem(eventSchema.parse(raw.data));
}

async function transition(slug: string, action: string, body?: unknown): Promise<EventItem> {
  const raw = await apiRequest<Resource<ApiEvent>>(
    `/organizer/events/${encodeURIComponent(slug)}/${action}`,
    { method: "POST", body },
  );
  return toEventItem(eventSchema.parse(raw.data));
}

export const publishEvent = (slug: string) => transition(slug, "publish");
export const openRegistrations = (slug: string) => transition(slug, "open-registrations");
export const closeRegistrations = (slug: string) => transition(slug, "close-registrations");
export const cancelEvent = (slug: string, justification: string) =>
  transition(slug, "cancel", { justification });
