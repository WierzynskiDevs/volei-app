/**
 * Camada financeira do protótipo BeacHub (mock).
 *
 * Conceitos separados de propósito — nunca misturar:
 *  - Registration: a inscrição da dupla no evento.
 *  - Payment: a cobrança gerada no gateway (Asaas).
 *  - Refund: a solicitação/estorno de um pagamento.
 *  - FinancialTransaction (ledger): cada lançamento financeiro auditável.
 *
 * Todos os valores são armazenados em centavos.
 */

export const GATEWAY = {
  name: "Asaas",
  status: "Conectado" as const,
  environment: "Sandbox",
  lastSync: "11/08/2026 09:40",
};

export function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function pct(rate: number) {
  return `${rate.toLocaleString("pt-BR", { minimumFractionDigits: rate % 1 === 0 ? 0 : 1 })}%`;
}

/* ------------------------------------------------------------------ *
 * PLANOS
 * ------------------------------------------------------------------ */

export type PlanStatus = "ATIVO" | "INATIVO";

export type Plan = {
  id: string;
  name: string;
  description: string;
  status: PlanStatus;
  monthlyCents: number;
  /** taxa percentual da plataforma aplicada a cada inscrição paga */
  platformFeeRate: number;
  /** taxa fixa opcional por transação */
  platformFeeFixedCents: number;
  eventLimit: number | null;
  registrationLimit: number | null;
  features: string[];
};

export const plans: Plan[] = [
  {
    id: "plan-free",
    name: "FREE",
    description: "Para quem está começando a organizar etapas e torneios sociais.",
    status: "ATIVO",
    monthlyCents: 0,
    platformFeeRate: 5,
    platformFeeFixedCents: 0,
    eventLimit: 3,
    registrationLimit: 120,
    features: [
      "Inscrições online",
      "Chaves e resultados",
      "Ranking de performance",
      "Suporte por e-mail",
    ],
  },
  {
    id: "plan-pro",
    name: "PRO",
    description: "Circuitos recorrentes com várias etapas por temporada.",
    status: "ATIVO",
    monthlyCents: 14900,
    platformFeeRate: 3.5,
    platformFeeFixedCents: 0,
    eventLimit: 20,
    registrationLimit: 2000,
    features: [
      "Tudo do FREE",
      "Etapas ilimitadas por circuito",
      "Página do circuito",
      "Relatórios financeiros por evento",
      "Lembretes automáticos de cobrança",
    ],
  },
  {
    id: "plan-premium",
    name: "PREMIUM",
    description: "Operação profissional com times, arenas próprias e alto volume.",
    status: "ATIVO",
    monthlyCents: 39900,
    platformFeeRate: 2.5,
    platformFeeFixedCents: 0,
    eventLimit: null,
    registrationLimit: null,
    features: [
      "Tudo do PRO",
      "Eventos e inscrições ilimitados",
      "Múltiplos operadores",
      "Exportação contábil",
      "Suporte prioritário",
    ],
  },
];

