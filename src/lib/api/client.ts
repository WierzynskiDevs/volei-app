/**
 * Client HTTP único da aplicação (CLAUDE.md §15).
 *
 * Nenhum componente visual faz `fetch` direto: tudo passa por aqui, que é onde
 * moram as três coisas que não podem ser esquecidas em nenhuma chamada —
 * credenciais de sessão, token CSRF e o envelope de erro da API.
 *
 * Autenticação é por cookie httpOnly (ADR 0005). Consequências práticas:
 *
 *  - `credentials: "include"` em toda requisição. Sem isso o cookie de sessão
 *    não viaja e toda rota autenticada responde 401.
 *  - Antes do primeiro POST/PATCH/DELETE é preciso buscar `/sanctum/csrf-cookie`.
 *    Sem isso a API responde 419.
 *  - O token vai no header `X-XSRF-TOKEN`, com o valor do cookie `XSRF-TOKEN`
 *    **decodificado** — o Laravel grava o cookie URL-encoded.
 */

import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestUrl } from "@tanstack/react-start/server";

/** Base da API. Sobrescrevível por ambiente sem tocar em código. */
export const API_BASE_URL = (import.meta.env["VITE_API_URL"] ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

const API_PREFIX = "/api/v1";

/** Formato do envelope de erro da API (CLAUDE.md §13). */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[] | unknown> | undefined;
  };
};

/**
 * Erro de API já traduzido.
 *
 * `code` é estável e serve para decidir comportamento; `message` é o texto
 * que se mostra ao usuário. A tela nunca inventa mensagem própria para um erro
 * que o backend já explicou.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[] | unknown> | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[] | unknown> | undefined,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Erros de validação por campo, no formato que os formulários consomem. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [field, messages] of Object.entries(this.details ?? {})) {
      if (Array.isArray(messages) && typeof messages[0] === "string") out[field] = messages[0];
    }
    return out;
  }

  get isUnauthenticated() {
    return this.status === 401;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * Repassa o cookie de sessão do navegador na chamada servidor→API durante SSR
 * (ADR 0012, pendência registrada: "os loaders SSR... precisam encaminhar o
 * cookie de sessão recebido do navegador").
 *
 * No navegador, `credentials: "include"` já basta — o próprio browser anexa o
 * cookie. No Worker (SSR), o `fetch()` daqui é uma chamada servidor→servidor:
 * não existe cookie de navegador para incluir a menos que a gente leia o
 * `Cookie` da requisição recebida e repasse explicitamente. Sem isto, a
 * primeira renderização aparece anônima mesmo com o usuário logado.
 *
 * `createIsomorphicFn` (não `import()` dinâmico) de propósito: o compilador
 * do TanStack Start reescreve esta chamada antes do bundle do navegador
 * existir, trocando o branch `.server()` — e o import server-only dentro
 * dele — por um no-op. Um `import()` dinâmico comum é bloqueado pelo plugin
 * de proteção de import ("server-only import reachable from client code").
 *
 * Também repassa a origem (`Origin`): o cookie sozinho não basta. O Sanctum
 * só trata a requisição como "do frontend" (`EnsureFrontendRequestsAreStateful
 * ::fromFrontend()`) quando `Referer`/`Origin` bate com `SANCTUM_STATEFUL_DOMAINS`
 * — sem isso ele ignora o cookie e cai no caminho de token, que não existe
 * aqui, e devolve 401 mesmo com a sessão válida.
 */
const getForwardedRequestContext = createIsomorphicFn()
  .server((): { cookie: string | null; origin: string | null } => {
    try {
      return {
        cookie: getRequestHeader("cookie") ?? null,
        origin: getRequestUrl().origin,
      };
    } catch {
      // Fora de um request handler válido (ex.: script de build) — nada
      // para repassar, não é erro.
      return { cookie: null, origin: null };
    }
  })
  .client((): { cookie: null; origin: null } => ({ cookie: null, origin: null }));

/**
 * Garante o cookie de CSRF antes de uma escrita.
 *
 * Só roda no navegador: no SSR não existe cookie de usuário para proteger, e
 * escrita não acontece durante render.
 */
