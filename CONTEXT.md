# Handoff Diff Tool — Contexto Completo do Projeto

## O que é

Plugin para Figma que detecta automaticamente o que mudou entre versões de uma tela e publica um review para o time de desenvolvimento. O dev abre a dashboard web e vê cada mudança categorizada — sem reunião, sem pergunta.

**Problema resolvido:** o designer atualiza uma tela, não documenta, e o dev precisa caçar as diferenças na mão. O Handoff elimina esse atrito.

---

## Versão atual: v0.3.0

---

## O que mudou desde a última versão

### Segurança (Sprint 1)
- Reviews isolados por usuário autenticado
- Cookie JWT agora httpOnly via Route Handler
- Middleware de rotas /dashboard → /login confirmado
- Rota pública remove checkedBy para evitar injeção

### Produto (Sprint 2)
- Plugin distingue no_changes / offline / synced com visuais diferentes
- includePosition agora usa o setting real (não mais hardcoded false)
- Re-autenticação automática quando token expira (401)
- Feedback progressivo de cold start: "Conectando...", "Publicando..."
- Polling preserva filtro de status ativo
- fileName usa figma.root.name em vez de 'Figma File' hardcoded

### Gestão e onboarding (Sprint 3)
- Deletar e arquivar reviews (backend + frontend com confirmação)
- Reset de baseline por frame no plugin
- Tela de onboarding para primeiro acesso
- Badge de novos reviews dismissível

### Qualidade técnica (Sprint 4)
- Paginação no GET /api/reviews com limit/offset/total/hasMore
- Debounce de 500ms no SAVE_FIGMA_URL
- capturingFrameIds sempre limpo no finally
- Rate limiting por IP nas rotas públicas via Redis
- auth.ts marcado como server-only
- api/MIGRATIONS.md criado com schema e guia completo

### Feature B — Dashboard por arquivo
- GET /api/files e GET /api/files/:fileKey/reviews
- Página /dashboard/files com FileCard (badges por status)
- Página /dashboard/files/[fileKey] com reviews filtrados
- Arquivos locais desabilitados sem gerar 404
- Item "Arquivos" na sidebar

### Feature A — Notificações Slack
- Tabela slack_integrations no banco (migration 003)
- Notificação fire-and-forget ao publicar review
- Página /dashboard/settings com campo de webhook
- Botão de teste, mascaramento do URL, remoção com confirmação
- Item "Configurações" na sidebar

### Comentários por item de review
- Migration 004: coluna `comment TEXT` em review_items
- Backend: `patchReviewItem` e `patchPublicReviewItem` aceitam `comment?: string`
- COALESCE preserva comentário existente se não passado novo valor
- `getReview` e `getPublicReview` retornam `comment` em cada item
- Dashboard: checkbox para marcar abre campo de texto opcional com botões "Confirmar" e "Pular" antes de enviar o PATCH
- Página pública: mesmo comportamento com `confirmingId` global (um item por vez)
- Exibe 💬 "texto" abaixo do item quando `comment` está preenchido

---

## Monorepo — Estrutura

```
handoff-diff-tool/
├── plugin/        ← Plugin Figma (TypeScript + React + Vite)
├── api/           ← Backend REST (Node.js + Fastify + PostgreSQL + Redis)
├── web/           ← Dashboard web (Next.js 16 + Tailwind)
├── CONTEXT.md     ← este arquivo
└── package.json   ← scripts raiz para orquestrar tudo
```

### Scripts raiz úteis
```bash
npm run dev          # plugin em modo watch
npm run build        # build de produção do plugin
npm run test:run     # testes do plugin (vitest)
npm run typecheck    # typecheck do plugin

npm run api:dev      # inicia o backend local
npm run api:install  # instala deps do backend

npm run web:dev      # inicia a dashboard local (localhost:3000)
npm run web:build    # build de produção da dashboard
npm run web:install  # instala deps da dashboard
```

---

## URLs de Produção

| Serviço | URL |
|---|---|
| Backend (Render) | https://handoff-api.onrender.com |
| Dashboard (Vercel) | https://handoff-diff-tool.vercel.app |
| GitHub | https://github.com/Jitterkkk/handoff-diff-tool |

---

## Infraestrutura

