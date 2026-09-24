import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { MatchOpsCard } from "@/components/site/ops";
import { RatingCard } from "@/components/site/ratings";
import { useOperations } from "@/lib/operations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/juiz")({
  head: () => ({
    meta: [
      { title: "Área do juiz · BeacHub" },
      {
        name: "description",
        content:
          "Visão simplificada da arbitragem: apenas as partidas autorizadas, com início, placar e resultado.",
      },
      { property: "og:title", content: "Área do juiz · BeacHub" },
      {
        property: "og:description",
        content: "Meus jogos, placar por set e finalização direto da quadra.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RefereePage,
});

function RefereePage() {
  const { referees, matches } = useOperations();
  const [refId, setRefId] = useState(referees[0]?.id ?? "");
  const referee = referees.find((r) => r.id === refId);
  const mine = matches.filter((m) => m.refereeId === refId);
  const open = mine.filter((m) => m.status !== "FINALIZADO");
  const done = mine.filter((m) => m.status === "FINALIZADO");

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader
          eyebrow="Arbitragem"
          title="Meus jogos"
          description="Você vê somente as partidas autorizadas para você. Financeiro e configurações do evento não ficam disponíveis nesta visão."
        />

        <label className="mt-4 block border border-border bg-card p-4">
          <span className="eyebrow">Você está operando como</span>
          <select
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
          >
            {referees.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.court ?? "sem quadra"}
              </option>
            ))}
          </select>
        </label>

        {referee ? (
          <p
            className={cn(
              "mt-2 flex items-center gap-2 text-sm",
              referee.invite === "ACEITO" ? "text-muted-foreground" : "text-warning",
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            {referee.invite === "ACEITO"
              ? `Convite aceito · ${referee.court ?? "quadra a definir"}`
              : "Convite ainda não aceito — confirme com o organizador."}
          </p>
        ) : null}

        <h2 className="mt-8 text-xl">Partidas autorizadas</h2>
        <div className="mt-3 space-y-3">
          {open.map((m) => (
            <MatchOpsCard key={m.id} match={m} compact />
          ))}
          {open.length === 0 ? (
            <p className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma partida aberta para você agora.
            </p>
          ) : null}
        </div>

        {done.length ? (
          <>
            <h2 className="mt-8 text-xl">Encerradas</h2>
            <div className="mt-3 space-y-3">
              {done.map((m) => (
                <MatchOpsCard key={m.id} match={m} compact />
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-8">
          <RatingCard
            eyebrow="Após a partida"
            title="Avaliação da arbitragem"
            description="As duplas avaliam a arbitragem assim que a partida é finalizada. Esta é a prévia do que elas veem."
          />
        </div>
      </div>
    </AppShell>
  );
}
