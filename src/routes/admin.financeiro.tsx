import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AdminPageHeader, AdminShell, AdminTable } from "@/components/site/admin-shell";
import { AdminTableState } from "@/components/site/admin-async";
import { Stat } from "@/components/site/cards";
import { GatewayBadge, MoneyCard, MoneyRow } from "@/components/site/finance";
import { adminFinanceQuery, adminOverviewQuery } from "@/lib/api/admin";
import { brl, GATEWAY, pct } from "@/lib/finance-data";

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro global · Super Admin BeacHub" },
      { name: "description", content: "GMV, receita da plataforma, taxas de pagamento, reembolsos, chargebacks e receita por organizador, evento e período." },
      { property: "og:title", content: "Financeiro global · Super Admin BeacHub" },
      { property: "og:description", content: "Quanto a plataforma movimenta e quanto ela ganha." },
    ],
  }),
  component: AdminFinance,
});

/** Rótulo do mês a partir de `YYYY-MM`, sem passar por `new Date`. */
function monthLabel(period: string): string {
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [year, month] = period.split("-");
  const index = Number(month) - 1;
  return `${months[index] ?? month}/${(year ?? "").slice(2)}`;
}

function AdminFinance() {
  const { data, isPending, isError, error, refetch } = useQuery(adminFinanceQuery());
  const { data: overview } = useQuery(adminOverviewQuery());

  const platform = data?.platform;
  const periods = data?.by_month ?? [];

  /*
   * Confirmadas = pagas. `CONFIRMED` e `RECEIVED` contam juntas: as duas
   * garantem a vaga, e a diferença entre elas é de disponibilidade do dinheiro,
   * não de pagamento (ADR 0009 §2).
   */
  const byStatus = overview?.payments.by_status ?? {};
  const paidCount = (byStatus["CONFIRMED"] ?? 0) + (byStatus["RECEIVED"] ?? 0);

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Financeiro"
          description="GMV é o valor bruto movimentado pela plataforma. A receita da plataforma é a soma das taxas cobradas sobre cada inscrição paga."
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyCard label="GMV total" cents={platform?.gross_cents ?? 0} hint="valor bruto movimentado" emphasis />
          <MoneyCard label="Receita da plataforma" cents={platform?.platform_revenue_cents ?? 0} hint="taxas congeladas por transação" tone="ok" />
          <MoneyCard label="Taxas de pagamento (Asaas)" cents={platform?.asaas_fee_cents ?? 0} hint="custo do organizador" />
          <MoneyCard label="Reembolsos" cents={platform?.refunded_cents ?? 0} hint="estornos confirmados" tone="danger" />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyCard label="Chargebacks" cents={platform?.chargeback_cents ?? 0} hint="contestações de cartão" tone="danger" />
          <MoneyCard
            label="Pagamentos pendentes"
            cents={data?.pending.gross_cents ?? 0}
            hint={`${data?.pending.count ?? 0} cobranças`}
          />
          <Stat label="Pagamentos confirmados" value={paidCount} hint="inscrições pagas" />
          <Stat label="Gateway" value={GATEWAY.name} hint={`${GATEWAY.status} · ${GATEWAY.environment}`} />
        </div>

        <section className="mt-8 border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-lg">Composição do GMV</h2>
          </div>
          <div className="divide-y divide-border">
            <MoneyRow label="GMV" cents={platform?.gross_cents ?? 0} detail="Total pago pelos participantes" />
            <MoneyRow label="Receita da plataforma" cents={platform?.platform_revenue_cents ?? 0} detail="Receita do SaaS" />
            <MoneyRow label="Taxas Asaas" cents={platform?.asaas_fee_cents ?? 0} detail="Custo de processamento repassado ao organizador" />
            <MoneyRow
              label="Reembolsos e chargebacks"
              cents={(platform?.refunded_cents ?? 0) + (platform?.chargeback_cents ?? 0)}
              detail="Valor devolvido ou contestado"
              negative
            />
            {/*
              * O líquido só fecha quando toda taxa de gateway foi informada.
              * Enquanto não fecha, dizer o número seria afirmar um repasse que
              * o gateway ainda não confirmou (ADR 0009 §5).
              */}
            <MoneyRow
              label="Repassado a organizadores"
              cents={platform?.organizer_net_cents ?? 0}
              detail={
                platform && !platform.net_is_complete
                  ? "Parcial — há cobrança confirmada sem taxa do gateway informada"
                  : "Saldo líquido dos organizadores"
              }
              strong
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Receita por organizador</h2>
          <AdminTable head={["Organizador", "Plano", "Taxa atual", "Eventos", "GMV", "Receita SaaS", ""]}>
            <AdminTableState
              columns={7}
              isPending={isPending}
              isError={isError}
              error={error}
              isEmpty={(data?.by_organizer.length ?? 0) === 0}
              emptyMessage="Nenhum lançamento financeiro ainda. A primeira linha aparece quando uma inscrição for paga."
              onRetry={() => void refetch()}
            >
              {(data?.by_organizer ?? []).map((o) => (
                <tr key={o.organizer_id}>
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/organizadores/$id"
                      params={{ id: o.organizer_id }}
                      className="font-display text-sm font-bold hover:text-accent"
                    >
                      {o.organizer_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{o.plan_code ?? "—"}</td>
                  {/* Taxa VIGENTE do plano — não a congelada nas cobranças passadas. */}
                  <td className="score-num px-4 py-3">
                    {o.current_platform_fee_basis_points === null
                      ? "—"
                      : pct(o.current_platform_fee_basis_points / 100)}
                  </td>
                  <td className="score-num px-4 py-3">—</td>
                  <td className="score-num px-4 py-3 tabular-nums">{brl(o.gross_cents)}</td>
                  <td className="score-num px-4 py-3 tabular-nums">{brl(o.platform_revenue_cents)}</td>
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/organizadores/$id"
                      params={{ id: o.organizer_id }}
                      className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
                    >
                      Detalhe
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminTableState>
          </AdminTable>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Receita por evento</h2>
          <AdminTable head={["Evento", "GMV", "Receita SaaS", "Taxas Asaas", "Reembolsos", "Chargebacks"]}>
            <AdminTableState
              columns={6}
              isPending={isPending}
              isError={isError}
              error={error}
              isEmpty={(data?.by_event.length ?? 0) === 0}
              emptyMessage="Nenhum evento movimentou dinheiro ainda."
              onRetry={() => void refetch()}
            >
              {(data?.by_event ?? []).map((e) => (
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
                  <td className="score-num px-4 py-3 tabular-nums">{brl(e.platform_revenue_cents)}</td>
                  <td className="score-num px-4 py-3 tabular-nums">{brl(e.asaas_fee_cents)}</td>
                  <td className="score-num px-4 py-3 tabular-nums">{brl(e.refunded_cents)}</td>
                  <td className="score-num px-4 py-3 tabular-nums">{brl(e.chargeback_cents)}</td>
                </tr>
              ))}
            </AdminTableState>
          </AdminTable>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Receita por período</h2>
          <div className="mt-3 border border-border bg-card p-4">
            {periods.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ainda não há meses com movimento. O gráfico se forma a partir do primeiro pagamento confirmado.
              </p>
            ) : (
              <div className="flex items-end gap-4">
                {periods.map((p) => {
                  // Escala relativa ao maior mês. Sem movimento, `max` seria 0 e
                  // a divisão viraria NaN — daí o piso de 1.
                  const max = Math.max(1, ...periods.map((x) => x.gross_cents));
                  return (
                    <div key={p.period} className="flex flex-1 flex-col items-center gap-2">
                      <span className="score-num text-xs tabular-nums text-muted-foreground">
                        {brl(p.platform_revenue_cents)}
                      </span>
                      <div className="flex h-40 w-full items-end bg-sand-deep/30">
                        <div className="w-full bg-graphite" style={{ height: `${(p.gross_cents / max) * 100}%` }} />
                      </div>
                      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {monthLabel(p.period)}
                      </span>
                      <span className="score-num text-xs tabular-nums">{brl(p.gross_cents)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Barra = GMV do período · valor acima = receita da plataforma.</p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