| Serviço | Provedor | Plano |
|---|---|---|
| Backend (Node.js) | Render | Free (dorme após 15 min idle) |
| Banco de dados | Neon (PostgreSQL 15) | Free |
| Cache/OAuth state | Upstash (Redis REST) | Free |
| Dashboard | Vercel | Free |

**Atenção ao Render free:** o backend dorme após 15 min sem requests. O primeiro request após o sleep pode demorar ~30s para acordar. Isso afeta a autenticação do plugin na primeira abertura.

---

## Figma OAuth App

| Campo | Valor |
|---|---|
| Client ID | `ww7Bhv8yY8easYiBFY1RnO` |
| Callback URL | `https://handoff-api.onrender.com/auth/figma/callback` |
| Scopes | `current_user:read` |

O Client Secret está nas variáveis de ambiente do Render (`FIGMA_CLIENT_SECRET`).

---

## Variáveis de Ambiente

### Backend (Render)

```env
DATABASE_URL=postgresql://...@neon.tech/handoff
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
JWT_SECRET=...                           # string longa aleatória
FIGMA_CLIENT_ID=ww7Bhv8yY8easYiBFY1RnO
FIGMA_CLIENT_SECRET=...
FRONTEND_URL=https://handoff-diff-tool.vercel.app
API_BASE=https://handoff-api.onrender.com
PORT=3001
NODE_ENV=production
```

### Dashboard (Vercel)

```env
NEXT_PUBLIC_API_URL=https://handoff-api.onrender.com
NEXT_PUBLIC_APP_URL=https://handoff-diff-tool.vercel.app
```

---

## Plugin Figma (`plugin/`)

### Fluxo atual (simplificado)

```
1. Designer seleciona um frame no Figma
2. Plugin captura o baseline automaticamente (clientStorage)
3. Designer faz as alterações
4. Abre o plugin → clica "Publicar review"
5. Plugin detecta o diff, salva local + envia para o backend
6. Confirmação: synced=true (backend OK) ou synced=false (offline)
```

### Arquitetura do plugin

O Figma executa o plugin em dois contextos isolados:

- **Sandbox** (`plugin/plugin/`): acesso à `figma.*` API, sem DOM
- **UI/iframe** (`plugin/ui/`): DOM + React, sem acesso à `figma.*`

Comunicação via `postMessage` tipado em `plugin/shared/types.ts`.

### Arquivos principais

| Arquivo | Responsabilidade |
|---|---|
| `plugin/plugin/code.ts` | Entry point: auth init, handlers de mensagem, selectionchange |
| `plugin/plugin/snapshot.ts` | `takeSnapshot()` — serializa frame recursivamente |
| `plugin/plugin/diff.ts` | `diffSnapshots()` — compara dois snapshots, retorna DiffResult[] |
| `plugin/plugin/storage.ts` | clientStorage: histórico LZString, reviews, settings, auth token |
| `plugin/plugin/badge.ts` | Badge visual colorido no canvas do Figma |
| `plugin/plugin/highlight.ts` | Retângulo temporário vermelho sobre nodes alterados |
| `plugin/plugin/reviewUtils.ts` | Puras: computePendingCount, computeReviewStatus, applyItemCheck |
| `plugin/plugin/api.ts` | Cliente HTTP para o backend (fetch + AbortController 10s timeout) |
| `plugin/ui/App.tsx` | Componente raiz: máquina de 5 estados |
| `plugin/ui/components/FrameSelector.tsx` | Nome do frame + indicador de auth (●verde/●cinza) |
| `plugin/shared/types.ts` | Tipos compartilhados entre sandbox e UI |

### Estados da UI do plugin

```
no_frame   → Nenhum frame selecionado no canvas
ready      → Frame selecionado + baseline capturado → botão "Publicar review"
publishing → Spinner (aguarda backend, até 10s)
published  → synced=true: "Review publicado e sincronizado com o time!"
             synced=false: "Review salvo localmente"
             Auto-reset para 'ready' após 3s
error      → Mensagem de erro + botão "Tentar novamente"
```

### Autenticação do plugin

