# Migrations

## Como funciona

O sistema usa um runner caseiro em `src/db/migrate.ts`. Ao rodar:

1. Cria a tabela `_migrations` no banco (se não existir) — rastreia o histórico de aplicações
2. Lê todos os arquivos `.sql` de `src/migrations/` em **ordem alfabética** (por isso os nomes começam com `001_`, `002_`, etc.)
3. Para cada arquivo: verifica se já existe em `_migrations`; se sim, pula; se não, aplica com `sql.unsafe()` e registra
4. O build (`npm run build`) compila o TypeScript e copia os `.sql` para `dist/migrations/` via `scripts/copy-migrations.mjs` — o runner em `dist/db/migrate.js` lê de lá

## Migrations existentes

| Arquivo | O que faz | Sprint |
|---|---|---|
| `001_initial.sql` | Cria as tabelas `files`, `users`, `reviews`, `review_items`, `file_members` e os índices principais | 1 — schema inicial |
| `002_add_archived_at.sql` | Adiciona `archived_at TIMESTAMPTZ` em `reviews` para soft-delete de reviews arquivados | 3 — gestão de reviews |
| `003_slack_integrations.sql` | Cria a tabela `slack_integrations` para armazenar webhooks Slack por usuário | Sprint A — notificações Slack |
| `004_review_item_comment.sql` | Adiciona `comment TEXT` em `review_items` para comentários por item | Feature — comentários por item |

## Como rodar

### Desenvolvimento local

```bash
# Na pasta api/
npm run build        # compila TS + copia .sql para dist/
npm run migrate      # aplica migrations pendentes
```

Requer a variável `DATABASE_URL` em `api/.env`:

```
DATABASE_URL=postgres://user:password@localhost:5432/handoff
```

### Produção (Render)

No painel do Render, configure o **Release Command** do serviço da API:

```
npm run build && npm run migrate
```

O Render executa esse comando a cada deploy antes de subir a nova instância. A variável `DATABASE_URL` já vem do painel de Environment Variables.

## Como criar uma nova migration

1. Crie o arquivo em `api/src/migrations/` com o nome `NNN_descricao.sql`, onde `NNN` é o próximo número sequencial (ex: `003_add_file_key_index.sql`)
2. Escreva o SQL — **sempre use formas idempotentes** para não quebrar se a migration rodar duas vezes:
   - Tabelas: `CREATE TABLE IF NOT EXISTS`
   - Colunas: `ALTER TABLE t ADD COLUMN IF NOT EXISTS`
   - Índices: `CREATE INDEX IF NOT EXISTS`
3. Rode o build + migrate localmente para validar:
   ```bash
   npm run build && npm run migrate
   ```
4. Commite o arquivo `.sql`. O `git` rastreia `src/migrations/`; o `dist/` está no `.gitignore` e é reconstruído no deploy

## Schema atual

### `files`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | Gerado com `gen_random_uuid()` |
| `figma_file_key` | VARCHAR(255) UNIQUE | Chave extraída da URL do Figma |
| `name` | VARCHAR(255) | Nome do arquivo no Figma |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

### `users`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `figma_user_id` | VARCHAR(255) UNIQUE | ID do usuário no Figma |
| `name` | VARCHAR(255) | Nome do usuário |
| `email` | VARCHAR(255) | Email (opcional) |
| `avatar_url` | TEXT | URL do avatar |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `reviews`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `file_id` | UUID FK → `files` | Cascade delete |
| `frame_id` | VARCHAR(255) | ID do frame no Figma |
| `frame_name` | VARCHAR(255) | Nome do frame |
| `published_by` | UUID FK → `users` | Quem publicou |
| `description` | TEXT | Descrição opcional |
| `status` | VARCHAR(20) | `pending`, `in_progress`, `done` |
| `snapshot_before` | JSONB | Estado do frame antes |
| `snapshot_after` | JSONB | Estado do frame depois |
| `published_at` | TIMESTAMPTZ | Data de publicação |
| `updated_at` | TIMESTAMPTZ | |
| `archived_at` | TIMESTAMPTZ | NULL = ativo; preenchido = arquivado (Sprint 3) |

### `review_items`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `review_id` | UUID FK → `reviews` | Cascade delete |
| `node_id` | VARCHAR(255) | ID do nó no Figma |
| `node_name` | VARCHAR(255) | Nome do nó |
| `diff_type` | VARCHAR(50) | `COLOR`, `SIZE`, `TYPOGRAPHY`, etc. |
| `severity` | VARCHAR(20) | `high`, `medium`, `low` |
| `before_value` / `after_value` | JSONB | Valores antes/depois |
| `checked_at` | TIMESTAMPTZ | Data de aprovação pelo dev |
| `checked_by` | UUID FK → `users` | Quem aprovou |
| `comment` | TEXT | Comentário opcional do dev ao aprovar (Feature — comentários) |
| `created_at` | TIMESTAMPTZ | |

### `slack_integrations`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | Gerado com `gen_random_uuid()` |
| `user_id` | UUID FK → `users` | Cascade delete; UNIQUE por usuário |
| `webhook_url` | TEXT | URL do Incoming Webhook do Slack |
| `enabled` | BOOLEAN | Padrão `true`; reservado para desativar sem deletar |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `file_members`
| Coluna | Tipo | Descrição |
|---|---|---|
| `file_id` | UUID FK → `files` | PK composta |
| `user_id` | UUID FK → `users` | PK composta |
| `role` | VARCHAR(20) | `owner` ou `member` |
| `joined_at` | TIMESTAMPTZ | |

### `_migrations` (interna)
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL PK | |
| `name` | VARCHAR(255) UNIQUE | Nome do arquivo `.sql` aplicado |
| `applied_at` | TIMESTAMPTZ | Data de aplicação |

## Restaurar do zero

Para recriar o banco completo em um ambiente novo:

```bash
# 1. Crie um banco Postgres vazio (ex: via Render, Supabase ou local)
# 2. Configure a variável de ambiente
echo "DATABASE_URL=postgres://user:password@host:5432/handoff" > api/.env

# 3. Na pasta api/, compile e aplique todas as migrations
cd api
npm run build
npm run migrate
```

O runner vai aplicar `001_initial.sql` e depois todas as migrations subsequentes em ordem. A tabela `_migrations` registra o que foi aplicado — se o banco já tiver parte das migrations, só as pendentes serão aplicadas.
