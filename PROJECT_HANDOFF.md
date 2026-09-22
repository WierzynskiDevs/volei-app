# PROJECT_HANDOFF.md — volei-app (SAQUE)

Auditoria técnica do frontend atual, para orientar o desenvolvimento do backend `volei-api` (PHP / Laravel 12 / PostgreSQL / REST).

Data da auditoria: 18/08/2026.
Escopo: somente análise. **Nenhum arquivo do projeto foi alterado.**

Legenda de status usada no documento:

- `IMPLEMENTADO` — funciona de ponta a ponta dentro do frontend (com dados locais).
- `PARCIAL` — parte do fluxo funciona, parte é estática.
- `MOCK` — funciona lendo arrays fixos em `src/lib/*`.
- `VISUAL ONLY` — a tela existe, nenhum estado muda ao interagir.
- `NÃO IMPLEMENTADO` — não existe.

---

## 1. Executive Summary

O `volei-app` é hoje um **protótipo navegável de alta fidelidade**, construído com TanStack Start (React 19 + Vite) e Tailwind v4. Ele cobre 58 rotas e três perfis de usuário (jogador, organizador, super admin), com um design system próprio ("Areia & Grafite").

Fatos essenciais para o backend:

- **Não existe backend.** Zero chamadas HTTP a APIs próprias ou de terceiros. Nenhum `fetch`, nenhum client de API, nenhum `createServerFn` de negócio.
- **Não existe Supabase.** Nenhuma dependência, nenhum import, nenhuma tabela, nenhuma RLS, nenhum edge function.
- **Não existe autenticação real.** Login é a seleção de uma conta fictícia entre 7 contas hardcoded, persistida em `localStorage`.
- **Não existe integração Asaas.** Toda a camada financeira é mock em memória. Marcado explicitamente como **INTEGRAÇÃO NÃO IMPLEMENTADA**.
- **Não existe persistência.** Nenhum dado criado na UI sobrevive a um reload (exceto o id da sessão fake).
- **Não é PWA.** Sem manifest, sem service worker, sem ícones, sem offline.
- Toda a modelagem de domínio já existe em TypeScript, em 4 arquivos (`mock-data.ts`, `admin-data.ts`, `finance-data.ts`, `schedule-data.ts`), somando ~2.400 linhas de tipos + fixtures. **Esses tipos são o contrato de fato que o backend precisa atender.**

Valor real da entrega atual: a UX, os fluxos, os estados de domínio e as máquinas de estado (evento, pagamento, reembolso, denúncia, partida) estão desenhados e nomeados. O backend pode ser especificado quase diretamente a partir deles.

---

## 2. Current Architecture

Aplicação monolítica de frontend, SSR-capable, sem camada de dados.

```
Browser ──> TanStack Start (SSR/hydration, Vite 8, Cloudflare Worker target)
                │
                ├── TanStack Router (file-based, src/routes/*)
                ├── React 19 componentes
                └── src/lib/*.ts  ← "banco de dados": arrays constantes em memória
```

- Não há camada de serviços (`services/`, `api/`, `hooks/queries`).
- `@tanstack/react-query` está instalado e o `QueryClientProvider` está montado em `__root.tsx`, mas **nenhum `useQuery`/`useMutation` é utilizado em nenhuma rota**. Está pronto para uso, sem uso.
- `src/server.ts` existe apenas como wrapper de erro do SSR (infra do template), não contém regra de negócio.
- Estado de servidor: inexistente. Estado global: um único `SessionProvider` (Context API).

---

## 3. Project Structure

| Item | Valor |
| --- | --- |
| Framework | TanStack Start `1.168.32` + TanStack Router `1.170.18` |
| React | `19.2.0` |
| Build tool | Vite `^8.2.0` via `@lovable.dev/vite-tanstack-config` `2.13.1` |
| SSR/deploy target | Nitro `3.0.260603-beta`, alvo Cloudflare Worker |
| CSS | Tailwind CSS `4.2.1` (config em CSS, `src/styles.css`), `tw-animate-css` |
| Component library | shadcn/ui (Radix primitives) — 45 componentes em `src/components/ui` |
| Ícones | `lucide-react` `0.575.0` |
| Charts | `recharts` `2.15.4` — **instalado, não utilizado em nenhuma rota** |
| Forms | `react-hook-form` + `@hookform/resolvers` — **instalados, não utilizados**; todos os formulários usam `useState` |
| Validation | `zod` `3.24.2` — usado **apenas** em `src/routes/placar.tsx` para validar o search param `quadra` |
| Datas | `date-fns` `4.1.0` — instalado, uso residual (calendar do shadcn) |
| Toast | `sonner` `2.0.7` (`<Toaster />` montado em `__root.tsx`) |
| State management | React Context API (`src/lib/session.tsx`) + `useState` local |
| Routing | file-based, `src/routes/`, `routeTree.gen.ts` gerado |
| Storage | `localStorage` (1 chave) |
| Auth | mock local |
| API client | **nenhum** |
| PWA | **nenhum** |

Diretórios relevantes:

```
src/
  components/
    site/        ← componentes de domínio (8 arquivos)
    ui/          ← shadcn/ui (45 arquivos, não modificados)
  hooks/
    use-mobile.tsx
  lib/
    accounts.ts        ← contas de demonstração + Role
    session.tsx        ← SessionProvider (localStorage)
    mock-data.ts       ← players, events, teams, pools, matches, brackets, reviews, venues, notifications
    admin-data.ts      ← partnerVenues, adCampaigns, reports, eventFeedbacks, auditLog
    finance-data.ts    ← plans, organizerFinances, payments, refunds, eventChanges, eventFinances, agregações
    schedule-data.ts   ← scheduledMatches, sets, motor de estimativa de horários
    utils.ts           ← cn()
    error-capture.ts / error-page.ts / lovable-error-reporting.ts  ← infra do template
  routes/        ← 58 arquivos de rota
  styles.css     ← design system completo
  router.tsx / server.ts / start.ts   ← bootstrap
public/
  favicon.ico, robots.txt      ← nada além disso
```

Não existem: `src/pages`, `src/services`, `src/types`, `src/api`, `src/store`, `.env`, `src/integrations`.

---

## 4. Pages

58 rotas. Todas usam dados dos arquivos `src/lib/*`. Nenhuma persiste dados.

### Público / jogador

| Página | Rota | Objetivo | Acesso | Dados | Ações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Home | `/` | Landing: hero, partida em andamento, busca de parceiro, top ranking | Todos | `mock-data`, `schedule-data` | navegar; CTA "Sou organizador" oculto para PLAYER logado | MOCK |
| Campeonatos | `/eventos` | Lista + filtros de categoria/nível | Todos | `events` | filtro client-side (`useState`) | MOCK |
| Evento | `/eventos/$slug` | Detalhe com abas Info/Duplas/Chave/Agenda/Classificação/Resultados | Todos | `events`, `teams`, `pools`, `matches`, `goldBracket`, `getEventFinance` | trocar aba, ir para inscrição | MOCK |
| Inscrição | `/inscricao/$slug` | Escolher modo (parceiro / buscar / individual), convidar | Todos (sem guard) | `events`, `players`, `finance` | selecionar modo, "convidar" (estado local `sent`) | PARCIAL — nada é gravado |
| Checkout | `/checkout/$slug` | Pagamento da inscrição | Todos (sem guard) | `getEventFinance` | escolher método, avançar entre `checkout → pending → paid` | VISUAL ONLY (transição de estado local) |
| Minhas inscrições | `/minhas-inscricoes` | Inscrições + pagamentos do jogador | Jogador (sem guard) | `payments` filtrado por nome fixo | ver detalhe, pedir reembolso | MOCK |
| Reembolso | `/reembolso/$paymentId` | Solicitar reembolso com motivo | Jogador | `payments`, `refunds`, `eventChanges` | selecionar motivo, enviar (estado local) | VISUAL ONLY |
| Meus jogos | `/meus-jogos` | Próximo jogo, ETA, conflitos, avaliações pendentes | Jogador | `schedule-data` | nenhuma escrita | MOCK |
| Perfil do jogador | `/jogadores/$playerId` | Performance + reputação + extrato de pontos + reviews | Todos | `players`, `pointTransactions`, `performanceHistory`, `reviews` | trocar aba | MOCK |
| Ranking | `/ranking` | Ranking de performance e de reputação | Todos | `players` | filtros client-side | MOCK |
| Ao vivo | `/ao-vivo` | Partidas em andamento e próximas | Todos | `schedule-data` | — | MOCK |
| Placar (telão) | `/placar?quadra=` | Modo telão fullscreen | Organizador/arena | `schedule-data` | seletor de quadra (search param validado por zod) | MOCK |
| Arenas | `/arenas` | Lista de arenas | Todos | `venues` | — | MOCK |
| Parceiros | `/parceiros` | Encontrar parceiro de dupla | Todos | `players` | filtros | MOCK |
| Notificações | `/notificacoes` | Lista de notificações | Logado (sem guard) | `notifications` | — | MOCK |
| Feedback do evento | `/feedback/$slug` | Avaliar infraestrutura do evento | Jogador | `FEEDBACK_CRITERIA` | dar notas (estado local) | VISUAL ONLY |
| Meus feedbacks | `/meus-feedbacks` | Histórico de feedbacks enviados | Jogador | `eventFeedbacks` | — | MOCK |
| Denunciar | `/denunciar` | Abrir denúncia | Logado | `REPORT_REASONS` | selecionar alvo/motivo, enviar (local) | VISUAL ONLY |
| Configurações | `/configuracoes` | Privacidade e logout | Logado | `session` | logout real (limpa localStorage) | PARCIAL |