1. Na inicialização (`void (async () => {...})()`), tenta `loadAuthToken()` do clientStorage
2. Se não tiver: chama `POST /auth/plugin` com `figma.currentUser` (id, name, photoUrl)
3. Token JWT (30 dias) salvo no clientStorage com chave `handoff:auth:token`
4. Se o backend estiver offline: continua em modo offline silenciosamente
5. `AUTH_STATUS` enviado para a UI com `{ authenticated, userName }`

**Nota:** o plugin usa IIFE assíncrono (não top-level await) porque o Rollup em formato IIFE não suporta top-level await.

### Storage local (clientStorage do Figma)

```
handoff:history:{frameId}   → snapshots comprimidos (LZString, máx 5, limite 900KB)
handoff:review:{frameId}    → review local mais recente do frame (JSON)
handoff:settings            → { includePosition: boolean }
handoff:auth:token          → JWT do backend
```

### Build do plugin

- **Vite** com dois builds: UI (singlefile HTML inline) + sandbox (IIFE)
- **Target ES2017** para compatibilidade com o sandbox do Figma
- Bundle atual: ~17 kB gzip para code.js

### manifest.json (resumo)

```json
{
  "permissions": ["currentuser"],
  "networkAccess": { "allowedDomains": ["https://handoff-api.onrender.com"] }
}
```

---

## Backend (`api/`)

### Stack

- Node.js 20 + TypeScript strict + Fastify 5
- postgres.js (pool), @upstash/redis (REST), Zod (validação), @fastify/jwt

### Rotas REST

```
GET  /health
POST /auth/plugin            → upsert user + JWT (não requer token)
GET  /auth/me                → JWT requerido
GET  /auth/figma             → inicia OAuth (state no Redis, TTL 600s)
GET  /auth/figma/callback    → valida state, troca code, upsert user, redireciona com JWT

POST   /api/reviews                          → JWT — cria review + items em transaction
                                               dispara notificação Slack (fire-and-forget)
GET    /api/reviews?fileKey=&status=         → JWT — lista paginada (limit/offset/total/hasMore)
GET    /api/reviews/:id                      → JWT — detalhe com items
PATCH  /api/reviews/:id/items/:itemId        → JWT — check/uncheck + recalcula status
DELETE /api/reviews/:id                      → JWT — deleta review
PATCH  /api/reviews/:id/archive              → JWT — arquiva review (archived_at)

GET    /api/reviews/:id/public               → público, rate limit 60/min por IP
PATCH  /api/reviews/:id/items/:itemId/public → público, rate limit 30/min por IP

GET    /api/files                            → JWT — lista arquivos com stats por status
GET    /api/files/:fileKey/reviews           → JWT — reviews de um arquivo (paginado)
GET    /api/files/:fileKey/members           → JWT — membros do arquivo

GET    /api/slack/webhook                    → JWT — retorna integração atual
POST   /api/slack/webhook                    → JWT — cria ou atualiza webhook
DELETE /api/slack/webhook                    → JWT — remove integração
POST   /api/slack/test                       → JWT — envia mensagem de teste no Slack
```

### Schema do banco de dados

```
files             (id UUID PK, figma_file_key UNIQUE, name, created_at, updated_at)
users             (id UUID PK, figma_user_id UNIQUE, name, email, avatar_url, ...)
reviews           (id UUID PK, file_id→files, frame_id, frame_name, published_by→users,
                   description, status [pending|in_progress|done],
                   snapshot_before JSONB, snapshot_after JSONB,
                   published_at, updated_at, archived_at TIMESTAMPTZ)
review_items      (id UUID PK, review_id→reviews, node_id, node_name, diff_type,
                   severity [high|medium|low], before_value JSONB, after_value JSONB,
                   checked_at TIMESTAMPTZ, checked_by→users)
file_members      (file_id, user_id, role [owner|member]) PK composta
slack_integrations (id UUID PK, user_id→users UNIQUE, webhook_url TEXT,
                    enabled BOOLEAN DEFAULT true, created_at, updated_at)
_migrations       (id, name UNIQUE, applied_at) ← controle interno
```

### Status de um review

Calculado automaticamente no PATCH:

```
0 checados       → pending
1..N-1 checados  → in_progress
todos checados   → done
archived_at != NULL → arquivado (não aparece nas listas padrão)
```

### Rate limiting (rotas públicas)

