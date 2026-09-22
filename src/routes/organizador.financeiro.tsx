import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PageHeader } from "@/components/site/shell";
import { Stat } from "@/components/site/cards";
import { OrganizerNav } from "@/components/site/organizer-nav";
import { FinanceAlert, GatewayBadge, MoneyCard, MoneyRow } from "@/components/site/finance";
import { balanceCents, organizerFinanceQuery } from "@/lib/api/finance";
import { brl, pct } from "@/lib/finance-data";

export const Route = createFileRoute("/organizador/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · Organizador BeacHub" },
      { name: "description", content: "Receita bruta, taxa da plataforma, taxas do Asaas, valor líquido, pendências e reembolsos dos seus campeonatos." },
      { property: "og:title", content: "Financeiro · Organizador BeacHub" },
      { property: "og:description", content: "Quanto você arrecadou, quanto pagou de taxa e quanto vai receber." },
    ],
  }),
  component: OrganizerFinance,
});

function OrganizerFinance() {
  const { data, isPending, isError, error, refetch } = useQuery(organizerFinanceQuery());

  const totals = data?.totals;
  const balance = totals ? balanceCents(totals) : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <OrganizerNav />
        <PageHeader
          eyebrow={data?.organizer.name ?? "Organizador"}
          title="Financeiro"
          action={<GatewayBadge />}
        />

        {isError ? (
          <div className="mt-6 border border-destructive/40 bg-destructive/10 p-5">
            <p className="font-display text-sm font-bold">Não foi possível carregar o financeiro.</p>
            <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 border border-border px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest"
            >
              Tentar de novo
            </button>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {data && !data.organizer.can_receive_payments ? (
            <FinanceAlert tone="danger" title="Conta de recebimento não vinculada">
              Sem conta vinculada não é possível publicar evento pago — não há destino para o repasse.
            </FinanceAlert>
          ) : null}
          {data && data.pending.count > 0 ? (
            <FinanceAlert
              title={`${data.pending.count} pagamento(s) pendente(s) — ${brl(data.pending.gross_cents)}`}
              action={
                <Link to="/organizador/inscricoes" className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest">
                  Cobrar
                </Link>
              }
            >
              Inscrições só são confirmadas após a confirmação do pagamento.
            </FinanceAlert>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyCard
            label="Receita bruta"
            cents={totals?.gross_cents ?? 0}
            hint={isPending ? "carregando…" : `${data?.paid_count ?? 0} inscrições pagas`}
            emphasis
          />
          <MoneyCard
            label="Taxa da plataforma"
            cents={totals?.platform_fee_cents ?? 0}
            hint={
              data?.organizer.plan
                ? `Plano ${data.organizer.plan.name} · ${pct(data.organizer.plan.platform_fee_basis_points / 100)} atual`
                : "—"
            }
          />
          <MoneyCard
            label="Taxas de pagamento (Asaas)"
            cents={totals?.asaas_fee_cents ?? 0}
            hint="Custo de processamento — do organizador"
          />
          <MoneyCard
            label="Valor líquido"
            cents={totals?.organizer_net_cents ?? 0}
            hint={
              totals && !totals.net_is_complete
                ? "Parcial — falta a taxa do gateway em alguma cobrança"
                : "Antes de reembolsos e chargebacks"
            }
            tone="ok"
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Pagamentos recebidos" value={data?.paid_count ?? 0} hint={brl(totals?.gross_cents ?? 0)} />
          <Stat label="Pagamentos pendentes" value={data?.pending.count ?? 0} hint={brl(data?.pending.gross_cents ?? 0)} />
          <MoneyCard
            label="Reembolsos"
            cents={totals?.refunded_cents ?? 0}
            hint="Estornos confirmados pelo gateway"
            {...(totals?.refunded_cents ? { tone: "danger" as const } : {})}
          />
          <MoneyCard label="Saldo" cents={balance} hint="Líquido menos reembolsos e chargebacks" emphasis />
        </div>

        <section className="mt-8 border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-lg">Como o dinheiro é dividido</h2>
            <p className="text-sm text-muted-foreground">
              O jogador paga apenas o valor da inscrição. A taxa da plataforma e as taxas do Asaas são descontadas via split.
            </p>
          </div>
          <div className="divide-y divide-border">
            <MoneyRow label="Receita bruta das inscrições" cents={totals?.gross_cents ?? 0} detail="Total pago pelos participantes" />
            <MoneyRow label="Taxa da plataforma" cents={totals?.platform_fee_cents ?? 0} detail="Receita do SaaS · taxa congelada em cada transação" negative />
            <MoneyRow label="Taxas Asaas" cents={totals?.asaas_fee_cents ?? 0} detail="Custo de processamento financeiro — responsabilidade do organizador" negative />
            <MoneyRow label="Reembolsos confirmados" cents={totals?.refunded_cents ?? 0} detail="Estornos processados pelo gateway" negative />
            <MoneyRow label="Chargebacks" cents={totals?.chargeback_cents ?? 0} detail="Contestações de cartão" negative />
            <MoneyRow label="Saldo do organizador" cents={balance} detail="Valor efetivamente destinado a você" strong />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Financeiro por evento</h2>
          <div className="mt-3 overflow-x-auto border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-sand-deep/40 text-left">
                  {["Evento", "Receita bruta", "Taxa plataforma", "Taxas Asaas", "Reembolsos", "Valor líquido", "Saldo"].map((h) => (
                    <th key={h} className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isPending ? (
                  [0, 1].map((i) => (
                    <tr key={i} aria-hidden="true">
                      {Array.from({ length: 7 }, (_, c) => (
                        <td key={c} className="px-4 py-3">
                          <div className="h-4 w-full animate-pulse bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (data?.by_event.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Nenhum evento movimentou dinheiro ainda. A primeira linha aparece quando uma inscrição
                      for paga.
                    </td>
                  </tr>
                ) : (
                  (data?.by_event ?? []).map((e) => (
                    <tr key={e.event_id}>
                      <td className="px-4 py-3">
                        {e.event_slug ? (
                          <Link to="/eventos/$slug" params={{ slug: e.event_slug }} className="font-display text-sm font-bold hover:text-accent">
                            {e.event_name ?? "—"}
                          </Link>
                        ) : (
                          <span className="font-display text-sm font-bold">{e.event_name ?? "—"}</span>
                        )}
                      </td>
                      <td className="score-num px-4 py-3 tabular-nums">{brl(e.gross_cents)}</td>
                      <td className="score-num px-4 py-3 tabular-nums">{brl(e.platform_fee_cents)}</td>
                      <td className="score-num px-4 py-3 tabular-nums">{brl(e.asaas_fee_cents)}</td>
                      <td className="score-num px-4 py-3 tabular-nums">{brl(e.refunded_cents)}</td>
                      <td className="score-num px-4 py-3 tabular-nums">{brl(e.organizer_net_cents)}</td>
                      <td className="score-num px-4 py-3 font-bold tabular-nums">{brl(balanceCents(e))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/*
          * Reembolsos: o fluxo de estorno ainda não existe no backend
          * (ADR 0010 §1). A seção fica dizendo a verdade — a alternativa seria
          * listar solicitações inventadas.
          */}
        <section id="reembolsos" className="mt-8">
          <h2 className="text-xl">Reembolsos</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            O reembolso só é considerado concluído após confirmação do Asaas — não é possível marcar manualmente como
            reembolsado.
          </p>
          <p className="mt-3 border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            O fluxo de solicitação de reembolso ainda não está implementado. Estornos já confirmados pelo
            gateway aparecem nos totais acima.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
