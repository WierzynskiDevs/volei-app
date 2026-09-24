import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  AdminAction,
  AdminPageHeader,
  AdminShell,
  AdminTable,
  StatusPill,
} from "@/components/site/admin-shell";
import { AdminTableState, formatDate } from "@/components/site/admin-async";
import {
  adminOrganizersQuery,
  setOrganizerStatus,
  type AdminOrganizer,
  type OrganizerStatus,
} from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/query-keys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/organizadores/")({
  head: () => ({
    meta: [
      { title: "Organizadores · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Acompanhe organizadores de campeonatos, volume de eventos, denúncias associadas e status na plataforma.",
      },
      { property: "og:title", content: "Organizadores · Super Admin BeacHub" },
      { property: "og:description", content: "Governança de quem opera campeonatos." },
    ],
  }),
  component: AdminOrganizers,
});

function toneOf(status: OrganizerStatus) {
  if (status === "BLOCKED") return "danger" as const;
  if (status === "ATTENTION") return "warn" as const;
  return "ok" as const;
}

function AdminOrganizers() {
  const [decision, setDecision] = useState<{
    organizer: AdminOrganizer;
    status: OrganizerStatus;
  } | null>(null);
  const [reason, setReason] = useState("");

  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery(adminOrganizersQuery());

  const change = useMutation({
    mutationFn: ({ id, status, why }: { id: string; status: OrganizerStatus; why: string }) =>
      setOrganizerStatus(id, status, why),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      setDecision(null);
      setReason("");
    },
  });

  const organizers = data?.data ?? [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Organizadores"
          description="Organizador cria e opera campeonatos. Não confundir com Super Admin, que controla a plataforma inteira."
        />

        <AdminTable
          head={["Organizador", "Cidade", "Eventos", "Denúncias", "Status", "Desde", "Ações"]}
        >
          <AdminTableState
            columns={7}
            isPending={isPending}
            isError={isError}
            error={error}
            isEmpty={organizers.length === 0}
            emptyMessage="Nenhum organizador cadastrado ainda."
            onRetry={() => void refetch()}
          >
            {organizers.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3">
                  <p className="font-display text-sm font-bold">{o.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.contact_email ?? o.owner?.email ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm">
                  {o.city && o.state ? `${o.city}/${o.state}` : "—"}
                </td>
                {/* Contagem vinda do módulo Events, composta pelo backend. */}
                <td className="score-num px-4 py-3">{o.events_count ?? "—"}</td>
                {/*
                 * Denúncias são Fase 2: não existe tabela nem endpoint. O
                 * protótipo contava por correspondência de nome — inventar de
                 * novo seria pior do que a coluna vazia.
                 */}
                <td className="px-4 py-3">
                  <StatusPill>—</StatusPill>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={toneOf(o.status)}>{o.status_label}</StatusPill>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(o.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Link
                      to="/admin/organizadores/$id"
                      params={{ id: o.id }}
                      className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
                    >
                      Visualizar
                    </Link>
                    <AdminAction
                      onClick={() => {
                        setDecision({ organizer: o, status: "ATTENTION" });
                        setReason("");
                      }}
                    >
                      Advertir
                    </AdminAction>
                    <AdminAction
                      tone="danger"
                      onClick={() => {
                        // Bloqueado volta para regular; os demais vão para bloqueado.
                        setDecision({
                          organizer: o,
                          status: o.status === "BLOCKED" ? "REGULAR" : "BLOCKED",
                        });
                        setReason("");
                      }}
                    >
                      {o.status === "BLOCKED" ? "Liberar" : "Suspender"}
                    </AdminAction>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableState>
        </AdminTable>
      </div>

      <AlertDialog
        open={!!decision}
        onOpenChange={(o) => {
          if (!o) {
            setDecision(null);
            setReason("");
            change.reset();
          }
        }}
      >
        <AlertDialogContent className="rounded-none border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision?.status === "BLOCKED"
                ? "Suspender este organizador?"
                : decision?.status === "ATTENTION"
                  ? "Registrar advertência?"
                  : "Liberar este organizador?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision ? `${decision.organizer.name}. ` : ""}
              {decision?.status === "BLOCKED"
                ? "Ele deixa de criar eventos e de receber pagamentos enquanto estiver suspenso."
                : decision?.status === "ATTENTION"
                  ? "A conta continua operando; a advertência fica registrada para acompanhamento."
                  : "Ele volta a operar normalmente."}{" "}
              A decisão vai para a trilha de auditoria com o motivo informado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block">
            <span className="eyebrow">Motivo</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-base mt-1.5"
              placeholder="Cancelamentos recorrentes, reembolso não processado, denúncia procedente…"
            />
          </label>
          {change.isError ? (
            <p className="text-sm text-destructive">{(change.error as Error).message}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-destructive-foreground"
              disabled={reason.trim().length < 10 || change.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (decision) {
                  change.mutate({
                    id: decision.organizer.id,
                    status: decision.status,
                    why: reason.trim(),
                  });
                }
              }}
            >
              {change.isPending ? "Registrando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
