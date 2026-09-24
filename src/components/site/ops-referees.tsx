/**
 * Juízes do evento, ligado à API real (ADR 0013 §5/§6/§8, S8b).
 *
 * O link de convite agora carrega o TOKEN REAL devolvido por
 * `POST .../referees/{referee}/invite` (antes: `refereeInviteLink()`, id
 * fabricado no cliente). Ele aponta para `/juiz?convite={token}` — mesmo
 * formato de URL do mock — mas `/juiz` ainda não lê esse parâmetro nem usa a
 * sessão por token (ADR 0013 §5) que o backend já emite: essa tela
 * (juiz abrindo o próprio link) é a próxima fatia, não esta
 * (docs/DIVERGENCES.md). O que muda aqui é só o convite ser real.
 */

import { Copy, Link2, Plus, Send, Share2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { courtsQuery } from "@/lib/api/courts";
import { organizerMatchesQuery } from "@/lib/api/matches";
import { queryKeys } from "@/lib/api/query-keys";
import { addReferee, inviteReferee, refereesQuery, setRefereeCourt, type ApiReferee } from "@/lib/api/referees";
import { cn } from "@/lib/utils";

const inviteTone: Record<ApiReferee["invite_status"], string> = {
  NOT_SENT: "bg-muted text-muted-foreground",
  SENT: "bg-warning/20 text-foreground",
  ACCEPTED: "bg-success/15 text-success",
};

function inviteLink(token: string): string {
  return `${window.location.origin}/juiz?convite=${encodeURIComponent(token)}`;
}

function reportError(e: unknown) {
  if (e instanceof ApiError) toast.error(e.message);
  else toast.error("Não foi possível concluir a operação. Tente novamente.");
}

export function InviteRefereeDialog({
  slug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: async () => {
      const referee = await addReferee(slug, name.trim(), phone.trim());
      return inviteReferee(slug, referee.id);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.referees.byEvent(slug) });
      setLink(inviteLink(result.inviteToken));
      toast.success("Link de convite gerado");
    },
    onError: reportError,
  });

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
                  void navigator.clipboard?.writeText(link);
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
            onClick={() => {
              if (link) {
                onOpenChange(false);
                return;
              }
              if (!name.trim() || !phone.trim()) {
                toast.error("Informe nome e telefone do juiz.");
                return;
              }
              generate.mutate();
            }}
            disabled={generate.isPending}
            className="inline-flex h-11 items-center gap-2 bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
          >
            <Link2 className="h-4 w-4" /> {generate.isPending ? "Gerando…" : link ? "Concluir" : "Gerar link"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RefereesPanel({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const referees = useQuery(refereesQuery(slug));
  const courts = useQuery(courtsQuery(slug));
  const matches = useQuery(organizerMatchesQuery(slug));

  const setCourt = useMutation({
    mutationFn: (args: { refereeId: string; courtId: string | null }) =>
      setRefereeCourt(slug, args.refereeId, args.courtId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.referees.byEvent(slug) }),
    onError: reportError,
  });

  const resend = useMutation({
    mutationFn: (refereeId: string) => inviteReferee(slug, refereeId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.referees.byEvent(slug) });
      const link = inviteLink(result.inviteToken);
      void navigator.clipboard?.writeText(link);
      toast.success("Convite copiado", { description: `${result.referee.name} · link na área de transferência` });
    },
    onError: reportError,
  });

  const courtList = courts.data ?? [];
  const matchList = matches.data ?? [];

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
        {(referees.data ?? []).map((r) => {
          const assigned = matchList.filter((m) => m.referee_id === r.id).length;
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
              <div className="min-w-[180px] flex-1">
                <p className="font-display text-base font-bold">{r.name}</p>
                <p className="score-num text-sm text-muted-foreground">{r.phone}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {assigned} partida{assigned === 1 ? "" : "s"} atribuída{assigned === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className={cn(
                  "px-2 py-1 font-display text-[10px] font-bold uppercase tracking-widest",
                  inviteTone[r.invite_status],
                )}
              >
                {r.invite_status_label}
              </span>
              <label className="block">
                <span className="sr-only">Quadra do juiz</span>
                <select
                  value={r.court_id ?? ""}
                  onChange={(e) => setCourt.mutate({ refereeId: r.id, courtId: e.target.value || null })}
                  disabled={setCourt.isPending}
                  className="h-9 border border-border bg-background px-2 font-display text-[11px] font-bold uppercase tracking-widest outline-none"
                >
                  <option value="">Sem quadra</option>
                  {courtList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => resend.mutate(r.id)}
                disabled={resend.isPending}
                className="inline-flex h-9 items-center gap-1.5 border border-border px-3 font-display text-[10px] font-bold uppercase tracking-widest disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" /> {r.invite_status === "NOT_SENT" ? "Enviar convite" : "Reenviar convite"}
              </button>
            </div>
          );
        })}
        {(referees.data ?? []).length === 0 && !referees.isPending ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum juiz cadastrado ainda.</p>
        ) : null}
      </div>

      <InviteRefereeDialog slug={slug} open={open} onOpenChange={setOpen} />
    </div>
  );
}
