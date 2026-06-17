/**
 * SearchPage — busca por nome de posto ou cidade (Seção 6).
 * Usa busca textual (ilike) suportada pelo índice pg_trgm.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Station } from '@abastece/types';
import { supabase } from '../services/supabase';
import { Litro } from '../components/Litro';

async function searchStations(term: string): Promise<Station[]> {
  if (term.trim().length < 2) return [];
  const like = `%${term.trim()}%`;
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .or(`name.ilike.${like},city.ilike.${like}`)
    .eq('is_active', true)
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as Station[];
}

export function SearchPage() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['search', term],
    queryFn: () => searchStations(term),
    enabled: term.trim().length >= 2,
  });

  return (
    <div className="min-h-dvh bg-surface px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-text-secondary">
        ← Voltar
      </button>

      <label htmlFor="search-input" className="sr-only">
        Buscar posto ou cidade
      </label>
      <input
        id="search-input"
        type="search"
        autoFocus
        placeholder="Buscar posto ou cidade…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="w-full rounded-md border border-border bg-surface-card p-4"
      />

      <div className="mt-4">
        {isFetching && <p className="text-center text-text-muted">Buscando…</p>}

        {!isFetching && term.trim().length >= 2 && (data?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <Litro size={72} mood="sleepy" />
            <p className="mt-2 text-text-secondary">Nenhum posto encontrado para “{term}”.</p>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {(data ?? []).map((s) => (
            <li key={s.id}>
              <button
                onClick={() => navigate(`/station/${s.id}`)}
                className="w-full rounded-md border border-border bg-surface-card p-3 text-left"
              >
                <span className="font-semibold text-text-primary">{s.name}</span>
                <span className="block text-sm text-text-secondary">
                  {s.brand ? `${s.brand} • ` : ''}
                  {s.city}/{s.state}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SearchPage;