Implementado via Redis (`rateLimit.ts`):
- `GET /api/reviews/:id/public` → 60 req/min por IP
- `PATCH /api/reviews/:id/items/:itemId/public` → 30 req/min por IP
- Chave: `ratelimit:<ip>:<rota>` com TTL de 60s
- Fail-open: se Redis indisponível, permite o request

### Migration e setup local

```bash
cd api
docker compose up -d        # PostgreSQL 15 + Redis 7
cp .env.example .env        # preencher com credenciais locais
npm install
npm run migrate

# banco de teste:
docker exec handoff-api-postgres-1 psql -U handoff -c "CREATE DATABASE handoff_test;"
DATABASE_URL=postgresql://handoff:handoff@localhost:5432/handoff_test npm run migrate

npm run dev                 # localhost:3001
npm run test                # requer Docker
```

Ver `api/MIGRATIONS.md` para guia completo de migrations.

---

## Dashboard Web (`web/`)

### Stack

- Next.js 16 (App Router, Turbopack), Tailwind CSS v4, TypeScript strict
- Proxy de auth: cookie `handoff_token` (SameSite=Lax, 30 dias)
- Polling (sem WebSocket) para tempo real

### Rotas

```
/                              → redirect cookie-based
/login                         → tela dark + botão "Entrar com Figma"
/auth/callback                 → Client Component (useSearchParams → cookie → redirect)
/dashboard                     → 4 cards resumo + reviews recentes (Server Component)
/dashboard/reviews             → lista com filtros + polling 30s
/dashboard/reviews/[id]        → detalhe + checklist + polling 15s
/dashboard/files               → grid de arquivos com badges por status
/dashboard/files/[fileKey]     → reviews de um arquivo com filtros
/dashboard/settings            → configurações de integração Slack

/api/reviews                   → proxy server-side
/api/reviews/[reviewId]        → proxy server-side
/api/reviews/[reviewId]/archive → proxy server-side
/api/files                     → proxy server-side
/api/files/[fileKey]/reviews   → proxy server-side
/api/slack/webhook             → proxy server-side (GET/POST/DELETE)
/api/slack/test                → proxy server-side (POST)
```

### Proteção de rotas

`web/proxy.ts` (Next.js 16 renomeou de middleware.ts):
- Matcher: `/dashboard/:path*`
- Export obrigatório: `export function proxy(...)` (não `middleware`)

### Fluxo OAuth na dashboard

```
1. /login → clica "Entrar com Figma" → GET /auth/figma (backend)
2. Backend → redireciona para figma.com/oauth com state Redis
3. Figma → GET /auth/figma/callback (backend) com code+state
4. Backend → valida state, busca /v1/me, upsert user, gera JWT
5. Backend → redireciona para /auth/callback?token=JWT (Vercel)
6. page.tsx Client Component → salva cookie → redirect /dashboard
```

**Por que Client Component (não Route Handler) no callback:** Route Handler com httpOnly cookie não funcionava no fluxo de redirect externo da Vercel. Cookie client-side funciona porque o proxy.ts lê cookies normalmente.

### Componentes principais

```
Sidebar.tsx            ← nav com 4 itens: Visão Geral, Reviews, Arquivos, Configurações
ReviewCard.tsx         ← card com StatusBadge + ProgressBar
ReviewDetailClient.tsx ← detalhe com polling 15s (Client Component)
ReviewsListClient.tsx  ← lista com polling 30s + badge "N novos"
DiffItemRow.tsx        ← checkbox → Server Action toggleReviewItem
StatusBadge.tsx        ← pending/in_progress/done com cores
ProgressBar.tsx        ← X de Y revisados
FileCard.tsx           ← card de arquivo com badges; desabilitado para arquivos locais
SlackSettings.tsx      ← Client Component: input de webhook, testar, remover
```

---

## Autenticação — Dois Fluxos

| | Plugin | Dashboard |
|---|---|---|
| Método | POST /auth/plugin (não-OAuth) | OAuth via figma.com |
| User data | figma.currentUser (já disponível no sandbox) | GET figma.com/v1/me com access_token |
| Token storage | clientStorage do Figma | Cookie SameSite=Lax |
| Token TTL | 30 dias | 30 dias |
| Fallback offline | modo offline silencioso | redirect /login |

---

## Testes

