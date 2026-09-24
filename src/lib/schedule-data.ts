// Painel de partidas: agenda, sets oficiais e estimativa dinâmica de horários.
// O sistema NÃO controla ponto a ponto — apenas resultados de sets encerrados.

export type SetResult = {
  index: number;
  a: number;
  b: number;
  status: "OFFICIAL" | "IN_PROGRESS";
  correctedFrom?: { a: number; b: number; by: string; at: string; reason: string };
};

export type ScheduledMatch = {
  id: string;
  eventSlug: string;
  eventName: string;
  category: string;
  phase: string;
  court: string;
  teamA: string;
  teamB: string;
  playersA: string[];
  playersB: string[];
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  /** horário programado (nunca é sobrescrito) */
  scheduledStartAt: string;
  /** início real, quando a partida começou */
  actualStartAt?: string;
  /** fim real, quando a partida encerrou */
  actualEndAt?: string;
  /** duração estimada do formato, em minutos */
  estimatedDurationMin: number;
  sets: SetResult[];
};

export const COURTS = ["Quadra 1", "Quadra 2", "Quadra 3", "Quadra 4"];

export const ESTIMATE_DISCLAIMER =
  "Horário estimado. Pode sofrer alterações conforme a duração das partidas anteriores.";

/** "10:30" -> minutos */
export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function toClock(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "1h30" / "45 min" */
export function humanDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h${String(rest).padStart(2, "0")}`;
}

/** Relógio de referência do protótipo (arena em operação). */
export const NOW = "11:12";

export const scheduleMatches: ScheduledMatch[] = [
  {
    id: "sm1",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Masculino · Open",
    phase: "Gold · Quartas",
    court: "Quadra 2",
    teamA: "José / Marcos",
    teamB: "Cleber / Zeca",
    playersA: ["José Almeida", "Marcos Vieira"],
    playersB: ["Cleber Dias", "Zeca Prado"],
    status: "LIVE",
    scheduledStartAt: "10:30",
    actualStartAt: "10:30",
    estimatedDurationMin: 45,
    sets: [
      { index: 1, a: 21, b: 15, status: "OFFICIAL" },
      { index: 2, a: 22, b: 24, status: "OFFICIAL" },
      { index: 3, a: 0, b: 0, status: "IN_PROGRESS" },
    ],
  },
  {
    id: "sm2",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Feminino · Open",
    phase: "Gold · Quartas",
    court: "Quadra 1",
    teamA: "Naila / Maria",
    teamB: "Claudia / Brenda",
    playersA: ["Naila Souza", "Maria Prado"],
    playersB: ["Claudia Reis", "Brenda Lima"],
    status: "LIVE",
    scheduledStartAt: "10:30",
    actualStartAt: "10:45",
    estimatedDurationMin: 45,
    sets: [
      { index: 1, a: 13, b: 21, status: "OFFICIAL" },
      { index: 2, a: 0, b: 0, status: "IN_PROGRESS" },
    ],
  },
  {
    id: "sm3",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Misto · Intermediário",
    phase: "Silver · Semifinal",
    court: "Quadra 3",
    teamA: "Mendes / Alves",
    teamB: "Prado / Vidal",
    playersA: ["Rafael Mendes", "Bruna Alves"],
    playersB: ["Tiago Prado", "Julia Vidal"],
    status: "LIVE",
    scheduledStartAt: "10:40",
    actualStartAt: "10:52",
    estimatedDurationMin: 45,
    sets: [{ index: 1, a: 0, b: 0, status: "IN_PROGRESS" }],
  },
  {
    id: "sm4",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Masculino · Open",
    phase: "Pool D · Rodada 3",
    court: "Quadra 4",
    teamA: "Nunes / Lima",
    teamB: "Gomes / Assis",
    playersA: ["Diego Nunes", "Paulo Lima"],
    playersB: ["Ivan Gomes", "Rui Assis"],
    status: "LIVE",
    scheduledStartAt: "10:45",
    actualStartAt: "10:47",
    estimatedDurationMin: 40,
    sets: [
      { index: 1, a: 21, b: 19, status: "OFFICIAL" },
      { index: 2, a: 0, b: 0, status: "IN_PROGRESS" },
    ],
  },
  {
    id: "sm5",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Masculino · Open",
    phase: "Gold · Semifinal",
    court: "Quadra 2",
    teamA: "João / Pedro",
    teamB: "Carlos / Rafael",
    playersA: ["João Bastos", "Pedro Rangel"],
    playersB: ["Carlos Neto", "Rafael Mendes"],
    status: "SCHEDULED",
    scheduledStartAt: "11:30",
    estimatedDurationMin: 45,
    sets: [],
  },
  {
    id: "sm6",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Feminino · Open",
    phase: "Gold · Semifinal",
    court: "Quadra 1",
    teamA: "Ana / Bia",
    teamB: "Luiza / Carla",
    playersA: ["Ana Ferraz", "Bia Moura"],
    playersB: ["Luiza Reis", "Carla Souza"],
    status: "SCHEDULED",
    scheduledStartAt: "11:45",
    estimatedDurationMin: 45,
    sets: [],
  },
  {
    id: "sm7",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Misto · Intermediário",
    phase: "Silver · Final",
    court: "Quadra 3",
    teamA: "Barreto / Cunha",
    teamB: "Xavier / Pires",
    playersA: ["Igor Barreto", "Sofia Cunha"],
    playersB: ["Leo Xavier", "Nina Pires"],
    status: "SCHEDULED",
    scheduledStartAt: "11:50",
    estimatedDurationMin: 45,
    sets: [],
  },
  {
    id: "sm8",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Masculino · Open",
    phase: "Gold · Final",
    court: "Quadra 2",
    teamA: "José / Marcos",
    teamB: "Vencedor SF2",
    playersA: ["José Almeida", "Marcos Vieira"],
    playersB: [],
    status: "SCHEDULED",
    scheduledStartAt: "12:00",
    estimatedDurationMin: 50,
    sets: [],
  },
  {
    id: "sm9",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Feminino · Open",
    phase: "Bronze",
    court: "Quadra 4",
    teamA: "Naila / Maria",
    teamB: "Moura / Teles",
    playersA: ["Naila Souza", "Maria Prado"],
    playersB: ["Rita Moura", "Duda Teles"],
    status: "SCHEDULED",
    scheduledStartAt: "12:15",
    estimatedDurationMin: 40,
    sets: [],
  },
  {
    id: "sm0",
    eventSlug: "copa-areia-curitiba",
    eventName: "Copa Areia Curitiba",
    category: "Masculino · Open",
    phase: "Pool A · Rodada 2",
    court: "Quadra 1",
    teamA: "Farias / Rocha",
    teamB: "Nunes / Lima",
    playersA: ["Caio Farias", "Léo Rocha"],
    playersB: ["Diego Nunes", "Paulo Lima"],
    status: "FINISHED",
    scheduledStartAt: "09:45",
    actualStartAt: "09:52",
    actualEndAt: "10:41",
    estimatedDurationMin: 45,
    sets: [
      { index: 1, a: 18, b: 21, status: "OFFICIAL" },
      { index: 2, a: 21, b: 17, status: "OFFICIAL" },
      { index: 3, a: 12, b: 15, status: "OFFICIAL" },
    ],
  },
];

// ---------- Derivações ----------

export function setsWon(match: ScheduledMatch) {
  let a = 0;
  let b = 0;
  for (const s of match.sets) {
    if (s.status !== "OFFICIAL") continue;
    if (s.a > s.b) a += 1;
    else if (s.b > s.a) b += 1;
  }
  return { a, b };
}

export function currentSet(match: ScheduledMatch) {
  return match.sets.find((s) => s.status === "IN_PROGRESS") ?? null;
}

export function delayMinutes(match: ScheduledMatch) {
  if (!match.actualStartAt) return 0;
  return toMinutes(match.actualStartAt) - toMinutes(match.scheduledStartAt);
}

export function actualDuration(match: ScheduledMatch) {
  if (!match.actualStartAt || !match.actualEndAt) return null;
  return toMinutes(match.actualEndAt) - toMinutes(match.actualStartAt);
}

/** Duração observada média (usa durações reais quando existirem). */
export function observedDuration(court: string) {
  const done = scheduleMatches.filter((m) => m.court === court && actualDuration(m) !== null);
  if (done.length === 0) return null;
  return Math.round(done.reduce((acc, m) => acc + (actualDuration(m) ?? 0), 0) / done.length);
}

/**
 * Estimativa dinâmica por quadra: encadeia a partida em andamento (início real +
 * duração observada/estimada) com os próximos jogos da mesma quadra.
 */
export function estimatedStartMap(now: string = NOW) {
  const map = new Map<string, { estimated: string; delta: number }>();
  const nowMin = toMinutes(now);

  for (const court of COURTS) {
    const live = scheduleMatches.find((m) => m.court === court && m.status === "LIVE");
    const upcoming = scheduleMatches
      .filter((m) => m.court === court && m.status === "SCHEDULED")
      .sort((x, y) => toMinutes(x.scheduledStartAt) - toMinutes(y.scheduledStartAt));

    let cursor = nowMin;
    if (live) {
      const base = live.actualStartAt
        ? toMinutes(live.actualStartAt)
        : toMinutes(live.scheduledStartAt);
      const dur = observedDuration(court) ?? live.estimatedDurationMin;
      cursor = Math.max(nowMin + 5, base + dur);
    }

    for (const m of upcoming) {
      const scheduled = toMinutes(m.scheduledStartAt);
      const estimated = Math.max(scheduled, cursor + 5);
      map.set(m.id, { estimated: toClock(estimated), delta: estimated - scheduled });
      cursor = estimated + (observedDuration(court) ?? m.estimatedDurationMin);
    }
  }

  return map;
}

export function estimateFor(matchId: string, now: string = NOW) {
  return estimatedStartMap(now).get(matchId) ?? null;
}

export function liveMatches() {
  return scheduleMatches
    .filter((m) => m.status === "LIVE")
    .sort((a, b) => a.court.localeCompare(b.court));
}

export function upcomingMatches(limit = 4) {
  return scheduleMatches
    .filter((m) => m.status === "SCHEDULED")
    .sort((a, b) => toMinutes(a.scheduledStartAt) - toMinutes(b.scheduledStartAt))
    .slice(0, limit);
}

export type CourtStatus = {
  court: string;
  live: ScheduledMatch | null;
  delay: number;
  next: ScheduledMatch | null;
  nextEstimated: string | null;
  nextDelta: number;
};

export function courtStatuses(now: string = NOW): CourtStatus[] {
  const est = estimatedStartMap(now);
  return COURTS.map((court) => {
    const live = scheduleMatches.find((m) => m.court === court && m.status === "LIVE") ?? null;
    const next =
      scheduleMatches
        .filter((m) => m.court === court && m.status === "SCHEDULED")
        .sort((a, b) => toMinutes(a.scheduledStartAt) - toMinutes(b.scheduledStartAt))[0] ?? null;
    const e = next ? (est.get(next.id) ?? null) : null;
    return {
      court,
      live,
      delay: live ? delayMinutes(live) : 0,
      next,
      nextEstimated: e?.estimated ?? null,
      nextDelta: e?.delta ?? 0,
    };
  });
}

/** Partidas de um atleta (por nome), ordenadas pelo horário programado. */
export function matchesForPlayer(playerName: string) {
  return scheduleMatches
    .filter((m) => [...m.playersA, ...m.playersB].includes(playerName))
    .sort((a, b) => toMinutes(a.scheduledStartAt) - toMinutes(b.scheduledStartAt));
}

/** Risco de conflito: dois jogos do mesmo atleta com menos de 45 min de folga estimada. */
export function conflictRisks(playerName: string, now: string = NOW) {
  const est = estimatedStartMap(now);
  const list = matchesForPlayer(playerName).filter((m) => m.status !== "FINISHED");
  const risks: { first: ScheduledMatch; second: ScheduledMatch; gap: number }[] = [];
  for (let i = 0; i < list.length - 1; i += 1) {
    const first = list[i]!;
    const second = list[i + 1]!;
    const firstStart = first.actualStartAt
      ? toMinutes(first.actualStartAt)
      : toMinutes(est.get(first.id)?.estimated ?? first.scheduledStartAt);
    const firstEnd = firstStart + (observedDuration(first.court) ?? first.estimatedDurationMin);
    const secondStart = toMinutes(est.get(second.id)?.estimated ?? second.scheduledStartAt);
    const gap = secondStart - firstEnd;
    if (gap < 45) risks.push({ first, second, gap });
  }
  return risks;
}

/** Histórico de correções de resultado (auditoria). */
export type SetCorrection = {
  id: string;
  matchId: string;
  match: string;
  set: number;
  from: string;
  to: string;
  by: string;
  at: string;
  reason: string;
};

export const setCorrections: SetCorrection[] = [
  {
    id: "c1",
    matchId: "sm0",
    match: "Farias / Rocha × Nunes / Lima",
    set: 2,
    from: "21 × 18",
    to: "21 × 17",
    by: "Organizador · Arena Norte",
    at: "10:44",
    reason: "Erro de digitação na súmula.",
  },
];
