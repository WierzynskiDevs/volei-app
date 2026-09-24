/**
 * Dados fictícios de governança: arenas parceiras, publicidade,
 * denúncias, feedbacks de evento e auditoria.
 */

export type PartnerVenue = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  site: string;
  courts: number;
  sand: string;
  covered: boolean;
  lighting: boolean;
  lockers: boolean;
  parking: boolean;
  structure: string[];
  description: string;
  partner: true;
  since: string;
};

export const partnerVenues: PartnerVenue[] = [
  {
    id: "pv1",
    name: "Arena Norte Beach",
    city: "Curitiba",
    state: "PR",
    address: "Av. das Torres, 1420",
    phone: "+55 41 3232-9090",
    whatsapp: "+55 41 99632-9090",
    email: "contato@arenanorte.com.br",
    site: "arenanorte.com.br",
    courts: 6,
    sand: "Areia fina peneirada",
    covered: true,
    lighting: true,
    lockers: true,
    parking: true,
    structure: ["Coberta", "Iluminação", "Vestiário", "Bar", "Arquibancada"],
    description: "Complexo coberto com 6 quadras oficiais, referência no circuito paranaense.",
    partner: true,
    since: "11/2024",
  },
  {
    id: "pv2",
    name: "Praia Mole Sports",
    city: "Florianópolis",
    state: "SC",
    address: "Rod. SC-406, km 12",
    phone: "+55 48 3232-1177",
    whatsapp: "+55 48 99811-1177",
    email: "praiamole@sports.com",
    site: "praiamolesports.com",
    courts: 4,
    sand: "Areia natural de praia",
    covered: false,
    lighting: true,
    lockers: true,
    parking: true,
    structure: ["Areia natural", "Iluminação", "Chuveiro", "Estacionamento"],
    description: "Quadras à beira-mar com estrutura completa para etapas de circuito.",
    partner: true,
    since: "02/2025",
  },
  {
    id: "pv3",
    name: "Duna Beach Arena",
    city: "Natal",
    state: "RN",
    address: "Av. Eng. Roberto Freire, 3000",
    phone: "+55 84 3222-4455",
    whatsapp: "+55 84 99622-4455",
    email: "duna@beacharena.com",
    site: "dunabeacharena.com",
    courts: 3,
    sand: "Areia fina",
    covered: false,
    lighting: true,
    lockers: false,
    parking: true,
    structure: ["Iluminação", "Arquibancada", "Bar"],
    description: "Arena litorânea com arquibancada e transmissão para etapas noturnas.",
    partner: true,
    since: "06/2025",
  },
];

export const AD_POSITIONS = [
  "HOME_TOP",
  "HOME_MIDDLE",
  "EVENT_TOP",
  "EVENT_BOTTOM",
  "RANKING",
  "PLAYER_PROFILE",
  "VENUE",
  "DASHBOARD",
  "MATCH",
  "SCOREBOARD",
] as const;

export type AdPosition = (typeof AD_POSITIONS)[number];
export type AdStatus = "ATIVA" | "PAUSADA" | "AGENDADA" | "ENCERRADA";

export type AdCampaign = {
  id: string;
  advertiser: string;
  campaign: string;
  segment: string;
  tagline: string;
  url: string;
  start: string;
  end: string;
  status: AdStatus;
  priority: 1 | 2 | 3;
  positions: AdPosition[];
  impressions: number;
  clicks: number;
  hasDesktopArt: boolean;
  hasMobileArt: boolean;
};

export const adCampaigns: AdCampaign[] = [
  {
    id: "ad1",
    advertiser: "Beach Pro",
    campaign: "Beach Pro — Agosto 2026",
    segment: "Material esportivo",
    tagline: "Bolas oficiais e redes profissionais",
    url: "https://beachpro.exemplo.com",
    start: "01/08/2026",
    end: "31/08/2026",
    status: "ATIVA",
    priority: 1,
    positions: ["HOME_TOP", "EVENT_TOP"],
    impressions: 184320,
    clicks: 3241,
    hasDesktopArt: true,
    hasMobileArt: true,
  },
  {
    id: "ad2",
    advertiser: "Troféus Duna",
    campaign: "Troféus Duna — Temporada",
    segment: "Troféus e premiação",
    tagline: "Premiação personalizada para o seu circuito",
    url: "https://trofeusduna.exemplo.com",
    start: "01/07/2026",
    end: "30/09/2026",
    status: "ATIVA",
    priority: 2,
    positions: ["DASHBOARD", "EVENT_BOTTOM"],
    impressions: 96110,
    clicks: 1188,
    hasDesktopArt: true,
    hasMobileArt: true,
  },
  {
    id: "ad3",
    advertiser: "AreiaWear",
    campaign: "AreiaWear — Uniformes de dupla",
    segment: "Uniformes",
    tagline: "Uniformes de dupla sob medida",
    url: "https://areiawear.exemplo.com",
    start: "15/07/2026",
    end: "15/09/2026",
    status: "ATIVA",
    priority: 1,
    positions: ["RANKING", "PLAYER_PROFILE", "SCOREBOARD"],
    impressions: 142870,
    clicks: 2604,
    hasDesktopArt: true,
    hasMobileArt: false,
  },
  {
    id: "ad4",
    advertiser: "Clínica Movimento",
    campaign: "Fisioterapia esportiva — Piloto",
    segment: "Fisioterapia esportiva",
    tagline: "Recuperação e prevenção para atletas de areia",
    url: "https://movimento.exemplo.com",
    start: "01/09/2026",
    end: "30/11/2026",
    status: "AGENDADA",
    priority: 3,
    positions: ["HOME_MIDDLE", "MATCH"],
    impressions: 0,
    clicks: 0,
    hasDesktopArt: true,
    hasMobileArt: true,
  },
  {
    id: "ad5",
    advertiser: "Arena Prime",
    campaign: "Arena Prime — Locação de quadras",
    segment: "Arena",
    tagline: "Quadras cobertas para treinos e torneios",
    url: "https://arenaprime.exemplo.com",
    start: "01/05/2026",
    end: "30/06/2026",
    status: "PAUSADA",
    priority: 2,
    positions: ["VENUE"],
    impressions: 54200,
    clicks: 611,
    hasDesktopArt: true,
    hasMobileArt: true,
  },
];

