import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AdminAction, AdminPageHeader, AdminShell, AdminTable, StatusPill } from "@/components/site/admin-shell";
import { Stat } from "@/components/site/cards";
import { AD_POSITIONS, adCampaigns, ctr, type AdStatus } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/publicidade")({
  head: () => ({
    meta: [
      { title: "Publicidade · Super Admin BeacHub" },
      { name: "description", content: "Gerencie anunciantes, banners por posição, período de veiculação e estatísticas de impressões e cliques." },
      { property: "og:title", content: "Publicidade · Super Admin BeacHub" },
      { property: "og:description", content: "Monetização com banners premium, sem poluir a experiência." },
    ],
  }),
  component: AdminAds,
});

function tone(status: AdStatus) {
  if (status === "ATIVA") return "ok" as const;
  if (status === "PAUSADA") return "warn" as const;
  if (status === "ENCERRADA") return "danger" as const;
  return "neutral" as const;
}

function AdminAds() {
  const [creating, setCreating] = useState(false);

  const impressions = adCampaigns.reduce((s, c) => s + c.impressions, 0);
  const clicks = adCampaigns.reduce((s, c) => s + c.clicks, 0);

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Publicidade"
          description="Espaços comerciais definidos por posição. O visual do anúncio segue o padrão da plataforma para não parecer poluição."
          action={
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="h-11 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
            >
              {creating ? "Fechar" : "Nova campanha"}
            </button>
          }
        />

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Campanhas" value={adCampaigns.length} hint={`${adCampaigns.filter((c) => c.status === "ATIVA").length} ativas`} />
          <Stat label="Impressões" value={impressions.toLocaleString("pt-BR")} />
          <Stat label="Cliques" value={clicks.toLocaleString("pt-BR")} />
          <Stat label="CTR médio" value={`${((clicks / impressions) * 100).toFixed(2)}%`} />
        </div>

        {creating ? (
          <form className="mt-6 border border-border bg-card p-6" onSubmit={(e) => e.preventDefault()}>
            <h2 className="text-lg">Nova campanha</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="eyebrow">Anunciante</span>
                <input className="input-base mt-1.5" />
              </label>
              <label className="block">
                <span className="eyebrow">Título do banner</span>
                <input className="input-base mt-1.5" />
              </label>
              <label className="block">
                <span className="eyebrow">Imagem</span>
                <input type="file" className="input-base mt-1.5" />
              </label>
              <label className="block">
                <span className="eyebrow">Link de destino</span>
                <input className="input-base mt-1.5" placeholder="https://" />
              </label>
              <label className="block">
                <span className="eyebrow">Início</span>
                <input type="date" className="input-base mt-1.5" />
              </label>
              <label className="block">
                <span className="eyebrow">Fim</span>
                <input type="date" className="input-base mt-1.5" />
              </label>
            </div>
            <p className="eyebrow mt-5">Posições do banner</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {AD_POSITIONS.map((p) => (
                <label key={p} className="flex items-start gap-2 border border-border p-3 text-sm">
                  <input type="checkbox" className="mt-1" />
                  <span>{p}</span>
                </label>
              ))}
            </div>
            <button className="mt-5 h-11 bg-graphite px-6 font-display text-xs font-bold uppercase tracking-widest text-background">
              Salvar campanha
            </button>
          </form>
        ) : null}

        <AdminTable head={["Campanha", "Posições", "Período", "Impressões", "Cliques", "CTR", "Status", "Ações"]}>
          {adCampaigns.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3">
                <p className="font-display text-sm font-bold">{c.campaign}</p>
                <p className="text-xs text-muted-foreground">
                  {c.advertiser} · {c.segment}
                </p>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{c.positions.join(" · ")}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {c.start} → {c.end}
              </td>
              <td className="score-num px-4 py-3">{c.impressions.toLocaleString("pt-BR")}</td>
              <td className="score-num px-4 py-3">{c.clicks.toLocaleString("pt-BR")}</td>
              <td className="score-num px-4 py-3">{ctr(c)}%</td>
              <td className="px-4 py-3">
                <StatusPill tone={tone(c.status)}>{c.status}</StatusPill>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <AdminAction>Editar</AdminAction>
                  <AdminAction>{c.status === "ATIVA" ? "Pausar" : "Ativar"}</AdminAction>
                  <AdminAction tone="danger">Encerrar</AdminAction>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </AdminShell>
  );
}
