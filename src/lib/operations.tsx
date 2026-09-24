/**
 * Central operacional do evento (protótipo).
 * Estado em memória — nenhuma persistência. Preparado para virar API.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type OpsStatus =
  "PENDENTE" | "ATRIBUIDO" | "PRONTO" | "EM_ANDAMENTO" | "FINALIZADO" | "CANCELADO" | "ADIADO";

export const OPS_STATUS_LABEL: Record<OpsStatus, string> = {
  PENDENTE: "Pendente",
  ATRIBUIDO: "Atribuído",
  PRONTO: "Pronto",
  EM_ANDAMENTO: "Em andamento",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  ADIADO: "Adiado",
};

export const OPS_STATUS_TONE: Record<OpsStatus, string> = {
  PENDENTE: "bg-muted text-muted-foreground",
  ATRIBUIDO: "bg-sand text-foreground",
  PRONTO: "bg-graphite text-background",
  EM_ANDAMENTO: "bg-success/15 text-success",
  FINALIZADO: "bg-muted text-foreground",
  CANCELADO: "bg-destructive/15 text-destructive",
  ADIADO: "bg-warning/20 text-foreground",
};

export type OpsSet = { index: number; a: number; b: number };

export type OpsMatch = {
  id: string;
  eventSlug: string;
  phase: string;
  group?: string;
  teamA: string;
  teamB: string;
  /** null = ainda na coluna "Partidas pendentes" */
  court: string | null;
  refereeId: string | null;
  scheduledTime: string;
  startedAt?: string;
  endedAt?: string;
  status: OpsStatus;
  sets: OpsSet[];
};

export type Referee = {
  id: string;
  name: string;
  phone: string;
  invite: "NAO_ENVIADO" | "ENVIADO" | "ACEITO";
  court: string | null;
  rating?: number;
};

export type ScoringRules = {
  win: number;
  loss: number;
  champion: number;
  runnerUp: number;
  third: number;
  participation: number;
};

export type EventOpsConfig = {
  slug: string;
  courts: string[];
  matchDurationMin: number;
  /** melhor de N sets */
  bestOf: 1 | 3 | 5;
  pointsPerSet: number;
  tiebreakPoints: number;
  scoring: ScoringRules;
};

export type PendingRegistration = {
  id: string;
  eventSlug: string;
  captain: string;
  partner: string;
  playerLevel: string;
  eventLevel: string;
  status: "AGUARDANDO_ANALISE" | "APROVADA" | "REPROVADA";
  at: string;
};

export type GuestPlayer = { id: string; name: string; teamId: string | null };

export const DEFAULT_SCORING: ScoringRules = {
  win: 2,
  loss: -1,
  champion: 10,
  runnerUp: 6,
  third: 3,
  participation: 1,
};

export function makeCourts(count: number) {
  return Array.from({ length: Math.max(1, count) }, (_, i) => `Quadra ${i + 1}`);
}

const seedConfig: EventOpsConfig = {
  slug: "copa-areia-curitiba",
  courts: makeCourts(4),
  matchDurationMin: 45,
  bestOf: 3,
  pointsPerSet: 21,
  tiebreakPoints: 15,
  scoring: DEFAULT_SCORING,
};

const seedReferees: Referee[] = [
  {
    id: "r1",
    name: "Marcelo Faria",
    phone: "(41) 99811-2200",
    invite: "ACEITO",
    court: "Quadra 1",
    rating: 4.8,
  },
  {
    id: "r2",
    name: "Patrícia Lemos",
    phone: "(41) 99744-1080",
    invite: "ACEITO",
    court: "Quadra 2",
    rating: 4.9,
  },
  { id: "r3", name: "Ivo Camargo", phone: "(41) 99620-3311", invite: "ENVIADO", court: "Quadra 3" },
  { id: "r4", name: "Sandra Kühn", phone: "(41) 99500-7744", invite: "NAO_ENVIADO", court: null },
];