### Autenticação

| Página | Rota | Comportamento real | Status |
| --- | --- | --- | --- |
| Login | `/login` | Campos e-mail/senha existem mas **a senha é ignorada**; procura conta pelo e-mail em `accounts`, e se não achar entra como `player-01`. Também há botões de "entrar como" para cada conta demo | MOCK |
| Cadastro | `/cadastro` | Valida termos+privacidade, senha ≥ 6 e confirmação; ao submeter faz `signIn("player-01")` e vai para `/onboarding`. Campos nome/e-mail/telefone **não são lidos** | MOCK |
| Onboarding | `/onboarding` | Escolha PLAYER / ORGANIZER / BOTH → navega. Escolha **não é persistida** na conta | PARCIAL |
| Escolher perfil | `/escolher-perfil` | Para contas multi-role: define `activeRole` (persistido) | IMPLEMENTADO (sobre dados mock) |
| Recuperação de senha | — | **NÃO IMPLEMENTADO** (não existe rota) |
| Logout | `/configuracoes` + `UserMenu` | Limpa `localStorage` e o contexto | IMPLEMENTADO |

### Organizador (`/organizador/*`)

| Página | Rota | Conteúdo | Status |
| --- | --- | --- | --- |
| Painel | `/organizador` | KPIs, alertas de quadra, eventos | MOCK |
| Meus eventos | `/organizador/eventos` | Lista rascunho/publicado | MOCK |
| Novo evento | `/organizador/novo-evento` | Wizard de 4 etapas: identificação/local, data e horários, capacidade e quadras, formato. Calcula janela de operação, duração estimada (`matches * 35min / courts`) e viabilidade; valida campos obrigatórios; "Publicar" gera string de link e toast; "Salvar rascunho" só emite toast | PARCIAL — nada persiste |
| Alterar evento | `/organizador/alterar-evento/$slug` | Alteração com justificativa + aviso de reembolso obrigatório | VISUAL ONLY |
| Inscrições | `/organizador/inscricoes` | Lista de inscrições pagas | MOCK |
| Financeiro | `/organizador/financeiro` | GMV, taxas, líquido, ledger, reembolsos pendentes | MOCK (agregações calculadas no frontend) |
| Meu plano | `/organizador/plano` | Plano atual, taxa, histórico de planos | MOCK |
| Operação/controle | `/organizador/controle` | Registro de resultados por set, atrasos por quadra, correções auditadas, atletas impactados | PARCIAL — formulário de set atualiza apenas estado local |

### Super Admin (`/admin/*`) — todas MOCK

`/admin` (dashboard global), `/admin/usuarios`, `/admin/organizadores`, `/admin/organizadores/$id`, `/admin/eventos`, `/admin/arenas`, `/admin/publicidade`, `/admin/denuncias`, `/admin/denuncias/$id`, `/admin/feedbacks`, `/admin/financeiro`, `/admin/pagamentos`, `/admin/pagamentos/$id`, `/admin/reembolsos`, `/admin/planos`, `/admin/auditoria`, `/admin/configuracoes`.

Ações de moderação (suspender usuário, suspender evento, aprovar reembolso, decidir denúncia) são **botões sem efeito ou com efeito apenas em estado local**.

---

## 5. Routes

Mapa completo. **Proteção: nenhuma rota é protegida.** Não existe `beforeLoad`, guard, redirect por role ou layout `_authenticated`. Qualquer URL, inclusive `/admin/*`, é acessível deslogado digitando o endereço.

| Rota | Página | Proteção atual | Role esperada (a implementar no backend) |
| --- | --- | --- | --- |
| `/` | Home | nenhuma | pública |
| `/login`, `/cadastro`, `/onboarding`, `/escolher-perfil` | Auth | nenhuma | pública |
| `/eventos`, `/eventos/$slug`, `/arenas`, `/parceiros`, `/ranking`, `/jogadores/$playerId`, `/ao-vivo`, `/placar` | Público | nenhuma | pública |
| `/inscricao/$slug`, `/checkout/$slug`, `/minhas-inscricoes`, `/reembolso/$paymentId`, `/meus-jogos`, `/meus-feedbacks`, `/feedback/$slug`, `/notificacoes`, `/configuracoes`, `/denunciar` | Jogador | nenhuma | PLAYER autenticado |
| `/organizador`, `/organizador/eventos`, `/organizador/novo-evento`, `/organizador/alterar-evento/$slug`, `/organizador/inscricoes`, `/organizador/financeiro`, `/organizador/plano`, `/organizador/controle` | Organizador | nenhuma (só o link do menu é ocultado) | ORGANIZER, dono do recurso |
| `/admin/*` (17 rotas) | Super Admin | nenhuma | SUPER_ADMIN |

Observação: a única "permissão" existente é cosmética — em `src/components/site/shell.tsx` o item de nav "Organizador" é escondido quando há conta logada sem role `ORGANIZER`.

---

## 6. User Flows

### 6.1 Cadastro
Entrada: `/cadastro`. Passos: avatar (input file oculto, sem handler), nome, e-mail, telefone, senha, confirmação, checkboxes de termos e privacidade. Validação: senha ≥ 6, confirmação igual, ambos os checkboxes. Resultado: `signIn("player-01")` + navegação para `/onboarding`. **Os dados digitados são descartados.** Dependências: nenhuma. Limitação: não cria usuário.

### 6.2 Login
Entrada: `/login`. Busca `accounts.find(a => a.email === email)`. Senha nunca verificada. Fallback: `player-01`. Multi-role → `/escolher-perfil`; senão → `homeForRole(role)` (`/admin`, `/organizador` ou `/`). Persistência: `localStorage["saque.session.v1"] = {accountId, activeRole}`.

### 6.3 Logout
`signOut()` remove a chave e zera o contexto. Funciona.

### 6.4 Recuperação de senha
**Não implementado.**

### 6.5 Criação de evento
`/organizador/novo-evento`. Estados locais: `name`, `venueId | customVenue+customCity`, `date`, `start`, `end`, `noLimit`, `teams`, `courts`, `minGames`, `selected` (formato), `published`.
Regras embutidas: janela = `end - start` (em horas, precisa ser > 0); duração estimada = `formato.matches * 35 / courts / 60`; `fits = estimatedHours <= hours`; `canPublish = nenhum campo faltando && fits`. Campos obrigatórios validados: nome, arena/local, data, horários válidos.
Resultado: gera string `saque.app/eventos/<slug>` (slug derivado do nome, sem checagem de unicidade) e toast. **Nada é enviado ou salvo.**

### 6.6 Publicação e link público
O "link público" é apenas texto copiável. O evento publicado não existe fora da tela.

### 6.7 Inscrição
`/inscricao/$slug` → escolher modo → convidar parceiro (marca `sent=true`) → CTA para `/checkout/$slug`. Sem verificação de vagas, de duplicidade, de autenticação ou de prazo.

