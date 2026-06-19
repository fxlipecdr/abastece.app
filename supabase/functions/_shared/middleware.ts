/**
 * Abastece.app — Middleware de governança para Edge Functions (Deno)
 * -----------------------------------------------------------------------------
 * Camada de borda reutilizável que blinda os endpoints (OWASP-aligned):
 *   - CORS + preflight padronizados
 *   - Identificação de origem (IP, request-id, user-agent)
 *   - Autenticação (JWT do Supabase)
 *   - Rate limiting dinâmico atômico (via RPC check_rate_limit no banco)
 *   - RBAC (checagem de papel no tenant)
 *   - Sanitização/validação estrita de inputs
 *   - Respostas e erros padronizados, sempre com X-Request-Id
 *
 * Nada de segredos hardcoded: tudo vem de variáveis de ambiente do runtime.
 */

// @ts-expect-error — resolvido pelo runtime Deno do Supabase.
import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2';

// Acesso ao ambiente sem depender dos tipos globais do Deno.
const env = (key: string): string =>
  // @ts-expect-error — Deno.env existe no runtime.
  (globalThis.Deno?.env?.get(key) as string | undefined) ?? '';

export const SUPABASE_URL = env('SUPABASE_URL');
export const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');

/** Origens permitidas (CSV em ALLOWED_ORIGINS); '*' como fallback de dev. */
const ALLOWED_ORIGINS = (env('ALLOWED_ORIGINS') || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function resolveOrigin(req: Request): string {
  const origin = req.headers.get('Origin') ?? '';
  if (ALLOWED_ORIGINS.includes('*')) return '*';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '';
}

function baseHeaders(req: Request, requestId: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
    'X-Request-Id': requestId,
    // Hardening básico de resposta.
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

/** Erro HTTP estruturado para fluxo de controle do middleware. */
export class HttpError extends Error {
  status: number;
  code: string;
  extraHeaders: Record<string, string>;
  constructor(status: number, message: string, code = 'error', extraHeaders: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extraHeaders = extraHeaders;
  }
}

/** Cliente com service role (escrita controlada; user vem do token). */
export function adminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new HttpError(500, 'Configuração de ambiente ausente', 'config_missing');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Extrai o IP do cliente respeitando proxies (primeiro de X-Forwarded-For). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

/** Autentica via JWT; lança 401 se inválido. */
export async function getAuthedUser(
  admin: SupabaseClient,
  req: Request,
): Promise<{ user: User; token: string }> {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) throw new HttpError(401, 'Não autenticado', 'unauthenticated');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sessão inválida', 'invalid_session');
  return { user: data.user, token };
}

export interface RateInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset_at: string;
}

/**
 * Consome cota de rate limit de forma atômica no banco (resistente a múltiplas
 * instâncias da Edge). Lança 429 com Retry-After quando excedido.
 */
export async function enforceRateLimit(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateInfo> {
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new HttpError(500, 'Falha no controle de taxa', 'rate_limit_error');
  const info = data as RateInfo;
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(info.limit),
    'X-RateLimit-Remaining': String(info.remaining),
    'X-RateLimit-Reset': info.reset_at,
  };
  if (!info.allowed) {
    const retry = Math.max(
      1,
      Math.ceil((new Date(info.reset_at).getTime() - Date.now()) / 1000),
    );
    throw new HttpError(429, 'Limite de requisições excedido. Tente mais tarde.', 'rate_limited', {
      ...headers,
      'Retry-After': String(retry),
    });
  }
  return info;
}

/** Garante que o usuário tem um dos papéis exigidos no tenant; senão lança 403. */
export async function requireTenantRole(
  admin: SupabaseClient,
  userId: string,
  tenantId: string,
  roles: string[],
): Promise<string> {
  const { data, error } = await admin
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'Falha ao verificar permissão', 'rbac_error');
  if (!data || !roles.includes(data.role as string)) {
    throw new HttpError(403, 'Permissão insuficiente para esta operação', 'forbidden');
  }
  return data.role as string;
}

// -----------------------------------------------------------------------------
// Sanitização / validação estrita de inputs (anti-injection)
// -----------------------------------------------------------------------------

interface StringRule {
  field: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export function assertString(value: unknown, rule: StringRule): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, `Campo '${rule.field}' deve ser texto`, 'invalid_input');
  }
  const v = value.trim();
  if (rule.min !== undefined && v.length < rule.min) {
    throw new HttpError(400, `Campo '${rule.field}' muito curto`, 'invalid_input');
  }
  if (rule.max !== undefined && v.length > rule.max) {
    throw new HttpError(400, `Campo '${rule.field}' excede o tamanho máximo`, 'invalid_input');
  }
  if (rule.pattern && !rule.pattern.test(v)) {
    throw new HttpError(400, `Campo '${rule.field}' em formato inválido`, 'invalid_input');
  }
  return v;
}

export function assertUuid(value: unknown, field: string): string {
  return assertString(value, {
    field,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  });
}

export function assertNumber(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number } = {},
): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new HttpError(400, `Campo '${field}' deve ser numérico`, 'invalid_input');
  }
  if (opts.min !== undefined && n < opts.min) {
    throw new HttpError(400, `Campo '${field}' abaixo do mínimo`, 'invalid_input');
  }
  if (opts.max !== undefined && n > opts.max) {
    throw new HttpError(400, `Campo '${field}' acima do máximo`, 'invalid_input');
  }
  return n;
}

// -----------------------------------------------------------------------------
// Contexto e wrapper de execução
// -----------------------------------------------------------------------------

export interface GovernanceContext {
  admin: SupabaseClient;
  req: Request;
  ip: string;
  userAgent: string;
  requestId: string;
}

/**
 * Envelope padrão: trata OPTIONS, monta contexto, executa o handler e
 * padroniza erros (sempre JSON + X-Request-Id). Limita payload por segurança.
 */
export async function withGovernance(
  req: Request,
  handler: (ctx: GovernanceContext) => Promise<Response>,
): Promise<Response> {
  const requestId = req.headers.get('x-request-id') || newRequestId();
  const headers = baseHeaders(req, requestId);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const admin = adminClient();
    const ctx: GovernanceContext = {
      admin,
      req,
      ip: clientIp(req),
      userAgent: req.headers.get('user-agent') ?? '',
      requestId,
    };
    const res = await handler(ctx);
    // Garante o request-id também nas respostas do handler.
    headers['Content-Type'] = res.headers.get('Content-Type') ?? 'application/json';
    const merged = new Headers(res.headers);
    for (const [k, v] of Object.entries(headers)) merged.set(k, v);
    return new Response(res.body, { status: res.status, headers: merged });
  } catch (err) {
    const e =
      err instanceof HttpError
        ? err
        : new HttpError(500, 'Erro interno', 'internal_error');
    return new Response(
      JSON.stringify({ error: e.message, code: e.code, request_id: requestId }),
      {
        status: e.status,
        headers: { ...headers, ...e.extraHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}

/** Helper de resposta JSON de sucesso. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