export function getPlan(id: string) {
  return plans.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ *
 * ORGANIZADORES (visão financeira)
 * ------------------------------------------------------------------ */

export type OrganizerAsaasStatus = "CONECTADA" | "PENDENTE" | "NAO_VINCULADA";
export type OrganizerFinanceStatus = "REGULAR" | "ATENCAO" | "BLOQUEADO";

export type PlanHistoryEntry = { at: string; plan: string; rate: number; note: string };

export type OrganizerFinance = {
  id: string;
  name: string;
  accountId: string;
  planId: string;
  asaas: OrganizerAsaasStatus;
  asaasAccount: string;
  status: OrganizerFinanceStatus;
  planHistory: PlanHistoryEntry[];
};

export const organizerFinances: OrganizerFinance[] = [
  {
    id: "org-1",
    name: "Arena Norte Beach",
    accountId: "organizer-01",
    planId: "plan-pro",
    asaas: "CONECTADA",
    asaasAccount: "acc_8fd21c",
    status: "REGULAR",
    planHistory: [
      { at: "11/2024", plan: "FREE", rate: 5, note: "Cadastro inicial" },
      {
        at: "03/2026",
        plan: "PRO",
        rate: 3.5,
        note: "Migração para PRO — cobranças anteriores mantêm 5%",
      },
    ],
  },
  {
    id: "org-2",
    name: "Circuito Litoral",
    accountId: "organizer-02",
    planId: "plan-premium",
    asaas: "CONECTADA",
    asaasAccount: "acc_3ba907",
    status: "ATENCAO",
    planHistory: [
      { at: "02/2025", plan: "FREE", rate: 5, note: "Cadastro inicial" },
      { at: "09/2025", plan: "PRO", rate: 3.5, note: "Segunda temporada" },
      { at: "05/2026", plan: "PREMIUM", rate: 2.5, note: "Circuito com 5 etapas" },
    ],
  },
  {
    id: "org-3",
    name: "Duna Beach Arena",
    accountId: "organizer-03",
    planId: "plan-free",
    asaas: "PENDENTE",
    asaasAccount: "—",
    status: "BLOQUEADO",
    planHistory: [{ at: "06/2025", plan: "FREE", rate: 5, note: "Cadastro inicial" }],
  },
];

export function getOrganizerFinance(id: string) {
  return organizerFinances.find((o) => o.id === id);
}

/** Organizador logado no protótipo. */
export const currentOrganizer = organizerFinances[0]!;

/* ------------------------------------------------------------------ *
 * PAGAMENTOS
 * ------------------------------------------------------------------ */

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGEBACK";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  PAID: "Pago",
  FAILED: "Falhou",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  CHARGEBACK: "Chargeback",
};

export type Tone = "ok" | "warn" | "danger" | "neutral";

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  PENDING: "warn",
  PROCESSING: "warn",
  PAID: "ok",
  FAILED: "danger",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "warn",
  CHARGEBACK: "danger",
};

export type PaymentMethod = "PIX" | "CREDITO" | "DEBITO";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CREDITO: "Cartão de crédito",
  DEBITO: "Cartão de débito",
};

export type LedgerEntry = {
  at: string;
  label: string;
  detail: string;
  amountCents?: number;
};

export type Payment = {
  id: string;
  /** identificador visível ao participante */
  code: string;
  gatewayId: string;
  registrationId: string;
  eventSlug: string;
  eventName: string;
  organizerId: string;
  payer: string;
  team: string;
  categoryLabel: string;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  /** taxa congelada no momento da cobrança — nunca recalcular */
  platformFeeRate: number;
  platformFeeCents: number;
  gatewayFeeCents: number;
  netCents: number;
  createdAt: string;
  dueAt: string;
  paidAt?: string;
  refundId?: string;
  ledger: LedgerEntry[];
};

function ledgerFor(p: Omit<Payment, "ledger">): LedgerEntry[] {
  const base: LedgerEntry[] = [
    {
      at: p.createdAt,
      label: "Cobrança criada",
      detail: `${PAYMENT_METHOD_LABEL[p.method]} · ${p.gatewayId}`,
      amountCents: p.amountCents,
    },
  ];
  if (p.paidAt) {
    base.push({
      at: p.paidAt,
      label: "Pagamento confirmado",
      detail: "Webhook Asaas · PAYMENT_RECEIVED",
      amountCents: p.amountCents,
    });
    base.push({
      at: p.paidAt,
      label: "Split processado",
      detail: "Divisão plataforma / organizador",
    });
    base.push({
      at: p.paidAt,
      label: "Taxa da plataforma",
      detail: `${pct(p.platformFeeRate)} congelada na transação`,
      amountCents: -p.platformFeeCents,
    });
    base.push({
      at: p.paidAt,
      label: "Taxa Asaas",
      detail: "Custo de processamento (organizador)",
      amountCents: -p.gatewayFeeCents,
    });
    base.push({
      at: p.paidAt,
      label: "Saldo do organizador",
      detail: "Disponível conforme prazo do gateway",
      amountCents: p.netCents,
    });
  }
  return base;
}

function mkPayment(
  p: Omit<Payment, "ledger" | "platformFeeCents" | "gatewayFeeCents" | "netCents"> &
    Partial<Pick<Payment, "gatewayFeeCents">>,
): Payment {
  const platformFeeCents = Math.round((p.amountCents * p.platformFeeRate) / 100);
  const gatewayFeeCents =
    p.gatewayFeeCents ?? (p.method === "PIX" ? 199 : Math.round(p.amountCents * 0.0299) + 39);
  const netCents = p.amountCents - platformFeeCents - gatewayFeeCents;
  const full = { ...p, platformFeeCents, gatewayFeeCents, netCents } as Payment;
  return { ...full, ledger: ledgerFor(full) };
}

