import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { REPORT_REASONS, type ReportTarget } from "@/lib/admin-data";

export const Route = createFileRoute("/denunciar")({
  head: () => ({
    meta: [
      { title: "Denunciar · BeacHub" },
      { name: "description", content: "Denuncie organizadores, participantes, arenas ou eventos que descumpram as regras da plataforma." },
      { property: "og:title", content: "Denunciar · BeacHub" },
      { property: "og:description", content: "Canal de denúncias com análise pela equipe de governança." },
    ],
  }),
  component: ReportPage,
});

const targets: { key: ReportTarget; label: string }[] = [
  { key: "ORGANIZADOR", label: "Organizador" },
  { key: "PARTICIPANTE", label: "Participante" },
  { key: "ARENA", label: "Arena / estabelecimento" },
  { key: "EVENTO", label: "Evento" },
];

function ReportPage() {
  const [target, setTarget] = useState<ReportTarget>("ORGANIZADOR");
  const [reason, setReason] = useState(REPORT_REASONS.ORGANIZADOR[0]!);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="eyebrow">Denúncia enviada</p>
          <h1 className="mt-1 text-3xl">Recebemos seu relato</h1>
          <p className="mt-2 text-muted-foreground">
            Status atual: <strong>Pendente</strong>. Você será notificado quando a análise avançar.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex h-11 items-center bg-accent px-6 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader
          eyebrow="Governança"
          title="Denunciar"
          description="Relatos são analisados pela equipe da plataforma. Denúncias falsas também são passíveis de sanção."
        />

        <form
          className="mt-6 space-y-6 border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <div>
            <p className="eyebrow">Sobre quem é a denúncia?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {targets.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTarget(t.key);
                    setReason(REPORT_REASONS[t.key][0]!);
                  }}
                  className={`border px-4 py-3 text-left font-display text-sm font-bold ${
                    target === t.key ? "border-accent bg-accent/5" : "border-border hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">Qual o motivo?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REPORT_REASONS[target].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`border px-3 py-1.5 text-sm ${reason === r ? "border-accent bg-accent/5" : "border-border"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">Descreva o ocorrido</p>
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={1500}
              placeholder="Data, local, pessoas envolvidas e o que aconteceu."
              className="input-base mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">{text.length}/1500</p>
          </div>

          <label className="flex items-center justify-between border border-dashed border-border px-4 py-3 text-sm">
            <span>
              Anexar evidência <span className="text-muted-foreground">(opcional)</span>
            </span>
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-accent">Selecionar</span>
            <input type="file" className="hidden" />
          </label>

          <button
            type="submit"
            className="h-11 w-full bg-accent font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Enviar denúncia
          </button>
        </form>
      </div>
    </AppShell>
  );
}
