/**
 * Dados fictícios do protótipo BeacHub.
 * Nenhuma persistência: apenas para navegação e validação de UX.
 */

/**
 * `"Livre"` e `"A+B"` são categorias de **evento**, não nível de pessoa —
 * seguem no mesmo union porque a tela usa o mesmo rótulo nos dois contextos.
 * `"A+B"` entrou com o aditivo §15 (OPEN-QUESTIONS Q11).
 */
export type SkillLevel = "Iniciante" | "Intermediário" | "Avançado" | "Open" | "A+B" | "Livre";
export type Category = "Masculino" | "Feminino" | "Misto" | "Open";
export type EventStatus =
  | "RASCUNHO"
  | "PUBLICADO"
  | "INSCRICOES_ABERTAS"
  | "INSCRICOES_ENCERRADAS"
  | "AGUARDANDO_SORTEIO"
  | "CHAVE_PUBLICADA"
  | "EM_ANDAMENTO"
  | "FINALIZADO"
  | "CANCELADO";

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
  INSCRICOES_ABERTAS: "Inscrições abertas",
  INSCRICOES_ENCERRADAS: "Inscrições encerradas",
  AGUARDANDO_SORTEIO: "Aguardando sorteio",
  CHAVE_PUBLICADA: "Chave publicada",
  EM_ANDAMENTO: "Em andamento",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export type Player = {
  id: string;
  name: string;
  initials: string;
  city: string;
  state: string;
  gender: "M" | "F";
  level: SkillLevel;
  rankPosition: number;
  performancePoints: number;
  reputation: number;
  validReviews: number;
  totalReviews: number;
  events: number;
  wins: number;
  losses: number;
  podiums: number;
  bio?: string;
};

export const players: Player[] = [
  {
    id: "ana-ribeiro",
    name: "Ana Ribeiro",
    initials: "AR",
    city: "Florianópolis",
    state: "SC",
    gender: "F",
    level: "Avançado",
    rankPosition: 3,
    performancePoints: 186,
    reputation: 4.8,
    validReviews: 34,
    totalReviews: 47,
    events: 12,
    wins: 41,
    losses: 17,
    podiums: 6,
    bio: "Defensora. Jogo desde 2016 na Praia Mole. Prefiro torneios de manhã.",
  },
  {
    id: "joao-mendes",
    name: "João Mendes",
    initials: "JM",
    city: "Curitiba",
    state: "PR",
    gender: "M",
    level: "Avançado",
    rankPosition: 1,
    performancePoints: 241,
    reputation: 4.6,
    validReviews: 28,
    totalReviews: 31,
    events: 15,
    wins: 52,
    losses: 19,
    podiums: 9,
    bio: "Bloqueador. Disponível fins de semana.",
  },
  {
    id: "pedro-alves",
    name: "Pedro Alves",
    initials: "PA",
    city: "Curitiba",
    state: "PR",
    gender: "M",
    level: "Intermediário",
    rankPosition: 12,
    performancePoints: 118,
    reputation: 5.0,
    validReviews: 2,
    totalReviews: 5,
    events: 6,
    wins: 18,
    losses: 14,
    podiums: 1,
  },
  {
    id: "carla-souza",
    name: "Carla Souza",
    initials: "CS",
    city: "Santos",
    state: "SP",
    gender: "F",
    level: "Open",
    rankPosition: 2,
    performancePoints: 212,
    reputation: 4.9,
    validReviews: 41,
    totalReviews: 44,
    events: 14,
    wins: 49,
    losses: 15,
    podiums: 8,
  },
  {
    id: "rafael-lima",
    name: "Rafael Lima",
    initials: "RL",
    city: "Recife",
    state: "PE",
    gender: "M",
    level: "Intermediário",
    rankPosition: 8,
    performancePoints: 134,
    reputation: 4.2,
    validReviews: 11,
    totalReviews: 19,
    events: 9,
    wins: 24,
    losses: 21,
    podiums: 2,
  },
  {
    id: "bruna-castro",
    name: "Bruna Castro",
    initials: "BC",
    city: "Florianópolis",
    state: "SC",
    gender: "F",
    level: "Intermediário",
    rankPosition: 17,
    performancePoints: 96,
    reputation: 4.7,
    validReviews: 9,
    totalReviews: 12,
    events: 7,
    wins: 16,
    losses: 18,
    podiums: 1,
  },
  {
    id: "diego-nunes",
    name: "Diego Nunes",
    initials: "DN",
    city: "Natal",
    state: "RN",
    gender: "M",
    level: "Avançado",
    rankPosition: 5,
    performancePoints: 163,
    reputation: 4.4,
    validReviews: 22,
    totalReviews: 26,
    events: 11,
    wins: 35,
    losses: 20,
    podiums: 4,
  },
  {
    id: "marina-dias",
    name: "Marina Dias",
    initials: "MD",
    city: "Vitória",
    state: "ES",
    gender: "F",
    level: "Iniciante",
    rankPosition: 44,
    performancePoints: 22,
    reputation: 4.5,
    validReviews: 0,
    totalReviews: 3,
    events: 2,
    wins: 3,
    losses: 7,
    podiums: 0,
  },
];

