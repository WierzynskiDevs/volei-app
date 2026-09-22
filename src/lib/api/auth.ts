/**
 * Autenticação real (ADR 0005) — substitui o login mock.
 *
 * Sessão por cookie httpOnly: o token **não** vive em `localStorage`
 * (CLAUDE.md §10). Consequência prática: o cliente não guarda "quem está
 * logado" — ele pergunta ao servidor com `GET /me`. Enquanto o cookie for
 * válido, a resposta vem; quando não for, vem 401 e a sessão acabou.
 *
 * O papel do usuário vem do banco, sempre. Nada aqui aceita papel escolhido
 * pelo cliente — e mesmo que aceitasse, o backend ignoraria.
 */

import { z } from "zod";

import type { Account, Role } from "@/lib/accounts";

import { apiRequest, type Resource } from "./client";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  level: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  status: z.enum(["ACTIVE", "BLOCKED"]),
  roles: z.array(z.enum(["PLAYER", "ORGANIZER", "SUPER_ADMIN"])).default([]),
  organizer: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      status: z.string(),
      payment_account_status: z.string(),
    })
    .nullish(),
  email: z.string().optional(),
  phone: z.string().nullish(),
  created_at: z.string().nullable(),
});

export type ApiUser = z.infer<typeof userSchema>;

/** Iniciais para o avatar — o baseline as trazia prontas no mock. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Converte o usuário da API no formato `Account` que as telas já consomem.
 *
 * Manter a forma é o que permitiu trocar login mock por login real sem tocar
 * em `shell`, `user-menu`, `configuracoes` e `escolher-perfil`.
 *
 * Dois campos ficam propositalmente vazios:
 *
 *  - `playerId` — a página de jogador (`/jogadores/{id}`) é do módulo de
 *    perfil esportivo, que é Fase 2. Apontar para lá com o id real levaria a
 *    uma tela que ainda lê mock e não encontraria ninguém.
 *  - `events` / `participations` — contadores de Fase 2. Zero é honesto;
 *    inventar número não é.
 */
export function toAccount(user: ApiUser): Account {
  const location = user.city && user.state ? `${user.city}/${user.state}` : null;

  return {
    id: user.id,
    label: location ?? user.organizer?.name ?? "Conta BeacHub",
    name: user.name,
    initials: initialsOf(user.name),
    email: user.email ?? "",
    phone: user.phone ?? "",
    city: user.city ?? "",
    state: user.state ?? "",
    roles: user.roles as Role[],
    // Propriedade opcional: presente só quando existe, nunca como `undefined`.
    ...(user.organizer ? { organizerName: user.organizer.name } : {}),
    status: user.status === "ACTIVE" ? "ATIVO" : "SUSPENSO",
    createdAt: user.created_at?.slice(0, 10).split("-").reverse().join("/") ?? "",
    events: 0,
    participations: 0,
  };
}

async function parseUser(raw: Resource<ApiUser>): Promise<Account> {
  return toAccount(userSchema.parse(raw.data));
}

export async function login(email: string, password: string): Promise<Account> {
  return parseUser(
    await apiRequest<Resource<ApiUser>>("/auth/login", {
      method: "POST",
      body: { email: email.trim().toLowerCase(), password },
    }),
  );
}

export type RegisterPayload = {
  name: string;
  email: string;
  phone?: string | undefined;
  password: string;
  password_confirmation: string;
  accept_terms: boolean;
  accept_privacy: boolean;
};

export async function register(payload: RegisterPayload): Promise<Account> {
  return parseUser(
    await apiRequest<Resource<ApiUser>>("/auth/register", {
      method: "POST",
      body: { ...payload, email: payload.email.trim().toLowerCase() },
    }),
  );
}

/**
 * Encerra a sessão no servidor. Apagar cookie no cliente não encerra sessão —
 * é o backend que invalida.
 */
export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

export async function me(): Promise<Account> {
  return parseUser(await apiRequest<Resource<ApiUser>>("/me"));
}