export function ctr(c: AdCampaign) {
  if (!c.impressions) return "—";
  return `${((c.clicks / c.impressions) * 100).toFixed(2)}%`;
}

export function adsFor(position: AdPosition) {
  return adCampaigns
    .filter((c) => c.status === "ATIVA" && c.positions.includes(position))
    .sort((a, b) => a.priority - b.priority);
}

export type ReportTarget = "ORGANIZADOR" | "PARTICIPANTE" | "ARENA" | "EVENTO";
export type ReportStatus =
  "PENDENTE" | "EM_ANALISE" | "SOLICITACAO_INFO" | "RESOLVIDA" | "IMPROCEDENTE" | "ARQUIVADA";

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  PENDENTE: "Pendente",
  EM_ANALISE: "Em análise",
  SOLICITACAO_INFO: "Solicitação de informações",
  RESOLVIDA: "Resolvida",
  IMPROCEDENTE: "Improcedente",
  ARQUIVADA: "Arquivada",
};

export const REPORT_REASONS: Record<ReportTarget, string[]> = {
  ORGANIZADOR: [
    "Má organização",
    "Comportamento inadequado",
    "Fraude",
    "Cobrança indevida",
    "Descumprimento de regras",
  ],
  PARTICIPANTE: [
    "Comportamento antidesportivo",
    "Agressão verbal",
    "Assédio",
    "Fraude",
    "Manipulação de resultados",
  ],
  ARENA: [
    "Estrutura inadequada",
    "Problemas de segurança",
    "Cobrança indevida",
    "Condições diferentes das anunciadas",
  ],
  EVENTO: [
    "Informações falsas",
    "Cancelamento sem aviso",
    "Premiação não entregue",
    "Regulamento não cumprido",
  ],
};

export type Report = {
  id: string;
  code: string;
  target: ReportTarget;
  reported: string;
  reporter: string;
  event: string;
  reason: string;
  description: string;
  date: string;
  status: ReportStatus;
  priority: "Alta" | "Média" | "Baixa";
  evidence: string[];
  history: { at: string; text: string }[];
};