export const currentPlayer = players[0]!;

export function getPlayer(id: string) {
  return players.find((p) => p.id === id);
}

export type EventItem = {
  id: string;
  slug: string;
  name: string;
  organizer: string;
  city: string;
  state: string;
  venue: string;
  date: string;
  dateLabel: string;
  format: string;
  modality: string;
  category: Category;
  level: SkillLevel;
  status: EventStatus;
  eventType: "COMPETITIVO" | "SOCIAL" | "RANKING" | "AMISTOSO" | "LIGA" | "ESPECIAL";
  fee: string;
  prize: string;
  teamsRegistered: number;
  /** `null` = sem teto de duplas — o formulário tem "Sem máximo de equipes". */
  maxTeams: number | null;
  courts: number;
  registrationClose: string;
  rules: string[];
};

export const events: EventItem[] = [
  {
    id: "e1",
    slug: "copa-areia-curitiba",
    name: "Copa Areia Curitiba",
    organizer: "Arena Norte Beach",
    city: "Curitiba",
    state: "PR",
    venue: "Arena Norte Beach",
    date: "2026-08-22",
    dateLabel: "22 ago · sáb · 08h30",
    format: "Pool Play + Gold/Silver",
    modality: "2x2",
    category: "Masculino",
    level: "Avançado",
    status: "EM_ANDAMENTO",
    eventType: "RANKING",
    fee: "R$ 120 / dupla",
    prize: "R$ 3.000 + troféus",
    teamsRegistered: 16,
    maxTeams: 16,
    courts: 4,
    registrationClose: "18 ago, 23h59",
    rules: [
      "Melhor de 3 sets — sets 1 e 2 até 21, terceiro set até 15, diferença mínima de 2 pontos.",
      "Fase de grupos: set único até 21 com diferença de 2.",
      "Troca de lado a cada 7 pontos (5 no tie-break).",
      "Tolerância de 10 minutos por partida; após isso, W.O.",
    ],
  },
  {
    id: "e2",
    slug: "beach-open-floripa",
    name: "Beach Open Floripa",
    organizer: "Praia Mole Sports",
    city: "Florianópolis",
    state: "SC",
    venue: "Praia Mole",
    date: "2026-09-05",
    dateLabel: "05 set · sáb · 09h00",
    format: "Single Elimination",
    modality: "2x2",
    category: "Feminino",
    level: "Open",
    status: "INSCRICOES_ABERTAS",
    eventType: "COMPETITIVO",
    fee: "R$ 90 / dupla",
    prize: "R$ 2.000",
    teamsRegistered: 11,
    maxTeams: 16,
    courts: 3,
    registrationClose: "02 set, 20h00",
    rules: [
      "Chave de 16 com BYES automáticos para duplas cabeças de chave.",
      "Melhor de 3 sets a partir das quartas de final.",
      "Fases iniciais em set único até 21.",
    ],
  },
  {
    id: "e3",
    slug: "americano-de-verao-santos",
    name: "Americano de Verão",
    organizer: "Santos Beach Club",
    city: "Santos",
    state: "SP",
    venue: "Quadras da Ponta da Praia",
    date: "2026-09-12",
    dateLabel: "12 set · sáb · 15h00",
    format: "Americano",
    modality: "2x2 rotativo",
    category: "Misto",
    level: "Livre",
    status: "INSCRICOES_ABERTAS",
    eventType: "SOCIAL",
    fee: "R$ 45 / jogador",
    prize: "Kit + medalhas",
    teamsRegistered: 18,
    maxTeams: 24,
    courts: 3,
    registrationClose: "10 set, 18h00",
    rules: [
      "Inscrição individual — parceiros mudam a cada rodada.",
      "Pontuação individual acumulada.",
      "Partidas de 12 minutos corridos.",
    ],
  },
  {
    id: "e4",
    slug: "king-of-the-court-natal",
    name: "King of the Court Natal",
    organizer: "Duna Beach Arena",
    city: "Natal",
    state: "RN",
    venue: "Duna Beach Arena",
    date: "2026-09-19",
    dateLabel: "19 set · sáb · 16h00",
    format: "King of the Court",
    modality: "2x2",
    category: "Open",
    level: "Avançado",
    status: "AGUARDANDO_SORTEIO",
    eventType: "ESPECIAL",
    fee: "R$ 60 / jogador",
    prize: "R$ 1.500",
    teamsRegistered: 10,
    maxTeams: 10,
    courts: 1,
    registrationClose: "17 set, 12h00",
    rules: [
      "Lado vencedor e lado desafiante — apenas o lado vencedor pontua.",
      "Rodadas de 5 minutos.",
      "Ranking individual por pontos acumulados.",
    ],
  },
  {
    id: "e5",
    slug: "circuito-litoral-etapa-3",
    name: "Circuito Litoral — Etapa 3",
    organizer: "Federação Litoral",
    city: "Recife",
    state: "PE",
    venue: "Arena Boa Viagem",
    date: "2026-07-18",
    dateLabel: "18 jul · sáb",
    format: "Pool Play + Single Elimination",
    modality: "2x2",
    category: "Masculino",
    level: "Open",
    status: "FINALIZADO",
    eventType: "LIGA",
    fee: "R$ 140 / dupla",
    prize: "R$ 5.000",
    teamsRegistered: 24,
    maxTeams: 24,
    courts: 6,
    registrationClose: "15 jul",
    rules: ["Regulamento oficial do Circuito Litoral 2026, versão 2.1."],
  },
  {
    id: "e6",
    slug: "blind-draw-vitoria",
    name: "Blind Draw Vitória",
    organizer: "Camburi Beach",
    city: "Vitória",
    state: "ES",
    venue: "Praia de Camburi",
    date: "2026-09-27",
    dateLabel: "27 set · dom · 08h00",
    format: "Blind Draw",
    modality: "2x2",
    category: "Misto",
    level: "Iniciante",
    status: "INSCRICOES_ABERTAS",
    eventType: "SOCIAL",
    fee: "R$ 35 / jogador",
    prize: "Medalhas",
    teamsRegistered: 14,
    maxTeams: 20,
    courts: 2,
    registrationClose: "25 set",
    rules: ["Sorteio balanceado por nível. Parceiro definido no momento do sorteio."],
  },
];

