/**
 * Abastece.app — Utilitários de preço, semáforo, XP e economia
 * -----------------------------------------------------------------------------
 * Funções puras e testáveis (sem efeitos colaterais). Compartilhadas entre
 * web e mobile. Cobertas por testes unitários (price.test.ts).
 */

import {
  LEVELS,
  type LevelInfo,
  type NearbyStation,
  type PriceCategory,
} from '../types';

// -----------------------------------------------------------------------------
// Formatação monetária (padrão BR: vírgula decimal)
// -----------------------------------------------------------------------------

/**
 * Formata um valor como preço de combustível no padrão brasileiro.
 * Combustível usa 3 casas decimais (ex.: R$ 5,899).
 */
export function formatFuelPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return '—';
  }
  return `R$ ${price.toFixed(3).replace('.', ',')}`;
}

/** Formata um valor monetário comum com 2 casas (ex.: R$ 12,40). */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// -----------------------------------------------------------------------------
// Sistema semafórico (Seção 2)
// -----------------------------------------------------------------------------

/**
 * Classifica uma lista de preços em quartis para o semáforo.
 * Retorna os limites: <= p25 é barato (verde); >= p75 é caro (vermelho);
 * o resto é médio (amarelo). O cálculo é sempre relativo ao raio atual.
 */
export function computePriceThresholds(prices: number[]): {
  p25: number;
  p75: number;
} | null {
  const valid = prices.filter((p) => typeof p === 'number' && p > 0).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  return {
    p25: percentile(valid, 0.25),
    p75: percentile(valid, 0.75),
  };
}

/** Percentil linear sobre array já ordenado de forma ascendente. */
function percentile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? sorted[base] + rest * (next - sorted[base]) : sorted[base];
}

/**
 * Categoriza um preço individual com base nos limites do raio.
 * 'unknown' quando não há preço ou não há referência suficiente.
 */
export function categorizePrice(
  price: number | null | undefined,
  thresholds: { p25: number; p75: number } | null,
): PriceCategory {
  if (price === null || price === undefined || price <= 0) return 'unknown';
  if (!thresholds) return 'unknown';
  if (price <= thresholds.p25) return 'cheap';
  if (price >= thresholds.p75) return 'expensive';
  return 'mid';
}

/** Cor hex correspondente à categoria (alinhada ao design system). */
export const CATEGORY_COLORS: Record<PriceCategory, string> = {
  cheap: '#1B5E20',
  mid: '#FFD600',
  expensive: '#C62828',
  unknown: '#90A593',
};

/**
 * Anota uma lista de postos com a categoria semafórica de cada preço,
 * calculada relativamente à própria lista (raio atual de busca).
 */
export function annotateCategories(stations: NearbyStation[]): NearbyStation[] {
  const prices = stations
    .map((s) => s.price)
    .filter((p): p is number => typeof p === 'number' && p > 0);
  const thresholds = computePriceThresholds(prices);
  return stations.map((s) => ({
    ...s,
    category: categorizePrice(s.price, thresholds),
  }));
}

// -----------------------------------------------------------------------------
// Estatísticas de preço
// -----------------------------------------------------------------------------

/** Média aritmética de preços válidos; null se a lista estiver vazia. */
export function averagePrice(prices: number[]): number | null {
  const valid = prices.filter((p) => typeof p === 'number' && p > 0);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, p) => acc + p, 0);
  return sum / valid.length;
}

/**
 * Verifica se um preço reportado é plausível frente à média histórica.
 * Desvio acima de ±30% marca o reporte como pendente de confirmação.
 */
export function isPriceWithinRange(
  price: number,
  historicalAvg: number | null,
  tolerance = 0.3,
): boolean {
  if (historicalAvg === null || historicalAvg <= 0) return true; // sem histórico: aceita
  const lower = historicalAvg * (1 - tolerance);
  const upper = historicalAvg * (1 + tolerance);
  return price >= lower && price <= upper;
}

// -----------------------------------------------------------------------------
// Gamificação: XP e níveis
// -----------------------------------------------------------------------------

/** Retorna a faixa de nível correspondente a um total de XP. */
export function levelFromXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, xp);
  // Percorre do maior para o menor para achar a primeira faixa que cabe.
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (safeXp >= LEVELS[i].minXp) return LEVELS[i];
  }
  return LEVELS[0];
}

/**
 * Progresso percentual (0-100) dentro do nível atual.
 * No nível máximo (sem teto) retorna 100.
 */
export function levelProgress(xp: number): number {
  const info = levelFromXp(xp);
  if (info.maxXp === null) return 100;
  const span = info.maxXp - info.minXp;
  if (span <= 0) return 100;
  const progress = ((xp - info.minXp) / span) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/** XP que ainda falta para o próximo nível (null se já no máximo). */
export function xpToNextLevel(xp: number): number | null {
  const info = levelFromXp(xp);
  if (info.maxXp === null) return null;
  return Math.max(0, info.maxXp + 1 - xp);
}

// -----------------------------------------------------------------------------
// Estimativa de economia (Seção 5.4)
// -----------------------------------------------------------------------------

/**
 * Calcula quanto o usuário economizou ao abastecer num posto mais barato
 * que a média da região.
 *
 * @param paidPrice  preço pago por litro
 * @param regionAvg  preço médio da região por litro
 * @param liters     litros abastecidos
 * @returns economia em reais (0 se abasteceu acima da média)
 */
export function estimateSavings(
  paidPrice: number,
  regionAvg: number | null,
  liters: number,
): number {
  if (regionAvg === null || regionAvg <= 0 || liters <= 0) return 0;
  const perLiter = regionAvg - paidPrice;
  return perLiter > 0 ? perLiter * liters : 0;
}

// -----------------------------------------------------------------------------
// Tempo relativo ("Atualizado há 2h")
// -----------------------------------------------------------------------------

/** Formata um timestamp ISO como tempo relativo curto em pt-BR. */
export function timeAgo(isoDate: string | null, now: Date = new Date()): string {
  if (!isoDate) return 'sem dados';
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return 'sem dados';
  const diffMin = Math.floor((now.getTime() - then) / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return diffD === 1 ? 'há 1 dia' : `há ${diffD} dias`;
}
