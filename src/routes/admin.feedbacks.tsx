import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { AdminPageHeader, AdminShell } from "@/components/site/admin-shell";
import { Stat } from "@/components/site/cards";
import { eventFeedbacks, feedbackAverage, FEEDBACK_CRITERIA } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/feedbacks")({
  head: () => ({
    meta: [
      { title: "Feedbacks de eventos · Super Admin BeacHub" },
      { name: "description", content: "Avaliações de experiência dos eventos: organização, pontualidade, estrutura, arbitragem e comunicação." },
      { property: "og:title", content: "Feedbacks de eventos · Super Admin BeacHub" },
      { property: "og:description", content: "Qualidade dos campeonatos vista pelos participantes." },
    ],
  }),
  component: AdminFeedbacks,
});

function AdminFeedbacks() {
  const overall =
    eventFeedbacks.reduce((s, f) => s + feedbackAverage(f), 0) / (eventFeedbacks.length || 1);

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Feedbacks de eventos"
          description="Feedback avalia o evento e o organizador. Não interfere na reputação individual dos jogadores."
        />

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Feedbacks" value={eventFeedbacks.length} />
          <Stat label="Média geral" value={overall.toFixed(1)} hint="de 5 estrelas" />
          <Stat label="Eventos avaliados" value={new Set(eventFeedbacks.map((f) => f.event)).size} />
          <Stat label="Comentários públicos" value={eventFeedbacks.filter((f) => f.comment).length} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {eventFeedbacks.map((f) => (
            <article key={f.id} className="border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold">{f.event}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.author} · {f.date}
                  </p>
                </div>
                <span className="flex items-center gap-1 font-display text-sm font-bold">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  {feedbackAverage(f).toFixed(1)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 text-sm">
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
    </AdminShell>
  );
}
