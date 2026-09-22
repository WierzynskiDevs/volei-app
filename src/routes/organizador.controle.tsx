import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AppShell, PageHeader } from "@/components/site/shell";
import { Stat } from "@/components/site/cards";
import { CourtRow, EstimateNote, LiveMatchCard, UpcomingMatchCard } from "@/components/site/live";
import { OpsKanban } from "@/components/site/ops";
import { events } from "@/lib/mock-data";
import {
  courtStatuses,
  liveMatches,
  scheduleMatches,
  setCorrections,
  setsWon,
  upcomingMatches,
  type ScheduledMatch,
} from "@/lib/schedule-data";

export const Route = createFileRoute("/organizador/controle")({
  head: () => ({
    meta: [
      { title: "Operação do evento — partidas e sets · BeacHub" },
      {
        name: "description",
        content:
          "Registre o resultado dos sets encerrados, acompanhe atrasos por quadra e a estimativa de horário das próximas partidas.",
      },
      { property: "og:title", content: "Operação do evento — partidas e sets · BeacHub" },
      { property: "og:description", content: "Sets oficiais, atraso por quadra e previsão dos próximos jogos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventControlPage,
});

function SetForm({ match }: { match: ScheduledMatch }) {
  const current = match.sets.find((s) => s.status === "IN_PROGRESS");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  if (!current) return null;

  const submit = () => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isFinite(na) || !Number.isFinite(nb) || a === "" || b === "" || na === nb) {
      toast.error("Informe a pontuação final das duas duplas.");
      return;
    }
    toast.success(`Set ${current.index} registrado: ${na} × ${nb}`, {
      description: "Resultado oficial. Próximo set marcado como em andamento.",
    });
    setA("");
    setB("");
  };

  return (
    <div className="border border-border bg-card p-4">
      <p className="eyebrow">
        {match.court} · {match.phase} · Set {current.index}
      </p>
      <p className="mt-2 font-display text-base font-bold">
        {match.teamA} <span className="text-muted-foreground">×</span> {match.teamB}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="eyebrow">Pontuação {match.teamA}</span>
          <input
            inputMode="numeric"
            value={a}
            onChange={(e) => setA(e.target.value.replace(/\D/g, ""))}
            placeholder="21"
            className="score-num mt-1 h-12 w-full border border-border bg-background px-3 text-xl outline-none focus:border-graphite"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Pontuação {match.teamB}</span>
          <input
            inputMode="numeric"
            value={b}
            onChange={(e) => setB(e.target.value.replace(/\D/g, ""))}
            placeholder="15"
            className="score-num mt-1 h-12 w-full border border-border bg-background px-3 text-xl outline-none focus:border-graphite"
          />
        </label>
      </div>
      <button
        onClick={submit}
        className="mt-4 flex h-12 w-full items-center justify-center bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground"
      >
        Registrar set encerrado
      </button>
      <p className="mt-2 text-xs text-muted-foreground">
        O sistema não acompanha o ponto a ponto: informe apenas a pontuação final do set encerrado. Correções ficam
        registradas no histórico.
      </p>
    </div>
  );
}

const TABS = ["Kanban", "Sets", "Quadras", "Próximos jogos", "Resultados", "Correções"] as const;
type ControlTab = (typeof TABS)[number];

function EventControlPage() {
  const [tab, setTab] = useState<ControlTab>("Kanban");
  const live = liveMatches();
  const next = upcomingMatches(4);
  const courts = useMemo(() => courtStatuses(), []);
  const maxDelay = Math.max(0, ...courts.map((c) => c.delay));
  const remaining = scheduleMatches.filter((m) => m.status !== "FINISHED").length;
  const [slug, setSlug] = useState(events[0]?.slug ?? "copa-areia-curitiba");
  const activeEvent = events.find((e) => e.slug === slug) ?? events[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/organizador" className="eyebrow hover:text-foreground">
          ← Painel
        </Link>
        <PageHeader
          eyebrow={`${activeEvent?.name ?? "Evento"} · em operação`}
          title="Operação do evento"
          action={
            <Link
              to="/eventos/$slug"
              params={{ slug }}
              className="inline-flex h-11 items-center border border-graphite px-5 font-display text-xs font-bold uppercase tracking-widest"
            >
              Página do evento
            </Link>
          }
        />

        <div className="mt-6 border border-border bg-card p-4">
          <span className="eyebrow">Evento em operação</span>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 h-11 w-full border border-border bg-background px-3 font-display text-sm font-bold outline-none focus:border-graphite"
          >
            {events.map((e) => (
              <option key={e.id} value={e.slug}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Em quadra" value={String(live.length)} />
          <Stat label="Sets a registrar" value={String(live.filter((m) => m.sets.some((s) => s.status === "IN_PROGRESS")).length)} />
          <Stat label="Atraso máximo" value={`${maxDelay} min`} />
          <Stat label="Partidas restantes" value={String(remaining)} />
        </div>

        <div className="sticky top-14 z-30 mt-6 border-b border-border bg-background">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-3 py-3 font-display text-xs font-bold uppercase tracking-widest",
                  tab === t ? "border-accent text-foreground" : "border-transparent text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === "Kanban" ? (
          <div className="mt-6 border border-border bg-card p-4">
            <OpsKanban slug={slug} />
          </div>
        ) : null}

        {tab === "Sets" ? (
          <div>
            <h2 className="mt-8 text-xl">Registrar resultado de set</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {live.map((m) => (
                <SetForm key={m.id} match={m} />
              ))}
            </div>

            <h2 className="mt-10 text-xl">Partidas em andamento</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {live.map((m) => (
                <LiveMatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ) : null}

        {tab === "Quadras" ? (
          <div>
            <h2 className="mt-8 text-xl">Painel por quadra</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {courts.map((c) => (
                <CourtRow key={c.court} {...c} />
              ))}
            </div>
            <EstimateNote className="mt-3" />
          </div>
        ) : null}

        {tab === "Próximos jogos" ? (
          <div>
            <h2 className="mt-8 text-xl">Próximos jogos</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              {next.map((m) => (
                <UpcomingMatchCard key={m.id} match={m} />
              ))}
            </div>

            <h2 className="mt-10 text-xl">Atletas impactados</h2>
            <div className="mt-3 space-y-2">
              {next.slice(0, 3).map((m) => (
                <div key={m.id} className="border border-border bg-card p-4 text-sm">
                  <p className="font-display font-bold">
                    {m.teamA} <span className="text-muted-foreground">×</span> {m.teamB}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {[...m.playersA, ...m.playersB].join(", ") || "Duplas a definir"} — serão notificados se a
                    estimativa mudar em relação ao horário programado ({m.scheduledStartAt}).
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "Resultados" ? (
          <div>
            <h2 className="mt-8 text-xl">Resultados oficiais do dia</h2>
            <div className="mt-3 space-y-2">
              {scheduleMatches
                .filter((m) => m.status === "FINISHED")
                .map((m) => {
                  const w = setsWon(m);
                  return (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 border border-border bg-card p-4 text-sm"
                    >
                      <span className="font-display font-bold">
                        {m.teamA} ({w.a}) <span className="text-muted-foreground">×</span> ({w.b}) {m.teamB}
                      </span>
                      <span className="text-muted-foreground">
                        {m.sets.map((s) => `${s.a}×${s.b}`).join(" · ")} — {m.court}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : null}

        {tab === "Correções" ? (
          <div>
            <h2 className="mt-8 text-xl">Histórico de correções</h2>
            <div className="mt-3 space-y-2">
              {setCorrections.map((c) => (
                <div key={c.id} className="border border-border bg-card p-4 text-sm">
                  <p className="font-display font-bold">
                    {c.match} · Set {c.set}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {c.from} → {c.to} · {c.by} às {c.at} — {c.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
