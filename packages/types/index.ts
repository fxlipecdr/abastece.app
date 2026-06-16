/**
 * Abastece.app — Tipos TypeScript compartilhados
 * -----------------------------------------------------------------------------
 * Fonte única de verdade para os modelos de dados usados em web, mobile e
 * Edge Functions. Mantenha alinhado com supabase/migrations/001_initial_schema.sql.
 */

// -----------------------------------------------------------------------------
// Combustíveis
// -----------------------------------------------------------------------------

/** Tipos de combustível suportados (espelha o ENUM fuel_type do banco). */
export type FuelType =
  | 'gasolina_comum'
  | 'gasolina_aditivada'
  | 'etanol'
  | 'diesel'
  | 'diesel_s10'
  | 'gnv';

/** Rótulos legíveis para exibição na UI. */
export const FUEL_LABELS: Record<FuelType, string> = {
  gasolina_comum: 'Gasolina',
  gasolina_aditivada: 'Gasolina Aditivada',
  etanol: 'Etanol',
  diesel: 'Diesel',
  diesel_s10: 'Diesel S10',
  gnv: 'GNV',
};

/** Combustíveis exibidos como tabs principais no seletor. */
export const PRIMARY_FUELS: FuelType[] = [
  'gasolina_comum',
  'etanol',
  'diesel_s10',
  'gnv',
];

// -----------------------------------------------------------------------------
// Sistema semafórico de preços (elemento de assinatura visual)
// -----------------------------------------------------------------------------

/** Categoria de preço relativa ao raio de busca atual. */
export type PriceCategory = 'cheap' | 'mid' | 'expensive' | 'unknown';

// -----------------------------------------------------------------------------
// Entidades de banco
// -----------------------------------------------------------------------------

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  total_reports: number;
  accurate_reports: number;
  streak_days: number;
  last_report_at: string | null;
  badges: string[];
  is_premium: boolean;
  created_at: string;
}

export interface StationAmenities {
  conveniente?: boolean;
  lavagem?: boolean;
  ar?: boolean;
  banheiro?: boolean;
  aberto_24h?: boolean;
}

export interface Station {
  id: string;
  name: string;
  brand: string | null;
  cnpj: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  /** Coordenadas decodificadas a partir do GEOGRAPHY(POINT). */
  lat: number;
  lng: number;
  phone: string | null;
  is_verified: boolean;
  is_active: boolean;
  amenities: StationAmenities;
  rating_avg: number;
  rating_count: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceReport {
  id: string;
  station_id: string;
  user_id: string;
  fuel_type: FuelType;
  price: number;
  reported_at: string;
  confirmed_count: number;
  disputed_count: number;
  is_active: boolean;
  is_pending: boolean;
  source: 'user' | 'owner' | 'api';
}

export interface PriceConfirmation {
  id: string;
  report_id: string;
  user_id: string;
  is_confirmed: boolean;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  station_id: string | null;
  fuel_type: FuelType;
  target_price: number;
  radius_km: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition_type:
    | 'reports_count'
    | 'streak'
    | 'accuracy'
    | 'new_station'
    | 'savings';
  condition_value: number;
}

// -----------------------------------------------------------------------------
// DTOs / projeções para a UI
// -----------------------------------------------------------------------------

/** Resultado da função SQL nearby_stations + categoria calculada no cliente. */
export interface NearbyStation {
  id: string;
  name: string;
  brand: string | null;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  is_verified: boolean;
  amenities: StationAmenities;
  rating_avg: number;
  distance_km: number;
  /** Preço vigente do combustível selecionado (null se sem dados recentes). */
  price: number | null;
  reported_at: string | null;
  /** Calculada no cliente a partir da distribuição de preços do raio. */
  category?: PriceCategory;
}

/** Item da fila de operações offline (Seção 8.2). */
export interface OfflineQueueItem {
  id: string;
  action: 'report_price' | 'confirm_price' | 'add_favorite';
  payload: unknown;
  createdAt: string;
  retries: number;
}

// -----------------------------------------------------------------------------
// Gamificação
// -----------------------------------------------------------------------------

export interface LevelInfo {
  level: number;
  name: string;
  minXp: number;
  maxXp: number | null;
}

/** Faixas de nível conforme Seção 5.4. */
export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Curioso', minXp: 0, maxXp: 100 },
  { level: 2, name: 'Abastecedor', minXp: 101, maxXp: 300 },
  { level: 3, name: 'Colaborador', minXp: 301, maxXp: 700 },
  { level: 4, name: 'Especialista', minXp: 701, maxXp: 1500 },
  { level: 5, name: 'Guardião do Preço', minXp: 1501, maxXp: null },
];

/** Valores de XP por ação (Seção 5.4). */
export const XP_REWARDS = {
  firstReportOfDay: 20,
  reportConfirmed: 10,
  streak7Bonus: 50,
  streak30Bonus: 200,
  discoverBonus: 30,
  confirmOtherReport: 5,
  newStation: 100,
  completeProfile: 50,
} as const;
