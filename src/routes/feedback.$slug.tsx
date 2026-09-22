import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { FEEDBACK_CRITERIA } from "@/lib/admin-data";
import { getEvent } from "@/lib/mock-data";

export const Route = createFileRoute("/feedback/$slug")({
  head: () => ({
    meta: [
      { title: "Feedback do evento · BeacHub" },
      { name: "description", content: "Avalie organização, estrutura, pontualidade e ambiente do campeonato de vôlei de areia que você participou." },
      { property: "og:title", content: "Feedback do evento · BeacHub" },
      { property: "og:description", content: "Feedback do evento — diferente da avaliação de jogadores." },
    ],
  }),
  component: EventFeedbackPage,
});

function EventFeedbackPage() {
  const { slug } = useParams({ from: "/feedback/$slug" });
  const event = getEvent(slug);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="eyebrow">Obrigado</p>
          <h1 className="mt-1 text-3xl">Feedback registrado</h1>
          <p className="mt-2 text-muted-foreground">Ele fica disponível em Meus feedbacks e ajuda o organizador a melhorar.</p>
          <Link
            to="/meus-feedbacks"
            className="mt-6 inline-flex h-11 items-center bg-accent px-6 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Meus feedbacks
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader
          eyebrow={event ? event.name : "Evento finalizado"}
          title="Como foi o evento?"
          description="Este feedback avalia a experiência do evento. Ele não altera a reputação de nenhum jogador."
        />

        <form
          className="mt-6 space-y-6 border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          {FEEDBACK_CRITERIA.map((c) => (
            <div key={c.key} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 last:border-0">
              <span className="font-display text-sm font-bold">{c.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${c.label}: ${n} de 5`}
                    onClick={() => setScores((s) => ({ ...s, [c.key]: n }))}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        (scores[c.key] ?? 0) >= n ? "fill-accent text-accent" : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <label className="block">
            <span className="eyebrow">Conte um pouco mais sobre sua experiência</span>
            <textarea rows={4} maxLength={1000} className="input-base mt-2" placeholder="Opcional" />
          </label>

          <button
            type="submit"
            className="h-11 w-full bg-accent font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Enviar feedback
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Quer avaliar quem jogou com você?{" "}
            <Link to="/meus-jogos" className="font-semibold text-accent underline-offset-4 hover:underline">
              Avaliações de jogadores
            </Link>
          </p>
        </form>
      </div>
    </AppShell>
  );
}