export function getEvent(slug: string) {
  return events.find((e) => e.slug === slug);
}

export type Team = { id: string; name: string; seed: number; a: string; b: string };

export const teams: Team[] = [
  { id: "t1", name: "Mendes / Alves", seed: 1, a: "João Mendes", b: "Pedro Alves" },
  { id: "t2", name: "Nunes / Lima", seed: 2, a: "Diego Nunes", b: "Rafael Lima" },
  { id: "t3", name: "Barreto / Cunha", seed: 3, a: "Igor Barreto", b: "Tales Cunha" },
  { id: "t4", name: "Prado / Vidal", seed: 4, a: "Léo Prado", b: "Caio Vidal" },
  { id: "t5", name: "Farias / Rocha", seed: 5, a: "Alan Farias", b: "Vitor Rocha" },
  { id: "t6", name: "Moura / Teles", seed: 6, a: "Bruno Moura", b: "Jonas Teles" },
  { id: "t7", name: "Gomes / Assis", seed: 7, a: "Ivan Gomes", b: "Davi Assis" },
  { id: "t8", name: "Xavier / Pires", seed: 8, a: "Rui Xavier", b: "Nei Pires" },
];

export type PoolStanding = {
  team: string;
  j: number;
  v: number;
  d: number;
  setsWon: number;
  setsLost: number;
  pointsFor: number;
  pointsAgainst: number;
  classificationPoints: number;
};