export const payments: Payment[] = [
  mkPayment({
    id: "pay-1",
    code: "INS-4821",
    gatewayId: "pay_9a12f7c3",
    registrationId: "reg-1",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    organizerId: "org-1",
    payer: "João Mendes",
    team: "João / Pedro",
    categoryLabel: "Masculino Intermediário",
    amountCents: 13000,
    method: "PIX",
    status: "PAID",
    platformFeeRate: 5,
    createdAt: "28/07/2026 10:12",
    dueAt: "30/07/2026",
    paidAt: "28/07/2026 10:19",
  }),
  mkPayment({
    id: "pay-2",
    code: "INS-4822",
    gatewayId: "pay_1c07be55",
    registrationId: "reg-2",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    organizerId: "org-1",
    payer: "Pedro Alves",
    team: "João / Pedro",
    categoryLabel: "Masculino Intermediário",
    amountCents: 13000,
    method: "CREDITO",
    status: "PAID",
    platformFeeRate: 5,
    createdAt: "28/07/2026 10:22",
    dueAt: "30/07/2026",
    paidAt: "28/07/2026 10:23",
  }),
  mkPayment({
    id: "pay-3",
    code: "INS-4823",
    gatewayId: "pay_77bd0e91",
    registrationId: "reg-3",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    organizerId: "org-1",
    payer: "Carlos Nunes",
    team: "Carlos / Rafael",
    categoryLabel: "Masculino Intermediário",
    amountCents: 13000,
    method: "PIX",
    status: "PENDING",
    platformFeeRate: 3.5,
    createdAt: "09/08/2026 18:40",
    dueAt: "13/08/2026",
  }),
  mkPayment({
    id: "pay-4",
    code: "INS-4824",
    gatewayId: "pay_5410ad2b",
    registrationId: "reg-4",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    organizerId: "org-1",
    payer: "Rafael Prado",
    team: "Carlos / Rafael",
    categoryLabel: "Masculino Intermediário",
    amountCents: 13000,
    method: "CREDITO",
    status: "FAILED",
    platformFeeRate: 3.5,
    createdAt: "09/08/2026 18:52",
    dueAt: "13/08/2026",
  }),
  mkPayment({
    id: "pay-5",
    code: "INS-4901",
    gatewayId: "pay_b7712ee0",
    registrationId: "reg-5",
    eventSlug: "circuito-litoral-etapa-3",
    eventName: "Circuito Litoral — Etapa 3",
    organizerId: "org-2",
    payer: "Ana Ribeiro",
    team: "Ana / Carla",
    categoryLabel: "Feminino Avançado",
    amountCents: 14000,
    method: "PIX",
    status: "PAID",
    platformFeeRate: 2.5,
    createdAt: "20/07/2026 08:30",
    dueAt: "24/07/2026",
    paidAt: "20/07/2026 08:33",
  }),
  mkPayment({
    id: "pay-6",
    code: "INS-4902",
    gatewayId: "pay_2dd94f18",
    registrationId: "reg-6",
    eventSlug: "circuito-litoral-etapa-3",
    eventName: "Circuito Litoral — Etapa 3",
    organizerId: "org-2",
    payer: "Carla Souza",
    team: "Ana / Carla",
    categoryLabel: "Feminino Avançado",
    amountCents: 14000,
    method: "CREDITO",
    status: "REFUNDED",
    platformFeeRate: 2.5,
    createdAt: "20/07/2026 08:35",
    dueAt: "24/07/2026",
    paidAt: "20/07/2026 08:36",
    refundId: "ref-1",
  }),
  mkPayment({
    id: "pay-7",
    code: "INS-4903",
    gatewayId: "pay_ce38a740",
    registrationId: "reg-7",
    eventSlug: "beach-open-floripa",
    eventName: "Beach Open Floripa",
    organizerId: "org-2",
    payer: "Marina Costa",
    team: "Marina / Bia",
    categoryLabel: "Feminino Intermediário",
    amountCents: 9000,
    method: "CREDITO",
    status: "CHARGEBACK",
    platformFeeRate: 2.5,
    createdAt: "02/07/2026 14:02",
    dueAt: "05/07/2026",
    paidAt: "02/07/2026 14:03",
  }),
  mkPayment({
    id: "pay-8",
    code: "INS-4904",
    gatewayId: "pay_a0b5c199",
    registrationId: "reg-8",
    eventSlug: "beach-open-floripa",
    eventName: "Beach Open Floripa",
    organizerId: "org-2",
    payer: "Bia Toledo",
    team: "Marina / Bia",
    categoryLabel: "Feminino Intermediário",
    amountCents: 9000,
    method: "PIX",
    status: "EXPIRED",
    platformFeeRate: 3.5,
    createdAt: "01/07/2026 19:10",
    dueAt: "04/07/2026",
  }),
  mkPayment({
    id: "pay-9",
    code: "INS-5001",
    gatewayId: "pay_44e1d802",
    registrationId: "reg-9",
    eventSlug: "king-of-the-court-natal",
    eventName: "King of the Court Natal",
    organizerId: "org-3",
    payer: "Ana Ribeiro",
    team: "Ana Ribeiro (individual)",
    categoryLabel: "Open",
    amountCents: 6000,
    method: "PIX",
    status: "PAID",
    platformFeeRate: 5,
    createdAt: "18/07/2026 07:44",
    dueAt: "21/07/2026",
    paidAt: "18/07/2026 07:45",
  }),
  mkPayment({
    id: "pay-10",
    code: "INS-5002",
    gatewayId: "pay_63cf10aa",
    registrationId: "reg-10",
    eventSlug: "king-of-the-court-natal",
    eventName: "King of the Court Natal",
    organizerId: "org-3",
    payer: "João Mendes",
    team: "João Mendes (individual)",
    categoryLabel: "Open",
    amountCents: 6000,
    method: "PIX",
    status: "PAID",
    platformFeeRate: 5,
    createdAt: "18/07/2026 09:02",
    dueAt: "21/07/2026",
    paidAt: "18/07/2026 09:04",
    refundId: "ref-2",
  }),
  mkPayment({
    id: "pay-11",
    code: "INS-5003",
    gatewayId: "pay_98ff21b4",
    registrationId: "reg-11",
    eventSlug: "americano-de-verao-santos",
    eventName: "Americano de Verão Santos",
    organizerId: "org-1",
    payer: "Pedro Alves",
    team: "Pedro Alves (individual)",
    categoryLabel: "Misto Livre",
    amountCents: 4500,
    method: "PIX",
    status: "PROCESSING",
    platformFeeRate: 3.5,
    createdAt: "10/08/2026 21:15",
    dueAt: "14/08/2026",
  }),
  mkPayment({
    id: "pay-12",
    code: "INS-5004",
    gatewayId: "pay_11ac70de",
    registrationId: "reg-12",
    eventSlug: "americano-de-verao-santos",
    eventName: "Americano de Verão Santos",
    organizerId: "org-1",
    payer: "Carla Souza",
    team: "Carla Souza (individual)",
    categoryLabel: "Misto Livre",
    amountCents: 4500,
    method: "DEBITO",
    status: "CANCELLED",
    platformFeeRate: 3.5,
    createdAt: "05/08/2026 11:00",
    dueAt: "09/08/2026",
  }),
];