### 6.8 Pagamento
`/checkout/$slug`: mostra valor (`getEventFinance(slug).feeCents`), método (PIX/Crédito/Débito conforme o evento), políticas de cancelamento/alteração, e um código fixo `INS-5120`. Botões alternam `checkout → pending → paid` em estado local. Sem QR Code real, sem cobrança, sem webhook.

### 6.9 Dashboard do organizador
Leitura de `payments`/`refunds` filtrados por `organizerId` e agregados por `summarize()` no cliente.

### 6.10 Super Admin
Navegação e leitura completas; ações de escrita inertes.

---

## 7. Authentication

- Mecanismo: **mock em Context API + localStorage**. Arquivo: `src/lib/session.tsx`.
- Chave: `saque.session.v1`, valor `{ accountId: string, activeRole: Role }`.
- Sem JWT, sem cookie, sem sessão de servidor, sem refresh, sem expiração, sem hash de senha, sem verificação de e-mail, sem MFA.
- `useSession()` expõe `{ ready, account, activeRole, signIn, signOut, setActiveRole }`.
- `homeForRole(role)`: `SUPER_ADMIN → /admin`, `ORGANIZER → /organizador`, default `/`.
- Proteção de rotas: **inexistente** (ver seção 5).
- Consumidores de `useSession`: apenas `shell.tsx`, `user-menu.tsx`, `index.tsx`, `login.tsx`, `cadastro.tsx`, `onboarding.tsx`, `escolher-perfil.tsx`, `configuracoes.tsx`. As demais 50 rotas ignoram completamente quem está logado.

---

## 8. Users

Tipo `Account` (`src/lib/accounts.ts`):

| Campo | Tipo | Obs |
| --- | --- | --- |
| `id` | string | ex. `player-01` |
| `label` | string | rótulo demo |
| `name` | string | |
| `initials` | string | derivado manualmente, usado no avatar textual |
| `email` | string | |
| `phone` | string | formatado, com mascaramento parcial já no dado |
| `city`, `state` | string | |
| `roles` | `Role[]` | `"PLAYER" \| "ORGANIZER" \| "SUPER_ADMIN"` |
| `playerId?` | string | FK para `Player.id` |
| `organizerName?` | string | |
| `status` | `"ATIVO" \| "SUSPENSO"` | |
| `createdAt` | string `dd/mm/aaaa` | **string, não ISO** |
| `events`, `participations` | number | contadores denormalizados |

Não existem no modelo: data de nascimento, gênero na conta, CPF, avatar (URL), senha, e-mail verificado, último login, aceite de termos.

Tipo `Player` (`src/lib/mock-data.ts`) — perfil esportivo, separado da conta:
`id, name, initials, city, state, gender ("M"|"F"), level (SkillLevel), rankPosition, performancePoints, reputation (0-5), validReviews, totalReviews, events, wins, losses, podiums, bio?`.

Papéis existentes: **PLAYER, ORGANIZER, SUPER_ADMIN** — exatamente três. Contas demo: 4 jogadores (um `SUSPENSO`), 2 organizadores (um também PLAYER), 1 super admin. Todas hardcoded.

Helpers de privacidade puramente visuais: `maskPhone()`, `maskEmail()`.

---

## 9. Organizers

O organizador não é uma entidade própria completa; está espalhado em três lugares:

1. `Account` com role `ORGANIZER` (`organizerName`).
2. `EventItem.organizer` — **string com o nome**, não FK.
3. `OrganizerFinance` (`finance-data.ts`): `id ("org-1")`, `name`, `accountId`, `planId`, `asaas: "CONECTADA"|"PENDENTE"|"NAO_VINCULADA"`, `asaasAccount` (string), `status: "REGULAR"|"ATENCAO"|"BLOQUEADO"`, `planHistory: {at, plan, rate, note}[]`.

Ponto crítico para o backend: hoje há **três identificadores diferentes** para o mesmo organizador (`organizer-01`, `org-1`, `"Arena Norte Beach"`) e o vínculo é feito por nome em algumas telas. Precisa de uma chave única.

---

## 10. Events

Tipo `EventItem` — todos os campos encontrados, sem invenção:

| Campo | Tipo | Obrig. | Enum/valores | Uso na UI |
| --- | --- | --- | --- | --- |
| `id` | string | sim | `e1..en` | chave |
| `slug` | string | sim | | rota `/eventos/$slug` |
| `name` | string | sim | | títulos |
| `organizer` | string (nome) | sim | | exibição |
| `city`, `state` | string | sim | | filtros/exibição |
| `venue` | string | sim | | exibição |
| `date` | string `YYYY-MM-DD` | sim | | ordenação |
| `dateLabel` | string livre | sim | ex. `"22 ago · sáb · 08h30"` | exibição (duplicação de `date`, **inclui a hora, que não existe como campo próprio**) |
| `format` | string livre | sim | ex. `"Pool Play + Gold/Silver"` | exibição |
| `modality` | string | sim | ex. `"2x2"`, `"4x4"` | exibição |
| `category` | `Category` | sim | `Masculino \| Feminino \| Misto \| Open` | filtro |
| `level` | `SkillLevel` | sim | `Iniciante \| Intermediário \| Avançado \| Open \| Livre` | filtro |
| `status` | `EventStatus` | sim | ver seção 31 | badge |
| `eventType` | union | sim | `COMPETITIVO \| SOCIAL \| RANKING \| AMISTOSO \| LIGA \| ESPECIAL` | badge |
| `fee` | **string** | sim | ex. `"R$ 120 / dupla"` | exibição — valor monetário como texto |
| `prize` | string | sim | ex. `"R$ 3.000 + troféus"` | exibição |
| `teamsRegistered` | number | sim | | barra de vagas |
| `maxTeams` | number | sim | | barra de vagas (não há representação de "sem limite" no tipo) |
| `courts` | number | sim | | operação |
| `registrationClose` | string livre | sim | ex. `"18 ago, 23h59"` | exibição |
| `rules` | string[] | sim | | aba Informações |

Não existem no tipo: `description`, `gender` separado de `category`, `time`/`startAt`/`endAt`, `coverImage`, `organizerId`, `venueId`, `createdAt`, `publishedAt`, `minTeams`, `paymentMethods` (isso vive em `EventFinance`).

O wizard de criação (`/organizador/novo-evento`) coleta um conjunto **diferente** do tipo `EventItem`: `name`, `venueId | customVenue+customCity`, `date`, `start`, `end`, `noLimit`, `teams`, `courts`, `minGames`, `format`. Ou seja, **o formulário e o modelo de leitura estão dessincronizados** — o backend deve definir um único schema.

Política financeira do evento vive separada em `EventFinance`: `slug, feeCents, feeUnit ("dupla"|"jogador"), methods[], cancellationDeadline, cancellationPolicy, refundPolicy, changePolicy`, com `defaultEventFinance` como fallback (R$ 120, PIX+Crédito).

---

## 11. Categorias

Tudo **hardcoded como union types TypeScript**, sem tabela, sem configuração, sem endpoint.

- Gênero/categoria: `Category = "Masculino" | "Feminino" | "Misto" | "Open"` (um único campo mistura gênero e "Open").
- Nível: `SkillLevel = "Iniciante" | "Intermediário" | "Avançado" | "Open" | "Livre"`. **Não existem "A+B"** como no briefing.
- Idade (ADULTO / ADOLESCENTE / INFANTIL): **NÃO IMPLEMENTADO** — não há nenhum campo ou enum de faixa etária em lugar nenhum do projeto.
- Modalidade: string livre (`"2x2"`, `"4x4"`), sem enum.
- Tipo de evento: union `COMPETITIVO | SOCIAL | RANKING | AMISTOSO | LIGA | ESPECIAL`.

Recomendação: no backend, separar `gender`, `level` e `age_category` em enums/tabelas distintas.

---

## 12. Registrations (Inscrições)

**Não existe entidade `Registration` no frontend.** Existe apenas `Payment.registrationId` (string, ex. `reg-1`) referenciando uma entidade que não está modelada. Os "inscritos" são derivados de `payments` e de `teams`.

O que existe:

