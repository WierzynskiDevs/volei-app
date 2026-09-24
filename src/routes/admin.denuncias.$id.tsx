import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { AdminPageHeader, AdminShell, StatusPill } from "@/components/site/admin-shell";
import { getReport, REPORT_STATUS_LABEL, type Report, type ReportStatus } from "@/lib/admin-data";

function statusTone(status: ReportStatus) {
  if (status === "RESOLVIDA") return "ok" as const;
  if (status === "PENDENTE" || status === "EM_ANALISE" || status === "SOLICITACAO_INFO")
    return "warn" as const;
  return "neutral" as const;
}

export const Route = createFileRoute("/admin/denuncias/$id")({
  loader: ({ params }): { report: Report } => {
    const report = getReport(params.id);
    if (!report) throw notFound();
    return { report };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Denúncia não encontrada · BeacHub" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.report.code} · Super Admin BeacHub`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Análise da denúncia sobre ${loaderData.report.reported}: ${loaderData.report.reason}.`,
        },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: "Detalhe e resolução de denúncia." },
      ],
    };
  },
  component: ReportDetail,
});

const decisions: { key: ReportStatus; label: string; hint: string }[] = [
  { key: "EM_ANALISE", label: "Em análise", hint: "Manter em investigação" },
  { key: "SOLICITACAO_INFO", label: "Solicitar informações", hint: "Pedir provas ao denunciante" },
  { key: "RESOLVIDA", label: "Resolver", hint: "Aplicar sanção e encerrar" },
  { key: "IMPROCEDENTE", label: "Improcedente", hint: "Sem evidências suficientes" },
  { key: "ARQUIVADA", label: "Arquivar", hint: "Sem ação necessária" },
];

function ReportDetail() {
  const { report } = Route.useLoaderData() as { report: Report };
  const [decision, setDecision] = useState<ReportStatus>(report.status);

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/admin/denuncias" className="eyebrow text-accent">
          ← Voltar para denúncias
        </Link>
        <AdminPageHeader
          title={report.code}
          description={`${report.target} · aberta em ${report.date}`}
          action={
            <StatusPill tone={statusTone(report.status)}>
              {REPORT_STATUS_LABEL[report.status]}
            </StatusPill>
          }
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="border border-border bg-card p-5">
              <h2 className="text-lg">Detalhes</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Row label="Denunciado" value={report.reported} />
                <Row label="Denunciante" value={report.reporter} />
                <Row label="Evento" value={report.event} />
                <Row label="Motivo" value={report.reason} />
                <Row label="Prioridade" value={report.priority} />
              </dl>
              <p className="mt-4 text-sm">{report.description}</p>
            </section>

            <section className="border border-border bg-card p-5">
              <h2 className="text-lg">Evidências</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.evidence.length ? (
                  report.evidence.map((e) => (
                    <span
                      key={e}
                      className="border border-border px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {e}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum anexo enviado.</p>
                )}
              </div>
            </section>

            <section className="border border-border bg-card p-5">
              <h2 className="text-lg">Histórico</h2>
              <ol className="mt-3 space-y-3">
                {report.history.map((h) => (
                  <li key={h.at} className="border-l-2 border-accent pl-3">
                    <p className="text-xs text-muted-foreground">{h.at}</p>
                    <p className="text-sm">{h.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="h-fit border border-border bg-card p-5">
            <h2 className="text-lg">Decisão</h2>
            <div className="mt-3 space-y-2">
              {decisions.map((d) => (
                <label
                  key={d.key}
                  className={`flex cursor-pointer items-start gap-2 border p-3 text-sm ${
                    decision === d.key ? "border-graphite bg-muted" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    className="mt-1"
                    checked={decision === d.key}
                    onChange={() => setDecision(d.key)}
                  />
                  <span>
                    <span className="font-display font-bold">{d.label}</span>
                    <span className="block text-xs text-muted-foreground">{d.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="eyebrow">Justificativa (registrada na auditoria)</span>
              <textarea rows={4} className="input-base mt-1.5" />
            </label>
            <button className="mt-4 h-11 w-full bg-accent font-display text-xs font-bold uppercase tracking-widest text-accent-foreground">
              Registrar decisão
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Sanções disponíveis: advertência, suspensão temporária, suspensão definitiva ou
              remoção de conteúdo.
            </p>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-1.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
