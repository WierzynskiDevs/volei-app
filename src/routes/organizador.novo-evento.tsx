import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BracketTree, type BracketTreeRound } from "@/components/site/bracket-tree";
import { AppShell, PageHeader } from "@/components/site/shell";
import { ApiError } from "@/lib/api/client";
import {
  createEvent,
  publishEvent,
  updateEvent,
  GENDER_VALUE,
  LEVEL_VALUE,
  type SaveEventPayload,
} from "@/lib/api/events";
import { queryKeys } from "@/lib/api/query-keys";
import { useOperations } from "@/lib/operations";
import { partnerVenues } from "@/lib/admin-data";
import { nextPowerOfTwo, roundLabels, roundsFor } from "@/lib/bracket";
import { formatRecommendations, type Category, type SkillLevel } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/organizador/novo-evento")({
  head: () => ({
    meta: [
      { title: "Criar campeonato · BeacHub" },
      {
        name: "description",
        content:
          "Configure arena, data, horários, limite de duplas e formato, com validação de viabilidade antes de publicar.",
      },
      { property: "og:title", content: "Criar campeonato · BeacHub" },
      {
        property: "og:description",
        content: "Arena, data, horários, formato e checagem de viabilidade.",
      },
    ],
  }),
  component: NewEventPage,
});

/*
 * O `slugify` local saiu: o endere\u00e7o p\u00fablico \u00e9 decidido pelo servidor
 * (EventSlugGenerator). Endere\u00e7o escolhido pelo cliente pode colidir de
 * prop\u00f3sito com o evento de outro organizador.
 */

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

