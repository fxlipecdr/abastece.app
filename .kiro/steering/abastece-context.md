---
inclusion: always
---

# Abastece.app — Contexto do projeto (memória)

Plataforma colaborativa de preços de combustíveis no Brasil. Produto evoluindo de
MVP B2C para padrão **B2B corporativo** (Staff/Principal Engineer): foco em
escalabilidade, segurança da informação e eficiência operacional.

Proprietário: Felipe — União da Vitória, PR. Repo: github.com/fxlipecdr/abastece.app

## Stack
- **Web/PWA**: React 18 + TypeScript + Vite + TailwindCSS + React Query + Zustand + Leaflet/OSM. Workbox (PWA offline).
- **Mobile**: Expo SDK 51 + React Native + NativeWind + Expo Router + WatermelonDB (offline).
- **Backend**: Supabase (Postgres + PostGIS + Auth + RLS + Edge Functions/Deno).
- **Monorepo** npm workspaces: `apps/web`, `apps/mobile`, `packages/{types,utils}`, `supabase/`.

## Convenções (padrão-ouro)
- TypeScript estrito. Comentários e textos de UI em **pt-BR**.
- Tipos compartilhados em `packages/types` são fonte única de verdade.
- Migrations são **imutáveis após aplicadas**: nunca editar 001/002/...; sempre criar nova.
- Funções SQL `SECURITY DEFINER` devem ter `search_path` fixado.
- RLS nega por padrão; acesso concedido por papel.
- Nenhuma chave hardcoded (somente env). `.env*` é git-ignored (exceto `.env.example`).
- Design system v3 "clean": ver `apps/web/src/styles/design-system.css`. Ícones de linha em `components/icons.tsx` (sem emojis na navegação).

## Verificação
- Web: `cd apps/web && npm run lint` (tsc) e `npm run build`.
- SQL/Edge: validados ao aplicar no Supabase (não há Postgres/Deno local nesta máquina).

## Estado atual
Ver `docs/PROJECT_STATE.md` para o registro completo do que já foi entregue e os
próximos blocos planejados (API-first/outbox/webhooks, console B2B).
