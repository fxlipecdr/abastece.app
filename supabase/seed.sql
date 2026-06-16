-- =============================================================================
-- Abastece.app — seed.sql
-- -----------------------------------------------------------------------------
-- Dados iniciais para desenvolvimento: postos de União da Vitória/PR e reportes
-- de preço variados (para exercitar o semáforo verde/amarelo/vermelho).
--
-- Rode DEPOIS das migrations 001 e 002. Idempotente via UUIDs fixos + ON CONFLICT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Usuário "bot" do sistema (autor dos reportes de seed).
--    Inserir em auth.users dispara o trigger handle_new_user, que cria o profile.
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-0000000b0001',
  'authenticated', 'authenticated',
  'litro@abastece.app',
  crypt('seed-only-no-login', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"litro_bot","display_name":"Litro"}'
)
ON CONFLICT (id) DO NOTHING;

-- Garante o profile mesmo que o trigger não exista no ambiente de seed.
INSERT INTO public.profiles (id, username, display_name, xp, level)
VALUES ('00000000-0000-0000-0000-0000000b0001', 'litro_bot', 'Litro', 1600, 5)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Postos (União da Vitória/PR e arredores).
-- -----------------------------------------------------------------------------
INSERT INTO public.stations (id, name, brand, address, city, state, location, is_verified, amenities)
VALUES
  ('00000000-0000-0000-0000-0000000a0001', 'Posto Central',        'Ipiranga',
   'Av. Bento Munhoz da Rocha Neto, 100', 'União da Vitória', 'PR',
   ST_SetSRID(ST_MakePoint(-51.0875, -26.2306), 4326)::geography, TRUE,
   '{"conveniente":true,"ar":true,"banheiro":true}'),

  ('00000000-0000-0000-0000-0000000a0002', 'Auto Posto São Cristóvão', 'Shell',
   'R. Cel. Amazonas, 850', 'União da Vitória', 'PR',
   ST_SetSRID(ST_MakePoint(-51.0820, -26.2280), 4326)::geography, TRUE,
   '{"conveniente":true,"lavagem":true,"ar":true,"aberto_24h":true}'),

  ('00000000-0000-0000-0000-0000000a0003', 'Posto Boa Viagem',     'Petrobras',
   'Av. Manoel Ribas, 1500', 'União da Vitória', 'PR',
   ST_SetSRID(ST_MakePoint(-51.0930, -26.2350), 4326)::geography, FALSE,
   '{"ar":true,"banheiro":true}'),

  ('00000000-0000-0000-0000-0000000a0004', 'Posto Gralha Azul',    'Ipiranga',
   'R. Padre Saporiti, 420', 'União da Vitória', 'PR',
   ST_SetSRID(ST_MakePoint(-51.0790, -26.2330), 4326)::geography, FALSE,
   '{"conveniente":true}'),

  ('00000000-0000-0000-0000-0000000a0005', 'Posto Iguaçu',         'Shell',
   'BR-153, Km 12', 'União da Vitória', 'PR',
   ST_SetSRID(ST_MakePoint(-51.1010, -26.2410), 4326)::geography, FALSE,
   '{"conveniente":true,"lavagem":true,"banheiro":true,"aberto_24h":true}'),

  ('00000000-0000-0000-0000-0000000a0006', 'Posto Porto União',    'Petrobras',
   'Av. Manoel Ribas, 90', 'Porto União', 'SC',
   ST_SetSRID(ST_MakePoint(-51.0760, -26.2380), 4326)::geography, TRUE,
   '{"conveniente":true,"ar":true}'),

  ('00000000-0000-0000-0000-0000000a0007', 'Posto Rodeio',         'Br Mania',
   'R. Sete de Setembro, 233', 'União da Vitória', 'PR',
   ST_SetSRID(ST_MakePoint(-51.0855, -26.2255), 4326)::geography, FALSE,
   '{"banheiro":true}'),

  ('00000000-0000-0000-0000-0000000a0008', 'Posto Vitória Diesel', 'Ipiranga',
   'BR-476, Km 3', 'União da Vitória', 'PR',
   ST_SetSRID(ST_MakePoint(-51.0700, -26.2200), 4326)::geography, FALSE,
   '{"banheiro":true,"aberto_24h":true}')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Reportes de preço (variados para exercitar o semáforo).
