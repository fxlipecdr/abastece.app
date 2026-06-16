/**
 * useNearbyStations — busca postos próximos via RPC nearby_stations e anota
 * a categoria semafórica de cada preço (relativa ao raio atual).
 */
import { useQuery } from '@tanstack/react-query';
import type { FuelType, NearbyStation } from '@abastece/types';
import { annotateCategories } from '@abastece/utils/price';
import { supabase } from '../services/supabase';

interface Params {
  lat: number | null;
  lng: number | null;
  fuel: FuelType;
  radiusKm: number;
}

async function fetchNearby({ lat, lng, fuel, radiusKm }: Params): Promise<NearbyStation[]> {
  if (lat === null || lng === null) return [];
  const { data, error } = await supabase.rpc('nearby_stations', {
    user_lat: lat,
    user_lng: lng,
    fuel,
    radius_km: radiusKm,
  });
  if (error) throw new Error(error.message);
  return annotateCategories((data ?? []) as NearbyStation[]);
}

export function useNearbyStations(params: Params) {
  return useQuery({
    queryKey: ['nearby', params.lat, params.lng, params.fuel, params.radiusKm],
    queryFn: () => fetchNearby(params),
    enabled: params.lat !== null && params.lng !== null,
    staleTime: 60_000, // dados considerados frescos por 1 min
  });
}