function NewEventPage() {
  const [name, setName] = useState("Copa Areia Curitiba");
  const [venueId, setVenueId] = useState(partnerVenues[0]?.id ?? "custom");
  const [customVenue, setCustomVenue] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");

  const [noLimit, setNoLimit] = useState(false);
  const [teams, setTeams] = useState(16);
  const [courts, setCourts] = useState(4);
  const [minGames, setMinGames] = useState(3);
  const [days, setDays] = useState(1);

  /*
   * Configuração de partida e pontuação (aditivo §7/§14/§21). Ainda vive no
   * `OperationsProvider`, como no baseline: não existe coluna para ela no
   * backend (docs/DIVERGENCES.md §19). `courts` continua sendo o estado
   * persistido — `setCourtCount` só espelha as colunas do kanban.
   */
  const { config, setConfig, setCourtCount } = useOperations();

  const changeCourts = (v: number) => {
    setCourts(v);
    setCourtCount(v);
  };
  const [selected, setSelected] = useState(formatRecommendations[0]!.name);
  const [published, setPublished] = useState<string | null>(null);

  /*
   * Campos exigidos pela Fase 1 que o protótipo não coletava (ADR 0002).
   * Sem preço não existe núcleo comercial: o organizador não tem como dizer
   * quanto cobra, e o valor vinha de uma tabela estática indexada por slug.
   */
  const [feeReais, setFeeReais] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [closeTime, setCloseTime] = useState("23:59");
  const [category, setCategory] = useState<Category>("Masculino");
  const [level, setLevel] = useState<SkillLevel>("Open");
  const [modality, setModality] = useState<SaveEventPayload["modality"]>("TWO_VS_TWO");
  const [eventType, setEventType] = useState<SaveEventPayload["event_type"]>("COMPETITIVE");
  const [prize, setPrize] = useState("");
  const [description, setDescription] = useState("");

  /** Slug devolvido pelo backend — só existe depois de o evento ser gravado. */
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const venue = partnerVenues.find((v) => v.id === venueId);
  const venueLabel = venue ? `${venue.name} · ${venue.city}/${venue.state}` : customVenue.trim();

  const hours = useMemo(() => {
    const diff = toMinutes(end) - toMinutes(start);
    return diff > 0 ? Math.round((diff / 60) * 10) / 10 : 0;
  }, [start, end]);

  /**
   * Preview da chave (ADR 0011) — puramente visual, sem chamada de API. Mostra
   * o formato de árvore eliminatória para o nº de duplas informado; não
   * modela fielmente formatos com fase de grupos ou dupla eliminação (a chave
   * real, sorteada, só existe depois que o evento é criado — ver
   * `/organizador/sorteio/{slug}`).
   */
  const previewRounds = useMemo<BracketTreeRound[]>(() => {
    const bracketSize = nextPowerOfTwo(Math.max(2, teams));
    const totalRounds = roundsFor(bracketSize);
    const labels = roundLabels(totalRounds);

    return labels.map((label, roundIndex) => {
      const matchesInRound = bracketSize / 2 ** (roundIndex + 1);

      return {
        label,
        matches: Array.from({ length: matchesInRound }, (_, matchIndex) => ({
          a: {
            label: roundIndex === 0 ? `Dupla ${matchIndex * 2 + 1}` : "A definir",
            empty: roundIndex > 0,
          },
          b: {
            label: roundIndex === 0 ? `Dupla ${matchIndex * 2 + 2}` : "A definir",
            empty: roundIndex > 0,
          },
        })),
      };
    });
  }, [teams]);

  const chosen = formatRecommendations.find((f) => f.name === selected)!;
  const estimatedHours =
    Math.round(((chosen.matches * config.matchDurationMin) / courts / 60) * 10) / 10;

  // A janela disponível é a soma dos dias do evento (aditivo §7).
  const windowHours = Math.round(hours * days * 10) / 10;
  const fits = hours > 0 && estimatedHours <= windowHours;

  const missing: string[] = [];
  if (!name.trim()) missing.push("nome do campeonato");
  if (!venueLabel) missing.push("arena ou local");
  if (!date) missing.push("data");
  if (hours <= 0) missing.push("horários válidos");
  if (feeReais.trim() === "") missing.push("valor da inscrição");

  const canPublish = missing.length === 0 && fits && !saving;

  /**
   * Local do evento. Arena parceira traz cidade/UF prontas; local avulso vem
   * como texto livre "Cidade/UF", que o baseline já usava.
   */
  function resolveVenue(): { venue_name: string; city: string; state: string } | null {
    if (venue) return { venue_name: venue.name, city: venue.city, state: venue.state };

    const [city = "", state = ""] = customCity.split("/").map((part) => part.trim());
    if (!customVenue.trim() || !city || state.length !== 2) return null;

    return { venue_name: customVenue.trim(), city, state: state.toUpperCase() };
  }

  /**
   * Monta o corpo da requisição.
   *
   * Dinheiro vai em CENTAVOS e inteiro (CLAUDE.md §7): a tela coleta reais por
   * conveniência e converte aqui, uma vez. Nenhum cálculo financeiro acontece
   * no cliente — isto é conversão de unidade, não regra.
   */
  function buildPayload(): SaveEventPayload | null {
    const place = resolveVenue();
    if (!place) return null;

    return {
      ...place,
      name: name.trim(),
      description: description.trim() || null,
      date,
      start_time: start,
      end_time: end,
      registration_close_at: closeDate ? `${closeDate} ${closeTime}` : null,
      registration_fee_cents: Math.round(Number(feeReais.replace(",", ".")) * 100),
      max_teams: noLimit ? null : teams,
      courts,
      min_games: minGames,
      format: selected,
      modality,
      gender_category: GENDER_VALUE[category],
      level_category: LEVEL_VALUE[level],
      event_type: eventType,
      prize_description: prize.trim() || null,
      rules: [],
    };
  }

  /** Cria na primeira chamada; atualiza nas seguintes. Evita evento duplicado. */
  async function persist(): Promise<string | null> {
    const payload = buildPayload();

    if (!payload) {
      toast.error("Informe o local no formato “Cidade/UF”.");
      return null;
    }

    const saved = savedSlug ? await updateEvent(savedSlug, payload) : await createEvent(payload);

    setSavedSlug(saved.slug);
    await queryClient.invalidateQueries({ queryKey: queryKeys.organizerEvents.all });

    return saved.slug;
  }

  /** Mensagem de erro vem do backend — a tela não reinterpreta (CLAUDE.md §15). */
  function reportError(e: unknown) {
    if (e instanceof ApiError) {
      const first = Object.values(e.fieldErrors)[0];
      toast.error(e.message, first ? { description: first } : undefined);
    } else {
      toast.error("Não foi possível salvar. Tente novamente em instantes.");
    }
  }

  async function publish() {
    if (!canPublish) {
      toast.error(
        missing.length
          ? `Preencha: ${missing.join(", ")}.`
          : "O formato escolhido não cabe na janela informada.",
      );
      return;
    }

    setSaving(true);

    try {
      const slug = await persist();
      if (!slug) return;

      // Publicar é transição de estado no backend, não mudança de tela: é lá
      // que se verifica plano, conta de recebimento e máquina de estados.
      await publishEvent(slug);
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });

      setPublished(`beachub.com/eventos/${slug}`);
      toast.success("Campeonato publicado", { description: "Link de inscrição gerado." });
    } catch (e) {
      reportError(e);
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    if (!name.trim()) {
      toast.error("Dê um nome ao campeonato para salvar o rascunho.");
      return;
    }

    setSaving(true);

    try {
      const slug = await persist();
      if (slug) {
        toast.success("Rascunho salvo", {
          description: `“${name}” ficou disponível no seu painel.`,
        });
      }
    } catch (e) {
      reportError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/organizador" className="eyebrow hover:text-foreground">
          ← Painel
        </Link>
        <PageHeader
          eyebrow="Criação de evento"
          title="Criar campeonato"
          description="Defina arena, data e horários, informe as restrições reais do dia e o sistema recomenda o formato que cabe."
        />

        <h2 className="mt-8 text-xl">1 · Identificação e local</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block border border-border bg-card p-4 md:col-span-2">
            <span className="eyebrow">Nome do campeonato</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
            />
          </label>

          <label className="block border border-border bg-card p-4 md:col-span-2">
            <span className="eyebrow">Arena</span>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
            >
              {partnerVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.city}/{v.state} (parceira)
                </option>
              ))}
              <option value="custom">Outro local (só para este evento)</option>
            </select>
            {venue ? (
              <span className="mt-2 block text-sm text-muted-foreground">
                {venue.address} · {venue.courts} quadras · {venue.sand}
              </span>
            ) : null}
          </label>

          {venue ? null : (
            <>
              <label className="block border border-border bg-card p-4">
                <span className="eyebrow">Nome do local</span>
                <input
                  value={customVenue}
                  onChange={(e) => setCustomVenue(e.target.value)}
                  placeholder="Ex.: Praça da Areia"
                  className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
              </label>
              <label className="block border border-border bg-card p-4">
                <span className="eyebrow">Cidade/UF</span>
                <input
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="Ex.: Curitiba/PR"
                  className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
              </label>
            </>
          )}
        </div>

        <h2 className="mt-10 text-xl">2 · Data e horários</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Data de início</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="score-num mt-1 w-full bg-transparent text-2xl outline-none"
            />
          </label>
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Início</span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="score-num mt-1 w-full bg-transparent text-2xl outline-none"
            />
          </label>
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Término</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="score-num mt-1 w-full bg-transparent text-2xl outline-none"
            />
          </label>
          <Field label="Quantidade de dias" value={days} onChange={setDays} min={1} max={10} />
        </div>
        <p className={cn("mt-2 text-sm", hours > 0 ? "text-muted-foreground" : "text-destructive")}>
          {hours > 0
            ? days > 1
              ? `Janela de ${hours}h por dia · ${windowHours}h em ${days} dias.`
              : `Janela de ${hours}h de operação.`
            : "O horário de término deve ser depois do início."}
        </p>

        <h2 className="mt-10 text-xl">3 · Capacidade</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="border border-border bg-card p-4">
            <span className="eyebrow">Máximo de duplas</span>
            <input
              type="number"
              min={4}
              max={64}
              disabled={noLimit}
              value={noLimit ? "" : teams}
              placeholder="Sem limite"
              onChange={(e) => setTeams(Number(e.target.value))}
              className="score-num mt-1 w-full bg-transparent text-2xl outline-none placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground disabled:opacity-60"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={noLimit}
                onChange={(e) => setNoLimit(e.target.checked)}
              />
              Sem máximo de equipes
            </label>
          </label>
          <Field
            label="Quadras disponíveis"
            value={courts}
            onChange={changeCourts}
            min={1}
            max={12}
          />
          <Field
            label="Min. jogos por dupla"
            value={minGames}
            onChange={setMinGames}
            min={1}
            max={8}
          />
          <Field
            label="Duração estimada (min)"
            value={config.matchDurationMin}
            onChange={(v) => setConfig({ matchDurationMin: v })}
            min={15}
            max={120}
          />
        </div>
        {noLimit ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Inscrições abertas sem teto: a estimativa de duração usa o formato escolhido e pode
            crescer conforme o número de duplas.
          </p>
        ) : null}

        <h2 className="mt-10 text-xl">4 · Quadras do evento</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <Field
            label="Quantidade de quadras"
            value={courts}
            onChange={changeCourts}
            min={1}
            max={12}
          />
          <div className="border border-border bg-card p-4 md:col-span-2">
            <span className="eyebrow">Quadras criadas automaticamente</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {config.courts.map((c) => (
                <span
                  key={c}
                  className="border border-border px-2 py-1 font-display text-[11px] font-bold uppercase tracking-widest"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Cada quadra vira uma coluna no kanban operacional do evento.
            </p>
          </div>
        </div>

        <h2 className="mt-10 text-xl">5 · Regras da partida</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="border border-border bg-card p-4">
            <span className="eyebrow">Sets</span>
            <select
              value={config.bestOf}
              onChange={(e) => setConfig({ bestOf: Number(e.target.value) as 1 | 3 | 5 })}
              className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
            >
              <option value={1}>Set único</option>
              <option value={3}>Melhor de 3</option>
              <option value={5}>Melhor de 5</option>
            </select>
          </label>
          <Field
            label="Pontos por set"
            value={config.pointsPerSet}
            onChange={(v) => setConfig({ pointsPerSet: v })}
            min={11}
            max={31}
          />
          <Field
            label="Pontos no set decisivo"
            value={config.tiebreakPoints}
            onChange={(v) => setConfig({ tiebreakPoints: v })}
            min={11}
            max={25}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Duração estimada {config.matchDurationMin} min ·{" "}
          {config.bestOf === 1 ? "set único" : `melhor de ${config.bestOf}`} · sets até{" "}
          {config.pointsPerSet} (decisivo {config.tiebreakPoints}).
        </p>

        <h2 className="mt-10 text-xl">6 · Regras de pontuação</h2>
        <p className="text-sm text-muted-foreground">
          Os pontos do ranking deste evento são configuráveis — nada fica fixo na interface.
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <Field
            label="Vitória"
            value={config.scoring.win}
            onChange={(v) => setConfig({ scoring: { ...config.scoring, win: v } })}
            min={-10}
            max={50}
          />
          <Field
            label="Derrota"
            value={config.scoring.loss}
            onChange={(v) => setConfig({ scoring: { ...config.scoring, loss: v } })}
            min={-10}
            max={50}
          />
          <Field
            label="Participação"
            value={config.scoring.participation}
            onChange={(v) => setConfig({ scoring: { ...config.scoring, participation: v } })}
            min={0}
            max={50}
          />
          <Field
            label="Campeão"
            value={config.scoring.champion}
            onChange={(v) => setConfig({ scoring: { ...config.scoring, champion: v } })}
            min={0}
            max={100}
          />
          <Field
            label="Vice-campeão"
            value={config.scoring.runnerUp}
            onChange={(v) => setConfig({ scoring: { ...config.scoring, runnerUp: v } })}
            min={0}
            max={100}
          />
          <Field
            label="Terceiro lugar"
            value={config.scoring.third}
            onChange={(v) => setConfig({ scoring: { ...config.scoring, third: v } })}
            min={0}
            max={100}
          />
        </div>

        <h2 className="mt-10 text-xl">7 · Recomendação de formato</h2>
        <div className="mt-3 space-y-3">
          {formatRecommendations.map((f) => (
            <button
              key={f.name}
              onClick={() => setSelected(f.name)}
              className={cn(
                "flex w-full gap-4 border p-4 text-left",
                selected === f.name ? "border-graphite bg-card" : "border-border bg-card/60",
              )}
            >
              <span className="text-2xl">{f.medal}</span>
              <span className="flex-1">
                <span className="block font-display text-base font-bold">{f.name}</span>
                <span className="block text-sm text-muted-foreground">{f.why}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {f.matches} partidas · duração estimada {f.duration}
                </span>
              </span>
              {selected === f.name ? <Check className="h-5 w-5 text-accent" /> : null}
            </button>
          ))}
        </div>

        {/*
          Preview de chaveamento (ADR 0011, docs/DIVERGENCES.md §24) — não
          existe no baseline. Estimativa de árvore eliminatória simples a
          partir do nº de duplas; o sorteio real acontece depois de criado o
          evento, em /organizador/sorteio/{slug}.
        */}
        <h2 className="mt-8 text-xl">7.1 · Preview da chave</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimativa da árvore eliminatória{noLimit ? ` para ${teams} duplas` : ""}. Formatos com
          fase de grupos ou dupla eliminação não são representados fielmente aqui — o sorteio de
          verdade acontece depois que o evento é criado.
        </p>
        <div className="mt-3">
          <BracketTree rounds={previewRounds} />
        </div>

        {/*
          Seção acrescentada pelo ADR 0002: o protótipo não coletava preço,
          janela de inscrição, categorias nem premiação — sem esses campos o
          núcleo comercial da Fase 1 não fecha. É adição dentro do design
          system existente; nenhuma seção anterior foi alterada ou reordenada.
        */}
        <h2 className="mt-10 text-xl">8 · Inscrição</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Valor por jogador (R$)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={feeReais}
              onChange={(e) => setFeeReais(e.target.value)}
              placeholder="0,00"
              className="score-num mt-1 w-full bg-transparent text-2xl outline-none placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground"
            />
            <span className="mt-2 block text-xs text-muted-foreground">
              Zero para evento gratuito. A cobrança é por atleta.
            </span>
          </label>
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Inscrições até</span>
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="score-num mt-1 w-full bg-transparent text-2xl outline-none"
            />
          </label>
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Horário limite</span>
            <input
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="score-num mt-1 w-full bg-transparent text-2xl outline-none"
            />
          </label>
        </div>

        <h2 className="mt-10 text-xl">9 · Categoria e premiação</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Categoria</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
            >
              {(["Masculino", "Feminino", "Misto", "Open"] as const).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Nível</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as SkillLevel)}
              className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
            >
              {(["Iniciante", "Intermediário", "Avançado", "Open", "Livre"] as const).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Modalidade</span>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as SaveEventPayload["modality"])}
              className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
            >
              <option value="TWO_VS_TWO">2x2</option>
              <option value="TWO_VS_TWO_ROTATING">2x2 rotativo</option>
              <option value="FOUR_VS_FOUR">4x4</option>
            </select>
          </label>
          <label className="block border border-border bg-card p-4">
            <span className="eyebrow">Tipo de evento</span>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as SaveEventPayload["event_type"])}
              className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none"
            >
              <option value="COMPETITIVE">Competitivo</option>
              <option value="SOCIAL">Social</option>
              <option value="RANKING">Ranking</option>
              <option value="FRIENDLY">Amistoso</option>
              <option value="LEAGUE">Liga</option>
              <option value="SPECIAL">Especial</option>
            </select>
          </label>
          <label className="block border border-border bg-card p-4 md:col-span-2">
            <span className="eyebrow">Premiação</span>
            <input
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="Ex.: R$ 3.000 + troféus"
              className="mt-1 w-full bg-transparent font-display text-lg font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground"
            />
          </label>
          <label className="block border border-border bg-card p-4 md:col-span-2">
            <span className="eyebrow">Descrição</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Regras gerais, estrutura, estacionamento, o que levar…"
              className="mt-1 w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>

        <h2 className="mt-10 text-xl">Viabilidade</h2>
        <div
          className={cn(
            "mt-3 border p-5",
            fits ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10",
          )}
        >
          {fits ? (
            <>
              <p className="font-display text-base font-bold">Este formato cabe na sua janela.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {chosen.matches} partidas em {courts} quadras levam aproximadamente {estimatedHours}
                h, dentro das {windowHours}h{" "}
                {days > 1 ? `dos ${days} dias` : `entre ${start} e ${end}`}. Cada dupla joga no
                mínimo {minGames} partidas
                {noLimit ? " (sem limite de inscrições)" : ` (até ${teams} duplas)`}.
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 font-display text-base font-bold text-destructive">
                <AlertTriangle className="h-4 w-4" /> Este formato não cabe no tempo informado.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                São necessárias aproximadamente {estimatedHours}h, mas a janela informada é de{" "}
                {windowHours}h. Amplie o horário, adicione dias, adicione quadras ou escolha “
                {formatRecommendations[1]!.name}”.
              </p>
              <button
                onClick={() => setSelected(formatRecommendations[1]!.name)}
                className="mt-4 inline-flex h-10 items-center bg-graphite px-4 font-display text-xs font-bold uppercase tracking-widest text-background"
              >
                Usar alternativa
              </button>
            </>
          )}
        </div>

        {missing.length ? (
          <p className="mt-3 text-sm text-muted-foreground">Ainda faltam: {missing.join(", ")}.</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => void publish()}
            className="flex h-12 flex-1 items-center justify-center bg-accent font-display text-sm font-bold uppercase tracking-widest text-accent-foreground disabled:bg-muted disabled:text-muted-foreground"
            disabled={!canPublish}
          >
            {saving ? "Salvando…" : "Publicar e gerar link"}
          </button>
          <button
            onClick={() => void saveDraft()}
            disabled={saving}
            className="h-12 border border-border px-5 font-display text-xs font-bold uppercase tracking-widest disabled:opacity-60"
          >
            Salvar rascunho
          </button>
        </div>

        {published ? (
          <div className="mt-6 border border-success/40 bg-success/10 p-5">
            <p className="font-display text-base font-bold">Campeonato publicado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {venueLabel}
              {!venue && customCity ? ` · ${customCity}` : ""} · {date} · {start}–{end}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="border border-border bg-background px-3 py-2 text-sm">
                {published}
              </code>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(`https://${published}`);
                  toast.success("Link copiado");
                }}
                className="inline-flex h-10 items-center gap-2 border border-graphite px-4 font-display text-xs font-bold uppercase tracking-widest"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </button>
              <Link
                to="/eventos"
                className="inline-flex h-10 items-center bg-graphite px-4 font-display text-xs font-bold uppercase tracking-widest text-background"
              >
                Ver eventos
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="border border-border bg-card p-4">
      <span className="eyebrow">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="score-num mt-1 w-full bg-transparent text-2xl outline-none"
      />
    </label>
  );
}
