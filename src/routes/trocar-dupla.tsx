import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Copy, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/site/shell";
import { players } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trocar-dupla")({
  head: () => ({
    meta: [
      { title: "Trocar dupla · BeacHub" },
      {
        name: "description",
        content:
          "Escolha um jogador já cadastrado ou convide um novo parceiro para regularizar sua inscrição.",
      },
      { property: "og:title", content: "Trocar dupla · BeacHub" },
      {
        property: "og:description",
        content: "Convide um parceiro compatível com a categoria do campeonato.",
      },
    ],
  }),
  component: SwapPartner,
});

function SwapPartner() {
  const [mode, setMode] = useState<"existente" | "novo">("existente");
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Intermediário");
  const [link, setLink] = useState<string | null>(null);

  const found = players.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader eyebrow="Inscrição reprovada" title="Trocar dupla" />

        <div className="mt-4 border border-warning bg-warning/10 p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-warning">
            <AlertTriangle className="h-4 w-4" /> Atenção
          </p>
          <p className="mt-1 text-sm">
            O nível informado para esta inscrição não está de acordo com a categoria do evento.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="bg-graphite px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-background">
              Trocar dupla
            </span>
            <button
              onClick={() => toast("Solicitação de cancelamento enviada ao organizador")}
              className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
            >
              Solicitar cancelamento
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-1">
          {(["existente", "novo"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-2 font-display text-[11px] font-bold uppercase tracking-widest",
                mode === m
                  ? "bg-graphite text-background"
                  : "border border-border text-muted-foreground",
              )}
            >
              {m === "existente" ? "Escolher dupla existente" : "Convidar novo jogador"}
            </button>
          ))}
        </div>

        {mode === "existente" ? (
          <div className="mt-4">
            <label className="flex items-center gap-2 border border-border bg-card px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar jogador"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <div className="mt-3 divide-y divide-border border border-border bg-card">
              {found.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center bg-sand font-display text-sm font-bold">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.level} · {p.city}
                    </p>
                  </div>
                  <button
                    onClick={() => toast.success(`Convite enviado para ${p.name}`)}
                    className="bg-accent px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-accent-foreground"
                  >
                    Enviar convite
                  </button>
                </div>
              ))}
              {found.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum jogador encontrado.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <label className="block border border-border bg-card p-4">
              <span className="eyebrow">Nome do jogador</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Marcos Prado"
                className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
              />
            </label>
            <label className="block border border-border bg-card p-4">
              <span className="eyebrow">Categoria</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
              >
                {["Iniciante", "Intermediário", "Avançado", "Open"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                if (!name.trim()) {
                  toast.error("Informe o nome do jogador.");
                  return;
                }
                setLink(
                  `https://beachub.com/convite/${name.trim().toLowerCase().replace(/\s+/g, "-")}`,
                );
              }}
              className="inline-flex h-11 items-center gap-2 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
            >
              <UserPlus className="h-4 w-4" /> Gerar link de convite
            </button>
            {link ? (
              <div className="border border-border bg-card p-4">
                <p className="eyebrow">Link de convite</p>
                <p className="mt-1 break-all text-sm">{link}</p>
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(link);
                    toast.success("Link copiado");
                  }}
                  className="mt-3 inline-flex items-center gap-2 border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
                <p className="mt-3 text-sm text-muted-foreground">
                  Este jogador precisa criar uma conta para confirmar sua participação. Se ele não
                  criar até o dia do evento, o organizador pode autorizá-lo como jogador convidado.
                </p>
              </div>
            ) : null}
          </div>
        )}

        <Link to="/minhas-inscricoes" className="mt-8 inline-flex eyebrow hover:text-foreground">
          ← Minhas inscrições
        </Link>
      </div>
    </AppShell>
  );
}
