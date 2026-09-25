/**
 * Sessão do juiz por token, persistida no dispositivo (ADR 0013 §5).
 *
 * `localStorage` aqui não é o mesmo caso que o CLAUDE.md §10 veta: aquele é
 * sobre token de LONGA DURAÇÃO de conta de usuário completa. Este token é de
 * um ator diferente (juiz pode nem ter conta), tem expiração curta própria
 * (`expires_at` no backend) e não tem outro jeito de sobreviver a um refresh
 * de página durante o evento — o único caminho de entrada é o link de
 * convite, que não pode ser exigido de novo a cada F5 na quadra.
 */

const STORAGE_KEY = "saque.referee-session.v1";

export type StoredRefereeSession = {
  token: string;
  refereeName: string;
};

export function loadRefereeSession(): StoredRefereeSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { token?: unknown }).token === "string" &&
      typeof (parsed as { refereeName?: unknown }).refereeName === "string"
    ) {
      return parsed as StoredRefereeSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveRefereeSession(session: StoredRefereeSession): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Modo privado ou storage bloqueado: a sessão só dura a aba atual.
  }
}

export function clearRefereeSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada a fazer — não há o que limpar de verdade.
  }
}
