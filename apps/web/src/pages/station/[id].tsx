/**
 * StationDetailPage — detalhe do posto (Seção 5.1).
 * -----------------------------------------------------------------------------
 * Nome/bandeira, endereço com navegação externa, preços por combustível com
 * semáforo, histórico 30 dias, amenidades, avaliações e ações de confirmar/
 * reportar. Rota react-router: /station/:id (arquivo nomeado [id] por convenção).
 */
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FUEL_LABELS,
  PRIMARY_FUELS,
  type FuelType,
  type Station,
} from '@abastece/types';
import { categorizePrice, computePriceThresholds } from '@abastece/utils/price';
import { supabase } from '../../services/supabase';
import { PriceTag } from '../../components/PriceTag';
import { PriceHistoryChart, type PricePoint } from '../../components/PriceHistoryChart';
import { OfflineBanner } from '../../components/OfflineBanner';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuthStore } from '../../stores/auth';

interface StationPrice {
  fuel_type: FuelType;
  price: number;
  reported_at: string;
}

/** Busca o posto e seus preços vigentes por combustível. */
async function fetchStation(id: string): Promise<{
  station: Station;
  prices: StationPrice[];
}> {
  const { data: station, error: sErr } = await supabase
    .from('stations')
    .select('*')
    .eq('id', id)
    .single();
  if (sErr) throw new Error(sErr.message);

  const { data: prices, error: pErr } = await supabase
    .from('current_prices')
    .select('fuel_type, price, reported_at')
    .eq('station_id', id);
  if (pErr) throw new Error(pErr.message);

  return { station: station as Station, prices: (prices ?? []) as StationPrice[] };
}

/** Histórico de 30 dias de um combustível para o gráfico. */
async function fetchHistory(id: string, fuel: FuelType): Promise<PricePoint[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('price_reports')
    .select('price, reported_at')
    .eq('station_id', id)
    .eq('fuel_type', fuel)
    .eq('is_pending', false)
    .gte('reported_at', since)
    .order('reported_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ date: r.reported_at as string, price: Number(r.price) }));
}

export function StationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { data: favorites = [], add, remove } = useFavorites();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['station', id],
    queryFn: () => fetchStation(id),
    enabled: Boolean(id),
  });

  const mainFuel: FuelType = 'gasolina_comum';
  const { data: history } = useQuery({
    queryKey: ['station-history', id, mainFuel],
    queryFn: () => fetchHistory(id, mainFuel),
    enabled: Boolean(id),
  });

  // Categoriza os preços do próprio posto entre si para exibição.
  const thresholds = useMemo(() => {
    const list = (data?.prices ?? []).map((p) => p.price);
    return computePriceThresholds(list);
  }, [data]);

  const isFavorite = favorites.some((f) => f.station_id === id);

  if (isLoading) return <p className="p-6 text-center text-text-muted">Carregando posto…</p>;
  if (isError || !data) return <p className="p-6 text-center text-danger">Posto não encontrado.</p>;

  const { station, prices } = data;
  const priceByFuel = new Map(prices.map((p) => [p.fuel_type, p]));

  // Link de navegação universal (abre app de mapas padrão do dispositivo).
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  function toggleFavorite() {
    if (!session) {
      navigate('/auth/login');
      return;
    }
    if (isFavorite) remove.mutate(id);
    else add.mutate(id);
  }

  return (
    <div className="min-h-dvh bg-surface pb-8">
      <OfflineBanner />

      <header className="bg-primary px-4 pb-6 pt-4 text-white">
        <button onClick={() => navigate(-1)} className="mb-3 text-sm text-white/80" aria-label="Voltar">
          ← Voltar
        </button>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold">{station.name}</h1>
            {station.is_verified && <span aria-label="Posto verificado">✅</span>}
          </div>
          <button
            onClick={toggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className="text-2xl"
            disabled={add.isPending || remove.isPending}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
        <p className="text-white/85">
          {station.brand ? `${station.brand} • ` : ''}
          {station.address}, {station.city}/{station.state}
        </p>
        {add.isError && (
          <p className="mt-2 rounded-md bg-white/15 p-2 text-sm">
            {add.error instanceof Error ? add.error.message : 'Não foi possível favoritar.'}
          </p>
        )}
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-pill bg-accent px-4 py-2 text-sm font-bold text-text-primary"
        >
          🧭 Navegar até o posto
        </a>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        {/* Preços por combustível */}
        <section className="-mt-4 rounded-md bg-surface-card p-4 shadow-card">
          <h2 className="mb-3 font-display font-bold">Preços</h2>
          <ul className="flex flex-col gap-3">
            {PRIMARY_FUELS.map((fuel) => {
              const p = priceByFuel.get(fuel);
              const category = categorizePrice(p?.price ?? null, thresholds);
              return (
                <li key={fuel} className="flex items-center justify-between">
                  <span className="text-text-secondary">{FUEL_LABELS[fuel]}</span>
                  <PriceTag
                    price={p?.price ?? null}
                    category={category}
                    updatedAt={p?.reported_at ?? null}
                    size="md"
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {/* Ações */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => navigate(`/report?station=${station.id}`)}
            className="flex-1 rounded-md bg-primary py-3 font-semibold text-white"
          >
            Reportar preço diferente
          </button>
        </div>

        {/* Histórico */}
        <section className="mt-6">
          <h2 className="mb-2 font-display font-bold">
            Histórico — {FUEL_LABELS[mainFuel]} (30 dias)
          </h2>
          <PriceHistoryChart data={history ?? []} />
        </section>

        {/* Amenidades */}
        <section className="mt-6">
          <h2 className="mb-2 font-display font-bold">Comodidades</h2>
          <ul className="flex flex-wrap gap-2">
            {amenityList(station).map((a) => (
              <li key={a} className="rounded-pill bg-surface-card border border-border px-3 py-1 text-sm">
                {a}
              </li>
            ))}
            {amenityList(station).length === 0 && (
              <li className="text-sm text-text-muted">Sem informações de comodidades.</li>
            )}
          </ul>
        </section>

        {/* Avaliação */}
        <section className="mt-6">
          <h2 className="font-display font-bold">Avaliação</h2>
          <p className="text-text-secondary">
            {station.rating_count > 0
              ? `⭐ ${station.rating_avg.toFixed(1)} (${station.rating_count} avaliações)`
              : 'Ainda sem avaliações.'}
          </p>
        </section>
      </main>
    </div>
  );
}

/** Traduz o JSONB de amenidades em rótulos legíveis. */
function amenityList(station: Station): string[] {
  const labels: Record<string, string> = {
    conveniente: '🏪 Conveniência',
    lavagem: '🧼 Lavagem',
    ar: '💨 Ar',
    banheiro: '🚻 Banheiro',
    aberto_24h: '🕛 24h',
  };
  return Object.entries(station.amenities ?? {})
    .filter(([, v]) => v)
    .map(([k]) => labels[k] ?? k);
}

export default StationDetailPage;
