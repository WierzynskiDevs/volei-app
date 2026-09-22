import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { FinanceAlert, FinanceTimeline, GatewayBadge, MoneyRow, RefundStatusPill } from "@/components/site/finance";
import {
  brl,
  eventChanges,
  getPayment,
  refunds,
  REFUND_CAUSE_LABEL,
} from "@/lib/finance-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reembolso/$paymentId")({
  loader: ({ params }) => {
    const payment = getPayment(params.paymentId);
    if (!payment) throw notFound();
    return { payment };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Reembolso indisponível · BeacHub" }, { name: "robots", content: "noindex" }] };
    }
    const title = `Reembolso — ${loaderData.payment.eventName} · BeacHub`;
    const description = "Solicite e acompanhe o reembolso da sua inscrição, com status confirmado pelo gateway.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: RefundPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl">Pagamento não encontrado</h1>
        <Link to="/minhas-inscricoes" className="mt-4 inline-flex font-display text-xs font-bold uppercase tracking-widest text-accent">
          Minhas inscrições
        </Link>
      </div>
    </AppShell>
  ),
});

function RefundPage() {
  const { payment } = Route.useLoaderData();
  const existing = refunds.find((r) => r.paymentId === payment.id);
  const change = eventChanges.find((c) => c.eventSlug === payment.eventSlug);

  const [cause, setCause] = useState<"EVENTO_ALTERADO" | "DESISTENCIA">(change ? "EVENTO_ALTERADO" : "DESISTENCIA");
  const [sent, setSent] = useState(false);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/minhas-inscricoes" className="eyebrow hover:text-foreground">
          ← Minhas inscrições
        </Link>
        <PageHeader eyebrow={payment.eventName} title="Reembolso" />

        <div className="mt-4 divide-y divide-border border border-border bg-card">
          <MoneyRow label="Valor pago" cents={payment.amountCents} detail={`${payment.code} · ${payment.gatewayId}`} strong />
          <div className="flex flex-wrap gap-2 px-4 py-3 text-sm">
            <span className="min-w-[140px] text-muted-foreground">Dupla</span>
            <span className="font-display font-bold">{payment.team}</span>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3 text-sm">
            <span className="min-w-[140px] text-muted-foreground">Pago em</span>
            <span className="font-display font-bold">{payment.paidAt ?? "—"}</span>
          </div>
        </div>

        {existing ? (
          <section className="mt-6 border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
              <RefundStatusPill status={existing.status} />
              <span className="text-sm text-muted-foreground">{REFUND_CAUSE_LABEL[existing.cause]}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {existing.gatewayRefundId ?? "aguardando envio ao gateway"}
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm">Motivo: {existing.reason}</p>
              <div className="mt-3">
                <FinanceTimeline entries={existing.timeline} />
              </div>
            </div>
          </section>
        ) : sent ? (
          <div className="mt-6 border border-warning/40 bg-warning/10 p-6">
            <RefundStatusPill status="REQUESTED" />
            <p className="mt-3 font-display text-lg font-bold">Solicitação enviada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Motivo: {cause === "EVENTO_ALTERADO" ? "Não posso participar após a alteração do evento." : "Desistência do participante."}
              {" "}Valor: {brl(payment.amountCents)}. O reembolso só é considerado concluído após confirmação do Asaas.
            </p>
            <Link
              to="/minhas-inscricoes"
              className="mt-4 inline-flex h-11 items-center border border-graphite px-5 font-display text-xs font-bold uppercase tracking-widest"
            >
              Acompanhar status
            </Link>
          </div>
        ) : (
          <>
            {change ? (
              <FinanceAlert tone="warn" title="Este evento sofreu alteração">
                {change.fields.map((f) => `${f.label}: ${f.from} → ${f.to}`).join(" · ")} — Motivo: {change.justification}
              </FinanceAlert>
            ) : null}

            <div className="mt-6 grid gap-2">
              {(
                [
                  {
                    key: "EVENTO_ALTERADO" as const,
                    title: "Não posso participar após a alteração do evento",
                    desc: "Reembolso garantido: alteração de data, horário ou local é responsabilidade do organizador.",
                    disabled: !change,
                  },
                  {
                    key: "DESISTENCIA" as const,
                    title: "Desisti de participar",
                    desc: "O evento permanece conforme publicado. Segundo a política do evento, essa solicitação pode não gerar reembolso.",
                    disabled: false,
                  },
                ]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => setCause(opt.key)}
                  className={cn(
                    "border p-4 text-left",
                    cause === opt.key ? "border-graphite bg-card" : "border-border bg-card/60",
                    opt.disabled && "opacity-50",
                  )}
                >
                  <p className="font-display text-sm font-bold">{opt.title}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>

            {cause === "DESISTENCIA" ? (
              <div className="mt-4 border border-border bg-sand p-4 text-sm text-muted-foreground">
                Você está solicitando cancelamento de uma inscrição em um evento que permanece conforme publicado. De acordo
                com a política do evento, essa solicitação pode não gerar reembolso.
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setSent(true)}
              className="mt-6 h-12 w-full bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground"
            >
              Solicitar reembolso · {brl(payment.amountCents)}
            </button>
            <GatewayBadge className="mt-4" />
          </>
        )}
      </div>
    </AppShell>
  );
}
