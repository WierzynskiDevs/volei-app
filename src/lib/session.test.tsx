/**
 * Sessão real por cookie httpOnly (ADR 0005, CLAUDE.md §22: fluxo crítico de
 * auth). `signIn`/`signUp`/`signOut` são a superfície que `/login`, `/cadastro`
 * e o menu de usuário chamam — testado aqui via `renderHook`, sem precisar
 * montar as telas inteiras.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Account } from "@/lib/accounts";
import { ApiError } from "@/lib/api/client";

import * as authApi from "./api/auth";
import { homeForRole, SessionProvider, useSession } from "./session";

vi.mock("./api/auth", () => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

const player: Account = {
  id: "u1",
  label: "Curitiba/PR",
  name: "Ana Ribeiro",
  initials: "AR",
  email: "ana@beachub.com",
  phone: "",
  city: "Curitiba",
  state: "PR",
  roles: ["PLAYER"],
  status: "ATIVO",
  createdAt: "01/01/2026",
  events: 0,
  participations: 0,
};

const dualRole: Account = { ...player, id: "u2", roles: ["PLAYER", "ORGANIZER"] };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(authApi.me).mockReset();
  vi.mocked(authApi.login).mockReset();
  vi.mocked(authApi.register).mockReset();
  vi.mocked(authApi.logout).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSession — quem está logado é o servidor que diz", () => {
  it("sem sessão no servidor (401), account fica null e ready vira true", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "x"));

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.account).toBeNull();
  });

  it("com sessão válida, /me popula account e activeRole", async () => {
    vi.mocked(authApi.me).mockResolvedValue(player);

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.account?.id).toBe("u1"));
    expect(result.current.activeRole).toBe("PLAYER");
  });

  it("signIn bem-sucedido atualiza account com o que o backend devolveu", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "x"));
    vi.mocked(authApi.login).mockResolvedValue(player);

    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await result.current.signIn("ana@beachub.com", "senha-forte");

    expect(authApi.login).toHaveBeenCalledWith("ana@beachub.com", "senha-forte");
    await waitFor(() => expect(result.current.account?.id).toBe("u1"));
  });

  it("signIn com credencial errada propaga o erro do backend e não altera account", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "x"));
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos."),
    );

    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await expect(result.current.signIn("ana@beachub.com", "errada")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(result.current.account).toBeNull();
  });

  it("signOut limpa a sessão e a preferência de papel salva", async () => {
    // `signOut` reinvalida TODA query, inclusive a sessão — que refaz `/me`.
    // No servidor real, o cookie já foi derrubado e a chamada voltaria 401;
    // o mock precisa espelhar isso, senão o refetch "reloga" sozinho e o
    // teste checaria o comportamento errado.
    vi.mocked(authApi.me).mockResolvedValueOnce(dualRole);
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "x"));
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.account?.id).toBe("u2"));

    result.current.setActiveRole("ORGANIZER");
    await waitFor(() => expect(result.current.activeRole).toBe("ORGANIZER"));
    expect(window.localStorage.getItem("saque.active-role.v1")).toBe("ORGANIZER");

    await result.current.signOut();

    expect(authApi.logout).toHaveBeenCalled();
    await waitFor(() => expect(result.current.account).toBeNull());
    expect(window.localStorage.getItem("saque.active-role.v1")).toBeNull();
  });

  it("signOut limpa a sessão localmente mesmo se o servidor falhar", async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce(player);
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "x"));
    vi.mocked(authApi.logout).mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "x"));

    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.account?.id).toBe("u1"));

    // A tela não pode continuar mostrando dado de uma sessão que a pessoa
    // mandou encerrar, mesmo se o backend não confirmar.
    await expect(result.current.signOut()).resolves.toBeUndefined();
    await waitFor(() => expect(result.current.account).toBeNull());
  });

  it("papel ativo prefere a preferência salva, mas só se a conta realmente tiver esse papel", async () => {
    window.localStorage.setItem("saque.active-role.v1", "SUPER_ADMIN"); // conta não tem esse papel
    vi.mocked(authApi.me).mockResolvedValue(dualRole);

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.account?.id).toBe("u2"));
    // Cai para o primeiro papel real da conta, nunca aceita o que veio do
    // armazenamento local sem checar contra os papéis do servidor.
    expect(result.current.activeRole).toBe("PLAYER");
  });
});

describe("homeForRole — destino após login, decidido pelo papel do servidor", () => {
  it.each([
    ["SUPER_ADMIN", "/admin"],
    ["ORGANIZER", "/organizador"],
    ["PLAYER", "/"],
    [null, "/"],
  ] as const)("papel %s vai para %s", (role, path) => {
    expect(homeForRole(role)).toBe(path);
  });
});
