-- =============================================================================
-- Abastece.app — Migration 002: Seed de badges (conquistas)
-- -----------------------------------------------------------------------------
-- Catálogo inicial de conquistas conforme Seção 5.4 do escopo.
-- Idempotente: ON CONFLICT atualiza, permitindo reexecução segura.
-- =============================================================================

INSERT INTO public.badges (id, name, description, icon, xp_reward, condition_type, condition_value)
VALUES
  ('first_report', 'Primeiro Litro',  'Primeiro reporte enviado',          '⛽', 50,  'reports_count', 1),
  ('streak_7',     'Fiel da Bomba',   '7 dias seguidos reportando',        '🔥', 100, 'streak',        7),
  ('streak_30',    'Guardião',        '30 dias seguidos',                  '🛡️', 500, 'streak',        30),
  ('reports_10',   'Colaborador',     '10 reports enviados',               '🤝', 80,  'reports_count', 10),
  ('reports_100',  'Veterano',        '100 reports enviados',              '⭐', 300, 'reports_count', 100),
  ('accuracy_90',  'Olho Vivo',       '90% de precisão nos reports',       '👁️', 200, 'accuracy',      90),
  ('new_station',  'Desbravador',     'Cadastrou um posto novo',           '🗺️', 150, 'new_station',   1),
  ('saver_50',     'Economizador',    'Economizou R$ 50 com o app',        '💰', 100, 'savings',       50)
ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  description     = EXCLUDED.description,
  icon            = EXCLUDED.icon,
  xp_reward       = EXCLUDED.xp_reward,
  condition_type  = EXCLUDED.condition_type,
  condition_value = EXCLUDED.condition_value;

-- =============================================================================
-- Fim da migration 002.
-- =============================================================================
