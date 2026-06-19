/**
 * MapPage — tela principal (home), versão clean.
 * -----------------------------------------------------------------------------
 * Mapa em tela cheia, barra superior flutuante minimalista, seletor de
 * combustível em pílulas, bottom sheet recolhível com ranking de preços.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FuelType, NearbyStation } from '@abastece/types';
import { FUEL_LABELS, PRIMARY_FUELS } from '@abastece/types';
import { StationMap } from '../components/StationMap';
import { StationCard } from '../components/StationCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { Litro } from '../components/Litro';
import { PlusIcon, RefreshIcon, UserIcon } from '../components/icons';
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
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useNearbyStations({
    lat: geo.lat,
    lng: geo.lng,
    fuel,
    radiusKm,
  });

  const sorted = useMemo<NearbyStation[]>(() => {
    const list = [...(data ?? [])];
    return list.sort((a, b) => {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    });
  }, [data]);

  const center = { lat: geo.lat ?? -26.2306, lng: geo.lng ?? -51.0875 };

  return (
    <div className="relative h-full overflow-hidden bg-surface">
      {/* Mapa ao fundo */}
      <div className="absolute inset-0" style={{ zIndex: 'var(--z-map)' as unknown as number }}>
        <StationMap
          center={center}
          stations={data ?? []}
          onSelect={(s) => navigate(`/station/${s.id}`)}
        />
      </div>

      {/* Barra superior flutuante */}
      <div
        style={{ zIndex: 'var(--z-header)' as unknown as number }}
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 p-3"
      >
        <OfflineBanner />

        <div className="pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-pill bg-surface-card px-4 py-2 shadow-soft">
            <span className="h-2.5 w-2.5 rounded-pill bg-gradient-brand" aria-hidden="true" />
            <span className="font-display text-base font-extrabold tracking-tight text-text-primary">
              Abastece
            </span>
          </div>

          <button
            onClick={() => navigate(session ? '/profile' : '/auth/login')}
            className="pointer-events-auto flex items-center gap-2 rounded-pill bg-surface-card px-3 py-2 text-sm font-semibold text-text-secondary shadow-soft"
            aria-label={session ? 'Sua conta' : 'Entrar'}
          >
            <UserIcon size={18} />
            {session ? (profile ? `Nv ${profile.level}` : 'Conta') : 'Entrar'}
          </button>
        </div>

        {/* Pílulas de combustível */}
        <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PRIMARY_FUELS.map((f) => {
            const active = f === fuel;
            return (
              <button
                key={f}
                onClick={() => setFuel(f)}
                aria-pressed={active}
                className={[
                  'whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold shadow-xs transition-colors',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-surface-card text-text-secondary',
                ].join(' ')}
              >
                {FUEL_LABELS[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* FAB de reporte */}
      <button
        onClick={() => navigate('/report')}
        aria-label="Reportar preço"
        style={{ zIndex: 'var(--z-fab)' as unknown as number, bottom: expanded ? 'calc(64% + 16px)' : '200px' }}
        className="absolute right-4 flex h-14 w-14 items-center justify-center rounded-pill bg-primary text-white shadow-glow-primary transition-[bottom] duration-300 active:scale-95"
      >
        <PlusIcon size={26} />
      </button>

      {/* Bottom sheet */}
      <section
        style={{ zIndex: 'var(--z-sheet)' as unknown as number }}
        className={[
          'absolute inset-x-0 bottom-0 rounded-t-xl bg-surface-card shadow-sheet transition-[height] duration-300 ease-out',
          expanded ? 'h-[64%]' : 'h-[188px]',
        ].join(' ')}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full justify-center pb-1 pt-3"
          aria-label={expanded ? 'Recolher lista' : 'Expandir lista'}
          aria-expanded={expanded}
        >
          <span className="h-1 w-10 rounded-pill bg-border" aria-hidden="true" />
        </button>

        <div className="flex items-end justify-between px-5 pb-3 pt-1">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-tight">Por perto</h2>
            <p className="text-xs text-text-muted">
              {sorted.length > 0 ? `${sorted.length} postos • ordenados por preço` : 'Buscando…'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            aria-label="Atualizar"
            className="flex h-9 w-9 items-center justify-center rounded-pill bg-surface-alt text-primary"
          >
            <RefreshIcon size={18} className={isRefetching ? 'animate-spin' : undefined} />
          </button>
        </div>

        {/* Seletor de raio (segmentado) */}
        <div className="mb-1 flex gap-1.5 px-5">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              aria-pressed={radiusKm === r}
              className={[
                'flex-1 rounded-md py-1.5 text-xs font-bold transition-colors',
                radiusKm === r ? 'bg-primary text-white' : 'bg-surface-alt text-text-secondary',
              ].join(' ')}
            >
              {r}km
            </button>
          ))}
        </div>

        <div className="h-[calc(100%-150px)] overflow-y-auto px-5 pb-6 pt-3">
          {isLoading && (
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-[68px] w-full" />
              ))}
            </div>
          )}

          {isError && (
            <div className="py-8 text-center">
              <p className="font-semibold text-danger">Não foi possível carregar os preços.</p>
              <button
                onClick={() => refetch()}
                className="mt-3 rounded-pill bg-primary px-5 py-2.5 font-semibold text-white"
              >
                Tentar de novo
              </button>
            </div>
          )}

          {!isLoading && !isError && sorted.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <Litro size={88} mood="sleepy" className="animate-float-bob" />
              <p className="mt-3 max-w-xs text-text-secondary">
                Nenhum posto com preço por aqui ainda. Que tal ser o primeiro?
              </p>
              <button
                onClick={() => navigate('/report')}
                className="mt-4 rounded-pill bg-primary px-6 py-3 font-semibold text-white shadow-glow-primary"
              >
                Reportar preço
              </button>
            </div>
          )}

          <ul className="flex flex-col gap-2.5">
            {sorted.map((s, i) => (
              <li key={s.id} className="animate-fade-slide-up" style={{ animationDelay: `${i * 35}ms` }}>
                <StationCard
                  station={s}
                  distance={s.distance_km}
                  rank={i + 1}
                  featured={i === 0 && s.price !== null}
                  onClick={() => navigate(`/station/${s.id}`)}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export default MapPage;
