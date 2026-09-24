import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export function StarInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-6 w-6",
              n <= value ? "fill-accent text-accent" : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Avaliação da arbitragem (após a partida) e da organização (após o evento). */
export function RatingCard({
  eyebrow,
  title,
  description,
  submitLabel = "Enviar avaliação",
}: {
  eyebrow: string;
  title: string;
  description: string;
  submitLabel?: string;
}) {
  const [value, setValue] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="border border-success/40 bg-success/10 p-5">
        <p className="eyebrow">{eyebrow}</p>
        <p className="mt-1 font-display text-base font-bold">Avaliação enviada — obrigado!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua nota entra na média pública em até 24h e nunca é vinculada ao seu nome.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card p-5">
      <p className="eyebrow">{eyebrow}</p>
      <p className="mt-1 font-display text-base font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-3">
        <StarInput value={value} onChange={setValue} label={title} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Comentário opcional"
        className="mt-3 w-full border border-border bg-background p-3 text-sm outline-none"
      />
      <button
        onClick={() => {
          if (value === 0) {
            toast.error("Escolha de 1 a 5 estrelas.");
            return;
          }
          setSent(true);
          toast.success("Avaliação registrada");
        }}
        className="mt-3 inline-flex h-11 items-center bg-accent px-5 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
      >
        {submitLabel}
      </button>
    </div>
  );
}