- Modos de inscrição na UI: `parceiro` (convidar jogador existente), `buscar` (entrar em lista de procura), `individual` (sorteio/rotativo).
- Estado local: `mode`, `invited`, `sent`.
- Contadores `teamsRegistered` / `maxTeams` são apenas exibidos.

O que **não** existe: validação de vagas, checagem de duplicidade (mesmo jogador em duas duplas), exigência de autenticação, cadastro durante a inscrição, aceite do parceiro, lista de espera, prazo de inscrição aplicado, cancelamento de inscrição.

Status: **PARCIAL / VISUAL ONLY**.

---

## 13. Payments

Modelo `Payment` (todos os valores em **centavos**, o que é correto e deve ser mantido):

`id, code (visível ao usuário, ex. "INS-4821"), gatewayId (ex. "pay_9a12f7c3"), registrationId, eventSlug, eventName, organizerId, payer, team, categoryLabel, amountCents, method (PIX|CREDITO|DEBITO), status, platformFeeRate (congelada), platformFeeCents, gatewayFeeCents, netCents, createdAt, dueAt, paidAt?, refundId?, ledger: LedgerEntry[]`.

`LedgerEntry`: `{ at, label, detail, amountCents? }` — gerado no cliente por `ledgerFor()`, simulando eventos de webhook (`PAYMENT_RECEIVED`, split, taxa da plataforma, taxa Asaas, saldo do organizador).

Cálculos hoje feitos **no frontend** (`mkPayment`):
- `platformFeeCents = round(amountCents * platformFeeRate / 100)`
- `gatewayFeeCents = PIX ? 199 : round(amountCents * 0.0299) + 39`
- `netCents = amountCents - platformFeeCents - gatewayFeeCents`

Agregações: `summarize()` (gross, platformFee, gatewayFee, net, refunded, chargeback, pending, paidCount, pendingCount), `organizerGmv()`, `platformSummary()`, `revenueByPeriod()`. Todas client-side.

Planos (`Plan`): FREE (5%, limite 3 eventos / 120 inscrições, R$ 0), PRO (3,5%), PREMIUM (2,5%) — com `monthlyCents`, `platformFeeFixedCents`, `eventLimit`, `registrationLimit`, `features[]`.

Reembolsos (`Refund`): `RefundStatus = REQUESTED | APPROVED | PROCESSING | REFUNDED | FAILED | REJECTED`; `RefundCause = EVENTO_ALTERADO | EVENTO_CANCELADO | DESISTENCIA`.

Alterações de evento (`EventChange`): `fields[{label, from, to}]`, `justification`, `notified`, `affected`, `refundRequests` — base da regra de reembolso obrigatório.

Telas: `/checkout/$slug`, `/minhas-inscricoes`, `/reembolso/$paymentId`, `/organizador/financeiro`, `/organizador/plano`, `/admin/financeiro`, `/admin/pagamentos`, `/admin/pagamentos/$id`, `/admin/reembolsos`, `/admin/planos`.

---

## 14. Asaas

**INTEGRAÇÃO NÃO IMPLEMENTADA.**

O que existe é exclusivamente cosmético:

- `GATEWAY = { name: "Asaas", status: "Conectado", environment: "Sandbox", lastSync: "11/08/2026 09:40" }` — constante hardcoded em `finance-data.ts`.
- `<GatewayBadge />` em `src/components/site/finance.tsx` — selo visual.
- `Payment.gatewayId` — strings fictícias.
- Textos de ledger citando `Webhook Asaas · PAYMENT_RECEIVED` — apenas rótulos.
- `OrganizerFinance.asaas` / `asaasAccount` — status e string fictícios.

Não há: SDK, chave de API, URL de sandbox, criação de cobrança, QR Code PIX, split real, webhook, conciliação, subconta, KYC.

---

## 15. Super Admin

Existe como **conjunto de telas de leitura**. 17 rotas sob `/admin`, layout próprio (`src/components/site/admin-shell.tsx` com `AdminTable`, `AdminAction`, navegação lateral).

Cobre: dashboard global (usuários, eventos, arenas, receita de anúncios), usuários, organizadores (lista + detalhe), eventos, arenas parceiras, publicidade (campanhas, posições, CTR), denúncias (lista + triagem com histórico), feedbacks de evento, financeiro global, pagamentos (lista + detalhe com ledger), reembolsos, planos e taxas, auditoria (`AuditEntry`), configurações de plataforma (parâmetros de ranking/reputação).

Permissões: **nenhuma**. Nada verifica `activeRole === "SUPER_ADMIN"`. Ações de moderação não têm efeito persistente.

---

## 16. Mock Data

Tabela mock → entidade sugerida no backend.

| Mock (arquivo · export) | Entidade backend sugerida | Campos-chave | Observações |
| --- | --- | --- | --- |
| `accounts.ts · accounts` | `users` + `user_roles` | id, name, email, phone, city, state, roles[], status, createdAt | roles em tabela separada (nunca na tabela users) |
| `mock-data.ts · players` | `players` (perfil esportivo 1:1 com user) | level, rankPosition, performancePoints, reputation, validReviews, wins, losses, podiums | pontuação deve ser derivada, não armazenada solta |
| `mock-data.ts · events` | `events` | ver seção 10 | separar data/hora reais; `fee` string → `fee_cents` |
| `mock-data.ts · teams` | `teams` / `registrations` | name, seed, a, b (nomes) | jogadores por nome — precisa de FK |
| `mock-data.ts · pools` | `pools` + `pool_standings` | j, v, d, setsWon/Lost, pointsFor/Against, classificationPoints | standings devem ser calculados no backend |
| `mock-data.ts · matches`, `goldBracket` | `matches`, `bracket_matches` | court, time, phase, teamA/B, sets, status, winner | |
| `mock-data.ts · pointTransactions` | `ranking_point_transactions` | type, points, description, event, date | extrato auditável do ranking |
| `mock-data.ts · performanceHistory` | view/agregação | — | derivável |
| `mock-data.ts · reviews` | `player_reviews` | reviewer, event, rating, valid, comment, criteria{technical, sportsmanship, teamwork, commitment} | flag `valid` = regra das 4 participações |
| `mock-data.ts · venues` | `venues` | name, city, state, courts, structure[], upcoming | |
| `mock-data.ts · notifications` | `notifications` | type, title, body, time | |
| `mock-data.ts · formatRecommendations` | `tournament_formats` (config) | name, matches, duration, fits | hoje 3 formatos fixos; o briefing pede muitos mais |
| `admin-data.ts · partnerVenues` | `partner_venues` | contatos, estrutura, `partner`, `since` | 2ª fonte de arenas, conflita com `venues` |
| `admin-data.ts · adCampaigns` | `ad_campaigns` + `ad_placements` | advertiser, positions[], impressions, clicks, priority, período | 10 posições enumeradas |
| `admin-data.ts · reports` | `reports` | target, reason, status, histórico | |
| `admin-data.ts · eventFeedbacks` | `event_feedbacks` | critérios de infraestrutura | distinto de review de jogador |
| `admin-data.ts · auditLog` | `audit_logs` | ator, ação, alvo, timestamp | |
| `finance-data.ts · plans` | `plans` | fee rate, limites, features | |
| `finance-data.ts · organizerFinances` | `organizers` + `organizer_plan_history` | planId, asaas status, status financeiro | |
| `finance-data.ts · payments` | `payments` + `ledger_entries` | ver seção 13 | 12 registros em vários estados |
| `finance-data.ts · refunds` | `refunds` | status, causa | 5 registros incl. falhas e disputa |
| `finance-data.ts · eventChanges` | `event_changes` | fields diff, justificativa, notificação | dispara reembolso obrigatório |
| `finance-data.ts · eventFinances` | `event_financial_policies` | feeCents, methods, políticas | |
| `schedule-data.ts · scheduleMatches` | `scheduled_matches` + `match_sets` | scheduled/actual start/end, sets OFFICIAL/IN_PROGRESS | inclui `setCorrections` (auditoria de correção) |

---

## 17. API Calls

**Nenhuma.** Busca por `fetch(`, `axios`, `XMLHttpRequest`, `useQuery`, `useMutation` e `createServerFn` no diretório `src/` retorna apenas o `fetch` do handler SSR do template (`src/server.ts`), que não chama API alguma.

