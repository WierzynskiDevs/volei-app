/**
 * Chaves de query centralizadas (CLAUDE.md §15).
 *
 * Ficam num lugar só porque invalidação errada é bug silencioso: a mutação
 * "publicar evento" precisa invalidar exatamente as listas que mostram aquele
 * evento, e chave escrita à mão em cada arquivo diverge sem ninguém perceber.
 *
 * Hierarquia: `["events"]` invalida tudo de eventos; `["events","list",filtros]`
 * invalida só aquela combinação de filtros.
 */

export type EventListFilters = {
  q?: string | undefined;
  gender_category?: string | undefined;
  level_category?: string | undefined;
  state?: string | undefined;
  status?: string | undefined;
  per_page?: number | undefined;
};

export const queryKeys = {
  session: ["session", "me"] as const,

  events: {
    all: ["events"] as const,
    lists: () => [...queryKeys.events.all, "list"] as const,
    list: (filters: EventListFilters = {}) => [...queryKeys.events.lists(), filters] as const,
    details: () => [...queryKeys.events.all, "detail"] as const,
    detail: (slug: string) => [...queryKeys.events.details(), slug] as const,
  },

  organizerEvents: {
    all: ["organizer", "events"] as const,
    lists: () => [...queryKeys.organizerEvents.all, "list"] as const,
    list: (status?: string) => [...queryKeys.organizerEvents.lists(), status ?? "all"] as const,
    detail: (slug: string) => [...queryKeys.organizerEvents.all, "detail", slug] as const,
  },

  /*
   * Inscrições. `all` invalida tudo — é o que uma aprovação de nível precisa
   * fazer, porque a decisão muda a fila do organizador E a lista do atleta.
   */
  registrations: {
    all: ["registrations"] as const,
    mine: () => [...queryKeys.registrations.all, "mine"] as const,
    queue: (levelReview: string) => [...queryKeys.registrations.all, "queue", levelReview] as const,
    byEvent: (slug: string, status?: string) =>
      [...queryKeys.registrations.all, "event", slug, status ?? "all"] as const,
  },

  /*
   * Pagamentos. Nunca cacheados por padrão (§20): status de pagamento obsoleto
   * em tela é pior do que uma requisição a mais.
   */
  payments: {
    all: ["payments"] as const,
    detail: (id: string) => [...queryKeys.payments.all, "detail", id] as const,
  },

  /**
   * Sorteio/chaveamento inicial (ADR 0011). Uma chave por evento — não há
   * lista, então só `detail`.
   */
  draws: {
    all: ["draws"] as const,
    detail: (slug: string) => [...queryKeys.draws.all, "detail", slug] as const,
  },

  /*
   * Painel administrativo (ADR 0010). Fica sob uma raiz própria para que
   * `["admin"]` invalide o painel inteiro — que é o que uma suspensão de conta
   * precisa fazer: muda a lista de usuários, o dashboard e a auditoria de uma
   * vez.
   */
  admin: {
    all: ["admin"] as const,
    overview: () => [...queryKeys.admin.all, "overview"] as const,
    users: (filters: Record<string, string | undefined> = {}) =>
      [...queryKeys.admin.all, "users", filters] as const,
    organizers: (filters: Record<string, string | undefined> = {}) =>
      [...queryKeys.admin.all, "organizers", filters] as const,
    events: (filters: Record<string, string | undefined> = {}) =>
      [...queryKeys.admin.all, "events", filters] as const,
    payments: (filters: Record<string, string | undefined> = {}) =>
      [...queryKeys.admin.all, "payments", filters] as const,
    payment: (id: string) => [...queryKeys.admin.all, "payment", id] as const,
    finance: () => [...queryKeys.admin.all, "finance"] as const,
    auditLogs: (filters: Record<string, string | undefined> = {}) =>
      [...queryKeys.admin.all, "audit-logs", filters] as const,
  },
} as const;
