/**
 * Abastece.app — Edge Function: validate-price-report
 * -----------------------------------------------------------------------------
 * Executada ANTES de persistir um reporte de preço. Aplica as regras
 * anti-fraude da Seção 5.3/8.3:
 *
 *   1. GPS check  — usuário precisa estar a < 500m do posto.
 *   2. Range      — preço com desvio > 30% da média histórica vira "pendente".
 *   3. Rate limit — máximo 3 reports por posto por usuário por dia.
 *   4. Reputação  — reports de usuários nível 1 entram como pendentes.
 *   5. Persiste   — auto-aprovado insere direto; pendente aguarda 2 confirmações.
 *
 * Runtime: Deno (Supabase Edge Functions).
 * Deploy:  supabase functions deploy validate-price-report
 */

// @ts-expect-error — resolvido pelo runtime Deno do Supabase.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error — resolvido pelo runtime Deno do Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Acesso ao ambiente Deno sem depender dos tipos globais.
const env = (key: string): string =>
  // @ts-expect-error — Deno.env existe no runtime de execução.
  (globalThis.Deno?.env?.get(key) as string | undefined) ?? '';

const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');

// -----------------------------------------------------------------------------
// Tipos do payload (espelham packages/types)
// -----------------------------------------------------------------------------
type FuelType =
  | 'gasolina_comum'
  | 'gasolina_aditivada'
  | 'etanol'
  | 'diesel'
  | 'diesel_s10'
  | 'gnv';

interface ReportInput {
  station_id: string;
  fuel_type: FuelType;
  price: number;
  /** Localização do usuário no momento do reporte (para o GPS check). */
  user_lat: number;
  user_lng: number;
}

interface ValidationResult {
  accepted: boolean;
  pending: boolean;
  reason?: string;
  report_id?: string;
}

// Constantes de regra de negócio.
const MAX_DISTANCE_METERS = 500;
const MAX_REPORTS_PER_DAY = 3;
const PRICE_TOLERANCE = 0.3; // ±30%

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: ValidationResult | { error: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  // O JWT do usuário vem no header Authorization; usamos para identificar o autor.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return json({ error: 'Não autenticado' }, 401);

  let input: ReportInput;
  try {
    input = (await req.json()) as ReportInput;
  } catch {
    return json({ error: 'Payload inválido' }, 400);
  }

  // Validação básica de formato antes de tocar no banco.
  if (
    !input.station_id ||
    !input.fuel_type ||
    typeof input.price !== 'number' ||
    input.price <= 0 ||
    input.price >= 20
  ) {
    return json({ error: 'Dados do reporte inválidos' }, 400);
  }

  // Cliente com service role para escrever, mas o user_id vem do token.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) return json({ error: 'Sessão inválida' }, 401);
  const userId = user.id;

  try {
    // ---- 1. GPS check: distância usuário ↔ posto ---------------------------
    const { data: distRows, error: distErr } = await admin.rpc('station_distance_m', {
      station: input.station_id,
      user_lat: input.user_lat,
      user_lng: input.user_lng,
    });
    if (distErr) throw distErr;
    const distanceM = Number(distRows);
    if (!Number.isFinite(distanceM)) {
      return json({ accepted: false, pending: false, reason: 'Posto não encontrado' }, 404);
    }
    if (distanceM > MAX_DISTANCE_METERS) {
      return json({
        accepted: false,
        pending: false,
        reason: 'Você precisa estar próximo do posto (até 500m) para reportar.',
      });
    }

    // ---- 3. Rate limit: reports do usuário nas últimas 24h -----------------
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: todayCount, error: countErr } = await admin
      .from('price_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('station_id', input.station_id)
      .gte('reported_at', since);
    if (countErr) throw countErr;
    if ((todayCount ?? 0) >= MAX_REPORTS_PER_DAY) {
      return json({
        accepted: false,
        pending: false,
        reason: 'Limite de 3 reportes por posto por dia atingido.',
      });
    }

    // ---- 2. Range histórico: média dos últimos 30 dias ---------------------
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: history, error: histErr } = await admin
      .from('price_reports')
      .select('price')
      .eq('station_id', input.station_id)
      .eq('fuel_type', input.fuel_type)
      .gte('reported_at', monthAgo);
    if (histErr) throw histErr;

    const prices = (history ?? []).map((r: { price: number }) => Number(r.price));
    const avg = prices.length
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null;
    const outOfRange =
      avg !== null &&
      (input.price < avg * (1 - PRICE_TOLERANCE) ||
        input.price > avg * (1 + PRICE_TOLERANCE));

    // ---- 4. Reputação: nível 1 entra pendente ------------------------------
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('level')
      .eq('id', userId)
      .single();
    if (profErr) throw profErr;
    const lowReputation = (profile?.level ?? 1) <= 1;

    const pending = outOfRange || lowReputation;

    // ---- 5. Persistência ---------------------------------------------------
    const { data: inserted, error: insErr } = await admin
      .from('price_reports')
      .insert({
        station_id: input.station_id,
        user_id: userId,
        fuel_type: input.fuel_type,
        price: input.price,
        is_pending: pending,
        source: 'user',
      })
      .select('id')
      .single();
    if (insErr) throw insErr;

    // Auto-aprovado atualiza a view materializada para refletir na hora.
    if (!pending) {
      await admin.rpc('refresh_current_prices').catch(() => {
        /* refresh é best-effort; o cron cobre o caso de falha. */
      });
    }

    return json({
      accepted: true,
      pending,
      report_id: inserted.id,
      reason: pending
        ? 'Reporte recebido! Aguardando confirmação de outros usuários.'
        : 'Reporte confirmado. Obrigado!',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
