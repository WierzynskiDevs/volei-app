import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PageHeader } from "@/components/site/shell";
import { EmptyState } from "@/components/site/cards";
import { PaymentStatusPill } from "@/components/site/finance";
import { myRegistrationsQuery, teamLabel } from "@/lib/api/registrations";
import { deadlineLabel, paymentPillStatus } from "@/lib/api/format";
import { brl } from "@/lib/finance-data";

export const Route = createFileRoute("/minhas-inscricoes")({
  head: () => ({
    meta: [
      { title: "Minhas inscrições e pagamentos · BeacHub" },
      {
        name: "description",
        content:
          "Veja quanto pagou, se a inscrição está confirmada, alterações do evento e o status dos seus reembolsos.",
      },
      { property: "og:title", content: "Minhas inscrições e pagamentos · BeacHub" },
      {
        property: "og:description",
        content: "Situação financeira de cada inscrição, do PIX ao reembolso.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyRegistrations,
});

function MyRegistrations() {
  const { data, isPending, isError, error, refetch } = useQuery(myRegistrationsQuery());

  const mine = data?.items ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader eyebrow="Financeiro" title="Minhas inscrições" />

        {isPending ? (
          <div className="mt-6 space-y-4" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 animate-pulse border border-border bg-card" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-6">
            <EmptyState
              title="Não foi possível carregar suas inscrições"
              description={error.message}
              action={
                <button
                  onClick={() => void refetch()}
                  className="inline-flex h-11 items-center bg-graphite px-5 font-display text-xs font-bold uppercase tracking-widest text-background"
                >
                  Tentar de novo
                </button>
              }
            />
          </div>
        ) : mine.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Você ainda não tem inscrições"
              description="Quando você se inscrever em um campeonato, ele aparece aqui com o valor, o status do pagamento e a confirmação da vaga."
              action={
                <Link
                  to="/eventos"
                  className="inline-flex h-11 items-center bg-graphite px-5 font-display text-xs font-bold uppercase tracking-widest text-background"
                >
                  Ver campeonatos
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {mine.map((r) => {
              const payment = r.payment;
              /*
               * Sem cobrança criada, o valor exibido é o do evento — é o que a
               * pessoa vai pagar. Com cobrança, vale o valor congelado nela:
               * se a inscrição do evento mudou de preço depois, quem já tem
               * cobrança paga o que foi cobrado (§7.5).
               */
              const amountCents = payment?.gross_cents ?? r.event?.registration_fee_cents ?? 0;

              return (
                <section key={r.id} className="border border-border bg-card">
                  <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-[200px] flex-1">
                      {r.event ? (
                        <Link
                          to="/eventos/$slug"
                          params={{ slug: r.event.slug }}
                          className="font-display text-base font-bold hover:text-accent"
                        >
                          {r.event.name}
                        </Link>
                      ) : (
                        <span className="font-display text-base font-bold">Evento</span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {teamLabel(r)} · {r.status_label}
                      </p>
                    </div>
                    <span className="score-num text-lg tabular-nums">{brl(amountCents)}</span>
                    {payment ? (
                      <PaymentStatusPill status={paymentPillStatus(payment.status)} />
                    ) : null}
                  </div>

                  <div className="grid gap-2 px-4 py-3 text-sm text-muted-foreground sm:grid-cols-3">
                    <p>Método: {payment?.method_label ?? "—"}</p>
                    <p>Cobrança: {payment ? deadlineLabel(payment.created_at) : "não iniciada"}</p>
                    <p>
                      {payment?.confirmed_at
                        ? `Pago em ${deadlineLabel(payment.confirmed_at)}`
                        : payment
                          ? `Vence em ${deadlineLabel(payment.due_at)}`
                          : r.reserved_until
                            ? `Reserva até ${deadlineLabel(r.reserved_until)}`
                            : "—"}
                    </p>
                  </div>

                  {/*
                   * A vaga só é do atleta quando o pagamento confirma (ADR
                   * 0003). Enquanto o backend não disser que confirmou, a tela
                   * diz exatamente isso — e oferece o caminho para pagar.
                   */}
                  {r.status === "PENDING_PAYMENT" ? (
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        Sua inscrição só será confirmada após a confirmação do pagamento.
                      </p>
                      {r.event ? (
                        <Link
                          to="/checkout/$slug"
                          params={{ slug: r.event.slug }}
                          className="mt-2 inline-flex h-10 items-center bg-accent px-5 font-display text-[11px] font-bold uppercase tracking-widest text-accent-foreground"
                        >
                          Continuar pagamento
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  {r.status === "PENDING_ACCEPTANCE" ? (
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        Aguardando o aceite do seu parceiro. A cobrança é individual: cada atleta
                        paga a própria inscrição.
                      </p>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
