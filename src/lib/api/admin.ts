/**
 * Módulo de administração da camada de API (ADR 0010).
 *
 * Consumidores: as telas `/admin/*` que têm backend — dashboard, usuários,
 * organizadores, eventos, pagamentos, financeiro e auditoria.
 *
 * As demais telas `/admin` (reembolsos, planos, denúncias, feedbacks, arenas,
 * publicidade) **não** aparecem aqui: não têm endpoint, por decisão registrada
 * no ADR 0010 §1. Inventar chamada para elas seria criar contrato que o backend
 * não cumpre.
 *
 * Nenhuma regra vive neste arquivo. Quem decide quem pode ver o quê é o
 * backend: o middleware `super-admin` recusa qualquer outro papel, e o guard da
 * tela só evita mostrar o que seria negado (CLAUDE.md §15).
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest, type Paginated, type Resource } from "./client";
import { queryKeys } from "./query-keys";

/* ------------------------------------------------------------------ *
 * Dashboard global
 * ------------------------------------------------------------------ */

const financeTotalsSchema = z.object({
  gross_cents: z.number().int(),
  platform_revenue_cents: z.number().int(),
  asaas_fee_cents: z.number().int(),
  organizer_net_cents: z.number().int(),
  refunded_cents: z.number().int(),
  chargeback_cents: z.number().int(),
  /**
   * `false` = há pagamento confirmado sem taxa do gateway informada, então o
   * líquido não fecha. A tela mostra "indisponível" — nunca um número que
   * parece completo (ADR 0009 §5).
   */
  net_is_complete: z.boolean(),
});

export type FinanceTotals = z.infer<typeof financeTotalsSchema>;

const overviewSchema = z.object({
  users: z.object({
    total: z.number().int(),
    players: z.number().int(),
    organizers: z.number().int(),
    blocked: z.number().int(),
  }),
  organizers: z.object({ active: z.number().int() }),
  events: z.object({
    active: z.number().int(),
    finished: z.number().int(),
    draft: z.number().int(),
    cancelled: z.number().int(),
  }),
  payments: z.object({ by_status: z.record(z.string(), z.number().int()) }),
  finance: financeTotalsSchema.partial({
    refunded_cents: true,
    chargeback_cents: true,
  }),
});

export type AdminOverview = z.infer<typeof overviewSchema>;

export const adminOverviewQuery = () =>
  queryOptions({
    queryKey: queryKeys.admin.overview(),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Resource<unknown>>("/admin/overview", { signal });
      return overviewSchema.parse(body.data);
    },
    // Contagem de pagamento e saldo não são cacheáveis (CLAUDE.md §20).
    staleTime: 0,
  });

/* ------------------------------------------------------------------ *
 * Usuários
 * ------------------------------------------------------------------ */

export const USER_FILTERS = ["player", "organizer", "both", "active", "blocked"] as const;
export type AdminUserFilter = (typeof USER_FILTERS)[number];

const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  /** Mascarado no servidor. O valor completo nunca vem na listagem (§12). */
  phone_masked: z.string().nullable(),
  status: z.enum(["ACTIVE", "BLOCKED"]),
  status_label: z.string(),
  level: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  roles: z.array(z.enum(["PLAYER", "ORGANIZER", "SUPER_ADMIN"])).optional(),
  organizer: z
    .object({
      id: z.string(),
      name: z.string(),
      status: z.enum(["REGULAR", "ATTENTION", "BLOCKED"]),
      plan_code: z.string().nullable(),
    })
    .nullish(),
  created_at: z.string().nullable(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminUsersQuery = (filters: { filter?: AdminUserFilter; q?: string } = {}) =>
  queryOptions({
    queryKey: queryKeys.admin.users(filters),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Paginated<unknown>>("/admin/users", {
        signal,
        query: { filter: filters.filter, q: filters.q },
      });
      return { ...body, data: body.data.map((row) => adminUserSchema.parse(row)) };
    },
  });

/**
 * Suspende ou reativa uma conta.
 *
 * `reason` é obrigatório e tem mínimo de 10 caracteres — a API recusa com 422
 * sem ele, porque a trilha de auditoria sem motivo não sustenta contestação
 * (ADR 0010 §5).
 */
export async function setUserBlocked(
  id: string,
  blocked: boolean,
  reason: string,
): Promise<AdminUser> {
  const body = await apiRequest<Resource<unknown>>(
    `/admin/users/${id}/${blocked ? "block" : "unblock"}`,
    { method: "POST", body: { reason } },
  );
  return adminUserSchema.parse(body.data);
}

/* ------------------------------------------------------------------ *
 * Organizadores
 * ------------------------------------------------------------------ */