Não existe: base URL, cliente HTTP, interceptor, tratamento de 401, retry, cache de rede.

---

## 18. Storage

| Mecanismo | Uso | Chave |
| --- | --- | --- |
| `localStorage` | única | `saque.session.v1` → `{accountId, activeRole}` |
| `sessionStorage` | não usado | — |
| IndexedDB | não usado | — |
| Cookies | não usados pela aplicação | — |
| Supabase Storage | não existe | — |

---

## 19. Uploads

**NÃO IMPLEMENTADO.**

Único vestígio: em `/cadastro` há um `<input type="file" accept="image/*" className="hidden" />` dentro de um label "Avatar · Opcional · JPG ou PNG até 2 MB". **Não há `onChange`, nem preview, nem validação de tamanho/tipo, nem destino.** O limite de 2 MB é texto.

Não existe upload de imagem de evento, logo de organizador, foto de arena ou arte de banner publicitário (`AdCampaign.hasDesktopArt/hasMobileArt` são apenas booleanos indicativos).

---

## 20. Validation

Todas as validações são **client-side, ad-hoc e cosméticas**. `zod` só valida um search param; `react-hook-form` não é usado.

| Onde | Validação | Tipo |
| --- | --- | --- |
| `/cadastro` | senha ≥ 6 caracteres; confirmação igual; termos e privacidade obrigatórios; `required` + `type="email"` nativos em nome/e-mail/telefone | frontend |
| `/login` | `type="email"` nativo; **senha não validada** | frontend |
| `/organizador/novo-evento` | nome não vazio, arena/local definido, data preenchida, `end > start`, formato cabe na janela | frontend |
| `/placar` | `zod` no search param `quadra` | frontend |
| Demais formulários | nenhuma | — |

Ausentes: máscara/validação de telefone brasileiro, CPF, idade mínima, valores monetários, unicidade de e-mail, unicidade de slug, datas no passado, capacidade vs. quadras, prazo de inscrição.

---

## 21. Business Rules

### 21.1 Regras que DEVEM ir para o backend (hoje no frontend)

| Regra | Onde está | Observação |
| --- | --- | --- |
| Taxa da plataforma por plano (5% / 3,5% / 2,5%) | `finance-data.ts · plans` | fonte da verdade deve ser o backend |
| Cálculo de `platformFeeCents`, `gatewayFeeCents`, `netCents` | `mkPayment()` | inclusive a heurística de taxa Asaas (PIX R$1,99; cartão 2,99% + R$0,39) |
| Congelamento da taxa na transação | `Payment.platformFeeRate` | crítico para auditoria |
| Split plataforma/organizador | `ledgerFor()` | hoje só texto |
| Máquina de estados de pagamento | `PaymentStatus` | 9 estados |
| Máquina de estados de reembolso | `RefundStatus` + `pendingRefundStatuses` | |
| Reembolso obrigatório em alteração/cancelamento de evento | `EventChange` + textos de política | regra de negócio central, hoje apenas descrita |
| Políticas de cancelamento por evento e prazo | `EventFinance` | strings livres, precisam virar dados |
| Limites de plano (eventos, inscrições) | `Plan.eventLimit`, `registrationLimit` | não aplicados em lugar nenhum |
| Ranking de performance (+2 vitória, −1 derrota, bônus de colocação) | `pointTransactions` (dados prontos, sem motor) | motor precisa existir no backend |
| Reputação e validade da avaliação (`Review.valid`) | flag manual no mock | regra "4 participações" não implementada |
| Limite de vagas / `maxTeams` | apenas exibido | |
| Duplicidade de inscrição | inexistente | |
| Viabilidade de formato (`matches * 35min / courts`) | `novo-evento.tsx` | heurística; deve ser motor no backend |
| Geração de slug do evento | `slugify()` | sem unicidade |
| Permissão para editar/publicar evento | inexistente | |
| Permissão de moderação (Super Admin) | inexistente | |
| Estimativa dinâmica de horários (`estimatedStartMap`, atraso em cascata, `observedDuration`) | `schedule-data.ts` | ~120 linhas de lógica pura, boa candidata a porte para o backend |
| Detecção de conflito de agenda do atleta (`conflictRisks`) | `schedule-data.ts` | |
| Standings de pool (V/D, sets, pontos, classificação) | dados fixos | |
| Auditoria de correção de set | `setCorrections` | mock |

### 21.2 Regras puramente visuais (podem ficar no frontend)

Formatação `brl()` e `pct()`; rótulos (`*_LABEL`); tons de badge (`PAYMENT_STATUS_TONE`); mascaramento `maskEmail`/`maskPhone` (apenas apresentação — o backend não deve enviar o dado completo se não for permitido); filtros de lista; troca de abas; ocultação do link "Organizador"; disclaimer de estimativa; ordenação client-side de rankings já calculados.

---

## 22. Design System

Arquivo único: `src/styles.css` (Tailwind v4, `@theme inline` + CSS variables). Não existe `tailwind.config.js`.

- Nome: **"Areia & Grafite"**.
- Tokens de cor (oklch): `--sand` `0.973 0.011 90`, `--sand-deep` `0.899 0.028 88`, `--graphite` `0.201 0.006 65`, `--graphite-soft` `0.302 0.007 65`, `--line`/`--accent` `0.667 0.196 41` (laranja de linha de quadra), `--destructive` `0.55 0.212 27`, além de `success`, `warning`, `info`, `chart-1..5` e a paleta shadcn (`background`, `card`, `popover`, `muted`, `border`, `input`, `ring`, `sidebar-*`). Tema dark declarado via `@custom-variant dark`.
- Tipografia: `--font-display: Archivo` (títulos, uppercase, tracking), `--font-sans: Barlow` (corpo). Carregadas via `<link>` do Google Fonts no `__root.tsx`.
- Radius: `--radius: 0.375rem`, com escala `sm/md/lg/xl/2xl/3xl/4xl`.
- Utilitários próprios: `sand-grain` (textura), `court-line` (faixas de quadra), `eyebrow` (rótulo uppercase), `input-base`.
- Componentes: shadcn/ui completo em `src/components/ui` (45 arquivos) + camada de domínio em `src/components/site` (ver seção 35).
- Sombras: uso mínimo; a linguagem é de bordas retas (`border border-border`), sem raio nos blocos principais — estética esportiva/impressa.

---

## 23. UX/UI

- **Mobile first**: header colapsa em `Sheet`; existe barra de navegação inferior (`mobileNav`: Início, Eventos, Meus jogos, Ranking, Perfil).
- Hierarquia consistente: `eyebrow` → `h1` → descrição → blocos com borda.
- CTAs: botões retangulares em `accent` com texto uppercase.
- Feedback: `sonner` — usado apenas em `/organizador/novo-evento` e `/organizador/controle`.
- **Loading states: inexistentes** (dados síncronos em memória).
- **Empty states: praticamente inexistentes** — as listas nunca estão vazias no mock.
- Erros: `errorComponent` e `notFoundComponent` definidos nas rotas com `loader` (`/eventos/$slug`, `/inscricao/$slug`, `/checkout/$slug`, `/jogadores/$playerId`, `/reembolso/$paymentId`, `/admin/*/$id`), além do 404/erro global em `__root.tsx`.
- Success states: telas dedicadas em checkout (`paid`) e publicação de evento.
- Responsividade: grids `md:`/`lg:` amplamente usados; modo telão (`/placar`) desenhado para tela grande em dark.

---

## 24. PWA

**NÃO IMPLEMENTADO.** `public/` contém apenas `favicon.ico` e `robots.txt`.

Ausentes: `manifest.webmanifest`, service worker, `vite-plugin-pwa`, ícones 192/512, splash, `theme-color`, estratégia de cache, offline, prompt de instalação. O requisito "PWA / Mobile First" está atendido apenas na parte de layout responsivo.

---

## 25. Performance

Pontos de atenção (não corrigidos):

