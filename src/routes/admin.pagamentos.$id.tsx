import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AdminPageHeader, AdminShell } from "@/components/site/admin-shell";
import { formatDateTime } from "@/components/site/admin-async";
import {
  FinanceTimeline,
  GatewayBadge,
  MoneyRow,
  PaymentStatusPill,
  RefundStatusPill,
} from "@/components/site/finance";
import { adminPaymentQuery, type AdminPayment } from "@/lib/api/admin";
import { paymentPillStatus } from "@/lib/api/format";
import { brl, pct, type LedgerEntry } from "@/lib/finance-data";

export const Route = createFileRoute("/admin/pagamentos/$id")({
  head: () => ({
    meta: [
      { title: "Pagamento · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Ledger completo da cobrança: criação, confirmação, split, taxas, saldo do organizador e reembolso.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Pagamento · Super Admin BeacHub" },
    ],
  }),
  component: AdminPaymentDetail,
});

/**
 * Linha do tempo montada a partir dos instantes que a própria cobrança guarda.
 *
 * Não é o `ledger_entries` do banco — esse é a trilha contábil, e não há
 * endpoint que o exponha por pagamento. O que se mostra aqui são os fatos
 * datados da cobrança, que é exatamente o que a tela sempre mostrou: quando foi
 * criada, quando confirmou, quando o dinheiro ficou disponível.
 *
 * A distinção entre confirmar e receber é preservada de propósito (ADR 0009 §2):
 * juntar as duas esconderia os 32 dias que o cartão leva para liberar.
 */
function timelineOf(payment: AdminPayment): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  if (payment.created_at) {
    entries.push({
      at: formatDateTime(payment.created_at),
      label: "Cobrança criada",
      detail: `${payment.method_label} · ${payment.provider}`,
      amountCents: payment.gross_cents,
    });
  }

  if (payment.confirmed_at) {
    entries.push({
      at: formatDateTime(payment.confirmed_at),
      label: "Pagamento confirmado",
      detail: "Inscrição confirmada; saldo ainda não disponível",
    });
  }

  if (payment.received_at) {
    entries.push({
      at: formatDateTime(payment.received_at),
      label: "Valor disponível",
      detail: "Saldo liberado na conta do organizador",
    });
  }

  if (payment.reconciled_at) {
    entries.push({
      at: formatDateTime(payment.reconciled_at),
      label: "Conferido com o gateway",
      detail: "Reconciliação periódica",
    });
  }

  if (payment.refunded_at) {
    entries.push({
      at: formatDateTime(payment.refunded_at),
      label: "Estorno registrado",
      detail: "Lançamento de saída",
      amountCents: payment.refunded_cents,
    });
  }

  return entries;
}

function AdminPaymentDetail() {
  const { id } = Route.useParams();
  const { data: payment, isPending, isError, error, refetch } = useQuery(adminPaymentQuery(id));

  if (isPending) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-4xl px-4 py-8" aria-busy="true">
          <div className="h-6 w-40 animate-pulse bg-muted" />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse border border-border bg-card" />
            <div className="h-64 animate-pulse border border-border bg-card" />
          </div>
        </div>
      </AdminShell>
    );
  }

  if (isError) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-2xl">Pagamento não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              className="border border-border px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest"
            >
              Tentar de novo
            </button>
            <Link to="/admin/pagamentos" className="eyebrow self-center hover:text-foreground">
              ← Pagamentos
            </Link>
          </div>
        </div>
      </AdminShell>
    );
  }

  const hasRefund = payment.refunded_cents > 0;

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/admin/pagamentos" className="eyebrow hover:text-foreground">
          ← Pagamentos
        </Link>
        <AdminPageHeader
          title={payment.external_reference ?? payment.id.slice(0, 8)}
          description={`${payment.event?.name ?? "—"} · ${payment.payer?.name ?? "—"}`}
          action={<PaymentStatusPill status={paymentPillStatus(payment.status)} />}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg">Decomposição</h2>
            </div>
            <div className="divide-y divide-border">
              <MoneyRow
                label="Valor pago pelo participante"
                cents={payment.gross_cents}
                detail={payment.method_label}
              />
              <MoneyRow
                label="Taxa da plataforma"
                cents={payment.platform_fee_cents}
                detail={`${pct(payment.platform_fee_basis_points / 100)} congelada na transação`}
                negative
              />
              {/*
               * Taxa do gateway e líquido só existem depois que o Asaas
               * responde. Enquanto não vierem, a linha diz "indisponível" —
               * R$ 0,00 afirmaria que o organizador não paga taxa e recebe
               * nada (ADR 0009 §5).
               */}
              {payment.asaas_fee_cents === null ? (
                <div className="flex flex-wrap items-baseline gap-2 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Taxa Asaas</span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    Indisponível até o gateway informar
                  </span>
                </div>
              ) : (
                <MoneyRow
                  label="Taxa Asaas"
                  cents={payment.asaas_fee_cents}
                  detail="Custo de processamento do organizador"
                  negative
                />
              )}
              {payment.organizer_net_cents === null ? (
                <div className="flex flex-wrap items-baseline gap-2 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Saldo do organizador</span>
                  <span className="ml-auto text-sm text-muted-foreground">Indisponível</span>
                </div>
              ) : (
                <MoneyRow
                  label="Saldo do organizador"
                  cents={payment.organizer_net_cents}
                  detail={payment.organizer?.name ?? "—"}
                  strong
                />
              )}
            </div>
          </section>

          <section className="border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg">Referências</h2>
            </div>
            <div className="divide-y divide-border text-sm">
              {[
                ["Gateway", payment.provider],
                ["Referência externa", payment.external_reference ?? "—"],
                ["Inscrição (registration)", payment.registration_id],
                ["Organizador", payment.organizer?.name ?? "—"],
                ["Participante", payment.payer?.email ?? "—"],
                ["Criado em", formatDateTime(payment.created_at)],
                ["Vencimento", formatDateTime(payment.due_at)],
                ["Confirmado em", formatDateTime(payment.confirmed_at)],
                ["Disponível em", formatDateTime(payment.received_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap gap-2 px-4 py-2.5">
                  <span className="min-w-[160px] text-muted-foreground">{k}</span>
                  <span className="font-display font-bold">{v}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg">Ledger</h2>
            <GatewayBadge />
          </div>
          <div className="px-4 py-3">
            <FinanceTimeline entries={timelineOf(payment)} />
          </div>
        </section>

        {hasRefund ? (
          <section className="mt-6 border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
              <h2 className="text-lg">Reembolso</h2>
              <RefundStatusPill
                status={payment.status === "REFUNDED" ? "REFUNDED" : "PROCESSING"}
              />
              <span className="score-num ml-auto text-sm tabular-nums">
                {brl(payment.refunded_cents)}
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm">
                Estorno registrado em {formatDateTime(payment.refunded_at)}.
              </p>
            </div>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}
