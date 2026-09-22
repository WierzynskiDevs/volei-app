import { Copy, Link2, Plus, Send, Share2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { refereeInviteLink, useOperations, type Referee } from "@/lib/operations";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inviteTone: Record<Referee["invite"], string> = {
  NAO_ENVIADO: "bg-muted text-muted-foreground",
  ENVIADO: "bg-warning/20 text-foreground",
  ACEITO: "bg-success/15 text-success",
};

const inviteLabel: Record<Referee["invite"], string> = {
  NAO_ENVIADO: "Convite não enviado",
  ENVIADO: "Convite enviado",
  ACEITO: "Aceito",
};

export function InviteRefereeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { addReferee, inviteReferee } = useOperations();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState<string | null>(null);

  function generate() {
    if (!name.trim() || !phone.trim()) {
      toast.error("Informe nome e telefone do juiz.");
      return;
    }
    const ref = addReferee(name.trim(), phone.trim());
    setLink(refereeInviteLink(ref));
    toast.success("Link de convite gerado");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setName("");
          setPhone("");
          setLink(null);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Convidar juiz</DialogTitle>
          <DialogDescription>
            O juiz recebe um link e passa a ver apenas as partidas autorizadas na quadra dele.
          </DialogDescription>
        </DialogHeader>

        <label className="block border border-border bg-card p-4">
          <span className="eyebrow">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Marcelo Faria"
            className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </label>
        <label className="block border border-border bg-card p-4">
          <span className="eyebrow">Telefone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(41) 99999-0000"
            className="score-num mt-1 w-full bg-transparent text-xl outline-none placeholder:font-sans placeholder:text-base placeholder:text-muted-foreground"
          />
        </label>

        {link ? (
          <div className="border border-success/40 bg-success/10 p-4">
            <p className="eyebrow">Link do convite</p>
            <code className="mt-1 block break-all text-sm">{link}</code>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(`https://${link}`);
                  toast.success("Link copiado");
                }}
                className="inline-flex h-10 items-center gap-2 border border-graphite px-4 font-display text-xs font-bold uppercase tracking-widest"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </button>
              <button
                onClick={() => toast.success("Convite compartilhado por WhatsApp")}
                className="inline-flex h-10 items-center gap-2 bg-graphite px-4 font-display text-xs font-bold uppercase tracking-widest text-background"
              >
                <Share2 className="h-3.5 w-3.5" /> Compartilhar
              </button>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-11 border border-border px-4 font-display text-xs font-bold uppercase tracking-widest"
          >
            Fechar
          </button>
          <button
            onClick={link ? () => onOpenChange(false) : generate}
            className="inline-flex h-11 items-center gap-2 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            <Link2 className="h-4 w-4" /> {link ? "Concluir" : "Gerar link"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RefereesPanel({ slug }: { slug: string }) {
  const { config, referees, matchesFor, inviteReferee, setRefereeCourt } = useOperations();
  const [open, setOpen] = useState(false);
  const all = matchesFor(slug);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Juízes</h2>
          <p className="text-sm text-muted-foreground">
            Convide, acompanhe o aceite e atribua a quadra de cada juiz.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center gap-2 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
        >
          <Plus className="h-4 w-4" /> Adicionar juiz
        </button>
      </div>

      <div className="mt-4 divide-y divide-border border border-border bg-card">
        {referees.map((r) => {
          const assigned = all.filter((m) => m.refereeId === r.id).length;
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
              <div className="min-w-[180px] flex-1">
                <p className="font-display text-base font-bold">{r.name}</p>
                <p className="score-num text-sm text-muted-foreground">{r.phone}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {assigned} partida{assigned === 1 ? "" : "s"} atribuída{assigned === 1 ? "" : "s"}
                  {r.rating ? (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" /> {r.rating.toFixed(1)} arbitragem
                    </span>
                  ) : null}
                </p>
              </div>
              <span
                className={cn(
                  "px-2 py-1 font-display text-[10px] font-bold uppercase tracking-widest",
                  inviteTone[r.invite],
                )}
              >
                {inviteLabel[r.invite]}
              </span>
              <label className="block">
                <span className="sr-only">Quadra do juiz</span>
                <select
                  value={r.court ?? ""}
                  onChange={(e) => setRefereeCourt(r.id, e.target.value || null)}
                  className="h-9 border border-border bg-background px-2 font-display text-[11px] font-bold uppercase tracking-widest outline-none"
                >
                  <option value="">Sem quadra</option>
                  {config.courts.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => {
                  inviteReferee(r.id);
                  toast.success("Convite enviado", { description: `${r.name} · ${r.phone}` });
                }}
                className="inline-flex h-9 items-center gap-1.5 border border-border px-3 font-display text-[10px] font-bold uppercase tracking-widest"
              >
                <Send className="h-3.5 w-3.5" /> Enviar convite
              </button>
            </div>
          );
        })}
      </div>

      <InviteRefereeDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
