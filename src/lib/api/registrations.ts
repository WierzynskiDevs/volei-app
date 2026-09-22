/**
 * Módulo de inscrições da camada de API.
 *
 * Consumidores: `/inscricao/{slug}` (criar), `/organizador` (fila de análise de
 * nível) e `/minhas-inscricoes`.
 *
 * Nenhuma regra vive aqui: quem decide vaga, duplicidade, análise de nível e
 * confirmação é o backend (CLAUDE.md §15 e §27.6). Este arquivo só fala HTTP e
 * traduz o contrato para o formato que as telas já consomem.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest, type Paginated, type Resource } from "./client";
import { queryKeys } from "./query-keys";

/* ------------------------------------------------------------------ *
 * Contrato da API
 * ------------------------------------------------------------------ */

/**
 * Validação de fronteira com Zod (CLAUDE.md §15).
 *
 * Inscrição é fronteira crítica: dela sai o estado que decide se a pessoa tem
 * vaga. Resposta inesperada precisa falhar visivelmente em desenvolvimento em
 * vez de virar `undefined` que a tela renderiza como se fosse dado.
 */
const registrationSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  user_id: z.string(),
  group_id: z.string().nullable(),
  is_captain: z.boolean(),
  partner_mode: z.enum(["PARTNER", "SEEKING", "INDIVIDUAL"]),

  status: z.enum([
    "PENDING_ACCEPTANCE",
    "PENDING_PAYMENT",
    "CONFIRMED",
    "CANCELLED",
    "EXPIRED",
  ]),
  status_label: z.string(),

  level_review: z.enum(["NOT_REQUIRED", "REQUIRED", "APPROVED", "REJECTED"]),
  level_review_label: z.string(),
  player_level: z.string().nullable(),
  event_level: z.string(),
  level_review_decided_at: z.string().nullable(),
  level_review_reason: z.string().nullable(),

  reserved_until: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),

  /**
   * Cobrança mais recente da inscrição, composta pelo backend.
   *
   * `null` = nenhuma cobrança criada ainda (a pessoa começou a inscrição e não
   * foi ao checkout), que é diferente de cobrança de valor zero.
   */
  payment: z
    .object({
      id: z.string(),
      status: z.string(),
      status_label: z.string(),
      method: z.string(),
      method_label: z.string(),
      gross_cents: z.number().int(),
      confirms_registration: z.boolean(),
      due_at: z.string(),
      confirmed_at: z.string().nullable(),
      created_at: z.string().nullable(),
    })
    .nullish(),

  player: z
    .object({ id: z.string(), name: z.string(), level: z.string().nullable() })
    .nullish(),

  group: z
    .object({
      id: z.string(),
      display_name: z.string(),
      status: z.enum(["FORMING", "COMPLETE", "INCOMPLETE", "CANCELLED"]),
      status_label: z.string(),
      members: z
        .array(
          z.object({
            registration_id: z.string(),
            name: z.string().nullable(),
            status: z.string(),
            is_captain: z.boolean(),
          }),
        )
        .nullable(),
    })
    .nullish(),

  event: z
    .object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      start_at: z.string(),
      registration_fee_cents: z.number().int(),
    })
    .nullish(),

  created_at: z.string().nullable(),
});

export type ApiRegistration = z.infer<typeof registrationSchema>;

export type PartnerMode = ApiRegistration["partner_mode"];
export type LevelReviewStatus = ApiRegistration["level_review"];

/* ------------------------------------------------------------------ *
 * Leitura
 * ------------------------------------------------------------------ */

type RegistrationList = { items: ApiRegistration[]; total: number };

