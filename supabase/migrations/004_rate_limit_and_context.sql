-- =============================================================================
-- Abastece.app — Migration 004: Rate limiting + contexto de auditoria
-- -----------------------------------------------------------------------------
-- Suporte de banco para a camada de borda (Edge) de governança:
--   1. rate_limit_hits   — janela deslizante de contagem por chave (tenant+IP+rota)
--   2. check_rate_limit  — função atômica de consumo de cota (defense in depth)
--   3. set_audit_context — seta GUCs por transação p/ o audit_log registrar origem
--
-- O rate limit também vive no banco (não só na borda) para resistir a múltiplas
-- instâncias da Edge e a bypass do gateway. SECURITY DEFINER com search_path fixo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela de janelas de rate limit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  bucket_key   TEXT NOT NULL,          -- ex.: 'report:tenant:<id>:ip:<addr>'
  window_start TIMESTAMPTZ NOT NULL,   -- início da janela atual (truncado)
  hits         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);
-- Índice para limpeza eficiente de janelas antigas.
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_hits(window_start);

-- Bloqueia acesso direto: só a função SECURITY DEFINER manipula a tabela.
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_hits FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Consumo atômico de cota (janela fixa por simplicidade e robustez)
--    Retorna JSON: { allowed, remaining, limit, reset_at }
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key       TEXT,
  p_limit     INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_hits INTEGER;
BEGIN
  IF p_limit <= 0 OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Parâmetros de rate limit inválidos' USING ERRCODE = '22023';
  END IF;

  -- Trunca o início da janela para alinhar contagens (janela fixa).
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  -- UPSERT atômico: incrementa e devolve o total na janela.
  INSERT INTO public.rate_limit_hits(bucket_key, window_start, hits)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET hits = public.rate_limit_hits.hits + 1
  RETURNING hits INTO v_hits;

  RETURN jsonb_build_object(
    'allowed',   v_hits <= p_limit,
    'remaining', GREATEST(p_limit - v_hits, 0),
    'limit',     p_limit,
    'reset_at',  v_window_start + make_interval(secs => p_window_seconds)
  );
END;
$$;

-- Limpeza de janelas antigas (agendar via pg_cron):
--   SELECT cron.schedule('gc-rate-limit','*/10 * * * *',
--     $$DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 hour'$$);
CREATE OR REPLACE FUNCTION public.gc_rate_limit()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 hour';
$$;

-- -----------------------------------------------------------------------------
-- 3. Contexto de auditoria por transação (origem da requisição)
--    A borda chama isto no início da transação; o audit_trigger lê as GUCs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_audit_context(
  p_ip         TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 'true' = escopo local à transação (não vaza entre conexões do pool).
  PERFORM set_config('app.client_ip',  COALESCE(p_ip, ''), true);
  PERFORM set_config('app.user_agent', COALESCE(p_user_agent, ''), true);
  PERFORM set_config('app.request_id', COALESCE(p_request_id, ''), true);
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Insert auditado de reporte de preço (contexto + escrita na MESMA transação)
--    Garante que o audit_log capture IP/UA/request-id de forma confiável,
--    já que chamadas REST separadas não compartilham transação.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_price_report_audited(
  p_station    UUID,
  p_user       UUID,
  p_fuel       fuel_type,
  p_price      NUMERIC,
  p_pending    BOOLEAN,
  p_ip         TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.set_audit_context(p_ip, p_user_agent, p_request_id);
  INSERT INTO public.price_reports(station_id, user_id, fuel_type, price, is_pending, source)
  VALUES (p_station, p_user, p_fuel, p_price, p_pending, 'user')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- =============================================================================
-- Fim da migration 004.
-- =============================================================================