const seedMatches: OpsMatch[] = [
  {
    id: "op1",
    eventSlug: "copa-areia-curitiba",
    phase: "Pool A · Rodada 3",
    group: "Grupo A",
    teamA: "Mendes / Alves",
    teamB: "Farias / Rocha",
    court: "Quadra 1",
    refereeId: "r1",
    scheduledTime: "09:30",
    startedAt: "09:32",
    endedAt: "10:14",
    status: "FINALIZADO",
    sets: [
      { index: 1, a: 21, b: 18 },
      { index: 2, a: 21, b: 16 },
    ],
  },
  {
    id: "op2",
    eventSlug: "copa-areia-curitiba",
    phase: "Pool B · Rodada 3",
    group: "Grupo B",
    teamA: "Nunes / Lima",
    teamB: "Barreto / Cunha",
    court: "Quadra 2",
    refereeId: "r2",
    scheduledTime: "09:30",
    startedAt: "09:35",
    endedAt: "10:20",
    status: "FINALIZADO",
    sets: [
      { index: 1, a: 19, b: 21 },
      { index: 2, a: 21, b: 17 },
      { index: 3, a: 15, b: 12 },
    ],
  },
  {
    id: "op3",
    eventSlug: "copa-areia-curitiba",
    phase: "Gold · Quartas",
    teamA: "Prado / Vidal",
    teamB: "Gomes / Assis",
    court: "Quadra 1",
    refereeId: "r1",
    scheduledTime: "10:30",
    startedAt: "10:34",
    status: "EM_ANDAMENTO",
    sets: [{ index: 1, a: 21, b: 15 }],
  },
  {
    id: "op4",
    eventSlug: "copa-areia-curitiba",
    phase: "Gold · Quartas",
    teamA: "Moura / Teles",
    teamB: "Xavier / Pires",
    court: "Quadra 2",
    refereeId: "r2",
    scheduledTime: "10:30",
    status: "PRONTO",
    sets: [],
  },
  {
    id: "op5",
    eventSlug: "copa-areia-curitiba",
    phase: "Gold · Quartas",
    teamA: "Mendes / Alves",
    teamB: "Nunes / Lima",
    court: "Quadra 3",
    refereeId: null,
    scheduledTime: "11:10",
    status: "ATRIBUIDO",
    sets: [],
  },
  {
    id: "op6",
    eventSlug: "copa-areia-curitiba",
    phase: "Silver · Semifinal",
    teamA: "Farias / Rocha",
    teamB: "Barreto / Cunha",
    court: null,
    refereeId: null,
    scheduledTime: "11:10",
    status: "PENDENTE",
    sets: [],
  },
  {
    id: "op7",
    eventSlug: "copa-areia-curitiba",
    phase: "Silver · Semifinal",
    teamA: "Gomes / Assis",
    teamB: "Moura / Teles",
    court: null,
    refereeId: null,
    scheduledTime: "11:50",
    status: "PENDENTE",
    sets: [],
  },
  {
    id: "op8",
    eventSlug: "copa-areia-curitiba",
    phase: "Gold · Semifinal",
    teamA: "A definir",
    teamB: "A definir",
    court: null,
    refereeId: null,
    scheduledTime: "12:30",
    status: "PENDENTE",
    sets: [],
  },
];

const seedPending: PendingRegistration[] = [
  {
    id: "pr1",
    eventSlug: "copa-areia-curitiba",
    captain: "João Silva",
    partner: "Rafael Lima",
    playerLevel: "Open",
    eventLevel: "Intermediário",
    status: "AGUARDANDO_ANALISE",
    at: "hoje, 08:12",
  },
  {
    id: "pr2",
    eventSlug: "copa-areia-curitiba",
    captain: "Carla Souza",
    partner: "Bruna Alves",
    playerLevel: "Open",
    eventLevel: "Intermediário",
    status: "AGUARDANDO_ANALISE",
    at: "ontem, 21:40",
  },
];

export function nowClock() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function opsSetsWon(m: OpsMatch) {
  let a = 0;
  let b = 0;
  for (const s of m.sets) {
    if (s.a > s.b) a += 1;
    else if (s.b > s.a) b += 1;
  }
  return { a, b };
}

export function opsWinner(m: OpsMatch): "A" | "B" | null {
  if (m.status !== "FINALIZADO") return null;
  const { a, b } = opsSetsWon(m);
  if (a === b) return null;
  return a > b ? "A" : "B";
}

export type StandingRow = {
  team: string;
  games: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  points: number;
};

export function buildStandings(matches: OpsMatch[], scoring: ScoringRules): StandingRow[] {
  const map = new Map<string, StandingRow>();
  const row = (team: string) => {
    if (!map.has(team))
      map.set(team, { team, games: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, points: 0 });
    return map.get(team)!;
  };
  for (const m of matches) {
    if (m.status !== "FINALIZADO" || m.teamA === "A definir" || m.teamB === "A definir") continue;
    const { a, b } = opsSetsWon(m);
    const ra = row(m.teamA);
    const rb = row(m.teamB);
    ra.games += 1;
    rb.games += 1;
    ra.setsWon += a;
    ra.setsLost += b;
    rb.setsWon += b;
    rb.setsLost += a;
    if (a > b) {
      ra.wins += 1;
      rb.losses += 1;
      ra.points += scoring.win;
      rb.points += scoring.loss;
    } else if (b > a) {
      rb.wins += 1;
      ra.losses += 1;
      rb.points += scoring.win;
      ra.points += scoring.loss;
    }
  }
  return [...map.values()].sort(
    (x, y) =>
      y.points - x.points || y.wins - x.wins || y.setsWon - y.setsLost - (x.setsWon - x.setsLost),
  );
}