| Ponto | Detalhe |
| --- | --- |
| Dados em módulo | ~2.400 linhas de fixtures importadas estaticamente; ao migrar para API isso vira request — as telas hoje assumem dados síncronos |
| `recharts` no bundle | dependência pesada instalada e **não utilizada** |
| `react-hook-form`, `date-fns`, `embla-carousel`, `vaul`, `input-otp`, `cmdk` | instalados com uso nulo ou residual |
| Recalculo por render | `estimatedStartMap()` e `summarize()` são chamados no corpo de componentes sem memo em várias telas |
| Imagens | nenhuma imagem real no projeto (avatares são iniciais em CSS) — não há problema de peso hoje, mas também não há pipeline de imagem |
| Code splitting | automático por rota via TanStack Router |
| Lazy loading | não configurado explicitamente |
| SSR | todas as rotas renderizam no servidor com dados de módulo — ao trocar por API será necessário definir loader vs. client fetch |

---

## 26. Security

Riscos identificados (nenhum corrigido):

| # | Risco | Severidade | Detalhe |
| --- | --- | --- | --- |
| 1 | Ausência total de proteção de rotas | CRITICAL | `/admin/*` e `/organizador/*` acessíveis por URL sem sessão |
| 2 | Autenticação falsa | CRITICAL | senha ignorada; qualquer e-mail entra; `player-01` como fallback |
| 3 | Autorização confiada ao cliente | CRITICAL | `roles` vêm de `localStorage` e podem ser editados pelo usuário |
| 4 | Papel do super admin em array client-side | CRITICAL | escalonamento de privilégio trivial no modelo atual |
| 5 | Dados financeiros calculados no cliente | HIGH | taxas, líquido e GMV podem ser manipulados se a lógica permanecer no front |
| 6 | PII em código-fonte | MEDIUM | e-mails, telefones e cidades das contas demo estão versionados (fictícios, mas o padrão é perigoso) |
| 7 | Sessão sem expiração | MEDIUM | `localStorage` sem TTL, sem revogação |
| 8 | Sem CSRF/CORS/rate limit | — | não aplicável hoje; será do backend |
| 9 | Segredos expostos | NENHUM | não há API key, token ou `.env` no repositório — verificado |

---

## 27. Mobile

- Viewport correto (`width=device-width, initial-scale=1`) no `__root.tsx`.
- Bottom navigation com 5 itens; o item "Perfil" aponta para `/jogadores/$playerId` — **depende de um `playerId` que nem toda conta possui** (organizador sem `playerId`, super admin) — ponto de atenção.
- Touch targets: botões/CTAs em `h-11`/`h-12` (≥ 44px) — adequado; alguns ícones do header em `h-9 w-9` (36px) ficam abaixo do recomendado.
- Formulários: inputs nativos (`type="date"`, `type="time"`, `type="email"`) — bom teclado mobile; sem `inputMode` numérico em campos numéricos.
- Modais: `Sheet`/`Dialog` do Radix, com scroll-lock adequado.
- Sem gestos customizados, sem pull-to-refresh, sem safe-area insets para iOS.

---

## 28. Accessibility

- Semântica: uso correto de `header`, `nav`, `main`, `h1` único por página.
- Labels: a maioria dos inputs está dentro de `<label>`; alguns usam apenas `placeholder`.
- `aria-label` presente em botões-ícone (Notificações, Menu).
- Foco: anéis padrão do shadcn preservados; não há skip-link.
- Contraste: grafite sobre areia tem contraste alto; o `accent` laranja sobre branco em textos pequenos é o ponto mais frágil.
- ARIA em componentes complexos: herdado do Radix (tabs, dialog, dropdown) — adequado.
- Não há testes de leitor de tela nem `aria-live` para atualizações de placar.

---

## 29. Dependencies

| Pacote | Versão | Finalidade | Criticidade | Observação |
| --- | --- | --- | --- | --- |
| `@tanstack/react-start` | 1.168.32 | framework SSR | CRÍTICA | fixa a arquitetura |
| `@tanstack/react-router` | 1.170.18 | roteamento | CRÍTICA | file-based |
| `@tanstack/react-query` | ^5.101.1 | cache de servidor | ALTA | montado, **sem uso** — será a base do consumo da API |
| `react` / `react-dom` | ^19.2.0 | UI | CRÍTICA | |
| `tailwindcss` + `@tailwindcss/vite` | ^4.2.1 | estilos | CRÍTICA | config em CSS |
| Radix UI (22 pacotes) | várias | primitivos shadcn | ALTA | |
| `lucide-react` | ^0.575.0 | ícones | MÉDIA | |
| `zod` | ^3.24.2 | validação | MÉDIA | uso mínimo hoje; ideal para validar respostas da API |
| `react-hook-form` + resolvers | ^7.71 / ^5.2 | formulários | MÉDIA | **não usado** |
| `sonner` | ^2.0.7 | toasts | MÉDIA | |
| `recharts` | ^2.15.4 | gráficos | BAIXA | **não usado**, peso morto |
| `date-fns` | ^4.1.0 | datas | BAIXA | uso residual |
| `embla-carousel-react`, `vaul`, `cmdk`, `input-otp`, `react-day-picker`, `react-resizable-panels` | várias | shadcn deps | BAIXA | sem uso de produto |
| `vite` | ^8.2.0 | build | CRÍTICA | |
| `nitro` | 3.0.260603-beta | server build | ALTA | beta; alvo Cloudflare |

Não há dependência de HTTP client, SDK de pagamento, SDK de auth ou biblioteca de PWA.

---

## 30. Environment Variables

**Nenhuma variável de ambiente é lida pelo código da aplicação.** Busca por `import.meta.env` e `process.env` em `src/` retorna zero ocorrências fora da infra do template. Não existe arquivo `.env` no repositório.

Nenhum segredo exposto — verificado.

Variáveis que o frontend **passará a precisar** (PROPOSTA):

```
VITE_API_URL          # base da volei-api
VITE_APP_ENV          # local | staging | production
VITE_PUBLIC_SITE_URL  # para gerar links públicos de evento
```

Chaves de Asaas, banco e JWT devem existir **somente** no `volei-api`.

---

## 31. Estados

### Estados existentes no código

| Domínio | Enum | Valores |
| --- | --- | --- |
| Evento | `EventStatus` | `RASCUNHO`, `PUBLICADO`, `INSCRICOES_ABERTAS`, `INSCRICOES_ENCERRADAS`, `AGUARDANDO_SORTEIO`, `CHAVE_PUBLICADA`, `EM_ANDAMENTO`, `FINALIZADO`, `CANCELADO` |
| Pagamento | `PaymentStatus` | `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `EXPIRED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CHARGEBACK` |
| Reembolso | `RefundStatus` | `REQUESTED`, `APPROVED`, `PROCESSING`, `REFUNDED`, `FAILED`, `REJECTED` |
| Causa de reembolso | `RefundCause` | `EVENTO_ALTERADO`, `EVENTO_CANCELADO`, `DESISTENCIA` |
| Denúncia | `ReportStatus` | `PENDENTE`, `EM_ANALISE`, `SOLICITACAO_INFO`, `RESOLVIDA`, `IMPROCEDENTE`, `ARQUIVADA` |
| Alvo de denúncia | `ReportTarget` | `ORGANIZADOR`, `PARTICIPANTE`, `ARENA`, `EVENTO` |
| Conta | `Account.status` | `ATIVO`, `SUSPENSO` |
| Organizador (financeiro) | `OrganizerFinanceStatus` | `REGULAR`, `ATENCAO`, `BLOQUEADO` |
| Conexão Asaas | `OrganizerAsaasStatus` | `CONECTADA`, `PENDENTE`, `NAO_VINCULADA` |
| Plano | `PlanStatus` | `ATIVO`, `INATIVO` |
| Campanha | `AdStatus` | `ATIVA`, `PAUSADA`, `AGENDADA`, `ENCERRADA` |
| Partida (mock legado) | `Match.status` | `SCHEDULED`, `IN_PROGRESS`, `FINISHED` |
| Partida (agenda) | `ScheduledMatch.status` | `SCHEDULED`, `LIVE`, `FINISHED` |
| Set | `SetResult.status` | `OFFICIAL`, `IN_PROGRESS` |
| Método de pagamento | `PaymentMethod` | `PIX`, `CREDITO`, `DEBITO` |
| Tipo de evento | `EventItem.eventType` | `COMPETITIVO`, `SOCIAL`, `RANKING`, `AMISTOSO`, `LIGA`, `ESPECIAL` |
| Transação de ponto | `PointTransaction.type` | `MATCH_WIN`, `MATCH_LOSS`, `FINAL_RUNNER_UP`, `CHAMPION`, `OTHER` |

Inconsistência a resolver: dois enums de status de partida (`IN_PROGRESS` vs `LIVE`).

### Estados sugeridos (não existem hoje)

`Registration`: `DRAFT`, `PENDING_PARTNER`, `PENDING_PAYMENT`, `CONFIRMED`, `WAITLIST`, `CANCELLED`.
`User`: `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `DELETED`.

