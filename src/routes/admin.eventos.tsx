import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  AdminAction,
  AdminPageHeader,
  AdminShell,
  AdminTable,
  StatusPill,
} from "@/components/site/admin-shell";
import { AdminTableState, formatDateTime } from "@/components/site/admin-async";
import {
  adminEventsQuery,
  cancelEventAsAdmin,
  type AdminEvent,
  type EventGroup,
} from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/query-keys";

export const Route = createFileRoute("/admin/eventos")({
  head: () => ({
    meta: [
      { title: "Moderação de eventos · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Suspenda, cancele ou exclua eventos com motivo registrado em auditoria na plataforma BeacHub.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Moderação de eventos · Super Admin BeacHub" },
      { property: "og:description", content: "Governança de eventos publicados." },
    ],
  }),
  component: AdminEvents,
});

const filters = [
  "Todos",
  "Rascunho",
  "Ativo",
  "Em andamento",
  "Finalizado",
  "Cancelado",
  "Denunciado",
] as const;

/**
 * Abas viram filtro do servidor. "Em andamento" mapeia para os estados do motor
 * de competição, que é Fase 2 — a aba existe e responde vazio, que é a verdade.
 *
 * "Denunciado" não tem correspondente: denúncias são Fase 2 e não há tabela.
 * Filtrar por nome do evento, como o protótipo fazia, seria inventar dado.
 */
const GROUP: Record<(typeof filters)[number], EventGroup | undefined> = {
  Todos: undefined,
  Rascunho: "draft",
  Ativo: "active",
  "Em andamento": "running",
  Finalizado: "finished",
  Cancelado: "cancelled",
  Denunciado: undefined,
};

function tone(status: string) {
  if (status === "CANCELLED") return "danger" as const;
  if (status === "IN_PROGRESS") return "warn" as const;
  if (status === "FINISHED" || status === "DRAFT") return "neutral" as const;
  return "ok" as const;
}

function AdminEvents() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [action, setAction] = useState<{ event: AdminEvent; kind: string } | null>(null);
  const [reason, setReason] = useState("");

  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery(
    adminEventsQuery({ ...(GROUP[filter] ? { group: GROUP[filter] } : {}) }),
  );

  const cancel = useMutation({
    mutationFn: ({ slug, why }: { slug: string; why: string }) => cancelEventAsAdmin(slug, why),
    onSuccess: async () => {
      // O cancelamento muda a lista do admin, a vitrine pública e a trilha.
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      setAction(null);
      setReason("");
    },
  });

  const rows = data?.data ?? [];
  const isReportFilter = filter === "Denunciado";

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Eventos"
          description="Moderação em três passos: suspender para investigar, depois manter ativo, cancelar ou excluir — sempre com motivo registrado."
        />

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`border px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-widest ${
                filter === f
                  ? "border-graphite bg-graphite text-background"
                  : "border-border text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <AdminTable head={["Evento", "Organizador", "Local", "Data", "Status", "Ações"]}>
          <AdminTableState
            columns={6}
            isPending={isPending}
            isError={isError}
            error={error}
            isEmpty={isReportFilter || rows.length === 0}
            emptyMessage={
              isReportFilter
                ? "Denúncias entram na Fase 2 — ainda não há de onde ler esta lista."
                : "Nenhum evento com este filtro."
            }
            onRetry={() => void refetch()}
          >
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3">
                  <p className="font-display text-sm font-bold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.max_teams === null
                      ? `${e.teams_registered_count} duplas`
                      : `${e.teams_registered_count}/${e.max_teams} duplas`}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm">{e.organizer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-sm">
                  {e.city}/{e.state}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDateTime(e.start_at)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={tone(e.status)}>{e.status_label}</StatusPill>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <AdminAction>Visualizar</AdminAction>
                    <AdminAction
                      onClick={() => {
                        setAction({ event: e, kind: "Suspender evento" });
                        setReason("");
                      }}
                    >
                      Suspender
                    </AdminAction>
                    <AdminAction
                      onClick={() => {
                        setAction({ event: e, kind: "Cancelar evento" });
                        setReason("");
                      }}
                    >
                      Cancelar
                    </AdminAction>
                    <AdminAction
                      tone="danger"
                      onClick={() => {
                        setAction({ event: e, kind: "Excluir evento" });
                        setReason("");
                      }}
                    >
                      Excluir
                    </AdminAction>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableState>
        </AdminTable>

        {action ? (
          <div className="mt-6 border border-warning/40 bg-warning/10 p-5">
            <p className="font-display text-sm font-bold">
              {action.kind} · {action.event.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {action.kind === "Cancelar evento"
                ? "Informe o motivo. Ele será exibido ao organizador, registrado na auditoria e dispara o direito a reembolso dos inscritos."
                : "Informe o motivo. Ele será exibido ao organizador e registrado na auditoria."}
            </p>
            {/*
             * Só o cancelamento tem backend. Suspender e excluir evento não
             * existem como operação de domínio — ver ADR 0010 §1. Dizer isso na
             * tela é melhor do que um botão que finge ter agido.
             */}
            {action.kind !== "Cancelar evento" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Esta operação ainda não existe no backend. Para tirar o evento do ar agora, use
                “Cancelar”, que informa os inscritos e registra a decisão.
              </p>
            ) : null}
            <textarea
              rows={3}
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              className="input-base mt-3"
              placeholder="Motivo da ação de moderação"
            />
            {cancel.isError ? (
              <p className="mt-2 text-sm text-destructive">{(cancel.error as Error).message}</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={
                  action.kind !== "Cancelar evento" || reason.trim().length < 10 || cancel.isPending
                }
                onClick={() => cancel.mutate({ slug: action.event.slug, why: reason.trim() })}
                className="bg-graphite px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest text-background disabled:opacity-50"
              >
                {cancel.isPending ? "Registrando…" : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAction(null);
                  setReason("");
                  cancel.reset();
                }}
                className="border border-border px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
