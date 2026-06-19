/**
 * Abastece.app — Edge Function: validate-price-report (v2, hardened)
 * -----------------------------------------------------------------------------
 * Valida e persiste um reporte de preço, agora sob a camada de governança:
 *   - withGovernance: CORS, request-id, payload guard, erros padronizados
 *   - getAuthedUser:  exige JWT válido
 *   - enforceRateLimit: cota de borda por IP+usuário (anti-abuso/DoS)
 *   - sanitização estrita de inputs (assertUuid / assertNumber)
 *   - set_audit_context: registra origem (IP/UA/request-id) no audit_log
 *
 * Regras de negócio (mantidas):
 *   1. GPS check (< 500m)  2. rate limit 3/posto/dia  3. range ±30%
 *   4. reputação (nível 1 → pendente)  5. persistência + refresh da view
 *
 * Runtime: Deno (Supabase Edge Functions).
 */

// @ts-expect-error — resolvido pelo runtime Deno do Supabase.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  assertNumber,
  assertUuid,
  enforceRateLimit,
  getAuthedUser,
  HttpError,
  json,
  withGovernance,
} from '../_shared/middleware.ts';

type FuelType =
  | 'gasolina_comum'
  | 'gasolina_aditivada'
  | 'etanol'
  | 'diesel'
  | 'diesel_s10'
  | 'gnv';

const FUELS: FuelType[] = [
  'gasolina_comum',
  'gasolina_aditivada',
  'etanol',
  'diesel',
  'diesel_s10',
  'gnv',
];

// Constantes de regra de negócio.
const MAX_DISTANCE_METERS = 500;
const MAX_REPORTS_PER_DAY = 3;
const PRICE_TOLERANCE = 0.3;

// Rate limit de borda (defesa contra abuso, além da regra de negócio).
const EDGE_RATE_LIMIT = 20; // requisições
const EDGE_RATE_WINDOW = 60; // por minuto

// Limite de tamanho do corpo (anti-DoS de payload).
const MAX_BODY_BYTES = 2_048;

serve((req: Request) =>
  withGovernance(req, async (ctx) => {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Método não permitido', 'method_not_allowed');
    }

    // 0. Guard de tamanho do payload.
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Payload muito grande', 'payload_too_large');
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, 'JSON inválido', 'invalid_json');
    }

    // 1. Autenticação.
    const { user } = await getAuthedUser(ctx.admin, req);
    const userId = user.id;

    // 2. Rate limit de borda (por IP + usuário).
    await enforceRateLimit(
      ctx.admin,
      `report:ip:${ctx.ip}:user:${userId}`,
      EDGE_RATE_LIMIT,
      EDGE_RATE_WINDOW,
    );

    // 3. Sanitização estrita.
    const stationId = assertUuid(parsed.station_id, 'station_id');
    const fuelType = parsed.fuel_type as FuelType;
    if (!FUELS.includes(fuelType)) {
      throw new HttpError(400, 'Combustível inválido', 'invalid_input');
    }
    const price = assertNumber(parsed.price, 'price', { min: 0.001, max: 19.999 });
    const userLat = assertNumber(parsed.user_lat, 'user_lat', { min: -90, max: 90 });
    const userLng = assertNumber(parsed.user_lng, 'user_lng', { min: -180, max: 180 });

    // 4. GPS check.
    const { data: distData, error: distErr } = await ctx.admin.rpc('station_distance_m', {
      station: stationId,
      user_lat: userLat,
      user_lng: userLng,
    });
    if (distErr) throw new HttpError(500, 'Falha ao validar localização', 'distance_error');
    const distanceM = Number(distData);
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

    // 6. Rate limit de negócio: 3/posto/dia.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: todayCount, error: countErr } = await ctx.admin
      .from('price_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('station_id', stationId)
      .gte('reported_at', since);
    if (countErr) throw new HttpError(500, 'Falha ao verificar histórico', 'count_error');
    if ((todayCount ?? 0) >= MAX_REPORTS_PER_DAY) {
      return json({
        accepted: false,
        pending: false,
        reason: 'Limite de 3 reportes por posto por dia atingido.',
      });
    }

    // 7. Range histórico (30 dias).
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: history, error: histErr } = await ctx.admin
      .from('price_reports')
      .select('price')
      .eq('station_id', stationId)
      .eq('fuel_type', fuelType)
      .gte('reported_at', monthAgo);
    if (histErr) throw new HttpError(500, 'Falha ao consultar histórico', 'history_error');

    const prices = (history ?? []).map((r: { price: number }) => Number(r.price));
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const outOfRange =
      avg !== null && (price < avg * (1 - PRICE_TOLERANCE) || price > avg * (1 + PRICE_TOLERANCE));

    // 8. Reputação.
    const { data: profile, error: profErr } = await ctx.admin
      .from('profiles')
      .select('level')
      .eq('id', userId)
      .single();
    if (profErr) throw new HttpError(500, 'Falha ao carregar perfil', 'profile_error');
    const lowReputation = (profile?.level ?? 1) <= 1;

    const pending = outOfRange || lowReputation;

    // 9. Persistência auditada (contexto de origem + insert na mesma transação).
    const { data: newId, error: insErr } = await ctx.admin.rpc('insert_price_report_audited', {
      p_station: stationId,
      p_user: userId,
      p_fuel: fuelType,
      p_price: price,
      p_pending: pending,
      p_ip: ctx.ip,
      p_user_agent: ctx.userAgent,
      p_request_id: ctx.requestId,
    });
    if (insErr) throw new HttpError(500, 'Falha ao salvar o reporte', 'insert_error');

    if (!pending) {
      await ctx.admin.rpc('refresh_current_prices').catch(() => {});
    }

    return json({
      accepted: true,
      pending,
      report_id: newId,
      reason: pending
        ? 'Reporte recebido! Aguardando confirmação de outros usuários.'
        : 'Reporte confirmado. Obrigado!',
    });
  })
);