let csrfRequest: Promise<void> | null = null;

export async function ensureCsrfCookie(force = false): Promise<void> {
  if (typeof document === "undefined") return;
  if (!force && readCookie("XSRF-TOKEN")) return;

  // Requisições simultâneas compartilham a mesma ida ao servidor.
  csrfRequest ??= fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }).then(() => undefined);

  try {
    await csrfRequest;
  } finally {
    csrfRequest = null;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | undefined;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined> | undefined;
  signal?: AbortSignal | undefined;
  /**
   * Headers extras da chamada. Existe por causa de `Idempotency-Key`, que a API
   * exige na criação de cobrança (CLAUDE.md §8) e que precisa ser **o mesmo**
   * numa repetição para não gerar segunda cobrança no gateway.
   */
  headers?: Record<string, string> | undefined;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${path}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    // Filtro vazio não vira `?campo=` — a API trataria como filtro presente.
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function parseError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};

  try {
    body = (await response.json()) as Partial<ApiErrorBody>;
  } catch {
    // Resposta sem JSON (proxy, timeout, 502): a mensagem genérica abaixo vale.
  }

  return new ApiError(
    response.status,
    body.error?.code ?? "NETWORK_ERROR",
    body.error?.message ?? "Não foi possível concluir a operação. Tente novamente.",
    body.error?.details,
  );
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const isWrite = method !== "GET";

  /*
   * A busca do cookie CSRF também precisa virar `ApiError`.
   *
   * Sem este try, uma falha aqui — API fora do ar, origem fora da allowlist de
   * CORS — subia como `TypeError` cru. Quem chamava testava `instanceof
   * ApiError`, não reconhecia, e caía na mensagem genérica da tela: o usuário
   * via "tente novamente em instantes" para um problema que nunca se resolve
   * sozinho, e sem nenhuma pista do que era.
   */
  if (isWrite) {
    try {
      await ensureCsrfCookie();
    } catch (cause) {
      throw new ApiError(
        0,
        "CSRF_UNAVAILABLE",
        "Não foi possível iniciar a sessão segura com o servidor. Verifique se a API está no ar.",
        { cause: [String(cause)] },
      );
    }
  }

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = { Accept: "application/json" };

    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    // Antes do CSRF de propósito: header de chamada não sobrescreve o que
    // protege a sessão.
    for (const [key, value] of Object.entries(options.headers ?? {})) headers[key] = value;

    const xsrf = readCookie("XSRF-TOKEN");
    if (isWrite && xsrf) headers["X-XSRF-TOKEN"] = xsrf;

    const forwarded = getForwardedRequestContext();
    if (forwarded.cookie !== null) headers["Cookie"] = forwarded.cookie;
    if (forwarded.origin !== null) headers["Origin"] = forwarded.origin;

    /*
     * `init` é montado por partes: com `exactOptionalPropertyTypes`, passar
     * `body: undefined` explícito é erro de tipo — a chave precisa não existir.
     */
    const init: RequestInit = { method, credentials: "include", headers };

    if (options.body !== undefined) init.body = JSON.stringify(options.body);
    if (options.signal) init.signal = options.signal;

    return fetch(buildUrl(path, options.query), init);
  };

  let response: Response;

  try {
    response = await send();
  } catch (cause) {
    // Falha de rede: a API está fora, o navegador está offline ou o CORS
    // recusou. Vira um erro do mesmo formato dos demais para que a tela não
    // precise distinguir a origem.
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível falar com o servidor.", {
      cause: [String(cause)],
    });
  }

  /*
   * 419 = sessão de SPA expirada. Renova o cookie e repete UMA vez. Sem isso,
   * uma aba aberta desde ontem falharia a primeira escrita sem explicação.
   */
  if (response.status === 419 && isWrite) {
    await ensureCsrfCookie(true);
    response = await send();
  }

  if (!response.ok) throw await parseError(response);

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

/** Resposta paginada padrão dos Resources do Laravel. */
export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

/** Resposta de recurso único. */
export type Resource<T> = { data: T };

/** Resposta de coleção sem paginação (`Resource::collection` simples). */
export type ResourceCollection<T> = { data: T[] };
