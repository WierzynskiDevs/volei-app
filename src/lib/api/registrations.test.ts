/**
 * Inscrição (CLAUDE.md §22: fluxo crítico). O que importa aqui: a fronteira
 * Zod falha visível quando a API muda a forma da resposta (§15), e os helpers
 * de apresentação (`teamLabel`, `partnerName`) resolvem exatamente os casos
 * que `/inscricao/{slug}` e `/minhas-inscricoes` mostram.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRegistration, partnerName, teamLabel, type ApiRegistration } from "./registrations";

function baseRegistration(overrides: Partial<ApiRegistration> = {}): ApiRegistration {
  return {
    id: "reg_1",
    event_id: "evt_1",
    user_id: "u1",
    group_id: null,
    is_captain: false,
    partner_mode: "INDIVIDUAL",
    status: "PENDING_PAYMENT",
    status_label: "Aguardando pagamento",
    level_review: "NOT_REQUIRED",
    level_review_label: "Não exigida",
    player_level: null,
    event_level: "OPEN",
    level_review_decided_at: null,
    level_review_reason: null,
    reserved_until: null,
    confirmed_at: null,
    cancelled_at: null,
    payment: null,
    player: null,
    group: null,
    event: null,
    created_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("teamLabel — nome da dupla exibido nas telas", () => {
  it("usa o display_name do grupo quando existe dupla", () => {
    const reg = baseRegistration({
      group: {
        id: "g1",
        display_name: "Mendes / Alves",
        status: "FORMING",
        status_label: "Em formação",
        members: null,
      },
    });

    expect(teamLabel(reg)).toBe("Mendes / Alves");
  });

  it("sem dupla, cai para o nome do próprio atleta", () => {
    const reg = baseRegistration({ player: { id: "u1", name: "Ana Ribeiro", level: null } });

    expect(teamLabel(reg)).toBe("Ana Ribeiro");
  });

  it("sem dupla e sem player carregado, mostra travessão em vez de string vazia", () => {
    expect(teamLabel(baseRegistration())).toBe("—");
  });
});

describe("partnerName — nome do parceiro na dupla", () => {
  it("encontra o OUTRO membro do grupo, nunca a si mesmo", () => {
    const reg = baseRegistration({
      id: "reg_1",
      group: {
        id: "g1",
        display_name: "Mendes / Alves",
        status: "FORMING",
        status_label: "Em formação",
        members: [
          { registration_id: "reg_1", name: "Ana Ribeiro", status: "CONFIRMED", is_captain: true },
          {
            registration_id: "reg_2",
            name: "Bia Alves",
            status: "PENDING_ACCEPTANCE",
            is_captain: false,
          },
        ],
      },
    });

    expect(partnerName(reg)).toBe("Bia Alves");
  });

  it("sem grupo, devolve null — não inventa parceiro", () => {
    expect(partnerName(baseRegistration())).toBeNull();
  });
});

describe("createRegistration — chamada à API", () => {
  it("envia o payload exato para o evento certo e valida a resposta", async () => {
    const mocked = vi.mocked(fetch);
    mocked
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // csrf-cookie
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: baseRegistration({ partner_mode: "SEEKING" }) }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await createRegistration("copa-das-dunas", {
      partner_mode: "SEEKING",
      accept_rules: true,
    });

    expect(result.partner_mode).toBe("SEEKING");

    const [url, init] = mocked.mock.calls[1]!;
    expect(String(url)).toContain("/events/copa-das-dunas/registrations");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      partner_mode: "SEEKING",
      accept_rules: true,
    });
  });

  it("resposta com forma inesperada da API falha visível (Zod), não vira undefined silencioso", async () => {
    const mocked = vi.mocked(fetch);
    mocked.mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "reg_1" } }), {
        // faltam quase todos os campos obrigatórios do schema
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      createRegistration("copa-das-dunas", { partner_mode: "INDIVIDUAL", accept_rules: true }),
    ).rejects.toThrow();
  });
});