export function getPayment(id: string) {
  return payments.find((p) => p.id === id);
}

export function paymentsByEvent(slug: string) {
  return payments.filter((p) => p.eventSlug === slug);
}

export function paymentsByOrganizer(orgId: string) {
  return payments.filter((p) => p.organizerId === orgId);
}

/** Pagamentos do jogador logado no protótipo. */
export function paymentsByPayer(name: string) {
  return payments.filter((p) => p.payer === name);
}

/* ------------------------------------------------------------------ *
 * REEMBOLSOS
 * ------------------------------------------------------------------ */

export type RefundStatus =
  "REQUESTED" | "APPROVED" | "PROCESSING" | "REFUNDED" | "FAILED" | "REJECTED";

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  REQUESTED: "Solicitado",
  APPROVED: "Aprovado",
  PROCESSING: "Processando",
  REFUNDED: "Reembolsado",
  FAILED: "Falha no reembolso",
  REJECTED: "Recusado",
};

export const REFUND_STATUS_TONE: Record<RefundStatus, Tone> = {
  REQUESTED: "warn",
  APPROVED: "warn",
  PROCESSING: "warn",
  REFUNDED: "ok",
  FAILED: "danger",
  REJECTED: "neutral",
};

/** Origem determina se o reembolso é obrigatório (problema do evento) ou discricionário (desistência). */
export type RefundCause = "EVENTO_ALTERADO" | "EVENTO_CANCELADO" | "DESISTENCIA";

