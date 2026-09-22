import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Account, Role } from "@/lib/accounts";
import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Sessão do usuário — agora com autenticação real (ADR 0005).
 *
 * A regra que muda tudo: **quem está logado é o servidor que diz**. O cliente
 * não guarda identidade nem papel; ele pergunta em `GET /me` e o cookie
 * httpOnly responde por ele. `localStorage` não participa da autenticação
 * (CLAUDE.md §10) — só guarda qual papel a pessoa escolheu ver quando tem mais
 * de um, que é preferência de tela e não credencial.
 *
 * A forma exposta por `useSession()` foi preservada de propósito: `account`
 * continua sendo um `Account`, com os mesmos campos. É isso que permitiu trocar
 * o mock por login real sem alterar `shell`, `user-menu`, `configuracoes` ou
 * `escolher-perfil`.
 *
 * Nota de segurança: o guard de rota que este contexto habilita **esconde**;
 * quem nega é o backend, em toda requisição (CLAUDE.md §15).
 */

const ROLE_STORAGE_KEY = "saque.active-role.v1";

type SessionContextValue = {
  ready: boolean;
  account: Account | null;
  activeRole: Role | null;
  signIn: (email: string, password: string) => Promise<Account>;
  signUp: (payload: authApi.RegisterPayload) => Promise<Account>;
  signOut: () => Promise<void>;
  setActiveRole: (role: Role) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [preferredRole, setPreferredRole] = useState<Role | null>(null);

  const session = useQuery({
    queryKey: queryKeys.session,
    queryFn: authApi.me,

    /*
     * 401 aqui não é falha: é a resposta correta para "ninguém logado".
     * Repetir a chamada só atrasaria a renderização da tela de visitante.
     */
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.isUnauthenticated) && failureCount < 2,
    staleTime: 60_000,
  });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
      if (stored) setPreferredRole(stored as Role);
    } catch {
      /* ignore */
    }
  }, []);

  const account = session.data ?? null;

  const setActiveRole = useCallback((role: Role) => {
    setPreferredRole(role);
    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {
      /* ignore */
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const logged = await authApi.login(email, password);

      queryClient.setQueryData(queryKeys.session, logged);
      // Dados de outra sessão não podem sobreviver à troca de usuário.
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizerEvents.all });

      return logged;
    },
    [queryClient],
  );

  const signUp = useCallback(
    async (payload: authApi.RegisterPayload) => {
      const created = await authApi.register(payload);
      queryClient.setQueryData(queryKeys.session, created);
      return created;
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Mesmo que o servidor falhe, o cliente não pode continuar exibindo
      // dado de uma sessão que a pessoa mandou encerrar — e quem chama
      // signOut() não deveria precisar de try/catch próprio para isso.
    } finally {
      setPreferredRole(null);
      try {
        window.localStorage.removeItem(ROLE_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      queryClient.setQueryData(queryKeys.session, null);
      await queryClient.invalidateQueries();
    }
  }, [queryClient]);

  const value = useMemo<SessionContextValue>(() => {
    const roles = account?.roles ?? [];
    const activeRole =
      account === null
        ? null
        : preferredRole && roles.includes(preferredRole)
          ? preferredRole
          : (roles[0] ?? null);

    return {
      ready: !session.isPending,
      account,
      activeRole,
      signIn,
      signUp,
      signOut,
      setActiveRole,
    };
  }, [account, preferredRole, session.isPending, signIn, signUp, signOut, setActiveRole]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession precisa estar dentro de SessionProvider");
  return ctx;
}

export function homeForRole(role: Role | null) {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "ORGANIZER") return "/organizador";
  return "/";
}
