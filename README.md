# Handoff Diff Tool

Plugin para Figma que detecta automaticamente o que mudou entre versões de uma tela e gera um relatório visual das diferenças para o time de desenvolvimento — sem que o dev precise perguntar nada ao designer.

---

## O problema que resolve

O ciclo de handoff entre design e desenvolvimento tem um gargalo clássico: o designer atualiza uma tela, não documenta o que mudou, e o dev precisa caçar as diferenças na mão — ou perguntar, esperar resposta e perder tempo.

O **Handoff Diff Tool** elimina essa fricção. O designer salva uma versão do frame antes de fazer alterações. Quando terminar, o dev abre o plugin, clica em "Ver o que mudou" e recebe um relatório com cada mudança categorizada por tipo (cor, tamanho, tipografia, layout…) e severidade (alta, média, baixa). Um clique em qualquer item centraliza o Figma no elemento alterado.

---

## Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [Figma Desktop](https://www.figma.com/downloads/) (o plugin local só funciona no app, não no browser)
- npm 9+

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Jitterkkk/handoff-diff-tool.git
cd handoff-diff-tool

# Instale as dependências
npm install
```

### Desenvolvimento com watch

```bash
npm run dev
```

Isso roda dois processos em paralelo via `concurrently`:

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
```

### Carregando o plugin no Figma

1. Abra o **Figma Desktop**
2. Vá em `Menu → Plugins → Development → Import plugin from manifest…`
3. Selecione o arquivo `manifest.json` na raiz do projeto
4. O plugin aparece em `Plugins → Development → Handoff Diff Tool`

> **Dica:** rode `npm run dev` antes de abrir o plugin para garantir que `dist/` está atualizado. O Figma recarrega o plugin a cada vez que você o abre, então basta fechar e reabrir para ver as mudanças.

---

## Como usar

1. Selecione um **frame** no canvas do Figma
2. Abra o plugin e clique em **Salvar versão atual**
3. Faça as alterações de design normalmente
4. Abra o plugin novamente e clique em **Ver o que mudou**
5. O relatório mostra cada mudança agrupada por severidade — clique em qualquer item para ir direto ao elemento no canvas

---

## Estrutura de pastas

```
handoff/
├── manifest.json          # Configuração do plugin: nome, permissões, paths de build
├── package.json           # Dependências e scripts npm
├── tsconfig.json          # Configuração TypeScript (target ES2020, strict, bundler resolution)
├── vite.config.ts         # Build duplo: UI com vite-plugin-singlefile / sandbox como IIFE
├── vitest.config.ts       # Configuração de testes unitários (ambiente node)
├── index.html             # Entry point da UI React (referenciado pelo Vite)
│
└── src/
    ├── shared/
    │   └── types.ts       # Tipos compartilhados entre plugin e UI: NodeSnapshot, DiffResult, mensagens
    │
    ├── plugin/            # Código do sandbox — roda no ambiente isolado do Figma, sem DOM
    │   ├── code.ts        # Entry point: inicializa o plugin, roteador de mensagens, listener de selectionchange
    │   ├── snapshot.ts    # takeSnapshot(): serializa recursivamente um frame em NodeSnapshot
    │   ├── diff.ts        # diffSnapshots(): compara dois snapshots e retorna lista de DiffResult
    │   ├── diff.test.ts   # Testes unitários do diffSnapshots (22 casos com Vitest)
    │   └── storage.ts     # Wrapper do figma.clientStorage com compressão LZString e validação de 900KB
    │
    └── ui/                # Código da interface — roda em iframe com acesso ao DOM
        ├── main.tsx       # Entry point React: monta o root no #root
        ├── App.tsx        # Componente raiz: estado global, reducer, comunicação com o plugin via postMessage
        └── components/
            ├── FrameSelector.tsx  # Header com nome do frame, badge de versão salva e botões de ação
            ├── DiffList.tsx       # Lista de mudanças agrupadas por severidade (alta / média / baixa)
            └── DiffItem.tsx       # Card individual de mudança com tipo, valores antes/depois e click-to-zoom
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

---

## Roadmap

### Em breve

- [ ] **Histórico de versões** — salvar múltiplos snapshots por frame com timestamps, permitindo comparar qualquer duas versões (não só a última)
- [ ] **Exportação do relatório** — gerar um arquivo `.md` ou `.json` com o diff para colar em tickets do Jira, Linear ou comentários de PR
- [ ] **Suporte a componentes e variantes** — detectar troca de variante dentro de um componente além da troca de `componentId`
- [ ] **Diff de espaçamento entre filhos** — comparar `gap` e `padding` em nível de grupo, não só de frame

### Médio prazo

- [ ] **Backend (Node.js + Fastify + PostgreSQL + Redis)** — persistência centralizada dos snapshots por arquivo e por time, eliminando a dependência do `clientStorage` local por máquina
- [ ] **Integração com Figma branching** — comparar automaticamente uma branch de design com o frame na main
- [ ] **Notificações** — enviar o relatório de diff por Slack ou e-mail quando o designer marcar uma tela como "pronta para dev"

### Longo prazo

- [ ] **Monetização** — plano gratuito com histórico de 7 dias; plano Pro com histórico ilimitado, exportação e integrações (permissão `payments` já prevista no manifest)
- [ ] **Suporte a múltiplos frames** — selecionar um grupo de frames e gerar um relatório consolidado de toda a tela
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
