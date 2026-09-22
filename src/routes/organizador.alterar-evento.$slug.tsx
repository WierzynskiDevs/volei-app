import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { OrganizerNav } from "@/components/site/organizer-nav";
import { FinanceAlert } from "@/components/site/finance";
import {
  cancelEvent,
  organizerEventBySlugQuery,
  updateEvent,
  type SaveEventPayload,
} from "@/lib/api/events";
import { organizerFinanceQuery } from "@/lib/api/finance";
import { dateInputValue, timeInputValue } from "@/lib/api/format";
import { queryKeys } from "@/lib/api/query-keys";

export const Route = createFileRoute("/organizador/alterar-evento/$slug")({
  head: () => ({
    meta: [
      { title: "Alterar evento · Organizador BeacHub" },
      { name: "description", content: "Altere data, horário ou local com justificativa obrigatória e comunicação automática aos inscritos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Alterar evento · Organizador BeacHub" },
    ],
  }),
  component: ChangeEventPage,
});

const field =
  "mt-1 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-graphite";

function ChangeEventPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();

  const event = useQuery(organizerEventBySlugQuery(slug));
  const finance = useQuery(organizerFinanceQuery());

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [venue, setVenue] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [cancelling, setCancelling] = useState(false);

  const ev = event.data;

  /*
   * Os valores originais vêm do evento e são formatados no fuso **do evento**
   * (ADR 0006): o organizador em outro estado precisa ver o horário em que a
   * bola sobe na quadra, não o do relógio dele.
   */
  const originalDate = ev ? dateInputValue(ev.start_at) : "";
  const originalTime = ev ? timeInputValue(ev.start_at) : "";
  const originalVenue = ev?.venue_name ?? "";

  const currentDate = date ?? originalDate;
  const currentTime = time ?? originalTime;
  const currentVenue = venue ?? originalVenue;

  /** Quantas inscrições pagas serão notificadas — número real, do financeiro. */
  const paid = finance.data?.by_event.find((e) => e.event_id === ev?.id)?.paid_count ?? 0;

  const changed = [
    currentDate !== originalDate ? { label: "Data", from: originalDate, to: currentDate } : null,
    currentTime !== originalTime ? { label: "Horário", from: originalTime, to: currentTime } : null,
    currentVenue !== originalVenue ? { label: "Local", from: originalVenue, to: currentVenue } : null,
  ].filter(Boolean) as { label: string; from: string; to: string }[];

  /**
   * A atualização reenvia o evento inteiro, com as três alterações aplicadas.
   *
   * O backend exige justificativa quando muda data, horário ou local de evento
   * publicado — e é ele quem decide isso, não a tela. Aqui a justificativa
   * sempre acompanha, porque estas são exatamente as três alterações que a
   * página permite.
   */
  const save = useMutation({
    mutationFn: async () => {
      if (!ev) throw new Error("Evento não carregado.");

      const payload: SaveEventPayload = {
        name: ev.name,
        venue_name: currentVenue,
        city: ev.city,
        state: ev.state,
        date: currentDate,
        start_time: currentTime,
        end_time: ev.end_at ? timeInputValue(ev.end_at) : currentTime,
        registration_open_at: ev.registration_open_at,
        registration_close_at: ev.registration_close_at,
        registration_fee_cents: ev.registration_fee_cents,
        max_teams: ev.max_teams,
        courts: ev.courts,
        min_games: ev.min_games,
        format: ev.format,
        modality: ev.modality,
        gender_category: ev.gender_category,
        level_category: ev.level_category,
        event_type: ev.event_type,
        prize_description: ev.prize_description,
        rules: ev.rules ?? [],
        justification: reason.trim(),
      };

      return updateEvent(slug, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizerEvents.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      setStep("done");
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelEvent(slug, reason.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizerEvents.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });

  if (event.isPending) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-8" aria-busy="true">
          <div className="h-6 w-48 animate-pulse bg-muted" />
          <div className="mt-6 h-64 animate-pulse border border-border bg-card" />
        </div>
      </AppShell>
    );
  }

  if (event.isError || !ev) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-2xl">Evento não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">{event.error?.message}</p>
          <Link to="/organizador/eventos" className="mt-4 inline-flex font-display text-xs font-bold uppercase tracking-widest text-accent">
            Meus eventos
          </Link>
        </div>
      </AppShell>
    );
  }

  const isCancelled = cancel.isSuccess || ev.status === "CANCELLED";

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <OrganizerNav />
        <PageHeader eyebrow={ev.name} title="Alterar evento" />

        <FinanceAlert tone="warn" title="Alterações geram obrigação de reembolso">
          Participantes impedidos de participar pela nova configuração podem solicitar reembolso, que é responsabilidade
          financeira do organizador e é processado pelo Asaas. {paid} inscrições pagas serão notificadas.
        </FinanceAlert>

        {isCancelled ? (
          <div className="mt-6 border border-destructive/40 bg-destructive/10 p-6">
            <p className="font-display text-lg font-bold">Evento cancelado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O cancelamento foi registrado com a justificativa e ficou na trilha de auditoria. {paid} inscrições
              pagas dão direito a reembolso — o processamento do estorno ainda não está implementado.
            </p>
            <Link
              to="/organizador/financeiro"
              className="mt-4 inline-flex h-11 items-center border border-graphite px-5 font-display text-xs font-bold uppercase tracking-widest"
            >
              Ver financeiro
            </Link>
          </div>
        ) : step === "done" ? (
          <div className="mt-6 border border-success/40 bg-success/10 p-6">
            <p className="font-display text-lg font-bold">Alteração salva</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A mudança foi gravada com a justificativa e registrada na auditoria. O envio automático da
              notificação aos {paid} inscritos ainda não está implementado.
            </p>
            <Link
              to="/organizador/eventos"
              className="mt-4 inline-flex h-11 items-center border border-graphite px-5 font-display text-xs font-bold uppercase tracking-widest"
            >
              Voltar aos eventos
            </Link>
          </div>
        ) : step === "confirm" ? (
          <div className="mt-6 border border-graphite bg-card p-6">
            <p className="font-display text-lg font-bold">Você está alterando informações importantes deste evento.</p>
            <div className="mt-4 divide-y divide-border border border-border">
              {changed.map((c) => (
                <div key={c.label} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
                  <p className="eyebrow">{c.label}</p>
                  <p className="text-sm text-muted-foreground line-through">{c.from}</p>
                  <p className="font-display text-sm font-bold">{c.to}</p>
                </div>
              ))}
              <div className="px-4 py-3">
                <p className="eyebrow">Justificativa</p>
                <p className="mt-1 text-sm">{reason}</p>
              </div>
            </div>
            {save.isError ? (
              <p className="mt-3 text-sm text-destructive">{(save.error as Error).message}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate()}
                className="h-11 bg-accent px-6 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
              >
                {save.isPending ? "Salvando…" : "Confirmar alteração"}
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="h-11 border border-border px-6 font-display text-xs font-bold uppercase tracking-widest"
              >
                Voltar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 border border-border bg-card p-4 sm:grid-cols-2">
              <label className="block">
                <span className="eyebrow">Data</span>
                <input type="date" value={currentDate} onChange={(e) => setDate(e.target.value)} className={field} />
              </label>
              <label className="block">
                <span className="eyebrow">Horário de início</span>
                <input type="time" value={currentTime} onChange={(e) => setTime(e.target.value)} className={field} />
              </label>
              <label className="block sm:col-span-2">
                <span className="eyebrow">Local</span>
                <input value={currentVenue} onChange={(e) => setVenue(e.target.value)} className={field} />
              </label>
              <label className="block sm:col-span-2">
                <span className="eyebrow">Justificativa (obrigatória)</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Por previsão de chuva intensa, o evento será transferido para 24/08."
                  className="mt-1 w-full border border-border bg-background p-3 text-sm outline-none focus:border-graphite"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={!changed.length || reason.trim().length < 10}
              onClick={() => setStep("confirm")}
              className="mt-4 h-12 w-full bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground disabled:bg-muted disabled:text-muted-foreground"
            >
              {!changed.length
                ? "Nenhuma alteração"
                : reason.trim().length < 10
                  ? "Informe a justificativa"
                  : "Revisar alteração"}
            </button>

            <div className="mt-8 border border-destructive/40 p-4">
              <p className="font-display text-sm font-bold text-destructive">Cancelar evento</p>
              <p className="mt-1 text-sm text-muted-foreground">
                O cancelamento gera reembolso obrigatório para todos os participantes pagantes, processado pelo Asaas.
                A justificativa acima é obrigatória e vai para a auditoria.
              </p>
              {cancel.isError ? (
                <p className="mt-2 text-sm text-destructive">{(cancel.error as Error).message}</p>
              ) : null}
              {cancelling ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={reason.trim().length < 10 || cancel.isPending}
                    onClick={() => cancel.mutate()}
                    className="h-10 bg-destructive px-5 font-display text-[11px] font-bold uppercase tracking-widest text-background disabled:opacity-60"
                  >
                    {cancel.isPending ? "Cancelando…" : "Confirmar cancelamento"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelling(false)}
                    className="h-10 border border-border px-5 font-display text-[11px] font-bold uppercase tracking-widest"
                  >
                    Manter evento
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCancelling(true)}
                  className="mt-3 h-10 border border-destructive/50 px-5 font-display text-[11px] font-bold uppercase tracking-widest text-destructive"
                >
                  Cancelar evento
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