---

## 32. Frontend ↔ Backend Contract — **PROPOSTA**

> Nada abaixo existe hoje. É uma proposta derivada dos tipos do frontend, para discussão.

Convenções sugeridas: REST JSON, `Authorization: Bearer <JWT>`, valores monetários sempre em **centavos** (`*_cents`), datas em ISO 8601 UTC, paginação `?page=&per_page=`, erros no formato Laravel (`{message, errors}`).

### Auth
| Método | Endpoint | Request | Response | Auth | Permissão |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | name, email, phone, password, terms_accepted | user + token | não | público |
| POST | `/api/auth/login` | email, password | user + roles + token | não | público |
| POST | `/api/auth/logout` | — | 204 | sim | qualquer |
| POST | `/api/auth/forgot-password` | email | 202 | não | público |
| POST | `/api/auth/reset-password` | token, password | 204 | não | público |
| GET | `/api/me` | — | user + roles + player profile | sim | qualquer |
| PATCH | `/api/me` | perfil, privacidade | user | sim | dono |
| POST | `/api/me/avatar` | multipart | url | sim | dono |

### Eventos
| Método | Endpoint | Observação |
| --- | --- | --- |
| GET | `/api/events` | filtros: `category`, `level`, `city`, `state`, `status`, `type` |
| GET | `/api/events/{slug}` | público; inclui policy financeira, regras, vagas |
| POST | `/api/events` | ORGANIZER; retorna `DRAFT` |
| PATCH | `/api/events/{id}` | ORGANIZER dono; gera `EventChange` quando data/hora/local mudam |
| POST | `/api/events/{id}/publish` | valida plano, viabilidade e completude |
| POST | `/api/events/{id}/cancel` | dispara reembolso obrigatório |
| GET | `/api/events/{slug}/teams` `/pools` `/bracket` `/matches` `/standings` | público |
| POST | `/api/events/formats/simulate` | motor de viabilidade (duplas, quadras, janela) |

### Inscrições e pagamentos
| Método | Endpoint | Observação |
| --- | --- | --- |
| POST | `/api/events/{id}/registrations` | valida vagas, duplicidade, prazo, categoria |
| GET | `/api/me/registrations` | |
| POST | `/api/registrations/{id}/invite` | convite ao parceiro |
| POST | `/api/registrations/{id}/accept` | aceite do parceiro |
| DELETE | `/api/registrations/{id}` | política de cancelamento |
| POST | `/api/registrations/{id}/payments` | cria cobrança no Asaas; retorna PIX/QR ou link |
| GET | `/api/payments/{id}` | inclui ledger |
| POST | `/api/payments/{id}/refunds` | motivo obrigatório |
| POST | `/api/webhooks/asaas` | **público com verificação de assinatura**; idempotente |

### Organizador
`GET /api/organizer/dashboard`, `/api/organizer/events`, `/api/organizer/registrations`, `/api/organizer/finance` (summary + ledger), `/api/organizer/plan`, `POST /api/organizer/asaas/connect`.

### Partidas e agenda
`POST /api/matches/{id}/sets` (resultado oficial), `PATCH /api/matches/{id}/sets/{n}` (correção auditada), `POST /api/matches/{id}/start|finish`, `GET /api/events/{slug}/schedule` (com ETA calculado no backend), `GET /api/courts/{id}/status`.

### Ranking e reputação
`GET /api/rankings/performance`, `GET /api/rankings/reputation`, `GET /api/players/{id}`, `GET /api/players/{id}/point-transactions`, `POST /api/players/{id}/reviews`.

### Governança
`POST /api/reports`, `GET/PATCH /api/admin/reports/{id}`, `GET /api/admin/users`, `PATCH /api/admin/users/{id}/status`, `GET /api/admin/events`, `PATCH /api/admin/events/{id}/status`, `CRUD /api/admin/venues`, `CRUD /api/admin/ads`, `GET /api/admin/finance`, `GET /api/admin/audit-logs`, `CRUD /api/admin/plans`, `GET/PATCH /api/admin/settings`.

Permissões: `público`, `auth`, `owner` (organizador dono do evento / jogador dono da inscrição), `admin`.

---

## 33. Current Status

| Funcionalidade | Status | Observação |
| --- | --- | --- |
| Design system | IMPLEMENTADO | tokens, tipografia, utilitários próprios |
| Navegação / shell / bottom nav | IMPLEMENTADO | |
| Login | MOCK | senha ignorada, contas hardcoded |
| Cadastro | MOCK | dados descartados |
| Recuperação de senha | NÃO IMPLEMENTADO | |
| Onboarding de papel | PARCIAL | escolha não persiste |
| Troca de papel (multi-role) | IMPLEMENTADO | persistido em localStorage |
| Logout | IMPLEMENTADO | |
| Proteção de rotas | NÃO IMPLEMENTADO | |
| Listagem/detalhe de eventos | MOCK | |
| Criação de evento | PARCIAL | validação e viabilidade reais; sem persistência |
| Edição/alteração de evento | VISUAL ONLY | |
| Publicação e link público | VISUAL ONLY | link é string |
| Inscrição | PARCIAL | UI completa, sem regras |
| Checkout / pagamento | VISUAL ONLY | 3 estados locais |
| Integração Asaas | NÃO IMPLEMENTADO | |
| Reembolsos | MOCK | |
| Financeiro do organizador | MOCK | agregação client-side |
| Planos e taxas | MOCK | |
| Dashboard do organizador | MOCK | |
| Controle de inscritos | MOCK | derivado de payments |
| Painel de partidas / sets / ETA | PARCIAL | motor de estimativa real sobre dados fixos |
| Modo telão | MOCK | com seletor de quadra funcional |
| Ranking performance / reputação | MOCK | sem motor de cálculo |
| Avaliações de jogador | MOCK | |
| Feedback de evento | VISUAL ONLY | |
| Denúncias | MOCK (admin) / VISUAL ONLY (criação) | |
| Arenas / parceiros | MOCK | duas fontes conflitantes |
| Publicidade | MOCK | |
| Super Admin | MOCK | leitura completa, ações inertes |
| Auditoria | MOCK | |
| Notificações | MOCK | sem push, sem e-mail |
| Uploads | NÃO IMPLEMENTADO | |
| PWA | NÃO IMPLEMENTADO | |
| Testes | NÃO IMPLEMENTADO | nenhum arquivo de teste |

---

## 34. Phase 1 Gap Analysis

| Item da Fase 1 | Situação | O que falta |
| --- | --- | --- |
| Cadastro de usuários | PARCIAL (UI) | persistência, unicidade, hash, verificação de e-mail |
| Login | MOCK | credenciais reais, JWT, refresh, expiração, reset de senha |
| Organizador | PARCIAL | entidade única, vínculo com conta, onboarding real |
| Criação de evento | PARCIAL | persistência, schema único, slug único, upload de capa |
| Edição de evento | VISUAL ONLY | diff, versionamento, notificação, gatilho de reembolso |
| Publicação | VISUAL ONLY | transição de estado, validações de plano |
| Link público | VISUAL ONLY | URL real e canônica |
| Inscrição | PARCIAL | entidade `Registration`, vagas, duplicidade, convite/aceite, prazo |
| Cadastro + inscrição no mesmo fluxo | NÃO IMPLEMENTADO | |
| Pagamento Asaas | NÃO IMPLEMENTADO | cobrança, PIX, cartão, split, webhook, conciliação |
| Controle de inscritos | MOCK | lista real, exportação, check-in |
| Controle financeiro | MOCK | ledger persistido, repasses, extratos |
| Dashboard do organizador | MOCK | métricas reais |
| Super Admin básico | MOCK | autorização + ações efetivas |
| Auditoria | MOCK | log imutável no banco |
| Segurança | NÃO IMPLEMENTADO | autenticação, autorização, RBAC, rate limit, LGPD |

