import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/site/shell";
import { Stat } from "@/components/site/cards";
import { OrganizerNav } from "@/components/site/organizer-nav";
import { FinancePill, GatewayBadge } from "@/components/site/finance";
import { formatDate } from "@/components/site/admin-async";
import { ApiError } from "@/lib/api/client";
import { organizerFinanceQuery } from "@/lib/api/finance";
import { organizerPlanQuery, requestPaymentAccountOnboarding } from "@/lib/api/plan";
import { brl, pct } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/organizador/plano")({
  head: () => ({
    meta: [
      { title: "Meu plano · Organizador BeacHub" },
      {
        name: "description",
        content:
          "Plano atual, taxa da plataforma aplicada, limites, histórico de planos e conta Asaas vinculada.",
      },
      { property: "og:title", content: "Meu plano · Organizador BeacHub" },
      { property: "og:description", content: "Sua taxa, seus limites e sua conta de recebimento." },
    ],
  }),
  component: OrganizerPlan,
});

function OrganizerPlan() {
  const { data, isPending, isError, error, refetch } = useQuery(organizerPlanQuery());
  /* O GMV e a contagem de cobranças são do financeiro — mesma fonte da tela
   * `/organizador/financeiro`, para os dois números nunca divergirem. */
  const finance = useQuery(organizerFinanceQuery());

  const current = data?.available.find((p) => p.code === data.current_plan_code) ?? null;
  const totals = finance.data?.totals;
  const charges = (finance.data?.paid_count ?? 0) + (finance.data?.pending.count ?? 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <OrganizerNav />
        <PageHeader
          eyebrow={data?.organizer.name ?? "Organizador"}
          title="Plano"
          action={<GatewayBadge />}
        />

        {isError ? (
          <div className="mt-6 border border-destructive/40 bg-destructive/10 p-5">
            <p className="font-display text-sm font-bold">Não foi possível carregar o plano.</p>
            <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 border border-border px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest"
            >
              Tentar de novo
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Plano atual"
            value={isPending ? "—" : (current?.name ?? "—")}
            hint={
              current?.monthly_price_cents
                ? `${brl(current.monthly_price_cents)}/mês`
                : "Sem mensalidade"
            }
          />
          <Stat
            label="Taxa da plataforma"
            value={current ? pct(current.platform_fee_basis_points / 100) : "—"}
            hint="aplicada às novas cobranças"
          />
          <Stat
            label="Eventos"
            value={finance.data?.by_event.length ?? 0}
            hint={current?.event_limit ? `limite ${current.event_limit}` : "ilimitado"}
          />
          <Stat label="GMV" value={brl(totals?.gross_cents ?? 0)} hint={`${charges} cobranças`} />
        </div>

        <section className="mt-8 border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg">Conta Asaas</h2>
            <FinancePill tone={data?.organizer.can_receive_payments ? "ok" : "warn"}>
              {data?.organizer.can_receive_payments ? "Conta vinculada" : "Vinculação pendente"}
            </FinancePill>
            {/*
             * O identificador da conta no gateway não é exposto pela API, e é
             * assim que deve ser: é credencial de recebimento, não informação
             * de tela. O que interessa ao organizador é a situação.
             */}
            <span className="ml-auto text-xs text-muted-foreground">
              {data?.organizer.payment_account_status_label ?? "—"}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="border border-border p-3">
              <p className="eyebrow">1. Organizador</p>
              <p className="mt-1">Cadastro e dados de recebimento.</p>
            </div>
            <div className="border border-border p-3">
              <p className="eyebrow">2. Conta Asaas vinculada</p>
              <p className="mt-1">Split configurado entre plataforma e organizador.</p>
            </div>
            <div className="border border-border p-3">
              <p className="eyebrow">3. Recebimento</p>
              <p className="mt-1">Inscrições caem no seu saldo já com as taxas descontadas.</p>
            </div>
          </div>

          {data?.organizer.payment_account_status === "NOT_LINKED" ? <PaymentAccountForm /> : null}
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Planos disponíveis</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {isPending
              ? [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-56 animate-pulse border border-border bg-card"
                    aria-hidden="true"
                  />
                ))
              : (data?.available ?? []).map((p) => {
                  const isCurrent = p.code === data?.current_plan_code;
                  return (
                    <div
                      key={p.code}
                      className={cn(
                        "border bg-card p-4",
                        isCurrent ? "border-graphite bg-sand-deep/30" : "border-border",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-display text-lg font-extrabold">{p.name}</p>
                        {isCurrent ? <FinancePill tone="ok">Plano atual</FinancePill> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                      <p className="score-num mt-3 text-2xl font-bold">
                        {p.monthly_price_cents ? brl(p.monthly_price_cents) : "R$ 0"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        por mês · taxa de {pct(p.platform_fee_basis_points / 100)} por inscrição
                        paga
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {(p.features ?? []).map((f) => (
                          <li key={f}>· {f}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Histórico de plano</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A taxa é congelada em cada transação: pagamentos antigos mantêm a taxa vigente no
            momento da cobrança.
          </p>
          <div className="mt-3 divide-y divide-border border border-border bg-card">
            {(data?.history.length ?? 0) === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma mudança de plano registrada.
              </p>
            ) : (
              (data?.history ?? []).map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{formatDate(h.effective_at)}</span>
                  <span className="font-display font-bold">
                    {h.plan_name ?? h.plan_code ?? "—"}
                  </span>
                  <span className="score-num">{pct(h.platform_fee_basis_points / 100)}</span>
                  {h.note ? <span className="text-muted-foreground">· {h.note}</span> : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/**
 * Formulário de vinculação da subconta Asaas (ADR 0018) — só aparece quando
 * `payment_account_status === "NOT_LINKED"`. Pede exatamente o que o Asaas
 * exige para abrir a conta (endereço, CEP, renda mensal declarada) e nada
 * além disso; esses dados nunca existiram no cadastro do organizador porque
 * a ADR 0014 manteve o cadastro inicial mínimo de propósito.
 */
function PaymentAccountForm() {
  const queryClient = useQueryClient();
  const [mobilePhone, setMobilePhone] = useState("");
  const [incomeReais, setIncomeReais] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const request = useMutation({
    mutationFn: () =>
      requestPaymentAccountOnboarding({
        mobile_phone: mobilePhone.replace(/\D/g, ""),
        income_cents: Math.round(Number(incomeReais.replace(",", ".")) * 100),
        address,
        address_number: addressNumber,
        province,
        postal_code: postalCode.replace(/\D/g, ""),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer", "plan"] });
      toast.success("Vinculação solicitada", {
        description: "Assim que o Asaas aprovar a conta, você pode publicar eventos pagos.",
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível solicitar a vinculação.");
    },
  });

  return (
    <div className="mt-4 border border-dashed border-border bg-card p-4">
      <p className="eyebrow">Vincular conta de recebimento</p>
      <p className="mt-1 text-sm text-muted-foreground">
        O Asaas exige estes dados para abrir a conta que recebe o dinheiro das suas inscrições.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Celular (com DDD)</span>
          <input
            value={mobilePhone}
            onChange={(e) => setMobilePhone(e.target.value)}
            placeholder="(41) 99999-0000"
            className="mt-1 h-11 w-full border border-border bg-background px-3 outline-none"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Renda mensal declarada</span>
          <input
            value={incomeReais}
            onChange={(e) => setIncomeReais(e.target.value)}
            placeholder="5000,00"
            inputMode="decimal"
            className="mt-1 h-11 w-full border border-border bg-background px-3 outline-none"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="eyebrow">Endereço</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua das Palmeiras"
            className="mt-1 h-11 w-full border border-border bg-background px-3 outline-none"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Número</span>
          <input
            value={addressNumber}
            onChange={(e) => setAddressNumber(e.target.value)}
            placeholder="123"
            className="mt-1 h-11 w-full border border-border bg-background px-3 outline-none"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Bairro</span>
          <input
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="Centro"
            className="mt-1 h-11 w-full border border-border bg-background px-3 outline-none"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="eyebrow">CEP</span>
          <input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="80000-000"
            className="mt-1 h-11 w-full border border-border bg-background px-3 outline-none"
          />
        </label>
      </div>
      <button
        onClick={() => {
          if (
            !mobilePhone ||
            !incomeReais ||
            !address ||
            !addressNumber ||
            !province ||
            !postalCode
          ) {
            toast.error("Preencha todos os campos.");
            return;
          }
          request.mutate();
        }}
        disabled={request.isPending}
        className="mt-4 inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
      >
        {request.isPending ? "Enviando…" : "Vincular conta"}
      </button>
    </div>
  );
}
