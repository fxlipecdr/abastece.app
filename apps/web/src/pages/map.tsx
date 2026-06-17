/**
 * MapPage — tela principal (home) do PWA (Seção 5.1).
 * -----------------------------------------------------------------------------
 * Mapa centralizado na localização do usuário, pins semafóricos, seletor de
 * combustível, bottom sheet com lista ordenada por preço e FAB de reporte.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FuelType, NearbyStation } from '@abastece/types';
import { StationMap } from '../components/StationMap';
import { FuelSelector } from '../components/FuelSelector';
import { StationCard } from '../components/StationCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { Litro } from '../components/Litro';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNearbyStations } from '../hooks/useNearbyStations';
import { useAuthStore } from '../stores/auth';

const RADIUS_OPTIONS = [2, 5, 10, 20, 50];

export function MapPage() {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const { session, profile } = useAuthStore();
  const [fuel, setFuel] = useState<FuelType>('gasolina_comum');
  const [radiusKm, setRadiusKm] = useState(5);

  const { data, isLoading, isError, refetch, isRefetching } = useNearbyStations({
    lat: geo.lat,
    lng: geo.lng,
    fuel,
    radiusKm,
  });

  // Lista ordenada por preço (postos sem preço vão para o fim).
  const sorted = useMemo<NearbyStation[]>(() => {
    const list = [...(data ?? [])];
    return list.sort((a, b) => {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    });
  }, [data]);

  const center = {
    lat: geo.lat ?? -26.2306,
    lng: geo.lng ?? -51.0875,
  };

  return (
    <div className="relative flex h-full flex-col">
      <OfflineBanner />

      {/* Seletor de combustível + raio (topo) */}
      <header className="z-10 bg-surface-card shadow-card">
        <div className="flex items-center justify-between px-4 pt-3">
          <h1 className="font-display text-lg font-extrabold text-primary">Abastece</h1>
          {session ? (
            <button
              onClick={() => navigate('/report')}
              className="flex items-center gap-2 rounded-pill bg-surface px-3 py-1 text-sm font-semibold text-text-secondary"
              aria-label="Sua conta"
            >
              <span aria-hidden="true">⛽</span>
              {profile ? `${profile.username} • Nv ${profile.level}` : 'Minha conta'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth/login')}
              className="rounded-pill bg-primary px-4 py-1 text-sm font-semibold text-white"
            >
              Entrar
            </button>
          )}
        </div>
        <FuelSelector selected={fuel} onChange={setFuel} />
        <div className="flex items-center gap-2 px-4 pb-2">
          <span className="text-xs text-text-muted">Raio:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              aria-pressed={radiusKm === r}
              className={[
                'rounded-pill px-3 py-1 text-xs font-semibold',
                radiusKm === r ? 'bg-primary text-white' : 'bg-surface text-text-secondary',
              ].join(' ')}
            >
              {r} km
            </button>
          ))}
        </div>
      </header>

      {/* Mapa */}
      <div className="relative flex-1">
        <StationMap
          center={center}
          stations={data ?? []}
          onSelect={(s) => navigate(`/station/${s.id}`)}
        />

        {/* FAB de reporte */}
        <button
          onClick={() => navigate('/report')}
          aria-label="Reportar preço"
          style={{ zIndex: 'var(--z-fab)' as unknown as number }}
          className="absolute bottom-[42%] right-4 flex h-14 w-14 items-center justify-center rounded-pill bg-primary text-3xl font-bold text-white shadow-float"
        >
          +
        </button>
      </div>

      {/* Bottom sheet: lista de postos */}
      <section
        style={{ zIndex: 'var(--z-sheet)' as unknown as number }}
        className="max-h-[40%] overflow-y-auto rounded-t-lg bg-surface px-4 pb-6 pt-3 shadow-float"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-border" aria-hidden="true" />

        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Postos por perto</h2>
          <button
            onClick={() => refetch()}
            className="text-sm font-semibold text-primary-light"
            disabled={isRefetching}
          >
            {isRefetching ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        {/* Estados: loading / erro / vazio / lista */}
        {isLoading && <p className="py-6 text-center text-text-muted">Buscando postos…</p>}

        {isError && (
          <div className="py-6 text-center">
            <p className="text-danger">Não foi possível carregar os preços.</p>
            <button onClick={() => refetch()} className="mt-2 font-semibold text-primary">
              Tentar de novo
            </button>
          </div>
        )}

        {!isLoading && !isError && sorted.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <Litro size={72} mood="sleepy" />
            <p className="mt-2 text-text-secondary">
              Nenhum posto com preço por aqui ainda. Que tal ser o primeiro a reportar?
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {sorted.map((s) => (
            <li key={s.id}>
              <StationCard
                station={s}
                distance={s.distance_km}
                featured={s.is_verified}
                onClick={() => navigate(`/station/${s.id}`)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default MapPage;
