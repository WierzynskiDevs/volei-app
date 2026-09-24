/**
 * Cálculo puro de chave eliminatória simples (ADR 0011).
 *
 * Espelha `App\Modules\Brackets\Domain\BracketSizing` do backend — aqui é só
 * para o **preview** na criação do evento (sem chamada de API), para nomear
 * as rodadas na tela de sorteio e na aba pública "Chaveamento". A fonte de
 * verdade do sorteio real é sempre o backend.
 */

import type { BracketTreeRound, BracketTreeSide } from "@/components/site/bracket-tree";

export function nextPowerOfTwo(teams: number): number {
  let size = 2;
  while (size < teams) size *= 2;
  return size;
}

/** `totalRounds` rodadas até a final, rotuladas em pt-BR. */
export function roundLabels(totalRounds: number): string[] {
  return Array.from({ length: totalRounds }, (_, index) => {
    const remaining = totalRounds - index - 1;
    if (remaining === 0) return "Final";
    if (remaining === 1) return "Semifinal";
    if (remaining === 2) return "Quartas de final";
    return `Rodada ${index + 1}`;
  });
}

/** `log2(bracketSize)`, isto é, quantas rodadas uma chave de N posições tem. */
export function roundsFor(bracketSize: number): number {
  return Math.max(1, Math.log2(bracketSize));
}

export type PublishedBracketSlot = {
  position: number;
  is_bye: boolean;
  registration_group: { display_name: string } | null;
};

function sideFor(slot: PublishedBracketSlot | undefined): BracketTreeSide {
  if (!slot) return { label: "—", empty: true };
  if (slot.is_bye) return { label: "Bye", empty: true };
  if (!slot.registration_group) return { label: "—", empty: true };
  return { label: slot.registration_group.display_name };
}

/**
 * Rodadas para `BracketTree`: a 1ª rodada com as duplas reais do sorteio, as
 * demais como "a definir" — avanço de chave depende do motor de partidas
 * (S9), ainda Fase 2 (ADR 0011 §1). Compartilhado pela tela de sorteio do
 * organizador (`/organizador/sorteio/$slug`) e pela aba pública
 * "Chaveamento" (`/eventos/$slug`, ADR 0017) — mesmo cálculo, duas fontes de
 * dado com o mesmo formato de posição.
 */
export function publishedBracketRounds(
  slots: PublishedBracketSlot[],
  bracketSize: number,
): BracketTreeRound[] {
  const totalRounds = roundsFor(bracketSize);
  const labels = roundLabels(totalRounds);

  return labels.map((label, roundIndex) => {
    if (roundIndex > 0) {
      const matchesInRound = bracketSize / 2 ** (roundIndex + 1);
      return {
        label,
        matches: Array.from({ length: matchesInRound }, () => ({
          a: { label: "A definir", empty: true },
          b: { label: "A definir", empty: true },
        })),
      };
    }

    const matches = [];
    for (let i = 0; i < slots.length; i += 2) {
      matches.push({ a: sideFor(slots[i]), b: sideFor(slots[i + 1]) });
    }
    return { label, matches };
  });
}
