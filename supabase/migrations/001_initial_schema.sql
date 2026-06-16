-- =============================================================================
-- Abastece.app — Migration 001: Schema inicial
-- -----------------------------------------------------------------------------
-- Mapeamento colaborativo de preços de combustíveis (Brasil).
-- PostgreSQL + PostGIS (consultas geoespaciais) + RLS (segurança por linha).
--
-- Arquitetura de dados:
--   profiles  ──< price_reports >── stations
--                     │
--                     ├──< price_confirmations
--                     └── current_prices (view materializada — preço vigente)
--
-- Ordem de execução: este é o primeiro arquivo a rodar no banco.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensões necessárias
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;   -- tipos GEOGRAPHY e funções espaciais
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- busca fuzzy por nome de posto
-- pg_cron é habilitado pelo painel do Supabase (Database > Extensions).

-- -----------------------------------------------------------------------------
-- 2. Tipos enumerados
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fuel_type') THEN
    CREATE TYPE fuel_type AS ENUM (
      'gasolina_comum',
      'gasolina_aditivada',
      'etanol',
      'diesel',
      'diesel_s10',
      'gnv'
    );
  END IF;
END$$;

-- -----------------------------------------------------------------------------
-- 3. profiles — estende auth.users do Supabase
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username          TEXT UNIQUE NOT NULL,
  display_name      TEXT,
  avatar_url        TEXT,
  xp                INTEGER DEFAULT 0,
  level             INTEGER DEFAULT 1,
  total_reports     INTEGER DEFAULT 0,
  accurate_reports  INTEGER DEFAULT 0,
  streak_days       INTEGER DEFAULT 0,
  last_report_at    TIMESTAMPTZ,
  badges            JSONB DEFAULT '[]'::jsonb,
  is_premium        BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Perfil público do usuário, com XP e gamificação.';

-- -----------------------------------------------------------------------------
-- 4. stations — postos de combustível
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  brand        TEXT,                         -- Shell, Ipiranga, Petrobras, etc.
  cnpj         TEXT,
  address      TEXT NOT NULL,
  city         TEXT NOT NULL,
  state        CHAR(2) NOT NULL,
  zip_code     TEXT,
  location     GEOGRAPHY(POINT, 4326) NOT NULL,
  phone        TEXT,
  is_verified  BOOLEAN DEFAULT FALSE,
  is_active    BOOLEAN DEFAULT TRUE,
  amenities    JSONB DEFAULT '{}'::jsonb,     -- {conveniente:true, lavagem:true, ar:true}
  rating_avg   NUMERIC(2,1) DEFAULT 0,        -- média de avaliações (0.0 - 5.0)
  rating_count INTEGER DEFAULT 0,
  owner_id     UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.stations IS 'Postos de combustível com localização geoespacial.';

-- Índice espacial GIST — obrigatório para performance das buscas por raio.
CREATE INDEX IF NOT EXISTS idx_stations_location ON public.stations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_stations_city ON public.stations(city, state);
-- Busca fuzzy por nome (autocomplete na tela de busca).
CREATE INDEX IF NOT EXISTS idx_stations_name_trgm ON public.stations USING GIN(name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 5. price_reports — núcleo do app (preços reportados)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id      UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  fuel_type       fuel_type NOT NULL,
  price           NUMERIC(6,3) NOT NULL CHECK (price > 0 AND price < 20),
  reported_at     TIMESTAMPTZ DEFAULT NOW(),
  confirmed_count INTEGER DEFAULT 0,
  disputed_count  INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  is_pending      BOOLEAN DEFAULT FALSE,        -- aguardando confirmações (anti-fraude)
  source          TEXT DEFAULT 'user'           -- 'user', 'owner', 'api'
    CHECK (source IN ('user', 'owner', 'api'))
);

COMMENT ON TABLE public.price_reports IS 'Cada linha é um reporte de preço feito por um usuário.';

