import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeader } from "@/components/site/shell";
import { Tag } from "@/components/site/cards";
import { venues } from "@/lib/mock-data";

export const Route = createFileRoute("/arenas")({
  head: () => ({
    meta: [
      { title: "Arenas e quadras de vôlei de areia · BeacHub" },
      {
        name: "description",
        content:
          "Descubra arenas de vôlei de areia no Brasil: quadras, estrutura, iluminação e próximos campeonatos.",
      },
      { property: "og:title", content: "Arenas e quadras de vôlei de areia · BeacHub" },
      { property: "og:description", content: "Arenas, quadras e eventos próximos em todo o país." },
    ],
  }),
  component: VenuesPage,
});

function VenuesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <PageHeader
          eyebrow="Ecossistema"
          title="Arenas"
          description="Onde o vôlei de areia acontece: estrutura, quadras e eventos programados."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {venues.map((v) => (
            <div key={v.id} className="border border-border bg-card">
              <div className="sand-grain h-28 bg-sand-deep" />
              <div className="p-5">
                <h2 className="text-xl">{v.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {v.city}/{v.state} · {v.courts} quadras
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.structure.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
                <p className="mt-4 border-t border-border pt-3 text-sm">
                  <strong className="score-num">{v.upcoming}</strong>{" "}
                  <span className="text-muted-foreground">campeonatos programados</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