type OperationsValue = {
  config: EventOpsConfig;
  matches: OpsMatch[];
  referees: Referee[];
  pending: PendingRegistration[];
  guests: GuestPlayer[];
  matchesFor: (slug: string) => OpsMatch[];
  pendingFor: (slug: string) => PendingRegistration[];
  refereeById: (id: string | null) => Referee | undefined;
  setConfig: (patch: Partial<EventOpsConfig>) => void;
  setCourtCount: (count: number) => void;
  assignCourt: (matchId: string, court: string | null) => void;
  assignReferee: (matchId: string, refereeId: string | null) => void;
  startMatch: (matchId: string) => void;
  finishMatch: (matchId: string, sets: OpsSet[]) => void;
  setMatchStatus: (matchId: string, status: OpsStatus) => void;
  renameTeam: (matchId: string, side: "A" | "B", name: string) => void;
  addReferee: (name: string, phone: string) => Referee;
  inviteReferee: (id: string) => void;
  setRefereeCourt: (id: string, court: string | null) => void;
  reviewRegistration: (id: string, status: "APROVADA" | "REPROVADA") => void;
  addGuest: (name: string) => void;
};

const OperationsContext = createContext<OperationsValue | null>(null);

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<EventOpsConfig>(seedConfig);
  const [matches, setMatches] = useState<OpsMatch[]>(seedMatches);
  const [referees, setReferees] = useState<Referee[]>(seedReferees);
  const [pending, setPending] = useState<PendingRegistration[]>(seedPending);
  const [guests, setGuests] = useState<GuestPlayer[]>([]);

  const patchMatch = useCallback((id: string, patch: (m: OpsMatch) => OpsMatch) => {
    setMatches((prev) => prev.map((m) => (m.id === id ? patch(m) : m)));
  }, []);

  const value = useMemo<OperationsValue>(
    () => ({
      config,
      matches,
      referees,
      pending,
      guests,
      matchesFor: (slug) => matches.filter((m) => m.eventSlug === slug),
      pendingFor: (slug) => pending.filter((p) => p.eventSlug === slug),
      refereeById: (id) => referees.find((r) => r.id === id),
      setConfig: (patch) => setConfigState((c) => ({ ...c, ...patch })),
      setCourtCount: (count) => {
        const courts = makeCourts(count);
        setConfigState((c) => ({ ...c, courts }));
        setMatches((prev) =>
          prev.map((m) =>
            m.court && !courts.includes(m.court) ? { ...m, court: null, status: "PENDENTE" } : m,
          ),
        );
      },
      assignCourt: (matchId, court) =>
        patchMatch(matchId, (m) => ({
          ...m,
          court,
          status:
            m.status === "EM_ANDAMENTO" || m.status === "FINALIZADO"
              ? m.status
              : court
                ? m.refereeId
                  ? "PRONTO"
                  : "ATRIBUIDO"
                : "PENDENTE",
        })),
      assignReferee: (matchId, refereeId) =>
        patchMatch(matchId, (m) => ({
          ...m,
          refereeId,
          status:
            m.status === "EM_ANDAMENTO" || m.status === "FINALIZADO"
              ? m.status
              : m.court && refereeId
                ? "PRONTO"
                : m.court
                  ? "ATRIBUIDO"
                  : "PENDENTE",
        })),
      startMatch: (matchId) =>
        patchMatch(matchId, (m) => ({
          ...m,
          status: "EM_ANDAMENTO",
          startedAt: m.startedAt ?? nowClock(),
        })),
      finishMatch: (matchId, sets) =>
        patchMatch(matchId, (m) => ({
          ...m,
          sets: sets.filter((s) => s.a > 0 || s.b > 0),
          status: "FINALIZADO",
          startedAt: m.startedAt ?? nowClock(),
          endedAt: nowClock(),
        })),
      setMatchStatus: (matchId, status) => patchMatch(matchId, (m) => ({ ...m, status })),
      renameTeam: (matchId, side, name) =>
        patchMatch(matchId, (m) => (side === "A" ? { ...m, teamA: name } : { ...m, teamB: name })),
      addReferee: (name, phone) => {
        const ref: Referee = {
          id: `r${Date.now()}`,
          name,
          phone,
          invite: "NAO_ENVIADO",
          court: null,
        };
        setReferees((prev) => [...prev, ref]);
        return ref;
      },
      inviteReferee: (id) =>
        setReferees((prev) => prev.map((r) => (r.id === id ? { ...r, invite: "ENVIADO" } : r))),
      setRefereeCourt: (id, court) =>
        setReferees((prev) => prev.map((r) => (r.id === id ? { ...r, court } : r))),
      reviewRegistration: (id, status) =>
        setPending((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p))),
      addGuest: (name) =>
        setGuests((prev) => [...prev, { id: `g${Date.now()}`, name, teamId: null }]),
    }),
    [config, matches, referees, pending, guests, patchMatch],
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const ctx = useContext(OperationsContext);
  if (!ctx) throw new Error("useOperations precisa estar dentro de OperationsProvider");
  return ctx;
}

/** Link de convite fictício do juiz. */
export function refereeInviteLink(ref: Referee) {
  return `beachub.com/juiz?convite=${ref.id}`;
}
