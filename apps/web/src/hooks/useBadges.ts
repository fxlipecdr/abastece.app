/**
 * useBadges — carrega o catálogo de conquistas do banco.
 */
import { useQuery } from '@tanstack/react-query';
import type { Badge } from '@abastece/types';
import { supabase } from '../services/supabase';

async function fetchBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as Badge[];
}

export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: fetchBadges,
    staleTime: 60 * 60 * 1000, // catálogo muda raramente
  });
}