export const REFUND_CAUSE_LABEL: Record<RefundCause, string> = {
  EVENTO_ALTERADO: "Alteração do evento",
  EVENTO_CANCELADO: "Cancelamento do evento",
  DESISTENCIA: "Desistência do participante",
};

export type Refund = {
  id: string;
  paymentId: string;
  organizerId: string;
  eventName: string;
  participant: string;
  amountCents: number;
  cause: RefundCause;
  mandatory: boolean;
  reason: string;
  requestedAt: string;
  deadline: string;
  status: RefundStatus;
  gatewayRefundId?: string;
  timeline: LedgerEntry[];
};

export const refunds: Refund[] = [
  {
    id: "ref-1",
    paymentId: "pay-6",
    organizerId: "org-2",
    eventName: "Circuito Litoral — Etapa 3",
    participant: "Carla Souza",
    amountCents: 14000,
    cause: "EVENTO_ALTERADO",
    mandatory: true,
    reason: "Não posso participar após a alteração da data do evento.",
    requestedAt: "24/07/2026",
    deadline: "31/07/2026",
    status: "REFUNDED",
    gatewayRefundId: "rfd_5c19ab77",
    timeline: [
      {
        at: "24/07 09:10",
        label: "Solicitação enviada",
        detail: "Participante sinalizou impedimento após alteração",
      },
      {
        at: "24/07 15:00",
        label: "Aprovado pelo organizador",
        detail: "Obrigatório — alteração de data",
      },
      { at: "25/07 08:12", label: "Refund solicitado no Asaas", detail: "rfd_5c19ab77" },
      {
        at: "26/07 11:30",
        label: "Reembolso confirmado",
        detail: "Webhook Asaas · PAYMENT_REFUNDED",
        amountCents: 14000,
      },
    ],
  },
  {
    id: "ref-2",
    paymentId: "pay-10",
    organizerId: "org-3",
    eventName: "King of the Court Natal",
    participant: "João Mendes",
    amountCents: 6000,
    cause: "EVENTO_CANCELADO",
    mandatory: true,
    reason: "Evento cancelado pelo organizador.",
    requestedAt: "05/08/2026",
    deadline: "12/08/2026",
    status: "PROCESSING",
    gatewayRefundId: "rfd_7710de02",
    timeline: [
      {
        at: "05/08 10:00",
        label: "Evento cancelado",
        detail: "Reembolso obrigatório gerado automaticamente",
      },
      { at: "06/08 09:20", label: "Refund solicitado no Asaas", detail: "rfd_7710de02" },
      {
        at: "07/08 14:05",
        label: "Processando no gateway",
        detail: "Aguardando confirmação do emissor",
      },
    ],
  },
  {
    id: "ref-3",
    paymentId: "pay-9",
    organizerId: "org-3",
    eventName: "King of the Court Natal",
    participant: "Ana Ribeiro",
    amountCents: 6000,
    cause: "EVENTO_CANCELADO",
    mandatory: true,
    reason: "Evento cancelado pelo organizador.",
    requestedAt: "05/08/2026",
    deadline: "12/08/2026",
    status: "REQUESTED",
    timeline: [
      {
        at: "05/08 10:00",
        label: "Evento cancelado",
        detail: "Reembolso obrigatório gerado automaticamente",
      },
    ],
  },
  {
    id: "ref-4",
    paymentId: "pay-1",
    organizerId: "org-1",
    eventName: "Copa Areia Curitiba",
    participant: "João Mendes",
    amountCents: 13000,
    cause: "DESISTENCIA",
    mandatory: false,
    reason: "Compromisso pessoal no fim de semana do evento.",
    requestedAt: "02/08/2026",
    deadline: "—",
    status: "REJECTED",
    timeline: [
      {
        at: "02/08 12:00",
        label: "Solicitação enviada",
        detail: "Evento permanece conforme publicado",
      },
      {
        at: "03/08 09:30",
        label: "Recusado pelo organizador",
        detail: "Fora do prazo da política de cancelamento",
      },
    ],
  },
  {
    id: "ref-5",
    paymentId: "pay-5",
    organizerId: "org-2",
    eventName: "Circuito Litoral — Etapa 3",
    participant: "Ana Ribeiro",
    amountCents: 14000,
    cause: "EVENTO_ALTERADO",
    mandatory: true,
    reason: "Não posso participar após a alteração do horário.",
    requestedAt: "08/08/2026",
    deadline: "15/08/2026",
    status: "FAILED",
    gatewayRefundId: "rfd_90cc1a34",
    timeline: [
      {
        at: "08/08 19:00",
        label: "Solicitação enviada",
        detail: "Impedimento após alteração de horário",
      },
      { at: "09/08 08:00", label: "Refund solicitado no Asaas", detail: "rfd_90cc1a34" },
      {
        at: "09/08 16:40",
        label: "Falha no reembolso",
        detail: "Saldo insuficiente na conta do organizador",
      },
    ],
  },
];

