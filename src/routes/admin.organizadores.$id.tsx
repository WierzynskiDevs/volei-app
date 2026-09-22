import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AdminPageHeader, AdminShell, AdminTable, StatusPill } from "@/components/site/admin-shell";
import { AdminTableState, formatDate } from "@/components/site/admin-async";
import { FinanceAlert, GatewayBadge, MoneyCard, PaymentStatusPill } from "@/components/site/finance";
import { adminOrganizerQuery, adminPaymentsQuery } from "@/lib/api/admin";
import { brlOrUnavailable, paymentPillStatus } from "@/lib/api/format";
import { brl, pct } from "@/lib/finance-data";

export const Route = createFileRoute("/admin/organizadores/$id")({
  head: () => ({
    meta: [
      { title: "Organizador · Super Admin BeacHub" },
      { name: "description", content: "Conta, plano, taxas, pagamentos e reembolsos de um organizador da plataforma BeacHub." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Organizador · Super Admin BeacHub" },
    ],
  }),
  component: AdminOrganizerDetail,
});

function AdminOrganizerDetail() {
  const { id } = Route.useParams();

  const { data: organizer, isPending, isError, error, refetch } = useQuery(adminOrganizerQuery(id));
  const payments = useQuery(adminPaymentsQuery({ organizer_id: id }));

  if (isPending) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true">
          <div className="h-6 w-48 animate-pulse bg-muted" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse border border-border bg-card" />
            ))}
          </div>
        </div>
      </AdminShell>
    );
  }

  if (isError) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-2xl">Organizador não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              className="border border-border px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest"
            >
              Tentar de novo
            </button>
            <Link to="/admin/organizadores" className="eyebrow self-center hover:text-foreground">
              ← Organizadores
            </Link>
          </div>
        </div>
      </AdminShell>
    );
  }

  const finance = organizer.finance;
  const feeLabel =
    organizer.plan === null || organizer.plan === undefined
      ? "—"
      : pct(organizer.plan.platform_fee_basis_points / 100);

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/admin/organizadores" className="eyebrow hover:text-foreground">
          ← Organizadores
        </Link>
        <AdminPageHeader
          title={organizer.name}
          description={`Plano ${organizer.plan?.name ?? "—"} · taxa atual ${feeLabel} · conta ${organizer.payment_account_status_label}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                tone={
                  organizer.status === "REGULAR" ? "ok" : organizer.status === "ATTENTION" ? "warn" : "danger"
                }
              >
                {organizer.status_label}
              </StatusPill>
              <GatewayBadge />
            </div>
          }
        />

        {organizer.status === "BLOCKED" ? (
          <div className="mt-4">
            <FinanceAlert tone="danger" title="Organizador bloqueado">
              Criação de eventos e recebimento de novas inscrições estão bloqueados. A liberação é feita
              na lista de organizadores, com motivo registrado em auditoria.
            </FinanceAlert>
          </div>
        ) : null}

        {!organizer.can_receive_payments && organizer.status !== "BLOCKED" ? (
          <div className="mt-4">
            <FinanceAlert tone="warn" title="Conta de recebimento não vinculada">
              Sem conta vinculada, este organizador não consegue publicar evento pago — não há destino
              para o repasse.
            </FinanceAlert>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyCard label="GMV" cents={finance?.gross_cents ?? 0} hint="bruto arrecadado" emphasis />
          <MoneyCard label="Receita da plataforma" cents={finance?.platform_revenue_cents ?? 0} hint="taxas cobradas" tone="ok" />
          <MoneyCard label="Taxas Asaas" cents={finance?.asaas_fee_cents ?? 0} hint="custo de processamento" />
          <MoneyCard
            label="Líquido do organizador"
            cents={finance?.organizer_net_cents ?? 0}
            hint={finance && !finance.net_is_complete ? "parcial — falta taxa do gateway" : "após taxas e estornos"}
          />
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg">Conta e plano</h2>
            </div>
            <div className="divide-y divide-border text-sm">
              {[
                ["Plano atual", organizer.plan?.name ?? "—"],
                ["Taxa da plataforma", feeLabel],
                ["Conta de recebimento", organizer.payment_account_status_label],
                ["Pode receber", organizer.can_receive_payments ? "Sim" : "Não"],
                ["Responsável", organizer.owner?.name ?? "—"],
                ["E-mail do responsável", organizer.owner?.email ?? "—"],
                ["Cadastro", formatDate(organizer.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap gap-2 px-4 py-2.5">
                  <span className="min-w-[160px] text-muted-foreground">{k}</span>
                  <span className="font-display font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg">Histórico de planos</h2>
            </div>
            <div className="divide-y divide-border">
              {(organizer.plan_history ?? []).length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Nenhuma mudança de plano registrada.
                </p>
              ) : (
                (organizer.plan_history ?? []).map((h) => (
                  <div key={h.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm font-bold">{h.plan_name ?? h.plan_code ?? "—"}</span>
                      {/* Taxa vigente à época da mudança, não a de hoje. */}
                      <span className="score-num text-sm">{pct(h.platform_fee_basis_points / 100)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{formatDate(h.effective_at)}</span>
                    </div>
                    {h.note ? <p className="text-xs text-muted-foreground">{h.note}</p> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/*
          * Reembolsos: a operação de estorno ainda não existe no backend
          * (ADR 0010 §1 e ADR 0009 §21.4). A seção fica, dizendo a verdade, em
          * vez de listar dado inventado.
          */}
        <section className="mt-8">
          <h2 className="text-xl">Reembolsos</h2>
          <p className="mt-3 border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            O fluxo de estorno ainda não está implementado — não há reembolso registrado para nenhum
            organizador.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Pagamentos</h2>
          <AdminTable head={["Cobrança", "Evento", "Participante", "Valor", "Taxa", "Líquido", "Status", ""]}>
            <AdminTableState
              columns={8}
              isPending={payments.isPending}
              isError={payments.isError}
              error={payments.error}
              isEmpty={(payments.data?.data.length ?? 0) === 0}
              emptyMessage="Nenhuma cobrança emitida por este organizador."
              onRetry={() => void payments.refetch()}
            >
              {(payments.data?.data ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-display text-sm font-bold">
                    {p.external_reference ?? p.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.event?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{p.payer?.name ?? "—"}</td>
                  <td className="score-num px-4 py-3 tabular-nums">{brl(p.gross_cents)}</td>
                  <td className="score-num px-4 py-3 tabular-nums">
                    {brl(p.platform_fee_cents)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {pct(p.platform_fee_basis_points / 100)}
                    </span>
                  </td>
                  <td className="score-num px-4 py-3 tabular-nums">
                    {brlOrUnavailable(p.organizer_net_cents, brl)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusPill status={paymentPillStatus(p.status)} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/pagamentos/$id"
                      params={{ id: p.id }}
                      className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
                    >
                      Ledger
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminTableState>
          </AdminTable>
        </section>
      </div>
    </AdminShell>
  );
}
