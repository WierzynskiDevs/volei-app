import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AdminPageHeader, AdminShell, StatusPill } from "@/components/site/admin-shell";
import { formatDateTime } from "@/components/site/admin-async";
import { Stat } from "@/components/site/cards";
import {
  adCampaigns,
  eventFeedbacks,
  feedbackAverage,
  partnerVenues,
  reports,
} from "@/lib/admin-data";
import { adminAuditLogsQuery, adminOverviewQuery } from "@/lib/api/admin";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard global · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Indicadores de usuários, eventos, arenas parceiras, denúncias e publicidade da plataforma BeacHub.",
      },
      { property: "og:title", content: "Dashboard global · Super Admin BeacHub" },
      { property: "og:description", content: "Controle global da plataforma de vôlei de areia." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  /*
   * Usuários, organizadores e eventos vêm do banco. Arenas, denúncias,
   * feedbacks e publicidade continuam em mock: são Fase 2 e não existe tabela
   * nem endpoint por trás deles (CLAUDE.md §27.3).
   */
  const { data, isPending } = useQuery(adminOverviewQuery());
  const audit = useQuery(adminAuditLogsQuery());

  const openReports = reports.filter((r) =>
    ["PENDENTE", "EM_ANALISE", "SOLICITACAO_INFO"].includes(r.status),
  ).length;
  const activeAds = adCampaigns.filter((c) => c.status === "ATIVA").length;

  /** Enquanto carrega, "—" em vez de zero: zero é uma afirmação sobre a base. */
  const n = (value: number | undefined) => (isPending || value === undefined ? "—" : value);

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Dashboard global"
          description="Visão consolidada da plataforma: base de usuários, operação de eventos, governança e receita de publicidade."
        />

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Stat
            label="Usuários cadastrados"
            value={n(data?.users.total)}
            hint="contas ativas e suspensas"
          />
          <Stat label="Jogadores" value={n(data?.users.players)} />
          <Stat label="Organizadores" value={n(data?.users.organizers)} />
          <Stat label="Eventos ativos" value={n(data?.events.active)} />
          <Stat label="Eventos realizados" value={n(data?.events.finished)} />
          <Stat label="Arenas parceiras" value={partnerVenues.length} />
          <Stat label="Denúncias abertas" value={openReports} hint="triagem e análise" />
          <Stat label="Feedbacks recentes" value={eventFeedbacks.length} />
          <Stat
            label="Publicidade ativa"
            value={activeAds}
            hint={`${adCampaigns.length} campanhas`}
          />
          <Stat label="Receita de publicidade" value="—" hint="preparado para faturamento" />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <section className="border border-border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg">Denúncias prioritárias</h2>
              <Link
                to="/admin/denuncias"
                className="font-display text-[10px] font-bold uppercase tracking-widest text-accent"
              >
                Ver todas
              </Link>
            </div>
            <div className="divide-y divide-border">
              {reports.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  to="/admin/denuncias/$id"
                  params={{ id: r.id }}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted"
                >
                  <span className="font-display text-sm font-bold">{r.code}</span>
                  <span className="text-sm text-muted-foreground">
                    {r.target} · {r.reason}
                  </span>
                  <span className="ml-auto flex gap-2">
                    <StatusPill tone={r.priority === "Alta" ? "danger" : "warn"}>
                      {r.priority}
                    </StatusPill>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg">Feedbacks recentes</h2>
            </div>
            <div className="divide-y divide-border">
              {eventFeedbacks.map((f) => (
                <div key={f.id} className="px-4 py-3">
                  <p className="font-display text-sm font-bold">{f.event}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.author} · média{" "}
                    <span className="score-num">{feedbackAverage(f).toFixed(1)}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg">Últimas ações administrativas</h2>
            <Link
              to="/admin/auditoria"
              className="font-display text-[10px] font-bold uppercase tracking-widest text-accent"
            >
              Auditoria
            </Link>
          </div>
          <div className="divide-y divide-border">
            {audit.isPending ? (
              <div className="px-4 py-3" aria-busy="true">
                <div className="h-4 w-2/3 animate-pulse bg-muted" />
              </div>
            ) : (audit.data?.data.length ?? 0) === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nenhuma ação registrada ainda.
              </p>
            ) : (
              (audit.data?.data ?? []).slice(0, 4).map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{formatDateTime(a.created_at)}</span>
                  <span className="font-semibold">{a.action}</span>
                  <span className="text-muted-foreground">· {a.target_type ?? "—"}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
