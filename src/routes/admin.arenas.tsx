import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import {
  AdminAction,
  AdminPageHeader,
  AdminShell,
  StatusPill,
} from "@/components/site/admin-shell";
import { partnerVenues } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/arenas")({
  head: () => ({
    meta: [
      { title: "Arenas parceiras · Super Admin BeacHub" },
      {
        name: "description",
        content:
          "Cadastre e administre as arenas parceiras oficiais da plataforma BeacHub: estrutura, contato e quadras.",
      },
      { property: "og:title", content: "Arenas parceiras · Super Admin BeacHub" },
      { property: "og:description", content: "Somente o Super Admin cadastra arenas parceiras." },
    ],
  }),
  component: AdminVenues,
});

function AdminVenues() {
  const [creating, setCreating] = useState(false);

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Arenas parceiras"
          description="Apenas o Super Admin cadastra uma arena como parceira. Locais informados por organizadores valem só para aquele evento."
          action={
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="h-11 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
            >
              {creating ? "Fechar" : "Nova arena parceira"}
            </button>
          }
        />

        {creating ? (
          <form
            className="mt-6 border border-border bg-card p-6"
            onSubmit={(e) => e.preventDefault()}
          >
            <h2 className="text-lg">Cadastrar arena parceira</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <F label="Nome" />
              <F label="Logo" type="file" />
              <F label="Fotos" type="file" />
              <F label="Endereço" />
              <F label="Cidade" />
              <F label="Estado" />
              <F label="Telefone" />
              <F label="WhatsApp" />
              <F label="E-mail" />
              <F label="Site" />
              <F label="Quantidade de quadras" type="number" />
              <F label="Tipo de areia" />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {["Cobertura", "Iluminação", "Vestiários", "Estacionamento"].map((s) => (
                <label key={s} className="flex items-center gap-2">
                  <input type="checkbox" /> {s}
                </label>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="eyebrow">Estrutura e descrição</span>
              <textarea rows={3} className="input-base mt-1.5" />
            </label>
            <button className="mt-4 h-11 bg-graphite px-6 font-display text-xs font-bold uppercase tracking-widest text-background">
              Salvar arena parceira
            </button>
          </form>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {partnerVenues.map((v) => (
            <article key={v.id} className="border border-border bg-card">
              <div className="sand-grain h-24 bg-sand-deep" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl">{v.name}</h2>
                  <PartnerBadge />
                </div>
                <p className="text-sm text-muted-foreground">
                  {v.city}/{v.state} · {v.courts} quadras · {v.sand}
                </p>
                <p className="mt-3 text-sm">{v.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.structure.map((s) => (
                    <span
                      key={s}
                      className="border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <StatusPill tone="ok">Parceira desde {v.since}</StatusPill>
                  <div className="flex gap-1.5">
                    <AdminAction>Editar</AdminAction>
                    <AdminAction tone="danger">Remover</AdminAction>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function F({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input type={type} className="input-base mt-1.5" />
    </label>
  );
}

export function PartnerBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 border border-accent bg-accent/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-accent">
      <Check className="h-3 w-3" /> Arena parceira
    </span>
  );
}
