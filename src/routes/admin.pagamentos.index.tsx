import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminPageHeader, AdminShell, AdminTable } from "@/components/site/admin-shell";
import { AdminTableState } from "@/components/site/admin-async";
import { FilterTabs, GatewayBadge, PaymentStatusPill } from "@/components/site/finance";
import { adminPaymentsQuery, type PaymentGroup } from "@/lib/api/admin";
import { brlOrUnavailable, paymentPillStatus } from "@/lib/api/format";
import { brl, pct } from "@/lib/finance-data";

export const Route = createFileRoute("/admin/pagamentos/")({
  head: () => ({
    meta: [
      { title: "Pagamentos · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Todas as cobranças da plataforma BeacHub com taxa congelada, taxa do gateway e valor líquido do organizador.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Pagamentos · Super Admin BeacHub" },
      { property: "og:description", content: "Visão completa das transações." },
    ],
  }),
  component: AdminPayments,
});

const filters = ["Todos", "Pagos", "Pendentes", "Falhos", "Reembolsados", "Chargebacks"] as const;

/**
 * As abas viram o parâmetro `group` da API, cujo mapa vive no enum de domínio
 * (`PaymentStatus::group`). "Pagos" reúne confirmado e recebido — fatos
 * diferentes que aparecem na mesma aba.
 */
const GROUP: Record<(typeof filters)[number], PaymentGroup | undefined> = {
  Todos: undefined,
  Pagos: "paid",
  Pendentes: "pending",
  Falhos: "failed",
  Reembolsados: "refunded",
  Chargebacks: "chargeback",
};

function AdminPayments() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");

  const { data, isPending, isError, error, refetch } = useQuery(
    adminPaymentsQuery({ ...(GROUP[filter] ? { group: GROUP[filter] } : {}) }),
  );

  const list = data?.data ?? [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Pagamentos"
          description="Cada cobrança guarda a taxa da plataforma congelada no momento em que foi criada — mudanças de plano não alteram transações passadas."
          action={<GatewayBadge />}
        />

        <div className="mt-6">
          <FilterTabs options={filters} value={filter} onChange={setFilter} />
        </div>

        <AdminTable
          head={[
            "Cobrança",
            "Participante",
            "Evento",
            "Valor",
            "Taxa plataforma",
            "Taxa Asaas",
            "Líquido",
            "Status",
            "",
          ]}
        >
          <AdminTableState
            columns={9}
            isPending={isPending}
            isError={isError}
            error={error}
            isEmpty={list.length === 0}
            emptyMessage="Nenhuma cobrança com este filtro."
            onRetry={() => void refetch()}
          >
            {list.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-display text-sm font-bold">
                    {p.external_reference ?? p.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.provider}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm">{p.payer?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.method_label}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.event?.name ?? "—"}</td>
                <td className="score-num px-4 py-3 tabular-nums">{brl(p.gross_cents)}</td>
                <td className="score-num px-4 py-3 tabular-nums">
                  {brl(p.platform_fee_cents)}
                  {/* Alíquota congelada da cobrança, não a taxa atual do plano (§7.5). */}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {pct(p.platform_fee_basis_points / 100)}
                  </span>
                </td>
                {/* `—` e não R$ 0,00: taxa desconhecida é diferente de taxa zero. */}
                <td className="score-num px-4 py-3 tabular-nums">
                  {brlOrUnavailable(p.asaas_fee_cents, brl)}
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
      </div>
    </AdminShell>
  );
}
