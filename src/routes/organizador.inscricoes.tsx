import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { OrganizerNav } from "@/components/site/organizer-nav";
import { FilterTabs, PaymentStatusPill } from "@/components/site/finance";
import { organizerRegistrationsQuery, teamLabel } from "@/lib/api/registrations";
import { deadlineLabel, paymentPillStatus } from "@/lib/api/format";
import { useSession } from "@/lib/session";
import { brl } from "@/lib/finance-data";

export const Route = createFileRoute("/organizador/inscricoes")({
  head: () => ({
    meta: [
      { title: "Inscrições pagas · Organizador BeacHub" },
      {
        name: "description",
        content: "Quem pagou, quem está pendente e quem pediu reembolso em cada campeonato.",
      },
      { property: "og:title", content: "Inscrições pagas · Organizador BeacHub" },
      {
        property: "og:description",
        content: "Controle de inscrições e cobranças por participante.",
      },
    ],
  }),
  component: OrganizerRegistrations,
});

const filters = ["Todos", "Pagos", "Pendentes", "Expirados", "Cancelados", "Reembolsados"] as const;

/**
 * As abas são status de **pagamento**, e viram o parâmetro `payment_group` da
 * API — cujo mapa vive em `PaymentStatus::group()`, no domínio.
 *
 * "Expirados" e "Cancelados" caem no mesmo grupo `failed` do domínio, que reúne
 * cobrança falhada e cancelada. Manter as duas abas preserva a tela; o
 * resultado é o mesmo conjunto, e é a verdade do backend.
 */
const GROUP: Record<(typeof filters)[number], string | undefined> = {
  Todos: undefined,
  Pagos: "paid",
  Pendentes: "pending",
  Expirados: "failed",
  Cancelados: "failed",
  Reembolsados: "refunded",
};

function OrganizerRegistrations() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const { account } = useSession();

  const { data, isPending, isError, error, refetch } = useQuery(
    organizerRegistrationsQuery(GROUP[filter]),
  );

  const list = data?.items ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <OrganizerNav />
        <PageHeader eyebrow={account?.organizerName ?? "Organizador"} title="Inscrições" />

        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A inscrição só é considerada confirmada depois que o pagamento é confirmado pelo gateway.
          Iniciar o cadastro não garante vaga.
        </p>

        <div className="mt-6">
          <FilterTabs options={filters} value={filter} onChange={setFilter} />
        </div>

        <div className="mt-4 overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-sand-deep/40 text-left">
                {["Jogador", "Dupla", "Evento", "Valor", "Método", "Status", "Ações"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isPending ? (
                [0, 1, 2].map((i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: 7 }, (_, c) => (
                      <td key={c} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <p className="text-sm">Não foi possível carregar as inscrições.</p>
                    <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="mt-4 border border-border px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest"
                    >
                      Tentar de novo
                    </button>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhuma inscrição neste filtro.
                  </td>
                </tr>
              ) : (
                list.map((r) => {
                  const payment = r.payment;
                  const amountCents = payment?.gross_cents ?? r.event?.registration_fee_cents ?? 0;

                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <p className="font-display text-sm font-bold">{r.player?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.status_label}</p>
                      </td>
                      <td className="px-4 py-3">{teamLabel(r)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.event?.name ?? "—"}
                      </td>
                      <td className="score-num px-4 py-3 tabular-nums">{brl(amountCents)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {payment?.method_label ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {payment ? (
                          <PaymentStatusPill status={paymentPillStatus(payment.status)} />
                        ) : (
                          <span className="text-xs text-muted-foreground">sem cobrança</span>
                        )}
                        {payment && !payment.confirmed_at ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            vence {deadlineLabel(payment.due_at)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {/*
                         * Lembrete de cobrança depende de um módulo de
                         * notificações que ainda não existe. Em vez de um botão
                         * que finge enviar, a coluna mostra a referência da
                         * cobrança — que é o que o organizador usa para achar a
                         * transação no gateway.
                         */}
                        <span className="text-xs text-muted-foreground">
                          {payment ? payment.id.slice(0, 8) : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
