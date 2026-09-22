/**
 * Árvore de chave eliminatória simples — vocabulário visual extraído de
 * `BracketTab` (`src/routes/eventos.$slug.tsx`): colunas por rodada, cada
 * partida um card com dois lados empilhados. Não existe no baseline como
 * componente próprio (é JSX inline lá); foi extraído aqui para não duplicar
 * marcação entre o preview da criação do evento e a tela de sorteio
 * (docs/DIVERGENCES.md §24).
 *
 * Sem placar: nenhuma das duas telas que usam este componente acompanha
 * partida (isso é S9, ainda Fase 2) — o traço no lugar do placar é
 * deliberado, não um valor faltando.
 */

import { cn } from "@/lib/utils";

export type BracketTreeSide = {
  label: string;
  /** Lado sem dupla ainda (vazio no sorteio, ou "TBD" no preview). */
  empty?: boolean;
};

export type BracketTreeMatch = {
  a: BracketTreeSide;
  b: BracketTreeSide;
};

export type BracketTreeRound = {
  label: string;
  matches: BracketTreeMatch[];
};

export function BracketTree({ rounds }: { rounds: BracketTreeRound[] }) {
  return (
    <div className="grid gap-6 overflow-x-auto md:grid-cols-3">
      {rounds.map((round) => (
        <div key={round.label} className="min-w-[240px] space-y-4">
          <p className="eyebrow">{round.label}</p>
          {round.matches.map((match, index) => (
            <div key={index} className="border border-border bg-card">
              {([match.a, match.b] as const).map((side, sideIndex) => (
                <div
                  key={sideIndex}
                  className="flex items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0"
                >
                  <span
                    className={cn(
                      "font-display text-sm font-bold",
                      side.empty && "text-muted-foreground",
                    )}
                  >
                    {side.label}
                  </span>
                  <span className="score-num text-muted-foreground">–</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