export const ORGANIZER_STATUSES = ["REGULAR", "ATTENTION", "BLOCKED"] as const;
export type OrganizerStatus = (typeof ORGANIZER_STATUSES)[number];

const adminOrganizerSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  contact_email: z.string().nullable(),
  status: z.enum(ORGANIZER_STATUSES),
  status_label: z.string(),
  payment_account_status: z.enum(["LINKED", "PENDING", "NOT_LINKED"]),
  payment_account_status_label: z.string(),
  can_receive_payments: z.boolean(),
  plan: z
    .object({
      code: z.string(),
      name: z.string(),
      /** Taxa VIGENTE do plano — não a das cobranças já emitidas (§7.5). */
      platform_fee_basis_points: z.number().int(),
    })
    .nullish(),
  owner: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      status: z.enum(["ACTIVE", "BLOCKED"]),
    })
    .nullish(),
  /** `null` quando a resposta não vem da listagem — não zero. */
  events_count: z.number().int().nullable(),
  finance: financeTotalsSchema.nullable(),
  /** Só na tela de detalhe: a listagem não carrega para não gerar N+1. */
  plan_history: z
    .array(
      z.object({
        id: z.string(),
        plan_code: z.string().nullable(),
        plan_name: z.string().nullable(),
        platform_fee_basis_points: z.number().int(),
        note: z.string().nullable(),
        effective_at: z.string().nullable(),
      }),
    )
    .optional(),
  created_at: z.string().nullable(),
});

export type AdminOrganizer = z.infer<typeof adminOrganizerSchema>;

export const adminOrganizersQuery = (filters: { status?: OrganizerStatus; q?: string } = {}) =>
  queryOptions({
    queryKey: queryKeys.admin.organizers(filters),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Paginated<unknown>>("/admin/organizers", {
        signal,
        query: { status: filters.status, q: filters.q },
      });
      return { ...body, data: body.data.map((row) => adminOrganizerSchema.parse(row)) };
    },
  });

export const adminOrganizerQuery = (id: string) =>
  queryOptions({
    queryKey: [...queryKeys.admin.all, "organizer", id] as const,
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Resource<unknown>>(`/admin/organizers/${id}`, { signal });
      return adminOrganizerSchema.parse(body.data);
    },
  });

export async function setOrganizerStatus(
  id: string,
  status: OrganizerStatus,
  reason: string,
): Promise<AdminOrganizer> {
  const body = await apiRequest<Resource<unknown>>(`/admin/organizers/${id}/status`, {
    method: "POST",
    body: { status, reason },
  });
  return adminOrganizerSchema.parse(body.data);
}

/* ------------------------------------------------------------------ *
 * Eventos
 * ------------------------------------------------------------------ */

const adminEventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  status: z.string(),
  status_label: z.string(),
  venue_name: z.string(),
  city: z.string(),
  state: z.string(),
  start_at: z.string(),
  end_at: z.string().nullable(),
  published_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  registration_fee_cents: z.number().int(),
  max_teams: z.number().int().nullable(),
  teams_registered_count: z.number().int(),
  organizer: z
    .object({ id: z.string(), name: z.string(), status: z.enum(ORGANIZER_STATUSES) })
    .nullish(),
  created_at: z.string().nullable(),
});

export type AdminEvent = z.infer<typeof adminEventSchema>;

export const EVENT_GROUPS = ["draft", "active", "running", "finished", "cancelled"] as const;
export type EventGroup = (typeof EVENT_GROUPS)[number];

/**
 * `group` é o filtro por conceito que as abas da tela usam — "Ativo" reúne
 * publicado, inscrições abertas e inscrições encerradas. `status` continua
 * disponível para um estado exato.
 */
export const adminEventsQuery = (filters: { group?: EventGroup; status?: string; q?: string } = {}) =>
  queryOptions({
    queryKey: queryKeys.admin.events(filters),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Paginated<unknown>>("/admin/events", {
        signal,
        query: { group: filters.group, status: filters.status, q: filters.q },
      });
      return { ...body, data: body.data.map((row) => adminEventSchema.parse(row)) };
    },
  });

/**
 * Cancela um evento.
 *
 * Passa pela mesma máquina de estados do organizador: evento já cancelado ou
 * finalizado devolve 409, e a tela mostra a mensagem do backend (ADR 0010 §2).
 */
export async function cancelEventAsAdmin(slug: string, reason: string): Promise<AdminEvent> {
  const body = await apiRequest<Resource<unknown>>(`/admin/events/${slug}/cancel`, {
    method: "POST",
    body: { reason },
  });
  return adminEventSchema.parse(body.data);
}

/* ------------------------------------------------------------------ *
 * Pagamentos
 * ------------------------------------------------------------------ */