export function getRefund(id: string) {
  return refunds.find((r) => r.id === id);
}

export function refundsByOrganizer(orgId: string) {
  return refunds.filter((r) => r.organizerId === orgId);
}

export const pendingRefundStatuses: RefundStatus[] = [
  "REQUESTED",
  "APPROVED",
  "PROCESSING",
  "FAILED",
];

export function pendingRefunds(orgId?: string) {
  return refunds.filter(
    (r) => pendingRefundStatuses.includes(r.status) && (!orgId || r.organizerId === orgId),
  );
}

/* ------------------------------------------------------------------ *
 * ALTERAÇÕES DE EVENTO
 * ------------------------------------------------------------------ */

export type EventChange = {
  id: string;
  eventSlug: string;
  eventName: string;
  organizerId: string;
  at: string;
  fields: { label: string; from: string; to: string }[];
  justification: string;
  notified: boolean;
  affected: number;
  refundRequests: number;
};

export const eventChanges: EventChange[] = [
  {
    id: "chg-1",
    eventSlug: "circuito-litoral-etapa-3",
    eventName: "Circuito Litoral — Etapa 3",
    organizerId: "org-2",
    at: "24/07/2026 08:00",
    fields: [
      { label: "Data", from: "10/08/2026", to: "17/08/2026" },
      { label: "Horário", from: "08h00", to: "09h00" },
    ],
    justification: "Previsão de chuva intensa no fim de semana original.",
    notified: true,
    affected: 24,
    refundRequests: 2,
  },
  {
    id: "chg-2",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    organizerId: "org-1",
    at: "09/08/2026 17:20",
    fields: [
      {
        label: "Local",
        from: "Arena Norte Beach — Quadra 1 a 4",
        to: "Arena Norte Beach — Quadras cobertas 5 a 8",
      },
    ],
    justification: "Manutenção emergencial na areia das quadras descobertas.",
    notified: false,
    affected: 32,
    refundRequests: 0,
  },
];

/* ------------------------------------------------------------------ *
 * POLÍTICA FINANCEIRA DO EVENTO
 * ------------------------------------------------------------------ */

export type EventFinance = {
  slug: string;
  feeCents: number;
  feeUnit: "dupla" | "jogador";
  methods: PaymentMethod[];
  cancellationDeadline: string;
  cancellationPolicy: string;
  refundPolicy: string;
  changePolicy: string;
};