### Plugin (50 testes, rodar da raiz)

```bash
npm run test:run
```

| Arquivo | Testes | O que cobre |
|---|---|---|
| `diff.test.ts` | 22 | Engine de diff (COLOR, SIZE, TYPOGRAPHY, CONTENT, ADDED, REMOVED, COMPONENT, LAYOUT) |
| `badge.test.ts` | 7 | BADGE_COLORS + computePendingCount |
| `review.test.ts` | 12 | computeReviewStatus + applyItemCheck |
| `api.test.ts` | 10 | Cliente HTTP: authenticate, publishReview, getReviews, erros, modo offline |

### Backend (13 testes, rodar dentro de api/)

```bash
cd api && npm run test   # requer Docker rodando
```

| Arquivo | Testes | O que cobre |
|---|---|---|
| `health.test.ts` | 1 | GET /health com db ok |
| `reviews.test.ts` | 7 | CRUD reviews, transição pending→in_progress→done |
| `auth.test.ts` | 5 | POST /auth/plugin upsert, GET /auth/me, 401 sem token |

---

## Arquivos que NÃO estão no git

```
api/.env                ← copiar de api/.env.example e preencher
api/node_modules/
api/dist/
web/.env.local          ← copiar de web/.env.example e preencher  
web/node_modules/
web/.next/
```

`plugin/dist/` está no git para facilitar o carregamento local no Figma Desktop.

---

## Decisões Técnicas Relevantes

| Decisão | Motivo |
|---|---|
| Snapshot no clientStorage (não banco) | Snapshots são grandes; clientStorage suficiente para uso individual; banco ficaria pesado |
| `synced` flag no REVIEW_PUBLISHED | Feedback real: designer sabe se review chegou ao time ou ficou só local |
| `@upstash/redis` em vez de ioredis | Render/Upstash free tier só suporta REST, não TCP |
| `proxy.ts` (não `middleware.ts`) | Next.js 16 renomeou arquivo e export obrigatório |
| Cookie client-side no `/auth/callback` | Route Handler httpOnly não funcionava na Vercel nesse fluxo |
| IIFE assíncrono (não top-level await) | Rollup formato IIFE não suporta top-level await (erro de build do Vite) |
| `||` em vez de `??` para env vars | `??` não trata string vazia; NEXT_PUBLIC vars podem ser `''` na Vercel |
| `lz-string` para snapshots | clientStorage do Figma tem limite de ~1MB por chave |
| `files:read` → `current_user:read` | Figma removeu os scopes de arquivo; `current_user:read` é o único aceito hoje |
| `redirect_uri` hardcoded no OAuth | URL dinâmica causava "Invalid redirect uri" no Figma — precisa ser exato |
| `archived_at TIMESTAMPTZ` | Soft-delete: arquivado é filtrado por padrão mas preservado no banco |
| Slack fire-and-forget (.catch) | Falha no webhook nunca deve bloquear a criação do review |
| Rate limit fail-open | Redis indisponível não deve derrubar a rota pública |
| `server-only` em auth.ts | Previne import acidental em Client Components (erros de build em vez de runtime) |

---

## Estado Atual do Projeto

### Funcionando

- Plugin detecta diffs e publica reviews no backend com flag `synced`
- Plugin autentica automaticamente via POST /auth/plugin na inicialização
- Dashboard protegida com Figma OAuth completo
- Dashboard lista reviews por arquivo com polling em tempo real
- Dev pode checar itens na dashboard
- Status calculado automaticamente: pending → in_progress → done
- Deletar e arquivar reviews com confirmação
- Rotas públicas de review (sem login) com rate limiting por IP
- Dashboard organizada por arquivo do Figma (/dashboard/files)
- Notificações Slack ao publicar review (/dashboard/settings)

---

## Próximos passos

1. Exportar review em Markdown
2. Real-time via SSE (Redis pub/sub já implementado)
3. Aprovação formal pelo designer
4. Integração Jira/Linear

---

## Para iniciar um novo chat

Cole este arquivo completo no início da conversa. O assistente terá todo o contexto necessário.

**Verificação rápida antes de qualquer mudança:**
```bash
npm run typecheck   # 0 erros
npm run test:run    # 50/50 passando
npm run build       # dist/ sem erros
```
