import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  PlayCircle,
  ShieldCheck,
  Star,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { notifications } from "@/lib/mock-data";

const icons: Record<string, typeof Bell> = {
  MATCH_STARTING: CalendarClock,
  BRACKET_PUBLISHED: Trophy,
  REVIEW_AVAILABLE: Users,
  EVENT_CANCELLED: AlertTriangle,
};

const opsNotifications = [
  {
    icon: AlertTriangle,
    title: "Nível acima da categoria",
    body: "Sua inscrição na Copa Areia Curitiba será analisada pelo organizador.",
    time: "há 2h",
  },
  {
    icon: CheckCircle2,
    title: "Inscrição aprovada",
    body: "O organizador aprovou sua dupla mesmo com nível acima da categoria.",
    time: "há 1h",
  },
  {
    icon: XCircle,
    title: "Inscrição reprovada",
    body: "Troque de dupla ou solicite o cancelamento da inscrição.",
    time: "há 1h",
  },
  {
    icon: ShieldCheck,
    title: "Convite de juiz",
    body: "Você foi convidado para arbitrar na Quadra 2 da Copa Areia Curitiba.",
    time: "há 50 min",
  },
  {
    icon: Users,
    title: "Partida atribuída",
    body: "Sua partida foi atribuída à Quadra 3.",
    time: "há 30 min",
  },
  {
    icon: PlayCircle,
    title: "Partida iniciada",
    body: "Sua partida começou às 10:32 na Quadra 1.",
    time: "há 12 min",
  },
  {
    icon: Trophy,
    title: "Partida finalizada",
    body: "Resultado oficial registrado: 21/15 e 21/18.",
    time: "há 5 min",
  },
  {
    icon: Star,
    title: "Avaliação disponível",
    body: "Avalie a arbitragem desta partida e, ao final, a organização do evento.",
    time: "agora",
  },
] as const;

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações · BeacHub" },
      {
        name: "description",
        content: "Avisos de partidas, chaves publicadas, inscrições e avaliações liberadas.",
      },
      { property: "og:title", content: "Notificações · BeacHub" },
      { property: "og:description", content: "Tudo o que mudou nos seus campeonatos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader eyebrow="Atualizações" title="Notificações" />
        <ul className="mt-6 divide-y divide-border border border-border bg-card">
          {notifications.map((n) => {
            const Icon = icons[n.type] ?? Bell;
            return (
              <li key={n.id} className="flex gap-3 px-4 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-sand">
                  <Icon className="h-4 w-4 text-accent" />
                </span>
                <div className="flex-1">
                  <p className="font-display text-sm font-bold">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </div>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-8 text-xl">Operacional do evento</h2>
        <ul className="mt-3 divide-y divide-border border border-border bg-card">
          {opsNotifications.map((n) => (
            <li key={n.title} className="flex gap-3 px-4 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-sand">
                <n.icon className="h-4 w-4 text-accent" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-bold">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
              </div>
              <span className="text-xs text-muted-foreground">{n.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
