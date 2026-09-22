import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AdminAction, AdminPageHeader, AdminShell, AdminTable, StatusPill } from "@/components/site/admin-shell";
import { MoneyCard } from "@/components/site/finance";
import { brl, organizerFinances, pct, plans, paymentsByOrganizer, summarize } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/planos")({
  head: () => ({
    meta: [
      { title: "Planos e taxas · Super Admin BeacHub" },
      { name: "description", content: "Configure planos, mensalidades, taxa da plataforma e limites, e veja quantos organizadores usam cada plano." },
      { property: "og:title", content: "Planos e taxas · Super Admin BeacHub" },
      { property: "og:description", content: "Modelo de monetização da plataforma." },
    ],
  }),
  component: AdminPlans,
});

function AdminPlans() {
  const [selected, setSelected] = useState(plans[0]!.id);
  const plan = plans.find((p) => p.id === selected)!;
  const users = organizerFinances.filter((o) => o.planId === plan.id);
  const mrr = plans.reduce(
    (sum, p) => sum + p.monthlyCents * organizerFinances.filter((o) => o.planId === p.id).length,
    0,
  );

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminPageHeader
          title="Planos e taxas"
          description="Alterações de taxa valem apenas para novas cobranças. Toda cobrança já criada mantém a taxa congelada no momento da transação."
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MoneyCard label="MRR de assinaturas" cents={mrr} hint="mensalidades ativas" emphasis />
          <MoneyCard
            label="Receita de taxas"
            cents={organizerFinances.reduce((s, o) => s + summarize(paymentsByOrganizer(o.id)).platformFee, 0)}
            hint="comissão sobre inscrições"
            tone="ok"
          />
          <MoneyCard
            label="GMV dos organizadores"
            cents={organizerFinances.reduce((s, o) => s + summarize(paymentsByOrganizer(o.id)).gross, 0)}
            hint="base de cálculo da comissão"
          />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const count = organizerFinances.filter((o) => o.planId === p.id).length;
            const active = p.id === selected;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={cn("border p-5 text-left", active ? "border-graphite bg-card" : "border-border bg-card/60")}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-bold uppercase tracking-widest">{p.name}</p>
                  <StatusPill tone={p.status === "ATIVO" ? "ok" : "neutral"}>{p.status}</StatusPill>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                <p className="score-num mt-4 text-2xl tabular-nums">
                  {p.monthlyCents ? `${brl(p.monthlyCents)}/mês` : "Grátis"}
                </p>
                <p className="mt-1 font-display text-xs font-bold uppercase tracking-widest text-accent">
                  Taxa {pct(p.platformFeeRate)} por inscrição
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {count} organizador(es) · {p.eventLimit ?? "∞"} eventos · {p.registrationLimit ?? "∞"} inscrições
                </p>
              </button>
            );
          })}
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg">Configuração — {plan.name}</h2>
              <AdminAction>Salvar</AdminAction>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {[
                { label: "Mensalidade (R$)", value: (plan.monthlyCents / 100).toFixed(2) },
                { label: "Taxa da plataforma (%)", value: String(plan.platformFeeRate) },
                { label: "Taxa fixa por transação (R$)", value: (plan.platformFeeFixedCents / 100).toFixed(2) },
                { label: "Limite de eventos", value: plan.eventLimit === null ? "Ilimitado" : String(plan.eventLimit) },
                {
                  label: "Limite de inscrições",
                  value: plan.registrationLimit === null ? "Ilimitado" : String(plan.registrationLimit),
                },
                { label: "Status", value: plan.status },
              ].map((f) => (
                <label key={f.label} className="block">
                  <span className="eyebrow">{f.label}</span>
                  <input
                    readOnly
                    value={f.value}
                    className="mt-1 h-11 w-full border border-border bg-background px-3 font-display text-sm font-bold"
                  />
                </label>
              ))}
            </div>
            <div className="border-t border-border px-4 py-3">
              <p className="eyebrow">Recursos incluídos</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg">Organizadores no plano {plan.name}</h2>
            </div>
            <div className="divide-y divide-border">
              {users.length ? (
                users.map((o) => {
                  const s = summarize(paymentsByOrganizer(o.id));
                  return (
                    <div key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="min-w-[160px] flex-1 font-display text-sm font-bold">{o.name}</span>
                      <span className="score-num text-sm tabular-nums">{brl(s.gross)}</span>
                      <StatusPill tone={o.status === "REGULAR" ? "ok" : o.status === "ATENCAO" ? "warn" : "danger"}>
                        {o.status}
                      </StatusPill>
                    </div>
                  );
                })
              ) : (
                <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum organizador neste plano.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Histórico de mudanças de plano</h2>
          <AdminTable head={["Organizador", "Quando", "Plano", "Taxa aplicada", "Observação"]}>
            {organizerFinances.flatMap((o) =>
              o.planHistory.map((h) => (
                <tr key={`${o.id}-${h.at}`}>
                  <td className="px-4 py-3 font-display text-sm font-bold">{o.name}</td>
                  <td className="px-4 py-3 text-sm">{h.at}</td>
                  <td className="px-4 py-3 text-sm">{h.plan}</td>
                  <td className="score-num px-4 py-3">{pct(h.rate)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{h.note}</td>
                </tr>
              )),
            )}
          </AdminTable>
        </section>
      </div>
    </AdminShell>
  );
}