Resumo: **a Fase 1 está ~35% pronta em UI e 0% pronta em backend.**

---

## 35. Phase 2 Deferred Features (já existem visualmente)

Marcar como `FUTURE / PHASE 2` — telas prontas, sem motor:

- Ranking de performance (`/ranking`, extrato em `/jogadores/$playerId`).
- Reputação e avaliações entre jogadores (critérios técnicos/esportividade/entrosamento/comprometimento; flag `valid`).
- Partidas, sets, resultados oficiais e correções auditadas (`/organizador/controle`).
- Chaveamento (Gold/Silver bracket) e classificação de pools.
- Painel ao vivo (`/ao-vivo`) e modo telão (`/placar?quadra=`).
- Estimativa dinâmica de horários (ETA), atraso em cascata e conflitos de agenda.
- Arenas e arenas parceiras (`/arenas`, `/admin/arenas`).
- Busca de parceiro de dupla (`/parceiros`).
- Publicidade e anunciantes (`/admin/publicidade`, `AdSlot` com 10 posições).
- Feedback de infraestrutura do evento (`/feedback/$slug`, `/admin/feedbacks`).
- Denúncias e moderação (`/denunciar`, `/admin/denuncias`).
- Notificações in-app (`/notificacoes`).
- Planos PRO/PREMIUM e cobrança de assinatura.

---

## 36. Technical Debt

| # | Problema | Impacto | Prioridade | Recomendação |
| --- | --- | --- | --- | --- |
| 1 | Nenhuma proteção de rota / RBAC | acesso indevido a admin e organizador | CRITICAL | criar layout `_authenticated` e guards por role assim que houver JWT |
| 2 | Autenticação fake com contas hardcoded | bloqueia tudo | CRITICAL | substituir `session.tsx` por client de `/api/auth` + token |
| 3 | Regras financeiras no cliente | risco de fraude e divergência contábil | CRITICAL | mover 100% dos cálculos para o backend; frontend só exibe |
| 4 | Entidade `Registration` inexistente | fluxo central sem modelo | CRITICAL | modelar antes de qualquer coisa; `Payment.registrationId` já a pressupõe |
| 5 | Identificadores inconsistentes (`organizer-01` / `org-1` / nome) | joins impossíveis | HIGH | chave única de organizador e FKs em eventos, pagamentos e times |
| 6 | Datas e valores como string (`dateLabel`, `fee`, `createdAt "dd/mm/aaaa"`, horas `"11:12"`) | parsing frágil, timezone | HIGH | ISO 8601 + centavos em toda a API |
| 7 | Formulário de criação de evento ≠ modelo `EventItem` | contrato ambíguo | HIGH | schema único compartilhado (zod ↔ FormRequest) |
| 8 | Duas fontes de arenas (`venues` vs `partnerVenues`) | duplicidade | MEDIUM | uma tabela `venues` com flag `is_partner` |
| 9 | Dois enums de status de partida (`IN_PROGRESS` vs `LIVE`) | inconsistência | MEDIUM | unificar |
| 10 | React Query montado e não usado | trabalho retrabalhado | MEDIUM | adotar `queryOptions` + loaders na migração |
| 11 | `react-hook-form` e `zod` não usados nos formulários | validação frágil | MEDIUM | padronizar RHF + zod |
| 12 | `recharts` e outras libs sem uso no bundle | peso | LOW | remover ou usar |
| 13 | Sem loading/empty/error states de rede | UX quebra ao ligar API | HIGH | prever skeletons e vazios em toda lista |
| 14 | Sem PWA | requisito do produto não atendido | MEDIUM | `vite-plugin-pwa`, manifest, ícones |
| 15 | Sem uploads | avatar e capa de evento impossíveis | MEDIUM | definir storage (S3/R2) e endpoint |
| 16 | Zero testes | regressões silenciosas | MEDIUM | vitest + testing-library nos fluxos críticos |
| 17 | Bottom nav "Perfil" depende de `playerId` inexistente para admin/organizador | link quebrado | LOW | rota `/meu-perfil` resolvida pelo backend |
| 18 | Textos de política financeira como string livre | não auditável | LOW | estruturar em campos (prazo, percentual, condições) |

---

## 37. Risks

1. **Segurança (CRITICAL)** — hoje qualquer pessoa acessa `/admin`. Enquanto o backend não impuser RBAC, nada no frontend impede privilégio.
2. **Contabilidade (CRITICAL)** — taxas, split e líquido calculados no cliente. Se essa lógica for reaproveitada como fonte da verdade, haverá divergência com o extrato do Asaas.
3. **Contrato ambíguo (HIGH)** — o formulário de evento e o modelo de leitura divergem; se o backend copiar um dos dois, metade das telas quebra.
4. **Tipos frouxos (HIGH)** — dinheiro em string (`fee: "R$ 120 / dupla"`) e datas em português (`"22 ago · sáb · 08h30"`) convivem com campos corretos (`feeCents`, `date`). Padronizar é pré-requisito.
5. **Ausência da entidade Registration (HIGH)** — o núcleo do produto (inscrição) não tem modelo; pagamentos referenciam um `registrationId` fantasma.
6. **Escopo (MEDIUM)** — há muita superfície de Fase 2 já desenhada (ranking, sets, ETA, publicidade). Risco de o backend tentar entregar tudo junto e atrasar a Fase 1.
7. **Migração de dados síncronos (MEDIUM)** — todas as telas assumem dados disponíveis no primeiro render; a introdução de latência exigirá retrabalho de UI em praticamente todas as rotas.
8. **Runtime Cloudflare Worker (LOW)** — o `volei-app` roda em Worker; chamadas SSR à `volei-api` precisam considerar egress, CORS e timeouts.

---

## 38. Recommendations — ordem sugerida para o `volei-api`

1. **Fundação**: `users`, `user_roles` (tabela separada), auth JWT (login, registro, refresh, reset), `/api/me`. Em paralelo, no frontend: substituir `session.tsx` e criar guards.
2. **Organizadores e eventos**: entidade `organizers` com chave única; `events` com schema único (data/hora ISO, `fee_cents`, `max_teams` nullable = sem limite), `venues`, `event_status` como máquina de estados; publicação com validação.
3. **Inscrições**: `registrations` + `teams` + convite/aceite + vagas + duplicidade + prazo. É o gargalo do produto.
4. **Pagamentos**: `payments`, `ledger_entries`, `refunds`, `plans`, `organizer_plan_history`; integração Asaas (cobrança, PIX, split, webhook idempotente com verificação de assinatura); taxa congelada na transação.
5. **Governança**: `audit_logs` desde o dia 1, RBAC do super admin, `reports`, suspensão de usuários/eventos.
6. **Fase 2**: partidas, sets, standings, bracket, motor de ranking e reputação, ETA de agenda, arenas parceiras, publicidade, feedbacks.

Regras transversais para o backend: dinheiro sempre em centavos; toda mutação relevante gera log de auditoria; alteração de data/hora/local de evento publicado gera `event_change` + notificação + direito a reembolso; a taxa da plataforma é congelada no momento da cobrança e nunca recalculada.

---

## 39. Final Handoff Notes

- O `volei-app` deve ser tratado como **camada de apresentação já validada**, não como aplicação funcional.
- Os arquivos `src/lib/mock-data.ts`, `admin-data.ts`, `finance-data.ts` e `schedule-data.ts` são a **especificação de domínio mais confiável** que existe hoje — os nomes de campos e enums foram desenhados com a regra de negócio em mente e devem ser a base do schema PostgreSQL (com as correções de tipagem apontadas na seção 36).
- Ao ligar a API, o caminho natural é: `queryOptions` + `ensureQueryData` nos loaders das rotas e `useSuspenseQuery` nos componentes (React Query já está montado), substituindo os imports diretos de `src/lib/*`.
- Nada neste documento descreve funcionalidade existente que não tenha sido verificada no código. Onde não foi possível determinar, está escrito explicitamente.
- **Nenhuma alteração foi feita no projeto durante esta auditoria.**
