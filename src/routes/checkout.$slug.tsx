import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/site/shell";
import { FinancePill, GatewayBadge, MoneyRow } from "@/components/site/finance";
import { eventBySlugQuery } from "@/lib/api/events";
import { myRegistrationsQuery, teamLabel } from "@/lib/api/registrations";
import {
  createPayment,
  paymentQuery,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { deadlineLabel, eventDateLabel } from "@/lib/api/format";
import { brl } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout/$slug")({
  head: () => ({
    meta: [
      { title: "Pagamento da inscrição · BeacHub" },
      {
        name: "description",
        content: "Pague a inscrição por PIX, cartão ou boleto e confirme sua vaga.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Pagamento da inscrição · BeacHub" },
    ],
  }),
  component: CheckoutPage,
});

const METHOD_HINT: Record<PaymentMethod, string> = {
  PIX: "Confirmação em instantes",
  CREDIT_CARD: "Aprovação em instantes",
  BOLETO: "Compensação em até 3 dias úteis",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto",
};

/**
 * Chave de idempotência estável por inscrição (CLAUDE.md §8).
 *
 * Guardada em `sessionStorage` de propósito: o caso que a idempotência existe
 * para resolver não é só o duplo clique — é a pessoa recarregando a página
 * depois de a rede falhar, sem saber se a cobrança foi criada. Uma chave nova
 * a cada montagem do componente criaria a segunda cobrança no gateway, que é
 * exatamente o que não pode acontecer.
 */
function idempotencyKeyFor(registrationId: string): string {
  const storageKey = `saque:idem:payment:${registrationId}`;

  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;

    const fresh = crypto.randomUUID();
    sessionStorage.setItem(storageKey, fresh);
    return fresh;
  } catch {
    // Navegador com storage bloqueado: a chave passa a valer só para esta
    // montagem. Pior do que persistir, melhor do que não enviar chave alguma.
    return crypto.randomUUID();
  }
}

function CheckoutPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();

  const event = useQuery(eventBySlugQuery(slug));
  const registrations = useQuery(myRegistrationsQuery());

  const [method, setMethod] = useState<PaymentMethod>("PIX");

  /** A inscrição desta pessoa neste evento — é ela que se paga. */
  const registration = (registrations.data?.items ?? []).find(
    (r) => r.event?.slug === slug && r.status !== "CANCELLED" && r.status !== "EXPIRED",
  );

  const paymentId = registration?.payment?.id ?? null;

  /*
   * Consulta o PRÓPRIO backend, nunca o gateway (§14). Enquanto a cobrança
   * estiver aberta, a consulta se repete: quem confirma é o webhook, e a tela
   * só descobre por aqui.
   */
  const payment = useQuery({
    ...paymentQuery(paymentId ?? ""),
    enabled: paymentId !== null,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!registration) throw new Error("Inscrição não encontrada.");
      return createPayment(registration.id, { method }, idempotencyKeyFor(registration.id));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
    },
  });

  if (event.isPending || registrations.isPending) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-8" aria-busy="true">
          <div className="h-6 w-40 animate-pulse bg-muted" />
          <div className="mt-6 h-64 animate-pulse border border-border bg-card" />
        </div>
      </AppShell>
    );
  }

  if (event.isError || !event.data) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-2xl">Evento não encontrado</h1>
          <Link
            to="/eventos"
            className="mt-4 inline-flex font-display text-xs font-bold uppercase tracking-widest text-accent"
          >
            Ver campeonatos
          </Link>
        </div>
      </AppShell>
    );
  }

  const ev = event.data;

  if (!registration) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Link to="/eventos/$slug" params={{ slug }} className="eyebrow hover:text-foreground">
            ← {ev.name}
          </Link>
          <h1 className="mt-3 text-3xl">Você ainda não tem inscrição neste evento</h1>
          <p className="mt-1 text-muted-foreground">
            O pagamento é da inscrição — é preciso se inscrever antes, escolhendo a dupla.
          </p>
          <Link
            to="/inscricao/$slug"
            params={{ slug }}
            className="mt-6 inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Fazer inscrição
          </Link>
        </div>
      </AppShell>
    );
  }

  const current = payment.data ?? null;
  /*
   * Quem diz que a inscrição está confirmada é o backend, em
   * `confirms_registration` — a tela não deduz isso de `status`, porque deduzir
   * erraria em `PARTIALLY_REFUNDED`.
   */
  const isConfirmed = current?.confirms_registration ?? false;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/eventos/$slug" params={{ slug }} className="eyebrow hover:text-foreground">
          ← {ev.name}
        </Link>

        {isConfirmed && current ? (
          <div className="mt-4">
            <div className="border border-success/40 bg-success/10 p-6">
              <FinancePill tone="ok">Pagamento confirmado</FinancePill>
              <h1 className="mt-3 text-3xl">Sua inscrição está confirmada</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirmação recebida do gateway. A vaga da sua dupla está garantida na chave.
              </p>
            </div>
            <div className="mt-4 divide-y divide-border border border-border bg-card">
              {[
                ["Evento", ev.name],
                ["Dupla", teamLabel(registration)],
                ["Data", ev.dateLabel],
                ["Local", `${ev.venue} · ${ev.city}/${ev.state}`],
                ["Valor pago", brl(current.gross_cents)],
                ["Confirmado em", deadlineLabel(current.confirmed_at)],
                ["Método", current.method_label],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap gap-2 px-4 py-3 text-sm">
                  <span className="min-w-[140px] text-muted-foreground">{k}</span>
                  <span className="font-display font-bold">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/minhas-inscricoes"
                className="inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
              >
                Minhas inscrições
              </Link>
              <Link
                to="/eventos/$slug"
                params={{ slug }}
                className="inline-flex h-11 items-center border border-graphite px-5 font-display text-xs font-bold uppercase tracking-widest"
              >
                Ver evento
              </Link>
            </div>
            <GatewayBadge className="mt-4" />
          </div>
        ) : current ? (
          <div className="mt-4">
            <div className="border border-warning/40 bg-warning/10 p-6">
              <FinancePill tone="warn">Pagamento pendente</FinancePill>
              <h1 className="mt-3 text-3xl">Falta pagar para confirmar</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua inscrição fica reservada até o vencimento. Ela só é confirmada após a
                confirmação do pagamento.
              </p>
            </div>
            <div className="mt-4 divide-y divide-border border border-border bg-card">
              <MoneyRow
                label="Valor"
                cents={current.gross_cents}
                detail={`Inscrição — ${ev.name}`}
                strong
              />
              <div className="flex flex-wrap gap-2 px-4 py-3 text-sm">
                <span className="min-w-[140px] text-muted-foreground">Método</span>
                <span className="font-display font-bold">{current.method_label}</span>
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-3 text-sm">
                <span className="min-w-[140px] text-muted-foreground">Vence em</span>
                <span className="font-display font-bold">{deadlineLabel(current.due_at)}</span>
              </div>
              {current.pix_payload ? (
                <div className="px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Copia e cola do PIX</span>
                  <p className="mt-1 break-all font-mono text-xs">{current.pix_payload}</p>
                </div>
              ) : null}
            </div>
            {current.checkout_url ? (
              <a
                href={current.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex h-12 w-full items-center justify-center bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground"
              >
                Continuar pagamento
              </a>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              Esta página confere o pagamento sozinha. Assim que o gateway confirmar, a confirmação
              aparece aqui — não é preciso avisar ninguém.
            </p>
            <GatewayBadge className="mt-4" />
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-3xl">Pagamento da inscrição</h1>
            <p className="mt-1 text-muted-foreground">
              {ev.dateLabel} · {ev.venue}
            </p>

            <div className="mt-6 divide-y divide-border border border-border bg-card">
              <div className="px-4 py-3">
                <p className="eyebrow">Inscrição</p>
                <p className="font-display text-base font-bold">{ev.name}</p>
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-3 text-sm">
                <span className="min-w-[120px] text-muted-foreground">Dupla</span>
                <span className="font-display font-bold">{teamLabel(registration)}</span>
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-3 text-sm">
                <span className="min-w-[120px] text-muted-foreground">Categoria</span>
                <span className="font-display font-bold">
                  {ev.category} {ev.level}
                </span>
              </div>
              {/* A cobrança é por jogador, não por dupla (ADR 0001). */}
              <MoneyRow label="Total" cents={ev.feeCents} detail="por jogador" strong />
            </div>

            <div className="mt-6">
              <p className="eyebrow">Forma de pagamento</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cn(
                      "border p-4 text-left",
                      method === m ? "border-graphite bg-card" : "border-border bg-card/60",
                    )}
                  >
                    <p className="font-display text-sm font-bold">{METHOD_LABEL[m]}</p>
                    <p className="text-xs text-muted-foreground">{METHOD_HINT[m]}</p>
                  </button>
                ))}
              </div>
            </div>

            <section className="mt-6 border border-border bg-sand p-4 text-sm">
              <p className="eyebrow">Termos financeiros do evento</p>
              <dl className="mt-2 space-y-2 text-muted-foreground">
                <div>
                  <dt className="font-display text-xs font-bold uppercase tracking-widest text-foreground">
                    Valor da inscrição
                  </dt>
                  <dd>{brl(ev.feeCents)} por jogador.</dd>
                </div>
                <div>
                  <dt className="font-display text-xs font-bold uppercase tracking-widest text-foreground">
                    Confirmação da vaga
                  </dt>
                  <dd>
                    A vaga é confirmada quando o gateway confirma o pagamento. Até lá ela fica
                    reservada até o vencimento da cobrança.
                  </dd>
                </div>
                <div>
                  <dt className="font-display text-xs font-bold uppercase tracking-widest text-foreground">
                    Alteração do evento
                  </dt>
                  <dd>
                    Mudança de data, horário ou local dá direito a reembolso, e o organizador
                    precisa justificar a alteração.
                  </dd>
                </div>
                <div>
                  <dt className="font-display text-xs font-bold uppercase tracking-widest text-foreground">
                    Condições de reembolso
                  </dt>
                  <dd>
                    Cancelamento do evento pelo organizador gera reembolso. Desistência do
                    participante em evento mantido conforme publicado não gera reembolso automático.
                  </dd>
                </div>
              </dl>
            </section>

            {create.isError ? (
              <p className="mt-4 text-sm text-destructive">{(create.error as Error).message}</p>
            ) : null}

            <button
              type="button"
              disabled={create.isPending}
              onClick={() => create.mutate()}
              className="mt-6 h-12 w-full bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
            >
              {create.isPending ? "Gerando cobrança…" : `Pagar inscrição · ${brl(ev.feeCents)}`}
            </button>
            <GatewayBadge className="mt-4" />
          </>
        )}
      </div>
    </AppShell>
  );
}
