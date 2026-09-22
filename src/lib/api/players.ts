/**
 * Busca de atletas para formar dupla.
 *
 * Consumidores: seletor "Escolha o parceiro" em `/inscricao/{slug}` e a busca de
 * `/trocar-dupla`.
 *
 * O contrato é estreito de propósito — nome, nível e cidade. É o que a tela
 * mostra e é o mínimo para escolher um parceiro; e-mail e telefone não trafegam
 * (CLAUDE.md §12).
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "./client";

const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
});

export type ApiPlayer = z.infer<typeof playerSchema>;

const responseSchema = z.object({ data: z.array(playerSchema) });

/** Termo mínimo espelha o backend: abaixo disso ele devolve lista vazia. */
export const MIN_SEARCH_LENGTH = 2;

export const playerSearchQuery = (term: string) =>
  queryOptions({
    queryKey: ["players", "search", term] as const,
    queryFn: async ({ signal }) => {
      const raw = await apiRequest<unknown>("/players", { query: { q: term }, signal });
      return responseSchema.parse(raw).data;
    },
    // Sem termo suficiente nem chega a chamar: a lista nasce vazia.
    enabled: term.trim().length >= MIN_SEARCH_LENGTH,
  });

/** Rótulo de nível: o backend manda o valor do enum, a tela mostra o texto. */
const LEVEL_TEXT: Record<string, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
  OPEN: "Open",
};

export const playerLevelLabel = (value: string | null): string =>
  value === null ? "Nível não informado" : (LEVEL_TEXT[value] ?? value);

/** Iniciais para o avatar, como o baseline já faz com os mocks. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