async function fetchList(
  path: string,
  query: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<RegistrationList> {
  const response = await apiRequest<Paginated<unknown>>(path, {
    query,
    ...(signal ? { signal } : {}),
  });

  return {
    items: response.data.map((item) => registrationSchema.parse(item)),
    total: response.meta.total,
  };
}

/** Minhas inscrições — consumidor: `/minhas-inscricoes`. */
export const myRegistrationsQuery = () =>
  queryOptions({
    queryKey: queryKeys.registrations.mine(),
    queryFn: ({ signal }) => fetchList("/me/registrations", {}, signal),
  });

/**
 * Fila de análise de nível do organizador, de todos os eventos dele.
 *
 * Consumidor: painel "Inscrição aguardando análise" em `/organizador`. O escopo
 * vem da sessão no servidor — a tela não envia e não poderia enviar o id de
 * outro organizador.
 */
/**
 * Inscrições de todos os eventos do organizador, com a cobrança de cada uma.
 *
 * Consumidor: `/organizador/inscricoes`. `paymentGroup` é o filtro por status de
 * pagamento das abas — o backend resolve quais inscrições têm cobrança naquele
 * grupo, porque quem sabe disso é o módulo de pagamentos.
 */
export const organizerRegistrationsQuery = (paymentGroup?: string) =>
  queryOptions({
    queryKey: [...queryKeys.registrations.all, "organizer", paymentGroup ?? "all"] as const,
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Paginated<unknown>>("/organizer/registrations", {
        signal,
        query: { payment_group: paymentGroup },
      });
      return {
        items: body.data.map((row) => registrationSchema.parse(row)),
        total: body.meta.total,
      };
    },
    // Status de pagamento não é cacheável (CLAUDE.md §20).
    staleTime: 0,
  });

export const levelReviewQueueQuery = (levelReview: LevelReviewStatus = "REQUIRED") =>
  queryOptions({
    queryKey: queryKeys.registrations.queue(levelReview),
    queryFn: ({ signal }) =>
      fetchList("/organizer/registrations", { level_review: levelReview }, signal),
  });

/** Inscritos de um evento — consumidor: painel do organizador por evento. */
export const eventRegistrationsQuery = (slug: string, filters: { status?: string } = {}) =>
  queryOptions({
    queryKey: queryKeys.registrations.byEvent(slug, filters.status),
    queryFn: ({ signal }) =>
      fetchList(
        `/organizer/events/${encodeURIComponent(slug)}/registrations`,
        { status: filters.status },
        signal,
      ),
  });

/* ------------------------------------------------------------------ *
 * Escrita
 * ------------------------------------------------------------------ */

export type CreateRegistrationPayload = {
  partner_mode: PartnerMode;
  /** Só no modo `PARTNER`; a API recusa nos outros. */
  partner_user_id?: string | undefined;
  accept_rules: true;
};

export async function createRegistration(
  slug: string,
  payload: CreateRegistrationPayload,
): Promise<ApiRegistration> {
  const response = await apiRequest<Resource<unknown>>(
    `/events/${encodeURIComponent(slug)}/registrations`,
    { method: "POST", body: payload },
  );

  return registrationSchema.parse(response.data);
}

export async function cancelRegistration(
  id: string,
  reason?: string,
): Promise<ApiRegistration> {
  const response = await apiRequest<Resource<unknown>>(
    `/registrations/${encodeURIComponent(id)}`,
    { method: "DELETE", ...(reason ? { body: { reason } } : {}) },
  );

  return registrationSchema.parse(response.data);
}

/** Decisão do organizador sobre nível incompatível (aditivo §17). */
async function decideLevel(
  id: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<ApiRegistration> {
  const response = await apiRequest<Resource<unknown>>(
    `/organizer/registrations/${encodeURIComponent(id)}/${decision}`,
    { method: "POST", ...(reason ? { body: { reason } } : {}) },
  );

  return registrationSchema.parse(response.data);
}

export const approveRegistration = (id: string, reason?: string) =>
  decideLevel(id, "approve", reason);

export const rejectRegistration = (id: string, reason?: string) =>
  decideLevel(id, "reject", reason);

/* ------------------------------------------------------------------ *
 * Apresentação
 * ------------------------------------------------------------------ */

/**
 * Nome da dupla para exibição.
 *
 * O backend já devolve `group.display_name` resolvido; este helper cobre o caso
 * sem dupla (modos "encontrar parceiro" e "individual"), em que a tela mostra o
 * próprio atleta.
 */
export function teamLabel(registration: ApiRegistration): string {
  return registration.group?.display_name ?? registration.player?.name ?? "—";
}

/** Nome do parceiro, quando há dupla. */
export function partnerName(registration: ApiRegistration): string | null {
  const members = registration.group?.members ?? null;
  if (!members) return null;

  const other = members.find((m) => m.registration_id !== registration.id);
  return other?.name ?? null;
}
