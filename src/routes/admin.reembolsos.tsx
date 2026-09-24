import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  AdminAction,
  AdminPageHeader,
  AdminShell,
  AdminTable,
} from "@/components/site/admin-shell";
import { FinanceAlert, FilterTabs, MoneyCard, RefundStatusPill } from "@/components/site/finance";
import {
  brl,
  organizerFinances,
  pendingRefundStatuses,
  refunds,
  REFUND_CAUSE_LABEL,
} from "@/lib/finance-data";

export const Route = createFileRoute("/admin/reembolsos")({
  head: () => ({
    meta: [
      { title: "Reembolsos · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Fila de reembolsos pendentes por organizador, evento e participante, com motivo, prazo e status no gateway.",
      },
      { property: "og:title", content: "Reembolsos · Super Admin BeacHub" },
      {
        property: "og:description",
        content: "Governança dos estornos obrigatórios da plataforma.",
      },
    ],
  }),
  component: AdminRefunds,
});

const filters = ["Pendentes", "Todos", "Concluídos", "Falhas"] as const;

function AdminRefunds() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Pendentes");

  const list = refunds.filter((r) => {
    if (filter === "Todos") return true;
    if (filter === "Pendentes")
      return pendingRefundStatuses.includes(r.status) && r.status !== "FAILED";
    if (filter === "Concluídos") return r.status === "REFUNDED" || r.status === "REJECTED";
    return r.status === "FAILED";
  });

  const mandatoryPending = refunds.filter(
    (r) => r.mandatory && pendingRefundStatuses.includes(r.status),
  );
  const blocked = organizerFinances.filter((o) => o.status === "BLOQUEADO");

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Reembolsos"
          description="Reembolsos por alteração ou cancelamento de evento são obrigatórios e de responsabilidade financeira do organizador. Só são concluídos após confirmação do Asaas."
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MoneyCard
            label="Reembolsos obrigatórios pendentes"
            cents={mandatoryPending.reduce((s, r) => s + r.amountCents, 0)}
            hint={`${mandatoryPending.length} solicitações`}
            tone="danger"
          />
          <MoneyCard
            label="Reembolsos confirmados"
            cents={refunds
              .filter((r) => r.status === "REFUNDED")
              .reduce((s, r) => s + r.amountCents, 0)}
            hint="estornados pelo gateway"
            tone="ok"
          />
          <MoneyCard
            label="Falhas de reembolso"
            cents={refunds
              .filter((r) => r.status === "FAILED")
              .reduce((s, r) => s + r.amountCents, 0)}
            hint="exigem ação do organizador"
            tone="danger"
          />
        </div>

        {blocked.length ? (
          <div className="mt-4">
            <FinanceAlert
              tone="danger"
              title={`${blocked.length} organizador(es) com bloqueio administrativo`}
              action={
                <Link
                  to="/admin/organizadores"
                  className="border border-destructive/50 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-destructive"
                >
                  Ver organizadores
                </Link>
              }
            >
              {blocked.map((o) => o.name).join(", ")} — reembolsos obrigatórios não comprovados.
              Criação de eventos e recebimento de novas inscrições bloqueados.
            </FinanceAlert>
          </div>
        ) : null}

        <div className="mt-6">
          <FilterTabs options={filters} value={filter} onChange={setFilter} />
        </div>

        <AdminTable
          head={[
            "Organizador",
            "Evento",
            "Participante",
            "Valor",
            "Motivo",
            "Solicitado",
            "Prazo",
            "Gateway",
            "Status",
            "Ações",
          ]}
        >
          {list.map((r) => {
            const org = organizerFinances.find((o) => o.id === r.organizerId);
            return (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <Link
                    to="/admin/organizadores/$id"
                    params={{ id: r.organizerId }}
                    className="font-display text-sm font-bold hover:text-accent"
                  >
                    {org?.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.eventName}</td>
                <td className="px-4 py-3 text-sm">{r.participant}</td>
                <td className="score-num px-4 py-3 tabular-nums">{brl(r.amountCents)}</td>
                <td className="px-4 py-3 text-xs">
                  <p className="font-display font-bold uppercase tracking-widest text-muted-foreground">
                    {REFUND_CAUSE_LABEL[r.cause]}
                  </p>
                  <p className="text-muted-foreground">{r.reason}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.requestedAt}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.deadline}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {r.gatewayRefundId ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <RefundStatusPill status={r.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Link
                      to="/admin/pagamentos/$id"
                      params={{ id: r.paymentId }}
                      className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
                    >
                      Ledger
                    </Link>
                    {pendingRefundStatuses.includes(r.status) ? (
                      <AdminAction tone="danger">Cobrar organizador</AdminAction>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </AdminTable>

        <p className="mt-4 text-xs text-muted-foreground">
          O organizador não pode marcar um reembolso como concluído manualmente: o status só muda
          com a confirmação do Asaas via webhook.
        </p>
      </div>
    </AdminShell>
  );
}
