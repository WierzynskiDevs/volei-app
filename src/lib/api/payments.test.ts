/**
 * Checkout (CLAUDE.md §22: fluxo crítico). A regra que mais importa aqui é a
 * do §14: a confirmação NUNCA vem do retorno visual do checkout — o cliente só
 * sabe que pagou porque `refetchInterval` continua consultando o backend até
 * ele dizer que o estado deixou de ser transitório. É essa função pura que os
 * testes abaixo protegem.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPayment, isAwaitingPayment, paymentQuery, type ApiPayment } from "./payments";

/**
 * `refetchInterval` do React Query aceita número fixo OU função. Aqui é
 * sempre função (payments.ts) — o tipo é derivado da própria `paymentQuery`
 * em vez de reconstruído à mão, para nunca divergir da assinatura real.
 */
type RefetchIntervalFn = Extract<
  NonNullable<ReturnType<typeof paymentQuery>["refetchInterval"]>,
  (...args: never) => unknown
>;
type PaymentQuery = Parameters<RefetchIntervalFn>[0];

function basePayment(overrides: Partial<ApiPayment> = {}): ApiPayment {
  return {
    id: "pay_1",
    registration_id: "reg_1",
    event_id: "evt_1",
    status: "PENDING",
    status_label: "Aguardando pagamento",
    method: "PIX",
    method_label: "PIX",
    gross_cents: 13000,
    platform_fee_cents: 650,
    platform_fee_basis_points: 500,
    asaas_fee_cents: null,
    organizer_net_cents: null,
    refunded_cents: 0,
    money_is_available: false,
    confirms_registration: false,
    estimated_settlement_days: 0,
    checkout_url: null,
    pix_payload: "00020126...",
    due_at: "2026-11-10T23:59:00-03:00",
    confirmed_at: null,
    received_at: null,
    refunded_at: null,
    failure_reason: null,
    created_at: null,
    ...overrides,
  };
}

/** `refetchInterval` só recebe o que lê — não precisa de uma Query real inteira. */
function queryWithStatus(status: ApiPayment["status"] | undefined) {
  return { state: { data: status ? basePayment({ status }) : undefined } } as PaymentQuery;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isAwaitingPayment — nunca reimplementa a definição de 'pago' do backend", () => {
  it.each([
    ["DRAFT", true],
    ["PENDING", true],
    ["OVERDUE", true],
    ["CONFIRMED", false],
    ["RECEIVED", false],
    ["FAILED", false],
    ["CANCELLED", false],
    ["REFUNDED", false],
  ] as const)("%s → %s", (status, expected) => {
    expect(isAwaitingPayment(status)).toBe(expected);
  });
});

describe("paymentQuery — polling nunca confia no retorno do checkout (CLAUDE.md §14)", () => {
  const options = paymentQuery("pay_1");

  const refetchInterval = options.refetchInterval as RefetchIntervalFn;

  it("continua consultando (5s) enquanto o pagamento está PENDING ou DRAFT", () => {
    expect(refetchInterval(queryWithStatus("PENDING"))).toBe(5_000);
    expect(refetchInterval(queryWithStatus("DRAFT"))).toBe(5_000);
  });

  it("para de consultar assim que o estado deixa de ser transitório", () => {
    for (const status of ["CONFIRMED", "RECEIVED", "FAILED", "CANCELLED", "OVERDUE"] as const) {
      expect(refetchInterval(queryWithStatus(status))).toBe(false);
    }
  });

  it("sem dado ainda (primeira carga), não tenta decidir — apenas não repete", () => {
    expect(refetchInterval(queryWithStatus(undefined))).toBe(false);
  });

  it("nunca cacheia status de pagamento (CLAUDE.md §20)", () => {
    expect(options.staleTime).toBe(0);
  });

  it("busca a cobrança pelo id e valida a resposta", async () => {
    const mocked = vi.mocked(fetch);
    mocked.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: basePayment({ status: "CONFIRMED" }) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const queryFn = options.queryFn as (context: { signal: AbortSignal }) => Promise<ApiPayment>;
    const controller = new AbortController();
    const result = await queryFn({ signal: controller.signal });

    expect(result.status).toBe("CONFIRMED");
    expect(String(mocked.mock.calls[0]![0])).toContain("/payments/pay_1");
  });
});

describe("createPayment — Idempotency-Key nunca muda entre tentativas", () => {
  it("envia a chave recebida, não gera uma nova", async () => {
    document.cookie = "XSRF-TOKEN=tok";
    const mocked = vi.mocked(fetch);
    mocked.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: basePayment() }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await createPayment("reg_1", { method: "PIX" }, "chave-do-checkout-desta-visita");

    const [url, init] = mocked.mock.calls[0]!;
    expect(String(url)).toContain("/registrations/reg_1/payments");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("chave-do-checkout-desta-visita");
  });
});