export const pools: { name: string; standings: PoolStanding[] }[] = [
  {
    name: "Pool A",
    standings: [
      { team: "Mendes / Alves", j: 3, v: 3, d: 0, setsWon: 6, setsLost: 1, pointsFor: 128, pointsAgainst: 94, classificationPoints: 9 },
      { team: "Farias / Rocha", j: 3, v: 2, d: 1, setsWon: 4, setsLost: 3, pointsFor: 118, pointsAgainst: 110, classificationPoints: 6 },
      { team: "Gomes / Assis", j: 3, v: 1, d: 2, setsWon: 3, setsLost: 4, pointsFor: 109, pointsAgainst: 117, classificationPoints: 3 },
      { team: "Xavier / Pires", j: 3, v: 0, d: 3, setsWon: 1, setsLost: 6, pointsFor: 88, pointsAgainst: 122, classificationPoints: 0 },
    ],
  },
  {
    name: "Pool B",
    standings: [
      { team: "Nunes / Lima", j: 3, v: 3, d: 0, setsWon: 6, setsLost: 2, pointsFor: 131, pointsAgainst: 101, classificationPoints: 9 },
      { team: "Barreto / Cunha", j: 3, v: 2, d: 1, setsWon: 5, setsLost: 3, pointsFor: 124, pointsAgainst: 112, classificationPoints: 6 },
      { team: "Prado / Vidal", j: 3, v: 1, d: 2, setsWon: 2, setsLost: 5, pointsFor: 101, pointsAgainst: 121, classificationPoints: 3 },
      { team: "Moura / Teles", j: 3, v: 0, d: 3, setsWon: 1, setsLost: 6, pointsFor: 92, pointsAgainst: 126, classificationPoints: 0 },
    ],
  },
];

export type Match = {
  id: string;
  court: string;
  time: string;
  phase: string;
  teamA: string;
  teamB: string;
  sets: [number, number][];
  status: "SCHEDULED" | "IN_PROGRESS" | "FINISHED";
  winner?: "A" | "B";
};

export const matches: Match[] = [
  {
    id: "m1",
    court: "Quadra 1",
    time: "09:30",
    phase: "Pool A · Rodada 3",
    teamA: "Mendes / Alves",
    teamB: "Farias / Rocha",
    sets: [
      [21, 18],
      [21, 16],
    ],
    status: "FINISHED",
    winner: "A",
  },
  {
    id: "m2",
    court: "Quadra 2",
    time: "09:30",
    phase: "Pool B · Rodada 3",
    teamA: "Nunes / Lima",
    teamB: "Barreto / Cunha",
    sets: [
      [19, 21],
      [21, 17],
      [15, 12],
    ],
    status: "FINISHED",
    winner: "A",
  },
  {
    id: "m3",
    court: "Quadra 1",
    time: "10:15",
    phase: "Gold · Quartas",
    teamA: "Mendes / Alves",
    teamB: "Prado / Vidal",
    sets: [[18, 14]],
    status: "IN_PROGRESS",
  },
  {
    id: "m4",
    court: "Quadra 3",
    time: "10:15",
    phase: "Gold · Quartas",
    teamA: "Nunes / Lima",
    teamB: "Gomes / Assis",
    sets: [],
    status: "SCHEDULED",
  },
  {
    id: "m5",
    court: "Quadra 2",
    time: "11:00",
    phase: "Silver · Semifinal",
    teamA: "Xavier / Pires",
    teamB: "Moura / Teles",
    sets: [],
    status: "SCHEDULED",
  },
  {
    id: "m6",
    court: "Quadra 4",
    time: "11:45",
    phase: "Gold · Semifinal",
    teamA: "Vencedor QF1",
    teamB: "Vencedor QF2",
    sets: [],
    status: "SCHEDULED",
  },
];

