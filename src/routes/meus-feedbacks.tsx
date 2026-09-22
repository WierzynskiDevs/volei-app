import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { EmptyState } from "@/components/site/cards";
import { eventFeedbacks, feedbackAverage, FEEDBACK_CRITERIA } from "@/lib/admin-data";
import { events } from "@/lib/mock-data";

export const Route = createFileRoute("/meus-feedbacks")({
  head: () => ({
    meta: [
      { title: "Meus feedbacks · BeacHub" },
      { name: "description", content: "Veja os feedbacks que você deixou sobre campeonatos de vôlei de areia e os eventos que ainda aguardam avaliação." },
      { property: "og:title", content: "Meus feedbacks · BeacHub" },
      { property: "og:description", content: "Histórico de avaliações de experiência em eventos." },
    ],
  }),
  component: MyFeedbacksPage,
});

function MyFeedbacksPage() {
  const pending = events.filter((e) => e.status === "FINALIZADO").slice(0, 2);
  const mine = eventFeedbacks.slice(0, 2);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          eyebrow="Minha conta"
          title="Meus feedbacks"
          description="Feedback avalia o evento. A avaliação de jogadores, que influencia a reputação, fica em Meus jogos."
        />

        <h2 className="mt-8 text-xl">Aguardando seu feedback</h2>
        {pending.length ? (
          <div className="mt-3 divide-y divide-border border border-border bg-card">
            {pending.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <div className="min-w-[200px] flex-1">
                  <p className="font-display text-base font-bold">{e.name}</p>
                  <p className="text-sm text-muted-foreground">{e.dateLabel}</p>
                </div>
                <Link
                  to="/feedback/$slug"
                  params={{ slug: e.slug }}
                  className="bg-accent px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest text-accent-foreground"
                >
                  Avaliar evento
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState title="Nada pendente" description="Você avaliou todos os eventos que participou." />
          </div>
        )}

        <h2 className="mt-10 text-xl">Feedbacks enviados</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {mine.map((f) => (
            <article key={f.id} className="border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold">{f.event}</p>
                  <p className="text-xs text-muted-foreground">{f.date}</p>
                </div>
                <span className="flex items-center gap-1 font-display text-sm font-bold">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  {feedbackAverage(f).toFixed(1)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {FEEDBACK_CRITERIA.map((c) => (
                  <div key={c.key} className="flex justify-between border-b border-border py-1">
                    <dt className="text-muted-foreground">{c.label}</dt>
                    <dd className="score-num">{f.scores[c.key]}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm">{f.comment}</p>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
