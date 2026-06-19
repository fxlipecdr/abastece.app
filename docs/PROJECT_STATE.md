# Abastece.app — Estado do Projeto (memória de engenharia)

Registro do que foi entregue, decisões de arquitetura e próximos passos.
Atualizado conforme o projeto evolui. Este arquivo viaja com o repositório.

---

## 1. Visão geral

Plataforma colaborativa de preços de combustíveis (Brasil), evoluindo de MVP B2C
para padrão **B2B corporativo**. Monorepo npm workspaces.

```
abastece.app/
├── apps/
│   ├── web/      # PWA React + Vite (principal hoje)
│   └── mobile/   # Expo React Native (scaffolding executável)
├── packages/
│   ├── types/    # Tipos TS compartilhados (fonte única de verdade)
│   └── utils/    # Funções puras (preço, semáforo, XP, economia)
├── supabase/
│   ├── migrations/   # SQL versionado e imutável
│   ├── functions/    # Edge Functions (Deno)
│   └── seed.sql      # Dados de dev (União da Vitória/PR)
└── docs/
```

## 2. O que já foi entregue

### Banco de dados (supabase/migrations)
- **001_initial_schema**: profiles, stations (PostGIS), price_reports, confirmations,
  favorites, price_alerts, badges, advertisers, station_photos, station_ratings.
  View materializada `current_prices`. Funções `nearby_stations`, `station_distance_m`,
  `refresh_current_prices`, trigger de criação de profile, recalc de rating. RLS em tudo.
- **002_seed_badges**: catálogo de 8 conquistas.
- **003_multitenancy_rbac_audit**: `tenants`, `tenant_members` (RBAC: viewer→owner),
  `tenant_id` em stations/advertisers, funções `has_tenant_role`/`auth_tenant_ids`/
  `create_tenant`, RLS de isolamento por tenant, e **audit_log append-only** (trigger
  genérico + imutabilidade por trigger + REVOKE de DML).
- **004_rate_limit_and_context**: `rate_limit_hits` + `check_rate_limit` (atômico),
  `set_audit_context`, `insert_price_report_audited` (contexto+insert na mesma tx),
  `gc_rate_limit`.

### Edge Functions (supabase/functions)
- **_shared/middleware.ts**: camada de governança reutilizável — CORS allowlist,
  request-id, hardening headers, payload guard, `getAuthedUser`, `enforceRateLimit`,
  `requireTenantRole`, sanitização (`assertUuid/Number/String`), erros padronizados.
- **validate-price-report**: reescrita sobre o middleware (auth, rate limit de borda
  20/min + regra 3/posto/dia, sanitização, GPS check 500m, range ±30%, reputação,
  persistência auditada).

### Web (apps/web) — MVP completo + redesign clean (design system v3)
- Telas: onboarding, auth/login, auth/register, map (home), station/[id], report,
  search, alerts, profile, settings, offline.
- Componentes: Litro (mascote SVG), PriceTag, StationCard, FuelSelector, XPToast,
  OfflineBanner, LevelProgress, BadgeGrid, PriceHistoryChart, StationMap, ReportStepper,
  BottomNav, RequireAuth, icons (line icons).
- Stores: auth, settings (persistido). Hooks: useGeolocation, useNearbyStations,
  useBadges, useFavorites. Serviço offlineQueue (IndexedDB + retry).
- PWA (vite-plugin-pwa/Workbox), testes unitários das funções de preço (Vitest).

### Mobile (apps/mobile) — executável
- Expo Router (_layout, tabs), telas index/profile/alerts/station/report, WatermelonDB
  schema, hook useLocation, cliente supabase. NativeWind configurado.

## 3. Verificação atual
- `apps/web`: `npm run lint` (tsc) e `npm run build` passam.
- Migrations SQL e Edge Functions: **não executadas localmente** (sem Postgres/Deno
  nesta máquina). Validam ao aplicar no Supabase.

## 4. Pendências / próximos blocos (padrão-ouro B2B)
1. **API-first**: paginação por cursor; padrão **outbox** + dispatcher de **webhooks**
   para eventos críticos (integração com ERPs); fila para processamento assíncrono.
2. **Console B2B**: tabelas densas, filtros avançados, exportação CSV/PDF, navegação
   por teclado, atalhos (power users).
3. **Conectar Supabase real**: criar projeto, aplicar migrations + seed, preencher
   `.env.local` (web) e `.env` (mobile). Hoje o web usa placeholders.
4. **Ícones PWA PNG** (hoje SVG) e configuração de Google OAuth no Supabase.
5. **Mobile**: `npx expo install --fix` no primeiro setup do app nativo.

## 5. Decisões de arquitetura (por quê)
- **Multi-tenancy** via `tenant_members` + RLS: isolamento lógico, simples de operar.
- **Audit append-only** por trigger no banco: rastreabilidade independente da aplicação.
- **Rate limit no banco** (não só na borda): resiste a múltiplas instâncias Edge.
- **search_path fixo** em SECURITY DEFINER: mitiga search_path injection.
- **Tipos compartilhados** evitam divergência entre web/mobile/edge.

> Detalhes de setup e fluxo git: ver `docs/SETUP.md`.