export type BracketMatch = { a: string; b: string; scoreA?: number; scoreB?: number; winner?: "a" | "b" };

export const goldBracket: { round: string; matches: BracketMatch[] }[] = [
  {
    round: "Quartas",
    matches: [
      { a: "Mendes / Alves", b: "Prado / Vidal", scoreA: 2, scoreB: 0, winner: "a" },
      { a: "Barreto / Cunha", b: "Gomes / Assis", scoreA: 1, scoreB: 2, winner: "b" },
      { a: "Nunes / Lima", b: "Farias / Rocha", scoreA: 2, scoreB: 1, winner: "a" },
      { a: "Xavier / Pires", b: "Moura / Teles", scoreA: 0, scoreB: 2, winner: "b" },
    ],
  },
  {
    round: "Semifinais",
    matches: [
      { a: "Mendes / Alves", b: "Gomes / Assis", scoreA: 2, scoreB: 0, winner: "a" },
      { a: "Nunes / Lima", b: "Moura / Teles" },
    ],
  },
  {
    round: "Final",
    matches: [{ a: "Mendes / Alves", b: "A definir" }],
  },
];

export type PointTransaction = {
  id: string;
  type: "MATCH_WIN" | "MATCH_LOSS" | "FINAL_RUNNER_UP" | "CHAMPION" | "OTHER";
  points: number;
  description: string;
  event: string;
  date: string;
};

export const pointTransactions: PointTransaction[] = [
  { id: "p1", type: "MATCH_WIN", points: 2, description: "Vitória — Pool A", event: "Copa Areia Curitiba", date: "22 ago" },
  { id: "p2", type: "MATCH_WIN", points: 2, description: "Vitória — Pool A", event: "Copa Areia Curitiba", date: "22 ago" },
  { id: "p3", type: "MATCH_LOSS", points: -1, description: "Derrota — Pool A", event: "Copa Areia Curitiba", date: "22 ago" },
  { id: "p4", type: "MATCH_WIN", points: 2, description: "Vitória — Quartas", event: "Copa Areia Curitiba", date: "22 ago" },
  { id: "p5", type: "MATCH_WIN", points: 2, description: "Vitória — Semifinal", event: "Copa Areia Curitiba", date: "22 ago" },
  { id: "p6", type: "FINAL_RUNNER_UP", points: 0, description: "Derrota na final — vice não sofre desconto", event: "Copa Areia Curitiba", date: "22 ago" },
  { id: "p7", type: "OTHER", points: 1, description: "Bônus de colocação — Vice-campeã", event: "Copa Areia Curitiba", date: "22 ago" },
];

export type HistoryRow = {
  event: string;
  slug: string;
  date: string;
  partner: string;
  format: string;
  matches: number;
  wins: number;
  losses: number;
  position: string;
  points: number;
};

export const performanceHistory: HistoryRow[] = [
  { event: "Copa Areia Curitiba", slug: "copa-areia-curitiba", date: "22 ago 2026", partner: "Bruna Castro", format: "Pool + Gold/Silver", matches: 6, wins: 4, losses: 2, position: "🥈 Vice", points: 8 },
  { event: "Circuito Litoral — Etapa 3", slug: "circuito-litoral-etapa-3", date: "18 jul 2026", partner: "Carla Souza", format: "Pool + Elim.", matches: 5, wins: 4, losses: 1, position: "🥇 Campeã", points: 11 },
  { event: "Beach Open Floripa", slug: "beach-open-floripa", date: "14 jun 2026", partner: "Bruna Castro", format: "Single Elim.", matches: 3, wins: 2, losses: 1, position: "Semifinal", points: 3 },
];

