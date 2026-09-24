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
import { AdminTableState, formatDate } from "@/components/site/admin-async";
import { ROLE_LABEL } from "@/lib/accounts";
import {
  adminUsersQuery,
  setUserBlocked,
  type AdminUser,
  type AdminUserFilter,
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

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Controle de usuários · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Visualize, filtre, suspenda ou exclua contas de jogadores e organizadores da plataforma BeacHub.",
      },
      { property: "og:title", content: "Controle de usuários · Super Admin BeacHub" },
      { property: "og:description", content: "Gestão de contas com trilha de auditoria." },
    ],
  }),
  component: AdminUsers,
});

const filters = ["Todos", "Jogador", "Organizador", "Ambos", "Ativo", "Suspenso"] as const;

/**
 * As abas da tela viram filtro **do servidor**, não recorte em memória.
 *
 * Filtrar a página já carregada mentiria: a lista é paginada no backend (§6), e
 * "Suspenso" mostraria só os suspensos que por acaso estivessem na primeira
 * página.
 */
const FILTER_PARAM: Record<(typeof filters)[number], AdminUserFilter | undefined> = {
  Todos: undefined,
  Jogador: "player",
  Organizador: "organizer",
  Ambos: "both",
  Ativo: "active",
  Suspenso: "blocked",
};

/** Iniciais do nome — apresentação, derivada do dado real. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Linha de apoio sob o nome: onde a pessoa está, quando existe. */
function localityOf(user: AdminUser): string {
  return [user.city, user.state].filter(Boolean).join("/") || "Sem cidade informada";
}

function AdminUsers() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [toToggle, setToToggle] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");

  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery(
    adminUsersQuery({ ...(FILTER_PARAM[filter] ? { filter: FILTER_PARAM[filter] } : {}) }),
  );

  const rows = data?.data ?? [];

  /*
   * Suspender/reativar invalida o painel inteiro: a decisão muda esta lista, o
   * dashboard global e a trilha de auditoria de uma vez.
   */
  const toggle = useMutation({
    mutationFn: ({ user, why }: { user: AdminUser; why: string }) =>
      setUserBlocked(user.id, user.status === "ACTIVE", why),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      setToToggle(null);
      setReason("");
    },
  });

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Usuários"
          description="Dados de contato ficam mascarados por padrão e nunca aparecem no perfil público."
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

        <AdminTable
          head={[
            "Usuário",
            "Contato",
            "Tipo",
            "Status",
            "Eventos",
            "Participações",
            "Cadastro",
            "Ações",
          ]}
        >
          <AdminTableState
            columns={8}
            isPending={isPending}
            isError={isError}
            error={error}
            isEmpty={rows.length === 0}
            emptyMessage="Nenhuma conta com este filtro."
            onRetry={() => void refetch()}
          >
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center bg-graphite text-[11px] font-bold text-background">
                      {initialsOf(a.name)}
                    </span>
                    <div>
                      <p className="font-display text-sm font-bold">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{localityOf(a)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <p>{a.email}</p>
                  {/* Máscara feita no servidor: o telefone completo não chega aqui (§12). */}
                  <p>{a.phone_masked ?? "Sem telefone"}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  {(a.roles ?? []).map((r) => ROLE_LABEL[r]).join(" + ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={a.status === "ACTIVE" ? "ok" : "danger"}>
                    {a.status_label}
                  </StatusPill>
                </td>
                {/*
                 * Eventos e participações por conta não existem no contrato da
                 * API. Preferir "—" a somar número no cliente: contagem
                 * inventada em tela de governança é pior do que coluna vazia.
                 */}
                <td className="score-num px-4 py-3">—</td>
                <td className="score-num px-4 py-3">—</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(a.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <AdminAction>Visualizar</AdminAction>
                    <AdminAction
                      onClick={() => {
                        setToToggle(a);
                        setReason("");
                      }}
                    >
                      {a.status === "ACTIVE" ? "Suspender" : "Reativar"}
                    </AdminAction>
                    <AdminAction tone="danger" onClick={() => setToDelete(a)}>
                      Excluir
                    </AdminAction>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableState>
        </AdminTable>
      </div>

      {/*
       * Suspensão e reativação: o motivo é exigido pela API (mínimo de 10
       * caracteres) e vai para a trilha de auditoria. Sem ele a chamada volta
       * 422 — então o botão só habilita quando há texto suficiente.
       */}
      <AlertDialog
        open={!!toToggle}
        onOpenChange={(o) => {
          if (!o) {
            setToToggle(null);
            setReason("");
            toggle.reset();
          }
        }}
      >
        <AlertDialogContent className="rounded-none border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toToggle?.status === "ACTIVE" ? "Suspender esta conta?" : "Reativar esta conta?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toToggle ? `${toToggle.name} (${toToggle.email}). ` : ""}
              {toToggle?.status === "ACTIVE"
                ? "A pessoa perde o acesso imediatamente, inclusive na sessão que estiver aberta agora."
                : "A pessoa volta a acessar a plataforma normalmente."}{" "}
              A decisão é registrada na auditoria com o motivo informado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block">
            <span className="eyebrow">Motivo</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-base mt-1.5"
              placeholder="Fraude, abuso, violação das regras, denúncia grave…"
            />
          </label>
          {toggle.isError ? (
            <p className="text-sm text-destructive">{(toggle.error as Error).message}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-destructive-foreground"
              disabled={reason.trim().length < 10 || toggle.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toToggle) toggle.mutate({ user: toToggle, why: reason.trim() });
              }}
            >
              {toggle.isPending
                ? "Registrando…"
                : toToggle?.status === "ACTIVE"
                  ? "Suspender conta"
                  : "Reativar conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*
       * Exclusão de conta permanece sem backend, por decisão do ADR 0010 §1:
       * apagar titular é o direito de anonimização do §12, não um DELETE de
       * linha — e exclusão simples abriria caminho para apagar pessoa com
       * pagamento associado. O diálogo do baseline segue aqui, inalterado.
       */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-none border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `${toDelete.name} (${toDelete.email}). ` : ""}
              Essa ação afetará o acesso do usuário e poderá anonimizar dados relacionados ao
              histórico esportivo. A exclusão é registrada na auditoria com o motivo informado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block">
            <span className="eyebrow">Motivo da exclusão</span>
            <textarea
              rows={3}
              className="input-base mt-1.5"
              placeholder="Fraude, abuso, violação das regras, denúncia grave…"
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground">
              Excluir conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
