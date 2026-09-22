/**
 * Plano do organizador na camada de API.
 *
 * Consumidor: `/organizador/plano`.
 *
 * Só leitura. Trocar de plano tem efeito financeiro versionado (§7.8) e ainda
 * não tem desenho — a tela mostra os planos, e a contratação acontece fora do
 * produto. Um botão que "muda o plano" sem backend seria promessa falsa.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest, type Resource } from "./client";

const planSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  monthly_price_cents: z.number().int(),
  platform_fee_basis_points: z.number().int(),
  platform_fee_fixed_cents: z.number().int(),
  /** `null` = ilimitado. Diferente de zero, que seria "não pode criar nada". */
  event_limit: z.number().int().nullable(),
  registration_limit: z.number().int().nullable(),
  features: z.array(z.string()).nullable(),
});

export type ApiPlan = z.infer<typeof planSchema>;

const organizerPlanSchema = z.object({
  organizer: z.object({
    id: z.string(),
    name: z.string(),
    payment_account_status: z.enum(["LINKED", "PENDING", "NOT_LINKED"]),
    payment_account_status_label: z.string(),
    can_receive_payments: z.boolean(),
  }),
  current_plan_code: z.string().nullable(),
  available: z.array(planSchema),
  history: z.array(
    z.object({
      id: z.string(),
      plan_code: z.string().nullable(),
      plan_name: z.string().nullable(),
      /** Taxa vigente à época — é ela que explica a alíquota de cobranças antigas. */
      platform_fee_basis_points: z.number().int(),
      note: z.string().nullable(),
      effective_at: z.string().nullable(),
    }),
  ),
});

export type OrganizerPlan = z.infer<typeof organizerPlanSchema>;

export const organizerPlanQuery = () =>
  queryOptions({
    queryKey: ["organizer", "plan"] as const,
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Resource<unknown>>("/organizer/plan", { signal });
      return organizerPlanSchema.parse(body.data);
    },
  });
