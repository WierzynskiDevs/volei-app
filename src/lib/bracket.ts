/**
 * Cálculo puro de chave eliminatória simples (ADR 0011).
 *
 * Espelha `App\Modules\Brackets\Domain\BracketSizing` do backend — aqui é só
 * para o **preview** na criação do evento (sem chamada de API) e para nomear
 * as rodadas na tela de sorteio. A fonte de verdade do sorteio real é sempre
 * o backend.
 */

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
