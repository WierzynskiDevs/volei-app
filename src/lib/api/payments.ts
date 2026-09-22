/**
 * Módulo de pagamentos da camada de API.
 *
 * Consumidor: `/checkout/{slug}`.
 *
 * ## Duas regras que este arquivo existe para não deixar quebrar
 *
 * 1. **`Idempotency-Key` é obrigatório** na criação da cobrança (CLAUDE.md §8).
 *    A chave é gerada uma vez por tentativa de checkout e **reusada** enquanto a
 *    pessoa estiver na mesma tela: chave repetida devolve a mesma resposta, sem
 *    criar segunda cobrança no gateway. É isso que faz o duplo clique ser
 *    inofensivo.
 *
 * 2. **A confirmação nunca vem daqui.** `createPayment` devolve uma cobrança
 *    `PENDING`; quem move o estado é o webhook verificado ou a reconciliação
 *    (§14). A tela consulta `paymentQuery` até o backend dizer que confirmou —
 *    e o "confirmado" é sempre do backend, nunca do retorno visual do gateway.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest, type Resource } from "./client";
import { queryKeys } from "./query-keys";

/* ------------------------------------------------------------------ *
 * Contrato da API
 * ------------------------------------------------------------------ */

export const PAYMENT_STATUSES = [
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "RECEIVED",
  "OVERDUE",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CHARGEBACK",
] as const;

export const PAYMENT_METHODS = ["PIX", "CREDIT_CARD", "BOLETO"] as const;

/**
 * Fronteira crítica: aqui trafega dinheiro, então a resposta é validada.
 *
 * Os valores em centavos que podem ser `null` significam **desconhecido**, não
 * zero (ADR 0009 §5): a taxa do gateway só existe depois que o Asaas responde.
 * A tela mostra "indisponível", nunca R$ 0,00.
 */
const paymentSchema = z.object({
  id: z.string(),
  registration_id: z.string(),
  event_id: z.string(),

  status: z.enum(PAYMENT_STATUSES),
  status_label: z.string(),
  method: z.enum(PAYMENT_METHODS),
  method_label: z.string(),

  gross_cents: z.number().int(),
  platform_fee_cents: z.number().int(),
  platform_fee_basis_points: z.number().int(),
  asaas_fee_cents: z.number().int().nullable(),
  organizer_net_cents: z.number().int().nullable(),
  refunded_cents: z.number().int(),

  /*
   * Três respostas que o backend dá prontas, para a tela não deduzir de
   * `status`. Deduzir erraria: `CONFIRMED` parece "dinheiro na conta" e não é —
   * no cartão, o valor só fica disponível 32 dias depois (ADR 0009 §2).
   */
  money_is_available: z.boolean(),
  confirms_registration: z.boolean(),
  estimated_settlement_days: z.number().int(),

  checkout_url: z.string().nullable(),
  pix_payload: z.string().nullable(),

  due_at: z.string(),
  confirmed_at: z.string().nullable(),
  received_at: z.string().nullable(),
  refunded_at: z.string().nullable(),
  failure_reason: z.string().nullable(),
  created_at: z.string().nullable(),
});

export type ApiPayment = z.infer<typeof paymentSchema>;
export type PaymentStatus = ApiPayment["status"];
export type PaymentMethod = ApiPayment["method"];

/* ------------------------------------------------------------------ *
 * Leitura
 * ------------------------------------------------------------------ */

/**
 * Consulta a cobrança.
 *
 * `refetchInterval` enquanto a cobrança está aberta: PIX confirma em segundos e
 * a confirmação chega por webhook, não por resposta desta chamada. Parar de
 * consultar assim que o estado é terminal evita bater no servidor para sempre
 * numa aba esquecida aberta.
 */
export const paymentQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.payments.detail(id),
    queryFn: async ({ signal }) => {
      const body = await apiRequest<Resource<unknown>>(`/payments/${id}`, { signal });
      return paymentSchema.parse(body.data);
    },
    // Nunca cachear status de pagamento (CLAUDE.md §20).
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      return status === "PENDING" || status === "DRAFT" ? 5_000 : false;
    },
  });

/* ------------------------------------------------------------------ *
 * Escrita
 * ------------------------------------------------------------------ */

export type CreatePaymentPayload = {
  method: PaymentMethod;
};

/**
 * Cria a cobrança da inscrição.
 *
 * `idempotencyKey` é responsabilidade de quem chama, e de propósito: a tela
 * precisa reusar a MESMA chave quando o usuário clica duas vezes ou quando a
 * rede falha e ele tenta de novo. Gerar aqui dentro criaria uma chave nova a
 * cada chamada, que é exatamente o que a idempotência existe para impedir.
 */
export async function createPayment(
  registrationId: string,
  payload: CreatePaymentPayload,
  idempotencyKey: string,
): Promise<ApiPayment> {
  const body = await apiRequest<Resource<unknown>>(`/registrations/${registrationId}/payments`, {
    method: "POST",
    body: payload,
    headers: { "Idempotency-Key": idempotencyKey },
  });

  return paymentSchema.parse(body.data);
}

/* ------------------------------------------------------------------ *
 * Apresentação
 * ------------------------------------------------------------------ */

/**
 * Ainda dá para pagar — a reserva de vaga continua valendo (ADR 0003).
 *
 * Note que não existe aqui um `isSettled()`: essa pergunta o backend já responde
 * em `confirms_registration`, e reimplementá-la no cliente criaria uma segunda
 * definição de "pago" que divergiria da do domínio (CLAUDE.md §27.6).
 */
export function isAwaitingPayment(status: PaymentStatus): boolean {
  return status === "DRAFT" || status === "PENDING" || status === "OVERDUE";
}
