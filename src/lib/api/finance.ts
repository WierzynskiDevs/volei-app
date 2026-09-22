/**
 * Financeiro do organizador na camada de API.
 *
 * Consumidor: `/organizador/financeiro`.
 *
 * O escopo é sempre a sessão — não existe parâmetro de organizador nesta rota,
 * e é isso que fecha o IDOR (CLAUDE.md §10). Nenhum cálculo acontece aqui: os
 * valores vêm do ledger, já congelados (§7.5).
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest, type Resource } from "./client";

const totalsSchema = z.object({
  gross_cents: z.number().int(),
  platform_fee_cents: z.number().int(),
  asaas_fee_cents: z.number().int(),
  organizer_net_cents: z.number().int(),
  refunded_cents: z.number().int(),
  chargeback_cents: z.number().int(),
  /**
   * `false` = há cobrança confirmada cuja taxa do gateway ainda não veio. O
   * líquido não fecha, e a tela precisa dizer isso em vez de exibir um número
   * que parece completo (ADR 0009 §5).
   */
  net_is_complete: z.boolean(),
});

export type OrganizerFinanceTotals = z.infer<typeof totalsSchema>;

const organizerFinanceSchema = z.object({
  organizer: z.object({
    id: z.string(),
    name: z.string(),
    plan: z
      .object({
        code: z.string(),
        name: z.string(),
        platform_fee_basis_points: z.number().int(),
      })
      .nullable(),
    payment_account_status: z.enum(["LINKED", "PENDING", "NOT_LINKED"]),
    can_receive_payments: z.boolean(),
  }),
  totals: totalsSchema,
  /** Cobranças em aberto — expectativa, nunca somada aos totais. */
  pending: z.object({ count: z.number().int(), gross_cents: z.number().int() }),
  paid_count: z.number().int(),
  by_event: z.array(
    totalsSchema.extend({
      event_id: z.string(),
      event_name: z.string().nullable(),
      event_slug: z.string().nullable(),
      paid_count: z.number().int(),
      pending_count: z.number().int(),
    }),
  ),
});

export type OrganizerFinance = z.infer<typeof organizerFinanceSchema>;

export const organizerFinanceQuery = () =>
  queryOptions({
    queryKey: ["organizer", "finance"] as const,
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Resource<unknown>>("/organizer/finance", { signal });
      return organizerFinanceSchema.parse(body.data);
    },
    // Saldo não é cacheável (CLAUDE.md §20).
    staleTime: 0,
  });

/**
 * Saldo do organizador: líquido menos o que voltou.
 *
 * Existe como função nomeada e não espalhada em JSX porque é a única conta que
 * a tela faz — e ela é subtração de valores que o backend já entregou prontos,
 * não recálculo de taxa (§27.6).
 */
export function balanceCents(totals: OrganizerFinanceTotals): number {
  return totals.organizer_net_cents - totals.refunded_cents - totals.chargeback_cents;
}

/**
 * Índice por `event_id`, para a lista de eventos casar cada linha com o seu
 * financeiro sem varrer o array a cada render.
 */
export function financeByEventId(
  finance: OrganizerFinance | undefined,
): Record<string, OrganizerFinance["by_event"][number]> {
  const out: Record<string, OrganizerFinance["by_event"][number]> = {};
  for (const row of finance?.by_event ?? []) out[row.event_id] = row;
  return out;
}
