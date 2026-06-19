-- =============================================================================
-- Abastece.app — Migration 003: Multi-tenancy + RBAC + Audit Trail imutável
-- -----------------------------------------------------------------------------
-- Fundação corporativa (B2B). Introduz:
--   1. tenants            — clientes corporativos (redes de postos, distribuidoras)
--   2. tenant_members     — vínculo usuário↔tenant com papel (RBAC granular)
--   3. isolamento por tenant nas tabelas de domínio (RLS reescrita)
--   4. audit_log          — trilha de auditoria APPEND-ONLY (quem/quando/onde/quê)
--
-- Princípios aplicados:
--   - Funções SECURITY DEFINER com search_path FIXADO (anti search_path injection).
--   - RLS nega por padrão; acesso concedido explicitamente por papel.
--   - audit_log é imutável por trigger (bloqueia UPDATE/DELETE até do owner).
--
-- Idempotente onde possível (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tipos
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_role') THEN
    -- Papéis do menos para o mais privilegiado.
    CREATE TYPE tenant_role AS ENUM ('viewer', 'analyst', 'manager', 'admin', 'owner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status') THEN
    CREATE TYPE tenant_status AS ENUM ('trial', 'active', 'suspended', 'canceled');
  END IF;
END$$;

-- -----------------------------------------------------------------------------
-- 2. tenants — clientes corporativos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  cnpj        TEXT UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'visible'
                CHECK (plan IN ('visible', 'featured', 'premium', 'enterprise')),
  status      tenant_status NOT NULL DEFAULT 'trial',
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.tenants IS 'Cliente corporativo (tenant). Unidade de isolamento de dados.';

-- -----------------------------------------------------------------------------
-- 3. tenant_members — RBAC (vínculo usuário↔tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_members (
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        tenant_role NOT NULL DEFAULT 'viewer',
  invited_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON public.tenant_members(user_id);

-- -----------------------------------------------------------------------------
-- 4. Vínculo das tabelas de domínio ao tenant
-- -----------------------------------------------------------------------------
ALTER TABLE public.stations    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.advertisers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_stations_tenant    ON public.stations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_advertisers_tenant ON public.advertisers(tenant_id);

-- -----------------------------------------------------------------------------
-- 5. Funções de autorização (search_path FIXADO = anti-injection)
-- -----------------------------------------------------------------------------

-- Tenants aos quais o usuário autenticado pertence.
CREATE OR REPLACE FUNCTION public.auth_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

-- Verifica se o usuário tem ALGUM dos papéis informados no tenant.
CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant UUID, p_roles tenant_role[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = p_tenant
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$;

-- Cria um tenant e vincula o criador como 'owner' atomicamente (API-first).
CREATE OR REPLACE FUNCTION public.create_tenant(p_name TEXT, p_slug TEXT, p_cnpj TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  INSERT INTO public.tenants(name, slug, cnpj) VALUES (p_name, p_slug, p_cnpj) RETURNING id INTO v_id;
  INSERT INTO public.tenant_members(tenant_id, user_id, role, invited_by)
  VALUES (v_id, auth.uid(), 'owner', auth.uid());
  RETURN v_id;
END;
$$;

-- updated_at automático em tenants.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_tenants_updated ON public.tenants;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. RLS — tenants e tenant_members (nega por padrão, concede por papel)
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- tenants: membro enxerga os seus; só owner/admin altera.
DROP POLICY IF EXISTS tenants_select ON public.tenants;
CREATE POLICY tenants_select ON public.tenants FOR SELECT
  USING (id IN (SELECT public.auth_tenant_ids()));

DROP POLICY IF EXISTS tenants_update ON public.tenants;
CREATE POLICY tenants_update ON public.tenants FOR UPDATE
  USING (public.has_tenant_role(id, ARRAY['owner','admin']::tenant_role[]))
  WITH CHECK (public.has_tenant_role(id, ARRAY['owner','admin']::tenant_role[]));

-- tenant_members: membro vê o quadro do seu tenant; owner/admin gerencia.
DROP POLICY IF EXISTS members_select ON public.tenant_members;
CREATE POLICY members_select ON public.tenant_members FOR SELECT
  USING (tenant_id IN (SELECT public.auth_tenant_ids()));

DROP POLICY IF EXISTS members_manage ON public.tenant_members;
CREATE POLICY members_manage ON public.tenant_members FOR ALL
  USING (public.has_tenant_role(tenant_id, ARRAY['owner','admin']::tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner','admin']::tenant_role[]));

-- -----------------------------------------------------------------------------
-- 7. RLS de domínio — isolamento por tenant
-- -----------------------------------------------------------------------------
-- stations: leitura pública (consumidor). Atualização: dono pessoal OU
-- operador do tenant proprietário com papel de gestão.
DROP POLICY IF EXISTS "stations_update_owner" ON public.stations;
DROP POLICY IF EXISTS stations_update_tenant ON public.stations;
CREATE POLICY stations_update_tenant ON public.stations FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR (tenant_id IS NOT NULL
        AND public.has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::tenant_role[]))
  );

-- advertisers: leitura pública (banner). Escrita restrita ao tenant proprietário.
DROP POLICY IF EXISTS advertisers_manage ON public.advertisers;
CREATE POLICY advertisers_manage ON public.advertisers FOR ALL
  USING (tenant_id IS NOT NULL
         AND public.has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::tenant_role[]))
  WITH CHECK (tenant_id IS NOT NULL
         AND public.has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::tenant_role[]));

-- =============================================================================
-- 8. AUDIT TRAIL — append-only, imutável
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id    UUID,                 -- quem (auth.uid())
  actor_role  TEXT,                 -- papel/claim no momento da ação
  tenant_id   UUID,                 -- onde (contexto corporativo)
  action      TEXT NOT NULL,        -- INSERT / UPDATE / DELETE
  entity_type TEXT NOT NULL,        -- tabela afetada
  entity_id   TEXT,                 -- id da linha afetada
  old_data    JSONB,                -- estado anterior (UPDATE/DELETE)
  new_data    JSONB,                -- estado novo (INSERT/UPDATE)
  ip          INET,                 -- origem (preenchida pela borda/API)
  user_agent  TEXT,
  request_id  TEXT                  -- correlação com logs/traços
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log(entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_log(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON public.audit_log(actor_id, occurred_at DESC);

-- Função genérica de auditoria. Captura quem/quando/onde/quê.
-- Contexto de rede (ip/user_agent/request_id) vem de GUCs setadas pela borda:
--   SELECT set_config('app.client_ip', '1.2.3.4', true);  -- por transação
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_entity_id TEXT;
  v_tenant UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_old := to_jsonb(OLD); v_new := NULL; v_entity_id := (OLD).id::text;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_entity_id := (NEW).id::text;
  ELSE
    v_old := NULL; v_new := to_jsonb(NEW); v_entity_id := (NEW).id::text;
  END IF;

  -- tenant_id da própria linha, se a tabela tiver a coluna.
  v_tenant := COALESCE((v_new->>'tenant_id')::uuid, (v_old->>'tenant_id')::uuid);

  INSERT INTO public.audit_log(
    actor_id, actor_role, tenant_id, action, entity_type, entity_id,
    old_data, new_data, ip, user_agent, request_id
  ) VALUES (
    auth.uid(),
    current_setting('request.jwt.claim.role', true),
    v_tenant,
    TG_OP,
    TG_TABLE_NAME,
    v_entity_id,
    v_old,
    v_new,
    NULLIF(current_setting('app.client_ip', true), '')::inet,
    NULLIF(current_setting('app.user_agent', true), ''),
    NULLIF(current_setting('app.request_id', true), '')
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Anexa auditoria às tabelas críticas (alteração de estado).
DROP TRIGGER IF EXISTS audit_stations       ON public.stations;
DROP TRIGGER IF EXISTS audit_price_reports  ON public.price_reports;
DROP TRIGGER IF EXISTS audit_tenant_members ON public.tenant_members;
DROP TRIGGER IF EXISTS audit_advertisers    ON public.advertisers;
DROP TRIGGER IF EXISTS audit_tenants        ON public.tenants;

CREATE TRIGGER audit_stations       AFTER INSERT OR UPDATE OR DELETE ON public.stations        FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_price_reports  AFTER INSERT OR UPDATE OR DELETE ON public.price_reports   FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_tenant_members AFTER INSERT OR UPDATE OR DELETE ON public.tenant_members  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_advertisers    AFTER INSERT OR UPDATE OR DELETE ON public.advertisers     FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_tenants        AFTER INSERT OR UPDATE OR DELETE ON public.tenants         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- -----------------------------------------------------------------------------
-- 9. Imutabilidade do audit_log (append-only de verdade)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log é imutável (append-only); operação % bloqueada', TG_OP
    USING ERRCODE = '42501';
END;
$$;
DROP TRIGGER IF EXISTS audit_log_immutable ON public.audit_log;
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- RLS: leitura só para owner/admin do tenant; escrita só via trigger (definer).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_select ON public.audit_log;
CREATE POLICY audit_select ON public.audit_log FOR SELECT
  USING (tenant_id IS NOT NULL
         AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::tenant_role[]));

-- Nenhuma política de INSERT/UPDATE/DELETE → clientes não escrevem direto.
-- Revoga DML direto de papéis públicos por garantia (defense in depth).
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM anon, authenticated;

-- =============================================================================
-- Fim da migration 003.
-- =============================================================================