export const PAYMENT_GROUPS = ["paid", "pending", "failed", "refunded", "chargeback"] as const;
export type PaymentGroup = (typeof PAYMENT_GROUPS)[number];

const adminPaymentSchema = z.object({
  id: z.string(),
  status: z.string(),
  status_label: z.string(),
  method: z.string(),
  method_label: z.string(),
  provider: z.string(),
  external_reference: z.string().nullable(),

  gross_cents: z.number().int(),
  platform_fee_cents: z.number().int(),
  platform_fee_basis_points: z.number().int(),
  asaas_fee_cents: z.number().int().nullable(),
  organizer_net_cents: z.number().int().nullable(),
  refunded_cents: z.number().int(),

  due_at: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  received_at: z.string().nullable(),
  refunded_at: z.string().nullable(),
  reconciled_at: z.string().nullable(),

  payer: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullish(),
  event: z.object({ id: z.string(), slug: z.string(), name: z.string() }).nullish(),
  organizer: z.object({ id: z.string(), name: z.string() }).nullish(),

  registration_id: z.string(),
  created_at: z.string().nullable(),
});

export type AdminPayment = z.infer<typeof adminPaymentSchema>;

export const adminPaymentsQuery = (
  filters: { group?: PaymentGroup; organizer_id?: string; event_id?: string } = {},
) =>
  queryOptions({
    queryKey: queryKeys.admin.payments(filters),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Paginated<unknown>>("/admin/payments", {
        signal,
        query: {
          group: filters.group,
          organizer_id: filters.organizer_id,
          event_id: filters.event_id,
        },
      });
      return { ...body, data: body.data.map((row) => adminPaymentSchema.parse(row)) };
    },
    staleTime: 0,
  });

export const adminPaymentQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.admin.payment(id),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Resource<unknown>>(`/admin/payments/${id}`, { signal });
      return adminPaymentSchema.parse(body.data);
    },
    staleTime: 0,
  });

/* ------------------------------------------------------------------ *
 * Financeiro consolidado
 * ------------------------------------------------------------------ */

const financeSummarySchema = z.object({
  period: z.object({ from: z.string().nullable(), to: z.string().nullable() }),
  platform: financeTotalsSchema,
  /**
   * Cobranças ainda abertas. Vêm de `payments`, não do ledger — dinheiro que
   * ainda não entrou não tem lançamento contábil. É expectativa, e a tela nunca
   * soma isso ao consolidado.
   */
  pending: z.object({ count: z.number().int(), gross_cents: z.number().int() }),
  by_month: z.array(financeTotalsSchema.extend({ period: z.string() })),
  by_organizer: z.array(
    financeTotalsSchema.extend({
      organizer_id: z.string(),
      organizer_name: z.string().nullable(),
      plan_code: z.string().nullable(),
      current_platform_fee_basis_points: z.number().int().nullable(),
    }),
  ),
  by_event: z.array(
    financeTotalsSchema.extend({
      event_id: z.string(),
      event_name: z.string().nullable(),
      event_slug: z.string().nullable(),
    }),
  ),
});

export type AdminFinanceSummary = z.infer<typeof financeSummarySchema>;

export const adminFinanceQuery = () =>
  queryOptions({
    queryKey: queryKeys.admin.finance(),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Resource<unknown>>("/admin/finance", { signal });
      return financeSummarySchema.parse(body.data);
    },
    staleTime: 0,
  });

/* ------------------------------------------------------------------ *
 * Auditoria
 * ------------------------------------------------------------------ */

const auditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  requires_justification: z.boolean(),
  target_type: z.string().nullable(),
  target_id: z.string().nullable(),
  actor: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullish(),
  actor_role: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ip: z.string().nullable(),
  user_agent: z.string().nullable(),
  request_id: z.string().nullable(),
  created_at: z.string().nullable(),
});

export type AdminAuditLog = z.infer<typeof auditLogSchema>;

export const adminAuditLogsQuery = (filters: { action?: string } = {}) =>
  queryOptions({
    queryKey: queryKeys.admin.auditLogs(filters),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Paginated<unknown>>("/admin/audit-logs", {
        signal,
        query: { action: filters.action },
      });
      return { ...body, data: body.data.map((row) => auditLogSchema.parse(row)) };
    },
  });

/**
 * Motivo registrado na ação, quando existe.
 *
 * O `metadata` é livre por natureza — cada ação grava o que faz sentido para
 * ela. A tela de auditoria tem uma coluna "Motivo", e é este acessor que a
 * preenche sem espalhar `metadata?.reason` por JSX afora.
 */
export function auditReason(log: AdminAuditLog): string | null {
  const reason = log.metadata?.["reason"];
  return typeof reason === "string" ? reason : null;
}
