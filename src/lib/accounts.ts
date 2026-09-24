/**
 * Contas de demonstração do BeacHub.
 *
 * A autenticação agora é REAL (ADR 0005): esta lista deixou de ser a fonte de
 * verdade da sessão e virou apenas o catálogo do painel "Modo demonstração".
 * Os e-mails abaixo correspondem às contas criadas por `DemoAccountSeeder` no
 * backend, e os botões de atalho fazem login de verdade com elas.
 *
 * ⚠️ Este arquivo — e o painel que ele alimenta — sai antes de produção
 * (Fase 1F). Enquanto existir, existe uma senha conhecida em ambiente de
 * desenvolvimento, e só lá: em produção as contas simplesmente não existem,
 * porque o seeder recusa rodar (CLAUDE.md §11).
 */

/** Senha das contas semeadas em desenvolvimento. Igual à do `DemoAccountSeeder`. */
export const DEMO_PASSWORD = import.meta.env["VITE_DEMO_PASSWORD"] ?? "saque123456";

export type Role = "PLAYER" | "ORGANIZER" | "SUPER_ADMIN";

export type Account = {
  id: string;
  label: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  roles: Role[];
  playerId?: string;
  organizerName?: string;
  status: "ATIVO" | "SUSPENSO";
  createdAt: string;
  events: number;
  participations: number;
};

export const ROLE_LABEL: Record<Role, string> = {
  PLAYER: "Jogador",
  ORGANIZER: "Organizador",
  SUPER_ADMIN: "Super Admin",
};

export const accounts: Account[] = [
  {
    id: "player-01",
    label: "Player 01",
    name: "Ana Ribeiro",
    initials: "AR",
    email: "ana@beachub.com",
    phone: "+55 48 99xxx-1234",
    city: "Florianópolis",
    state: "SC",
    roles: ["PLAYER"],
    playerId: "ana-ribeiro",
    status: "ATIVO",
    createdAt: "12/03/2025",
    events: 0,
    participations: 12,
  },
  {
    id: "player-02",
    label: "Player 02",
    name: "João Mendes",
    initials: "JM",
    email: "joao@beachub.com",
    phone: "+55 41 98xxx-4477",
    city: "Curitiba",
    state: "PR",
    roles: ["PLAYER"],
    playerId: "joao-mendes",
    status: "ATIVO",
    createdAt: "02/01/2025",
    events: 0,
    participations: 18,
  },
  {
    id: "player-03",
    label: "Player 03",
    name: "Marina Costa",
    initials: "MC",
    email: "marina@beachub.com",
    phone: "+55 81 99xxx-8890",
    city: "Recife",
    state: "PE",
    roles: ["PLAYER"],
    playerId: "marina-costa",
    status: "ATIVO",
    createdAt: "19/05/2025",
    events: 0,
    participations: 7,
  },
  {
    id: "player-04",
    label: "Player 04",
    name: "Rafael Prado",
    initials: "RP",
    email: "rafael@beachub.com",
    phone: "+55 84 98xxx-2210",
    city: "Natal",
    state: "RN",
    roles: ["PLAYER"],
    playerId: "rafael-prado",
    status: "SUSPENSO",
    createdAt: "07/07/2025",
    events: 0,
    participations: 4,
  },
  {
    id: "organizer-01",
    label: "Organizer 01",
    name: "Arena Norte Beach",
    initials: "AN",
    email: "contato@arenanorte.com.br",
    phone: "+55 41 3xxx-9090",
    city: "Curitiba",
    state: "PR",
    roles: ["ORGANIZER"],
    organizerName: "Arena Norte Beach",
    status: "ATIVO",
    createdAt: "22/11/2024",
    events: 14,
    participations: 0,
  },
  {
    id: "organizer-02",
    label: "Organizer 02",
    name: "Circuito Litoral",
    initials: "CL",
    email: "producao@circuitolitoral.com",
    phone: "+55 48 3xxx-1177",
    city: "Florianópolis",
    state: "SC",
    roles: ["ORGANIZER", "PLAYER"],
    organizerName: "Circuito Litoral",
    playerId: "carla-souza",
    status: "ATIVO",
    createdAt: "05/02/2025",
    events: 9,
    participations: 3,
  },
  {
    id: "super-admin",
    label: "Super Admin",
    name: "Super Admin",
    initials: "SA",
    email: "admin@beachub.com",
    phone: "+55 11 9xxxx-0000",
    city: "São Paulo",
    state: "SP",
    roles: ["SUPER_ADMIN"],
    status: "ATIVO",
    createdAt: "01/10/2024",
    events: 0,
    participations: 0,
  },
];

export function getAccount(id: string) {
  return accounts.find((a) => a.id === id);
}

export function maskPhone(phone: string) {
  return phone.replace(/\d(?=\d{4})/g, (c, i) => (i < phone.length - 8 ? c : "•"));
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "•••";
  return `${user.slice(0, 2)}•••@${domain}`;
}