export const reports: Report[] = [
  {
    id: "r1",
    code: "Denúncia #001",
    target: "ORGANIZADOR",
    reported: "Circuito Litoral",
    reporter: "Player 02 · João Mendes",
    event: "Copa Areia Curitiba",
    reason: "Cobrança indevida",
    description:
      "Taxa extra de R$ 40 cobrada no local sem constar no regulamento publicado. Não houve recibo nem justificativa.",
    date: "04/08/2026",
    status: "EM_ANALISE",
    priority: "Alta",
    evidence: ["comprovante-pix.jpg", "print-regulamento.png"],
    history: [
      { at: "04/08 09:12", text: "Denúncia recebida" },
      { at: "04/08 14:30", text: "Triagem: prioridade alta" },
      { at: "05/08 10:02", text: "Movida para análise pelo Super Admin" },
    ],
  },
  {
    id: "r2",
    code: "Denúncia #002",
    target: "PARTICIPANTE",
    reported: "Player 04 · Rafael Prado",
    reporter: "Player 03 · Marina Costa",
    event: "Circuito Litoral — Etapa 3",
    reason: "Agressão verbal",
    description:
      "Ofensas à dupla adversária após a partida das quartas de final, presenciadas pelo árbitro.",
    date: "02/08/2026",
    status: "PENDENTE",
    priority: "Alta",
    evidence: ["relato-arbitro.pdf"],
    history: [{ at: "02/08 18:44", text: "Denúncia recebida" }],
  },
  {
    id: "r3",
    code: "Denúncia #003",
    target: "ARENA",
    reported: "Duna Beach Arena",
    reporter: "Player 01 · Ana Ribeiro",
    event: "Open de Verão — Natal",
    reason: "Problemas de segurança",
    description: "Iluminação parcial em duas quadras durante as partidas noturnas.",
    date: "28/07/2026",
    status: "SOLICITACAO_INFO",
    priority: "Média",
    evidence: [],
    history: [
      { at: "28/07 21:10", text: "Denúncia recebida" },
      { at: "29/07 08:20", text: "Informações solicitadas à arena" },
    ],
  },
  {
    id: "r4",
    code: "Denúncia #004",
    target: "EVENTO",
    reported: "Torneio Relâmpago Praia Mole",
    reporter: "Player 02 · João Mendes",
    event: "Torneio Relâmpago Praia Mole",
    reason: "Premiação não entregue",
    description: "Premiação em dinheiro anunciada não foi paga após a final.",
    date: "20/07/2026",
    status: "RESOLVIDA",
    priority: "Alta",
    evidence: ["conversa-organizador.png"],
    history: [
      { at: "20/07 19:00", text: "Denúncia recebida" },
      { at: "22/07 11:00", text: "Organizador advertido" },
      { at: "25/07 16:30", text: "Premiação paga · denúncia resolvida" },
    ],
  },
  {
    id: "r5",
    code: "Denúncia #005",
    target: "PARTICIPANTE",
    reported: "Player 03 · Marina Costa",
    reporter: "Anônimo",
    event: "Copa Areia Curitiba",
    reason: "Manipulação de resultados",
    description: "Suspeita sem elementos concretos apresentados.",
    date: "15/07/2026",
    status: "IMPROCEDENTE",
    priority: "Baixa",
    evidence: [],
    history: [
      { at: "15/07 10:00", text: "Denúncia recebida" },
      { at: "16/07 09:00", text: "Arquivada por falta de evidências" },
    ],
  },
];

export function getReport(id: string) {
  return reports.find((r) => r.id === id);
}

export const FEEDBACK_CRITERIA = [
  { key: "organization", label: "Organização" },
  { key: "structure", label: "Estrutura" },
  { key: "punctuality", label: "Pontualidade" },
  { key: "environment", label: "Ambiente" },
  { key: "overall", label: "Experiência geral" },
] as const;

export type EventFeedback = {
  id: string;
  event: string;
  eventSlug: string;
  author: string;
  date: string;
  scores: Record<(typeof FEEDBACK_CRITERIA)[number]["key"], number>;
  comment: string;
};

export const eventFeedbacks: EventFeedback[] = [
  {
    id: "f1",
    event: "Circuito Litoral — Etapa 3",
    eventSlug: "circuito-litoral-etapa-3",
    author: "Player 01 · Ana Ribeiro",
    date: "03/08/2026",
    scores: { organization: 5, structure: 4, punctuality: 5, environment: 5, overall: 5 },
    comment: "Chaves saíram no horário e a comunicação por notificação funcionou muito bem.",
  },
  {
    id: "f2",
    event: "Copa Areia Curitiba",
    eventSlug: "copa-areia-curitiba",
    author: "Player 02 · João Mendes",
    date: "01/08/2026",
    scores: { organization: 3, structure: 4, punctuality: 2, environment: 4, overall: 3 },
    comment: "Atraso de quase uma hora na Pool B. Estrutura da arena excelente.",
  },
  {
    id: "f3",
    event: "Open de Verão — Natal",
    eventSlug: "open-de-verao-natal",
    author: "Player 03 · Marina Costa",
    date: "26/07/2026",
    scores: { organization: 4, structure: 3, punctuality: 4, environment: 5, overall: 4 },
    comment: "Ambiente ótimo à noite, mas faltou vestiário adequado.",
  },
];

export function feedbackAverage(f: EventFeedback) {
  const values = Object.values(f.scores);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
};

export const auditLog: AuditEntry[] = [
  {
    id: "a1",
    at: "05/08/2026 10:02",
    actor: "Super Admin",
    action: "Denúncia movida para análise",
    target: "Denúncia #001",
    reason: "Triagem de prioridade alta",
  },
  {
    id: "a2",
    at: "04/08/2026 16:41",
    actor: "Super Admin",
    action: "Usuário suspenso",
    target: "Player 04 · Rafael Prado",
    reason: "Conduta antidesportiva reincidente",
  },
  {
    id: "a3",
    at: "02/08/2026 09:15",
    actor: "Super Admin",
    action: "Arena parceira cadastrada",
    target: "Duna Beach Arena",
    reason: "Contrato de parceria assinado",
  },
  {
    id: "a4",
    at: "28/07/2026 12:00",
    actor: "Super Admin",
    action: "Campanha publicitária ativada",
    target: "Beach Pro — Agosto 2026",
    reason: "Início do período contratado",
  },
  {
    id: "a5",
    at: "22/07/2026 11:00",
    actor: "Super Admin",
    action: "Organizador advertido",
    target: "Torneio Relâmpago Praia Mole",
    reason: "Premiação não entregue",
  },
];
