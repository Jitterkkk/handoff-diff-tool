# Handoff Diff Tool — Contexto do Projeto

## Stack
- Plugin Figma: TypeScript + React + Vite (pasta plugin/)
- Backend API: Node.js + Fastify + PostgreSQL + Redis (pasta api/)
- Dashboard Web: Next.js + Tailwind (pasta web/)
- Monorepo em: handoff-diff-tool/

## URLs de produção
- Backend: https://handoff-api.onrender.com
- Dashboard: https://handoff-diff-tool.vercel.app
- GitHub: https://github.com/Jitterkkk/handoff-diff-tool

## Infraestrutura
- Render (backend, plano free)
- Neon (PostgreSQL, plano free)
- Upstash (Redis REST, plano free)
- Vercel (dashboard, plano free)

## Figma OAuth App
- Client ID: ww7Bhv8yY8easYiBFY1RnO
- Callback URL: https://handoff-api.onrender.com/auth/figma/callback
- Scopes: current_user:read

## Status atual
- Plugin v0.2.0 funcionando com fluxo simplificado
- OAuth funcionando — login com Figma na dashboard OK
- Reviews ainda salvam localmente (clientStorage)
- Próximo passo: conectar plugin ao backend (prompt 2 pendente)

## Próximos prompts pendentes
1. Conectar plugin ao backend (reviews aparecem na dashboard)
2. Dashboard mostra reviews por arquivo com link compartilhável
3. Dev acessa sem precisar fazer login

## Fases concluídas
- Fase 1-4: Plugin completo com Design Review Flow
- Fase 5: Backend Foundation
- Fase 6: Deploy Render + Neon + Upstash
- Fase 7: Autenticação Figma OAuth
- Fase 8: Dashboard Next.js
- Fase 9: Deploy Vercel + OAuth funcionando
- Refactor: Plugin simplificado (foco em publicar reviews)
