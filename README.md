# Handoff Diff Tool — Monorepo

[![CI](https://github.com/Jitterkkk/handoff-diff-tool/actions/workflows/ci.yml/badge.svg)](https://github.com/Jitterkkk/handoff-diff-tool/actions/workflows/ci.yml)

Plugin para Figma que detecta automaticamente o que mudou entre versões de uma tela e gera um relatório visual das diferenças para o time de desenvolvimento — sem que o dev precise perguntar nada ao designer.

---

## Estrutura do repositório

```
handoff-diff-tool/
├── plugin/   ← Plugin Figma (React + TypeScript, sandbox + iframe)
├── api/      ← Backend Node.js (Fastify + PostgreSQL + Redis)
└── web/      ← Dashboard Next.js — em breve
```

### plugin/

Código do plugin. Dois contextos isolados:

- `plugin/plugin/` — sandbox do Figma (sem DOM, acessa `figma.*`)
- `plugin/ui/` — iframe React (DOM, sem `figma.*`)
- `plugin/shared/` — tipos compartilhados entre os dois

### api/

Servidor REST que conecta o plugin à dashboard web.

- Fastify 4 + PostgreSQL 15 + Redis 7
- Autenticação via JWT
- Rotas: `POST /api/reviews`, `GET /api/reviews`, `PATCH /api/reviews/:id/items/:itemId`
- Para rodar localmente: `cd api && docker compose up -d && npm install && npm run migrate && npm run dev`

### web/

Dashboard web para visualizar reviews fora do Figma. Em desenvolvimento.

---

## O problema que resolve

O ciclo de handoff entre design e desenvolvimento tem um gargalo clássico: o designer atualiza uma tela, não documenta o que mudou, e o dev precisa caçar as diferenças na mão — ou perguntar, esperar resposta e perder tempo.

O **Handoff Diff Tool** elimina essa fricção. O designer salva uma versão do frame antes de fazer alterações. Quando terminar, o dev abre o plugin, clica em "Ver o que mudou" e recebe um relatório com cada mudança categorizada por tipo (cor, tamanho, tipografia, layout…) e severidade (alta, média, baixa). Um clique em qualquer item centraliza o Figma no elemento alterado e destaca o node com um retângulo vermelho temporário.

---

## Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [Figma Desktop](https://www.figma.com/downloads/) (o plugin local só funciona no app, não no browser)
- npm 10+

### Instalação

```bash
git clone https://github.com/Jitterkkk/handoff-diff-tool.git
cd handoff-diff-tool
npm install
```

### Desenvolvimento com watch

```bash
npm run dev
```

Roda dois processos em paralelo via `concurrently`:

| Processo | Comando interno | Saída |
|---|---|---|
| UI (React) | `vite build --watch` | `dist/index.html` (tudo inline via vite-plugin-singlefile) |
| Sandbox | `vite build --mode plugin --watch` | `dist/code.js` (IIFE autocontido) |

Qualquer mudança em `src/` recompila o arquivo correspondente automaticamente.

### Build de produção

```bash
npm run build
```

### Testes

```bash
npm run test        # modo watch (desenvolvimento)
npm run test:run    # executa uma vez (CI)
npm run typecheck   # verifica tipos sem emitir arquivos
```

### Carregando o plugin no Figma

1. Abra o **Figma Desktop**
2. Vá em `Menu → Plugins → Development → Import plugin from manifest…`
3. Selecione o arquivo `manifest.json` na raiz do projeto
4. O plugin aparece em `Plugins → Development → Handoff Diff Tool`

> **Dica:** rode `npm run dev` antes de abrir o plugin para garantir que `dist/` está atualizado. O Figma recarrega o plugin a cada vez que você o abre, então basta fechar e reabrir para ver as mudanças.

---

## Como usar

### Fluxo básico (single frame)

1. Selecione um **frame** no canvas do Figma
2. Abra o plugin e clique em **Salvar versão atual**
3. Faça as alterações de design normalmente
4. Abra o plugin novamente e clique em **Ver o que mudou**
5. O relatório mostra cada mudança agrupada por severidade — clique em qualquer item para ir direto ao elemento no canvas e destacá-lo com um retângulo vermelho temporário
6. Use **Limpar highlights** para remover os retângulos do canvas
7. Use **↓ Exportar JSON** para baixar o relatório completo

### Múltiplos frames

1. Selecione **dois ou mais frames** simultaneamente no canvas (Shift+clique ou seleção por arrasto)
2. Clique em **Salvar N frames** para salvar todos de uma vez
3. Clique em **Ver o que mudou** — o plugin compara cada frame com seu snapshot mais recente e exibe os diffs agrupados por frame

### Comparar com versão anterior

No modo single-frame, o seletor de versão permite escolher qual das últimas 5 versões usar como base da comparação (do mais recente ao mais antigo).

### Toggle de posição

Por padrão, mudanças de posição (x/y) são ignoradas para reduzir ruído. Ligue o toggle **Incluir mudanças de posição** para incluí-las como mudanças de baixa prioridade. A preferência é salva por plugin.

### Design Review Flow

1. Com um frame selecionado, vá na aba **Reviews** e clique em **Publicar mudanças**
2. O plugin registra todos os diffs detectados como itens de review pendentes
3. Um badge colorido aparece no canto do frame no canvas (vermelho = pendente, amarelo = em andamento, verde = concluído)
4. O dev abre o plugin, vai em Reviews e marca cada item como revisado — o progresso é salvo no `clientStorage` do arquivo
5. Quando o último item é marcado, o status muda para "Concluído" e o badge fica verde

---

## Estrutura de pastas

```
handoff-diff-tool/
├── .github/
│   └── workflows/
│       └── ci.yml         # CI: npm ci → testes → build em Node 20
├── manifest.json          # Configuração do plugin: nome, permissões, paths de build
├── package.json           # Scripts raiz: build, dev, test, api:dev, api:install
├── tsconfig.json          # TypeScript (target ES2020, strict, bundler resolution)
├── vite.config.ts         # Build duplo: UI com vite-plugin-singlefile / sandbox como IIFE
├── vitest.config.ts       # Testes unitários do plugin (ambiente node)
├── index.html             # Entry point da UI React
│
├── api/                   # Backend Node.js
│   ├── docker-compose.yml # PostgreSQL 15 + Redis 7
│   ├── src/
│   │   ├── server.ts      # Entry point Fastify
│   │   ├── config.ts      # Validação de env vars com Zod
│   │   ├── db/            # postgres.js pool + runner de migrations
│   │   ├── redis/         # ioredis + publishEvent
│   │   ├── migrations/    # SQL migrations versionadas
│   │   ├── routes/        # health, reviews, files
│   │   ├── services/      # reviewService, fileService
│   │   ├── schemas/       # Zod schemas das rotas
│   │   └── types/         # Tipos de domínio
│   └── src/__tests__/     # Testes de integração (Vitest)
│
└── plugin/                # Plugin Figma
    ├── shared/
    │   └── types.ts       # Tipos compartilhados: NodeSnapshot, DiffResult, FrameMeta, mensagens
    │
    ├── plugin/            # Código do sandbox — roda no ambiente isolado do Figma, sem DOM
    │   ├── code.ts        # Entry point: roteador de mensagens, listener de selectionchange
    │   ├── snapshot.ts    # takeSnapshot(): serializa recursivamente um frame em NodeSnapshot
    │   ├── diff.ts        # diffSnapshots(): compara dois snapshots e retorna lista de DiffResult
    │   ├── diff.test.ts   # Testes unitários do diffSnapshots (Vitest)
    │   ├── storage.ts     # Histórico de até 5 snapshots por frame com compressão LZString
    │   ├── reviewUtils.ts # Funções puras do review flow: computePendingCount, computeReviewStatus
    │   ├── badge.ts       # upsertBadge / removeBadge / refreshBadge
    │   ├── badge.test.ts  # Testes de BADGE_COLORS e computePendingCount
    │   ├── review.test.ts # Testes de computeReviewStatus e applyItemCheck
    │   ├── export.ts      # exportDiffAsJSON()
    │   └── highlight.ts   # createHighlight() / clearHighlights()
    │
    └── ui/                # Código da interface — roda em iframe com acesso ao DOM
        ├── main.tsx       # Entry point React
        ├── App.tsx        # Componente raiz: estado global, reducer, abas Diff/Reviews
        └── components/
            ├── FrameSelector.tsx  # Header com nome(s) do(s) frame(s) e botões de ação
            ├── VersionSelector.tsx # Seletor de versão histórica
            ├── DiffList.tsx       # Lista de mudanças agrupadas por severidade
            ├── DiffItem.tsx       # Card de mudança com tipo, valores antes/depois e click-to-zoom
            └── ReviewPanel.tsx    # Painel de reviews: lista, detalhe com progresso e checkboxes por severidade
```

### Separação sandbox × UI

O Figma executa o plugin em dois contextos isolados:

- **Sandbox** (`src/plugin/`): tem acesso à Figma API (`figma.*`) mas **sem DOM**. Toda a lógica de negócio vive aqui.
- **UI** (`src/ui/`): roda em um iframe com DOM, mas **sem acesso à Figma API**. Só exibe dados e dispara ações via `postMessage`.

A comunicação é unidirecional por mensagens tipadas em `src/shared/types.ts` (`UIToPluginMessage` e `PluginToUIMessage`).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Plugin sandbox | TypeScript + Figma Plugin API |
| UI | React 18 + TypeScript |
| Build | Vite 5 + vite-plugin-singlefile |
| Testes | Vitest |
| Compressão de storage | lz-string |
| Paralelismo de dev | concurrently |
| CI | GitHub Actions (Node 20) |

---

## Roadmap

### Implementado em v0.2.0

- [x] **Design Review Flow** — designer publica mudanças, dev revisa item a item com checkboxes por severidade
- [x] **Badges visuais nos frames** — círculo colorido no canvas indica status do review em tempo real
- [x] **Notificação automática** — banner na UI ao selecionar frame com review pendente

### Em breve

- [ ] **Suporte a componentes e variantes** — detectar troca de variante dentro de um componente além da troca de `componentId`
- [ ] **Exportação em Markdown** — gerar `.md` formatado para colar em tickets do Jira, Linear ou comentários de PR
- [ ] **Diff de espaçamento entre filhos** — comparar `gap` e `padding` em nível de grupo, não só de frame

### Médio prazo

- [ ] **Backend (Node.js + Fastify + PostgreSQL)** — persistência centralizada dos snapshots por arquivo e por time, eliminando a dependência do `clientStorage` local por máquina
- [ ] **Integração com Figma branching** — comparar automaticamente uma branch de design com o frame na main
- [ ] **Notificações** — enviar o relatório de diff por Slack ou e-mail quando o designer marcar uma tela como "pronta para dev"

### Longo prazo

- [ ] **Monetização** — plano gratuito com histórico de 7 dias; plano Pro com histórico ilimitado e integrações
- [ ] **Dashboard web** — visualizar o histórico de diffs fora do Figma, compartilhável por link

---

## Contribuindo

O projeto está em desenvolvimento ativo. Se encontrar um bug ou quiser sugerir uma feature, abra uma [issue](https://github.com/Jitterkkk/handoff-diff-tool/issues).

```bash
# Antes de abrir um PR, rode:
npm run typecheck   # garante que não há erros de tipos
npm run test:run    # garante que todos os testes passam
npm run build       # garante que o build completo funciona
```
