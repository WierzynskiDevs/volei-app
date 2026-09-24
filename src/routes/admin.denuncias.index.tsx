import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AdminPageHeader, AdminShell, AdminTable, StatusPill } from "@/components/site/admin-shell";
import {
  REPORT_STATUS_LABEL,
  reports,
  type ReportStatus,
  type ReportTarget,
} from "@/lib/admin-data";

export const Route = createFileRoute("/admin/denuncias/")({
  head: () => ({
    meta: [
      { title: "Central de denúncias · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Triagem e resolução de denúncias contra organizadores, participantes, arenas e eventos na plataforma BeacHub.",
      },
      { property: "og:title", content: "Central de denúncias · Super Admin BeacHub" },
      { property: "og:description", content: "Moderação com histórico e trilha de auditoria." },
    ],
  }),
  component: AdminReports,
});

export function statusTone(status: ReportStatus) {
  if (status === "RESOLVIDA") return "ok" as const;
  if (status === "PENDENTE" || status === "EM_ANALISE" || status === "SOLICITACAO_INFO")
    return "warn" as const;
  return "neutral" as const;
}

const targets: ("TODOS" | ReportTarget)[] = [
  "TODOS",
  "ORGANIZADOR",
  "PARTICIPANTE",
  "ARENA",
  "EVENTO",
];

function AdminReports() {
  const [target, setTarget] = useState<(typeof targets)[number]>("TODOS");

  const rows = reports.filter((r) => target === "TODOS" || r.target === target);

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Denúncias"
          description="Toda denúncia gera protocolo, entra na fila de triagem e mantém histórico completo das decisões."
        />

        <div className="mt-5 flex flex-wrap gap-2">
          {targets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className={`border px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-widest ${
                target === t
                  ? "border-graphite bg-graphite text-background"
                  : "border-border text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <AdminTable
          head={["Protocolo", "Alvo", "Denunciado", "Motivo", "Data", "Prioridade", "Status", ""]}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-display text-sm font-bold">{r.code}</td>
              <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
                {r.target}
              </td>
              <td className="px-4 py-3 text-sm">{r.reported}</td>
              <td className="px-4 py-3 text-sm">{r.reason}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
              <td className="px-4 py-3">
                <StatusPill
                  tone={
                    r.priority === "Alta" ? "danger" : r.priority === "Média" ? "warn" : "neutral"
                  }
                >
                  {r.priority}
                </StatusPill>
              </td>
              <td className="px-4 py-3">
                <StatusPill tone={statusTone(r.status)}>{REPORT_STATUS_LABEL[r.status]}</StatusPill>
              </td>
              <td className="px-4 py-3">
                <Link
                  to="/admin/denuncias/$id"
                  params={{ id: r.id }}
                  className="border border-graphite px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest"
                >
                  Analisar
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </AdminShell>
  );
}
