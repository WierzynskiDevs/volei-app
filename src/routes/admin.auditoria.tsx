import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AdminPageHeader, AdminShell, AdminTable } from "@/components/site/admin-shell";
import { AdminTableState, formatDateTime } from "@/components/site/admin-async";
import { adminAuditLogsQuery, auditReason } from "@/lib/api/admin";

export const Route = createFileRoute("/admin/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Registro de todas as ações administrativas da plataforma BeacHub: quem fez, o quê, quando e por quê.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Auditoria · Super Admin BeacHub" },
      { property: "og:description", content: "Trilha completa de decisões administrativas." },
    ],
  }),
  component: AdminAudit,
});

function AdminAudit() {
  const { data, isPending, isError, error, refetch } = useQuery(adminAuditLogsQuery());

  const logs = data?.data ?? [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Auditoria"
          description="Toda ação sensível — exclusão, suspensão, moderação, ajuste de pontos — fica registrada de forma imutável."
        />
        <AdminTable head={["Data e hora", "Responsável", "Ação", "Alvo", "Motivo"]}>
          <AdminTableState
            columns={5}
            isPending={isPending}
            isError={isError}
            error={error}
            isEmpty={logs.length === 0}
            emptyMessage="Nenhuma ação registrada ainda. A trilha começa a se formar no primeiro cadastro, login ou decisão administrativa."
            onRetry={() => void refetch()}
          >
            {logs.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDateTime(a.created_at)}
                </td>
                {/*
                 * Ator nulo é ação de sistema — job de expiração, reconciliação.
                 * Inventar um nome aqui falsificaria a trilha.
                 */}
                <td className="px-4 py-3 text-sm font-semibold">{a.actor?.name ?? "Sistema"}</td>
                <td className="px-4 py-3 text-sm">{a.action}</td>
                <td className="px-4 py-3 text-sm">
                  {a.target_type ? `${a.target_type} ${a.target_id?.slice(0, 8) ?? ""}` : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{auditReason(a) ?? "—"}</td>
              </tr>
            ))}
          </AdminTableState>
        </AdminTable>
      </div>
    </AdminShell>
  );
}
