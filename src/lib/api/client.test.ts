/**
 * Client HTTP (CLAUDE.md §22: fluxo crítico — as três telas de auth, inscrição
 * e checkout passam por aqui). Comportamento testado, não implementação: o que
 * importa é o que a rede recebe e o que o chamador enxerga, não como o fetch é
 * montado por dentro.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest, ensureCsrfCookie } from "./client";

function mockFetch(responses: Array<() => Promise<Response> | Response>) {
  const calls: Array<[string, RequestInit | undefined]> = [];
  let i = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      const next = responses[Math.min(i, responses.length - 1)]!;
      i += 1;
      return next();
    }),
  );

  return calls;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  document.cookie = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiRequest — envelope de erro (CLAUDE.md §13)", () => {
  it("traduz um erro da API em ApiError com code, message e details", async () => {
    mockFetch([
      () =>
        jsonResponse(422, {
          error: {
            code: "VALIDATION_FAILED",
            message: "Os dados enviados são inválidos.",
            details: { email: ["O e-mail é obrigatório."] },
          },
        }),
    ]);

    await expect(apiRequest("/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Os dados enviados são inválidos.",
    });
  });

  it("fieldErrors extrai a primeira mensagem por campo", async () => {
    const error = new ApiError(422, "VALIDATION_FAILED", "Inválido", {
      email: ["Obrigatório.", "Formato inválido."],
      name: ["Muito curto."],
    });

    expect(error.fieldErrors).toEqual({
      email: "Obrigatório.",
      name: "Muito curto.",
    });
  });

  it("isUnauthenticated só é verdadeiro para 401", async () => {
    expect(new ApiError(401, "UNAUTHENTICATED", "x").isUnauthenticated).toBe(true);
    expect(new ApiError(403, "FORBIDDEN", "x").isUnauthenticated).toBe(false);
    expect(new ApiError(409, "CONFLICT", "x").isUnauthenticated).toBe(false);
  });

  it("resposta sem corpo JSON (proxy, 502) ainda vira ApiError com mensagem genérica", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>502</html>", { status: 502 })),
    );

    await expect(apiRequest("/me")).rejects.toMatchObject({
      status: 502,
      code: "NETWORK_ERROR",
    });
  });

  it("falha de rede (fetch rejeita) vira ApiError, nunca TypeError cru", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const rejection = apiRequest("/me");

    await expect(rejection).rejects.toBeInstanceOf(ApiError);
    await expect(rejection).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

describe("apiRequest — sessão por cookie (ADR 0005)", () => {
  it("busca o cookie CSRF antes de um POST, mas não antes de um GET", async () => {
    const calls = mockFetch([
      () => new Response(null, { status: 204 }), // /sanctum/csrf-cookie
      () => jsonResponse(201, { data: { id: "1" } }),
    ]);

    await apiRequest("/organizers", { method: "POST", body: { name: "x" } });

    expect(calls).toHaveLength(2);
    expect(calls[0]![0]).toContain("/sanctum/csrf-cookie");
    expect(calls[1]![0]).toContain("/organizers");
  });

  it("GET não dispara busca de CSRF", async () => {
    const calls = mockFetch([() => jsonResponse(200, { data: [] })]);

    await apiRequest("/events");

    expect(calls).toHaveLength(1);
  });

  it("envia o XSRF-TOKEN do cookie no header, decodificado", async () => {
    document.cookie = "XSRF-TOKEN=abc%2Bdef";

    const calls = mockFetch([() => jsonResponse(200, { data: { id: "1" } })]);

    await apiRequest("/registrations/1/accept", { method: "POST" });

    const headers = calls[0]![1]?.headers as Record<string, string>;
    expect(headers["X-XSRF-TOKEN"]).toBe("abc+def");
  });

  it("419 (sessão de SPA expirada) renova o CSRF e repete a chamada uma vez", async () => {
    document.cookie = "XSRF-TOKEN=old";

    const calls = mockFetch([
      () => jsonResponse(419, { error: { code: "CSRF_TOKEN_MISMATCH", message: "Expirou" } }),
      () => new Response(null, { status: 204 }), // renovação do /sanctum/csrf-cookie
      () => jsonResponse(200, { data: { id: "1" } }),
    ]);

    const result = await apiRequest("/registrations/1/accept", { method: "POST" });

    expect(result).toEqual({ data: { id: "1" } });
    expect(calls).toHaveLength(3);
    expect(calls[1]![0]).toContain("/sanctum/csrf-cookie");
  });

  it("credentials: include em toda chamada — sem isto o cookie de sessão não viaja", async () => {
    const calls = mockFetch([() => jsonResponse(200, { data: [] })]);

    await apiRequest("/events");

    expect(calls[0]![1]?.credentials).toBe("include");
  });

  it("headers extras (ex.: Idempotency-Key) chegam na chamada sem sobrescrever o CSRF", async () => {
    // Cookie já presente: ensureCsrfCookie() não dispara busca extra, então só
    // a chamada real acontece — é o header dela que este teste checa.
    document.cookie = "XSRF-TOKEN=tok";

    const calls = mockFetch([() => jsonResponse(201, { data: { id: "pay_1" } })]);

    await apiRequest("/registrations/1/payments", {
      method: "POST",
      body: { method: "PIX" },
      headers: { "Idempotency-Key": "chave-fixa-123" },
    });

    const headers = calls[0]![1]?.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("chave-fixa-123");
    expect(headers["X-XSRF-TOKEN"]).toBe("tok");
  });
});

describe("ensureCsrfCookie", () => {
  it("não busca de novo se o cookie XSRF-TOKEN já existe", async () => {
    document.cookie = "XSRF-TOKEN=ja-tenho";
    const calls = mockFetch([() => new Response(null, { status: 204 })]);

    await ensureCsrfCookie();

    expect(calls).toHaveLength(0);
  });

  it("force=true busca mesmo com o cookie presente", async () => {
    document.cookie = "XSRF-TOKEN=ja-tenho";
    const calls = mockFetch([() => new Response(null, { status: 204 })]);

    await ensureCsrfCookie(true);

    expect(calls).toHaveLength(1);
  });
});
