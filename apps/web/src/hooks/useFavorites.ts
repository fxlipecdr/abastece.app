/**
 * useFavorites — gerencia postos favoritos do usuário (Seção 5.1/5.7).
 * No plano gratuito, limita a 5 favoritos (Seção 7.1).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Station } from '@abastece/types';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth';

const FREE_LIMIT = 5;

interface FavoriteRow {
  station_id: string;
  stations: Station | null;
}

async function fetchFavorites(userId: string): Promise<FavoriteRow[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('station_id, stations(*)')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FavoriteRow[];
}

export function useFavorites() {
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => fetchFavorites(userId!),
    enabled: Boolean(userId),
  });

  const add = useMutation({
    mutationFn: async (stationId: string) => {
      if (!userId) throw new Error('Faça login para favoritar.');
      // Limite do plano gratuito (premium é ilimitado).
      const count = query.data?.length ?? 0;
      if (!profile?.is_premium && count >= FREE_LIMIT) {
        throw new Error(`Limite de ${FREE_LIMIT} favoritos no plano gratuito.`);
      }
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, station_id: stationId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', userId] }),
  });

  const remove = useMutation({
    mutationFn: async (stationId: string) => {
      if (!userId) throw new Error('Faça login.');
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('station_id', stationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', userId] }),
  });

  return { ...query, add, remove, limitReached: (query.data?.length ?? 0) >= FREE_LIMIT };
}
