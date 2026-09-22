import { createFileRoute } from "@tanstack/react-router";

import { AdminPageHeader, AdminShell } from "@/components/site/admin-shell";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da plataforma · Super Admin BeacHub" },
      { name: "description", content: "Parâmetros globais da plataforma BeacHub: regras de ranking, reputação, moderação e políticas públicas." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Configurações da plataforma · Super Admin BeacHub" },
      { property: "og:description", content: "Parâmetros globais de ranking, reputação e governança." },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <AdminPageHeader
          title="Configurações da plataforma"
          description="Alterações aqui valem para toda a base e ficam registradas na auditoria."
        />

        <section className="mt-6 border border-border bg-card p-6">
          <h2 className="text-lg">Ranking de performance</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Num label="Pontos por vitória" value="2" />
            <Num label="Pontos por derrota" value="-1" />
            <Num label="Bônus 1º lugar" value="5" />
            <Num label="Bônus 2º lugar" value="3" />
            <Num label="Piso de pontuação" value="0" />
            <Num label="Janela do ranking (meses)" value="12" />
          </div>
        </section>

        <section className="mt-4 border border-border bg-card p-6">
          <h2 className="text-lg">Reputação</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Num label="Participações mínimas para avaliar" value="4" />
            <Num label="Avaliações mínimas para exibir média" value="3" />
            <Num label="Prazo para avaliar após o evento (dias)" value="7" />
            <Num label="Limite de avaliações por dupla" value="1" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Reputação nunca influencia o ranking de performance — os dois eixos permanecem separados.
          </p>
        </section>

        <section className="mt-4 border border-border bg-card p-6">
          <h2 className="text-lg">Moderação e políticas</h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              "Exigir aprovação manual de novos organizadores",
              "Ocultar automaticamente avaliações denunciadas",
              "Bloquear inscrição de contas suspensas",
              "Exibir selo de Arena Parceira apenas para arenas verificadas",
            ].map((s) => (
              <label key={s} className="flex items-center justify-between border-b border-border pb-2">
                <span>{s}</span>
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </div>
        </section>

        <button className="mt-6 h-11 bg-accent px-6 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground">
          Salvar configurações
        </button>
      </div>
    </AdminShell>
  );
}

function Num({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input defaultValue={value} className="input-base score-num mt-1.5" />
    </label>
  );
}
