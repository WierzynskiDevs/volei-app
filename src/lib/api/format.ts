/**
 * Formatação de apresentação dos dados da API.
 *
 * A API trafega ISO 8601 com offset e centavos (CLAUDE.md §13); as strings que
 * a tela exibe — `"22 ago · sáb · 08h30"`, `"18 ago, 23h59"`, `"R$ 130 / jogador"` —
 * são produzidas aqui, no formato exato que o baseline já usava.
 *
 * Regra de fuso (ADR 0006 §5): a data é formatada **no fuso do evento**, nunca
 * no do navegador. Quem está em Manaus vendo um evento em Florianópolis precisa
 * ler `08h30` — o horário em que a bola sobe na quadra.
 *
 * Por isso estas funções NÃO usam `new Date()` para formatar: o construtor
 * converteria para o fuso local da máquina. A string que a API envia já está no
 * fuso do evento, então os componentes são lidos literalmente dela.
 */

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type DateParts = { year: number; month: number; day: number; hour: number; minute: number };

/** Extrai os componentes locais do evento direto da string ISO. */
function parts(iso: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

/**
 * Dia da semana. `Date.UTC` é usado só como calendário — os componentes já
 * são do fuso do evento, então não há conversão envolvida.
 */
function weekday(p: DateParts): string {
  return WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]!;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `"2026-08-22T08:30:00-03:00"` → `"22 ago · sáb · 08h30"` */
export function eventDateLabel(iso: string): string {
  const p = parts(iso);
  if (!p) return "";
  return `${pad(p.day)} ${MONTHS[p.month - 1]} · ${weekday(p)} · ${pad(p.hour)}h${pad(p.minute)}`;
}

/** `"2026-08-18T23:59:00-03:00"` → `"18 ago, 23h59"` */
export function deadlineLabel(iso: string | null): string {
  const p = iso ? parts(iso) : null;
  if (!p) return "sem prazo definido";
  return `${pad(p.day)} ${MONTHS[p.month - 1]}, ${pad(p.hour)}h${pad(p.minute)}`;
}

/** `"2026-08-22T08:30:00-03:00"` → `"2026-08-22"`, para inputs `type="date"`. */
export function dateInputValue(iso: string): string {
  const p = parts(iso);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)}` : "";
}

/** `"2026-08-22T08:30:00-03:00"` → `"08:30"`, para inputs `type="time"`. */
export function timeInputValue(iso: string): string {
  const p = parts(iso);
  return p ? `${pad(p.hour)}:${pad(p.minute)}` : "";
}

/**
 * Centavos → texto curto de moeda. Sem centavos quando o valor é redondo,
 * que é como o baseline escrevia ("R$ 120", não "R$ 120,00").
 */
export function shortBrl(cents: number): string {
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

/**
 * Texto do valor da inscrição.
 *
 * A unidade é **jogador**, não dupla: a cobrança é individual (ADR 0001).
 * O baseline oscilava entre "/ dupla" e "/ jogador" no mesmo conjunto de
 * dados — aqui existe uma única verdade.
 */
export function feeLabel(cents: number): string {
  if (cents === 0) return "Gratuito";
  return `${shortBrl(cents)} / jogador`;
}

/**
 * Traduz o status de pagamento da API para o vocabulário visual do baseline.
 *
 * Os dois conjuntos são diferentes de propósito. O domínio distingue
 * `CONFIRMED` (pago, saldo ainda não disponível) de `RECEIVED` (valor
 * disponível) — 32 dias de distância no cartão, ADR 0009 §2. O componente
 * `PaymentStatusPill` do baseline só tem "Pago", porque para quem olha a lista
 * a distinção não muda a leitura da linha.
 *
 * A tradução vive aqui, num lugar só: espalhada pelas telas, "recebido"
 * apareceria como "pendente" em alguma delas no dia em que alguém esquecesse um
 * caso do `switch`.
 */
export function paymentPillStatus(
  status: string,
): "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CHARGEBACK" {
  switch (status) {
    case "DRAFT":
    case "PENDING":
      return "PENDING";
    case "CONFIRMED":
    case "RECEIVED":
      return "PAID";
    case "OVERDUE":
      return "EXPIRED";
    case "REFUNDED":
      return "REFUNDED";
    case "PARTIALLY_REFUNDED":
      return "PARTIALLY_REFUNDED";
    case "CHARGEBACK":
      return "CHARGEBACK";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "FAILED";
  }
}

/**
 * Valor em centavos que pode ser desconhecido.
 *
 * `null` significa que o gateway ainda não informou a taxa, e o líquido não
 * existe até lá (ADR 0009 §5). Mostrar R$ 0,00 afirmaria que o organizador não
 * recebe nada — que é uma afirmação financeira falsa.
 */
export function brlOrUnavailable(cents: number | null | undefined, format: (c: number) => string): string {
  return cents === null || cents === undefined ? "—" : format(cents);
}