export const eventFinances: EventFinance[] = [
  {
    slug: "copa-areia-curitiba",
    feeCents: 13000,
    feeUnit: "dupla",
    methods: ["PIX", "CREDITO", "DEBITO"],
    cancellationDeadline: "18/08/2026, 23h59",
    cancellationPolicy:
      "Cancelamentos solicitados até 18/08 podem ser reembolsados integralmente a critério do organizador. Após essa data, a vaga já foi alocada na chave e não há reembolso por desistência.",
    refundPolicy:
      "Reembolso garantido quando o organizador cancelar o evento ou alterar data, horário ou local e o participante ficar impedido de participar.",
    changePolicy:
      "Alterações de data, horário ou local exigem justificativa e são comunicadas a todos os inscritos, que podem sinalizar impedimento e solicitar reembolso.",
  },
  {
    slug: "circuito-litoral-etapa-3",
    feeCents: 14000,
    feeUnit: "dupla",
    methods: ["PIX", "CREDITO"],
    cancellationDeadline: "12/08/2026, 20h00",
    cancellationPolicy:
      "Desistências até 12/08 são reembolsadas em 50%. Após o sorteio das chaves não há reembolso por desistência.",
    refundPolicy:
      "Cancelamento ou alteração do evento pelo organizador gera direito a reembolso integral.",
    changePolicy: "Toda alteração é registrada com justificativa e notificada aos inscritos.",
  },
];

export const defaultEventFinance: Omit<EventFinance, "slug"> = {
  feeCents: 12000,
  feeUnit: "dupla",
  methods: ["PIX", "CREDITO"],
  cancellationDeadline: "48h antes do evento",
  cancellationPolicy:
    "Desistência do participante em evento que permanece conforme publicado não gera reembolso automático — a decisão é do organizador.",
  refundPolicy:
    "Cancelamento ou alteração do evento pelo organizador gera direito a solicitar reembolso.",
  changePolicy:
    "Alterações de data, horário ou local exigem justificativa e notificação a todos os inscritos.",
};

export function getEventFinance(slug: string): EventFinance {
  return eventFinances.find((f) => f.slug === slug) ?? { slug, ...defaultEventFinance };
}

/* ------------------------------------------------------------------ *
 * AGREGAÇÕES
 * ------------------------------------------------------------------ */

const PAID_LIKE: PaymentStatus[] = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CHARGEBACK"];

export type FinanceSummary = {
  gross: number;
  platformFee: number;
  gatewayFee: number;
  net: number;
  refunded: number;
  chargeback: number;
  pending: number;
  paidCount: number;
  pendingCount: number;
  balance: number;
};

export function summarize(list: Payment[]): FinanceSummary {
  const paid = list.filter((p) => PAID_LIKE.includes(p.status));
  const pendingList = list.filter((p) => p.status === "PENDING" || p.status === "PROCESSING");
  const refundedList = list.filter(
    (p) => p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED",
  );
  const chargebackList = list.filter((p) => p.status === "CHARGEBACK");

  const gross = paid.reduce((s, p) => s + p.amountCents, 0);
  const platformFee = paid.reduce((s, p) => s + p.platformFeeCents, 0);
  const gatewayFee = paid.reduce((s, p) => s + p.gatewayFeeCents, 0);
  const refunded = refundedList.reduce((s, p) => s + p.amountCents, 0);
  const chargeback = chargebackList.reduce((s, p) => s + p.amountCents, 0);
  const net = gross - platformFee - gatewayFee;

  return {
    gross,
    platformFee,
    gatewayFee,
    net,
    refunded,
    chargeback,
    pending: pendingList.reduce((s, p) => s + p.amountCents, 0),
    paidCount: list.filter((p) => p.status === "PAID").length,
    pendingCount: pendingList.length,
    balance: net - refunded - chargeback,
  };
}

export function organizerGmv(orgId: string) {
  return summarize(paymentsByOrganizer(orgId)).gross;
}

export function platformSummary() {
  return summarize(payments);
}

export function eventsWithFinance() {
  const slugs = [...new Set(payments.map((p) => p.eventSlug))];
  return slugs.map((slug) => {
    const list = paymentsByEvent(slug);
    return {
      slug,
      name: list[0]!.eventName,
      organizerId: list[0]!.organizerId,
      ...summarize(list),
    };
  });
}

export function revenueByPeriod() {
  return [
    { period: "Mai/2026", gmv: 2860000, revenue: 118400 },
    { period: "Jun/2026", gmv: 3420000, revenue: 141900 },
    { period: "Jul/2026", gmv: 4180000, revenue: 168200 },
    { period: "Ago/2026", gmv: 2740000, revenue: 103600 },
  ];
}