CREATE INDEX IF NOT EXISTS idx_price_reports_station
  ON public.price_reports(station_id, fuel_type, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_reports_user
  ON public.price_reports(user_id);

-- -----------------------------------------------------------------------------
-- 6. current_prices — view materializada do preço vigente por posto/combustível
-- -----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.current_prices;
CREATE MATERIALIZED VIEW public.current_prices AS
SELECT DISTINCT ON (station_id, fuel_type)
  station_id,
  fuel_type,
  price,
  reported_at,
  user_id,
  confirmed_count
FROM public.price_reports
WHERE is_active = TRUE
  AND is_pending = FALSE
  AND reported_at > NOW() - INTERVAL '48 hours'
ORDER BY station_id, fuel_type, reported_at DESC;

-- Índice único permite REFRESH ... CONCURRENTLY (sem travar leituras).
CREATE UNIQUE INDEX IF NOT EXISTS idx_current_prices_pk
  ON public.current_prices(station_id, fuel_type);

-- Refresh automático a cada 5 min (requer pg_cron habilitado):
-- SELECT cron.schedule('refresh-prices', '*/5 * * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY public.current_prices');

-- -----------------------------------------------------------------------------
-- 7. price_confirmations — upvote/downvote de um reporte
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_confirmations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID NOT NULL REFERENCES public.price_reports(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id),
  is_confirmed BOOLEAN NOT NULL,             -- true = correto / false = incorreto
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 8. favorites — postos favoritos do usuário
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, station_id)
);

-- -----------------------------------------------------------------------------
-- 9. price_alerts — alertas configurados pelo usuário
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  station_id   UUID REFERENCES public.stations(id),  -- NULL = qualquer posto no raio
  fuel_type    fuel_type NOT NULL,
  target_price NUMERIC(6,3) NOT NULL,
  radius_km    INTEGER DEFAULT 10,
  is_active    BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON public.price_alerts(user_id, is_active);

-- -----------------------------------------------------------------------------
-- 10. badges — catálogo de conquistas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badges (
  id              TEXT PRIMARY KEY,           -- 'first_report', 'streak_7', etc.
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  icon            TEXT NOT NULL,              -- emoji ou nome do ícone
  xp_reward       INTEGER DEFAULT 0,
  condition_type  TEXT NOT NULL,              -- 'reports_count', 'streak', 'accuracy'...
  condition_value INTEGER NOT NULL
);

-- -----------------------------------------------------------------------------
-- 11. advertisers — parceiros/anunciantes (postos verificados)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advertisers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id        UUID REFERENCES public.stations(id),
  plan              TEXT DEFAULT 'basic'      -- 'visible', 'featured', 'premium'
    CHECK (plan IN ('basic', 'visible', 'featured', 'premium')),
  banner_url        TEXT,
  offer_text        TEXT,
  offer_expires_at  TIMESTAMPTZ,
  click_count       INTEGER DEFAULT 0,
  impression_count  INTEGER DEFAULT 0,
  active_until      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. station_photos — fotos enviadas pelos usuários
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.station_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  photo_url  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 13. station_ratings — avaliações 1-5 do posto
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.station_ratings (
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (station_id, user_id)
);

-- =============================================================================
-- 14. Funções e triggers
-- =============================================================================

-- 14.1 — Cria automaticamente um profile quando um usuário se cadastra no Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- username inicial deriva do email; usuário pode alterar depois.
    COALESCE(NEW.raw_user_meta_data->>'username',
             split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)),
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14.2 — Recalcula a média de avaliações do posto após insert/update/delete.
CREATE OR REPLACE FUNCTION public.recalc_station_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target UUID := COALESCE(NEW.station_id, OLD.station_id);
BEGIN
  UPDATE public.stations s
  SET rating_avg = COALESCE(sub.avg_rating, 0),
      rating_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS cnt
    FROM public.station_ratings
    WHERE station_id = target
  ) sub
  WHERE s.id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_rating_change ON public.station_ratings;
CREATE TRIGGER on_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON public.station_ratings
  FOR EACH ROW EXECUTE FUNCTION public.recalc_station_rating();