--    gasolina_comum: barato 5,79 → caro 6,19 | etanol e diesel_s10 também.
-- -----------------------------------------------------------------------------
INSERT INTO public.price_reports (station_id, user_id, fuel_type, price, reported_at, source)
VALUES
  -- Posto Central
  ('00000000-0000-0000-0000-0000000a0001', '00000000-0000-0000-0000-0000000b0001', 'gasolina_comum', 5.890, NOW() - INTERVAL '2 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0001', '00000000-0000-0000-0000-0000000b0001', 'etanol',         4.290, NOW() - INTERVAL '2 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0001', '00000000-0000-0000-0000-0000000b0001', 'diesel_s10',     6.090, NOW() - INTERVAL '2 hours', 'user'),
  -- São Cristóvão (mais barato)
  ('00000000-0000-0000-0000-0000000a0002', '00000000-0000-0000-0000-0000000b0001', 'gasolina_comum', 5.790, NOW() - INTERVAL '1 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0002', '00000000-0000-0000-0000-0000000b0001', 'etanol',         4.190, NOW() - INTERVAL '1 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0002', '00000000-0000-0000-0000-0000000b0001', 'diesel_s10',     5.990, NOW() - INTERVAL '1 hours', 'user'),
  -- Boa Viagem (caro)
  ('00000000-0000-0000-0000-0000000a0003', '00000000-0000-0000-0000-0000000b0001', 'gasolina_comum', 6.190, NOW() - INTERVAL '5 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0003', '00000000-0000-0000-0000-0000000b0001', 'etanol',         4.590, NOW() - INTERVAL '5 hours', 'user'),
  -- Gralha Azul (médio)
  ('00000000-0000-0000-0000-0000000a0004', '00000000-0000-0000-0000-0000000b0001', 'gasolina_comum', 5.990, NOW() - INTERVAL '3 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0004', '00000000-0000-0000-0000-0000000b0001', 'diesel_s10',     6.150, NOW() - INTERVAL '3 hours', 'user'),
  -- Iguaçu (médio/caro)
  ('00000000-0000-0000-0000-0000000a0005', '00000000-0000-0000-0000-0000000b0001', 'gasolina_comum', 6.090, NOW() - INTERVAL '4 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0005', '00000000-0000-0000-0000-0000000b0001', 'etanol',         4.490, NOW() - INTERVAL '4 hours', 'user'),
  -- Porto União (barato)
  ('00000000-0000-0000-0000-0000000a0006', '00000000-0000-0000-0000-0000000b0001', 'gasolina_comum', 5.840, NOW() - INTERVAL '1 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0006', '00000000-0000-0000-0000-0000000b0001', 'diesel_s10',     5.950, NOW() - INTERVAL '1 hours', 'user'),
  -- Rodeio (médio)
  ('00000000-0000-0000-0000-0000000a0007', '00000000-0000-0000-0000-0000000b0001', 'gasolina_comum', 5.950, NOW() - INTERVAL '6 hours', 'user'),
  -- Vitória Diesel (foco diesel, barato)
  ('00000000-0000-0000-0000-0000000a0008', '00000000-0000-0000-0000-0000000b0001', 'diesel_s10',     5.890, NOW() - INTERVAL '2 hours', 'user'),
  ('00000000-0000-0000-0000-0000000a0008', '00000000-0000-0000-0000-0000000b0001', 'gasolina_comum', 6.090, NOW() - INTERVAL '2 hours', 'user');

-- -----------------------------------------------------------------------------
-- 4. Histórico (30 dias) para o gráfico do Posto Central — gasolina_comum.
-- -----------------------------------------------------------------------------
INSERT INTO public.price_reports (station_id, user_id, fuel_type, price, reported_at, source)
SELECT
  '00000000-0000-0000-0000-0000000a0001',
  '00000000-0000-0000-0000-0000000b0001',
  'gasolina_comum',
  -- oscila suavemente em torno de 5,90
  ROUND((5.90 + (sin(d::numeric) * 0.12))::numeric, 3),
  NOW() - (d || ' days')::interval,
  'user'
FROM generate_series(3, 30, 3) AS d;

-- -----------------------------------------------------------------------------
-- 5. Atualiza a view materializada de preços vigentes.
-- -----------------------------------------------------------------------------
REFRESH MATERIALIZED VIEW public.current_prices;

-- =============================================================================
-- Fim do seed.
-- =============================================================================