export type Review = {
  id: string;
  reviewer: string;
  initials: string;
  event: string;
  rating: number;
  valid: boolean;
  comment: string;
  criteria: { technical: number; sportsmanship: number; teamwork: number; commitment: number };
};

export const reviews: Review[] = [
  {
    id: "r1",
    reviewer: "Carla Souza",
    initials: "CS",
    event: "Circuito Litoral — Etapa 3",
    rating: 5,
    valid: true,
    comment: "Parceira excelente, comunicação constante e muito consistente no passe.",
    criteria: { technical: 5, sportsmanship: 5, teamwork: 5, commitment: 5 },
  },
  {
    id: "r2",
    reviewer: "Diego Nunes",
    initials: "DN",
    event: "Copa Areia Curitiba",
    rating: 5,
    valid: true,
    comment: "Adversária durríssima e muito correta em quadra.",
    criteria: { technical: 5, sportsmanship: 5, teamwork: 4, commitment: 5 },
  },
  {
    id: "r3",
    reviewer: "Marina Dias",
    initials: "MD",
    event: "Blind Draw Vitória",
    rating: 4,
    valid: false,
    comment: "Muito atenciosa com quem está começando.",
    criteria: { technical: 4, sportsmanship: 5, teamwork: 4, commitment: 4 },
  },
];

export type Venue = {
  id: string;
  name: string;
  city: string;
  state: string;
  courts: number;
  structure: string[];
  upcoming: number;
};

export const venues: Venue[] = [
  { id: "v1", name: "Arena Norte Beach", city: "Curitiba", state: "PR", courts: 6, structure: ["Coberta", "Iluminação", "Vestiário", "Bar"], upcoming: 3 },
  { id: "v2", name: "Praia Mole Sports", city: "Florianópolis", state: "SC", courts: 4, structure: ["Areia natural", "Chuveiro", "Estacionamento"], upcoming: 2 },
  { id: "v3", name: "Duna Beach Arena", city: "Natal", state: "RN", courts: 3, structure: ["Iluminação", "Arquibancada", "Bar"], upcoming: 1 },
  { id: "v4", name: "Arena Boa Viagem", city: "Recife", state: "PE", courts: 8, structure: ["Coberta", "Iluminação", "Fisioterapia"], upcoming: 4 },
];

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
};

export const notifications: Notification[] = [
  { id: "n1", type: "MATCH_STARTING", title: "Sua partida começa em 15 min", body: "Quadra 1 · Gold · Quartas · vs Prado / Vidal", time: "agora" },
  { id: "n2", type: "BRACKET_PUBLISHED", title: "Chave publicada", body: "Copa Areia Curitiba — Gold e Silver disponíveis", time: "1 h" },
  { id: "n3", type: "REVIEW_AVAILABLE", title: "Avaliações liberadas", body: "Circuito Litoral — Etapa 3 foi finalizado", time: "ontem" },
];

export const formatRecommendations = [
  {
    medal: "🥇",
    name: "Pool Play + Gold/Silver",
    why: "Garante no mínimo 4 jogos por dupla e mantém todos jogando após a fase de grupos.",
    matches: 38,
    duration: "6h40",
    fits: true,
  },
  {
    medal: "🥈",
    name: "Modified Pool Play + Single Elimination",
    why: "Menos partidas na fase inicial, elimina antes e libera as quadras mais cedo.",
    matches: 30,
    duration: "5h20",
    fits: true,
  },
  {
    medal: "🥉",
    name: "Double Elimination",
    why: "Duas chances por dupla, mas exige janela maior que a informada.",
    matches: 31,
    duration: "9h20",
    fits: false,
  },
];