-- 14.3 — Busca de postos próximos com preço vigente (usada pelo app).
--        Recebe lat/lng do usuário, combustível e raio em km.
CREATE OR REPLACE FUNCTION public.nearby_stations(
  user_lat   DOUBLE PRECISION,
  user_lng   DOUBLE PRECISION,
  fuel       fuel_type,
  radius_km  INTEGER DEFAULT 5
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  brand        TEXT,
  address      TEXT,
  city         TEXT,
  state        CHAR(2),
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  is_verified  BOOLEAN,
  amenities    JSONB,
  rating_avg   NUMERIC,
  distance_km  DOUBLE PRECISION,
  price        NUMERIC,
  reported_at  TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.id,
    s.name,
    s.brand,
    s.address,
    s.city,
    s.state,
    ST_Y(s.location::geometry) AS lat,
    ST_X(s.location::geometry) AS lng,
    s.is_verified,
    s.amenities,
    s.rating_avg,
    ST_Distance(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0 AS distance_km,
    cp.price,
    cp.reported_at
  FROM public.stations s
  LEFT JOIN public.current_prices cp
    ON cp.station_id = s.id AND cp.fuel_type = fuel
  WHERE s.is_active = TRUE
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT 50;
$$;

-- 14.4 — Distância em metros entre um posto e um ponto do usuário.
--        Usada pela Edge Function validate-price-report (GPS check 500m).
CREATE OR REPLACE FUNCTION public.station_distance_m(
  station   UUID,
  user_lat  DOUBLE PRECISION,
  user_lng  DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql
STABLE
AS $$
  SELECT ST_Distance(
    s.location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  )
  FROM public.stations s
  WHERE s.id = station;
$$;

-- 14.5 — Wrapper para refresh da view materializada (chamável via RPC).
CREATE OR REPLACE FUNCTION public.refresh_current_prices()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.current_prices;
END;
$$;

-- =============================================================================
-- 15. Row Level Security (RLS)
-- =============================================================================
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_photos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_ratings     ENABLE ROW LEVEL SECURITY;

-- profiles: todos leem, cada um edita o próprio.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- stations: leitura pública; autenticados cadastram; dono atualiza o seu.
DROP POLICY IF EXISTS "stations_select" ON public.stations;
CREATE POLICY "stations_select" ON public.stations FOR SELECT USING (true);
DROP POLICY IF EXISTS "stations_insert" ON public.stations;
CREATE POLICY "stations_insert" ON public.stations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "stations_update_owner" ON public.stations;
CREATE POLICY "stations_update_owner" ON public.stations FOR UPDATE
  USING (auth.uid() = owner_id);

-- price_reports: leitura pública; cada usuário cria os próprios.
DROP POLICY IF EXISTS "reports_select" ON public.price_reports;
CREATE POLICY "reports_select" ON public.price_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "reports_insert" ON public.price_reports;
CREATE POLICY "reports_insert" ON public.price_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- price_confirmations: leitura pública; cada usuário cria a própria.
DROP POLICY IF EXISTS "confirmations_select" ON public.price_confirmations;
CREATE POLICY "confirmations_select" ON public.price_confirmations FOR SELECT USING (true);
DROP POLICY IF EXISTS "confirmations_insert" ON public.price_confirmations;
CREATE POLICY "confirmations_insert" ON public.price_confirmations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- favorites: usuário gerencia os próprios (todas as operações).
DROP POLICY IF EXISTS "favorites_all" ON public.favorites;
CREATE POLICY "favorites_all" ON public.favorites
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- price_alerts: usuário gerencia os próprios.
DROP POLICY IF EXISTS "alerts_all" ON public.price_alerts;
CREATE POLICY "alerts_all" ON public.price_alerts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- station_photos: leitura pública; autenticados enviam.
DROP POLICY IF EXISTS "photos_select" ON public.station_photos;
CREATE POLICY "photos_select" ON public.station_photos FOR SELECT USING (true);
DROP POLICY IF EXISTS "photos_insert" ON public.station_photos;
CREATE POLICY "photos_insert" ON public.station_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- station_ratings: leitura pública; usuário gerencia a própria avaliação.
DROP POLICY IF EXISTS "ratings_select" ON public.station_ratings;
CREATE POLICY "ratings_select" ON public.station_ratings FOR SELECT USING (true);
DROP POLICY IF EXISTS "ratings_all" ON public.station_ratings;
CREATE POLICY "ratings_all" ON public.station_ratings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- badges/advertisers: catálogo de leitura pública (escrita via service role).
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_select" ON public.badges;
CREATE POLICY "badges_select" ON public.badges FOR SELECT USING (true);

ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "advertisers_select" ON public.advertisers;
CREATE POLICY "advertisers_select" ON public.advertisers FOR SELECT USING (true);

-- =============================================================================
-- Fim da migration 001.
-- =============================================================================
