import { adsFor, type AdPosition } from "@/lib/admin-data";

/**
 * Slot de publicidade da plataforma (anunciantes), não patrocínio de evento.
 * Posições naturais, sem pop-up e sem cobrir conteúdo.
 */
export function AdSlot({ position, className = "" }: { position: AdPosition; className?: string }) {
  const ad = adsFor(position)[0];
  if (!ad) return null;

  return (
    <a
      href={ad.url}
      target="_blank"
      rel="noreferrer sponsored"
      className={`group block border border-border bg-card ${className}`}
      aria-label={`Publicidade de ${ad.advertiser}`}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="eyebrow text-muted-foreground">Publicidade</span>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <span className="font-display text-base font-extrabold tracking-tight">
          {ad.advertiser.toUpperCase()}
          <span className="text-accent">.</span>
        </span>
        <span className="text-sm text-muted-foreground">{ad.tagline}</span>
        <span className="ml-auto font-display text-[11px] font-bold uppercase tracking-widest text-accent group-hover:underline">
          Ver
        </span>
      </div>
    </a>
  );
}
