/**
 * StationCard — card de posto na lista, versão clean.
 * Mostra posição no ranking, nome, bandeira/distância e preço semafórico.
 */
import type { NearbyStation } from '@abastece/types';
import { PriceTag } from './PriceTag';

interface StationCardProps {
  station: NearbyStation;
  distance: number;
  rank?: number;
  featured?: boolean;
  onClick?: () => void;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function StationCard({ station, distance, rank, featured = false, onClick }: StationCardProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'group flex w-full items-center gap-3 rounded-lg bg-surface-card p-3.5 text-left transition-all active:scale-[0.99]',
        featured ? 'shadow-soft' : 'shadow-card',
      ].join(' ')}
      aria-label={`${station.name}, ${formatDistance(distance)}`}
    >
      {/* Selo de ranking */}
      {rank !== undefined && (
        <span
          className={[
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-pill text-sm font-extrabold',
            featured ? 'bg-gradient-brand text-white' : 'bg-surface-alt text-text-secondary',
          ].join(' ')}
          aria-hidden="true"
        >
          {rank}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-display text-[15px] font-bold text-text-primary">
            {station.name}
          </h3>
          {station.is_verified && (
            <span title="Posto verificado" aria-label="Posto verificado" className="text-xs text-primary">
              ✓
            </span>
          )}
        </div>
        <p className="truncate text-[13px] font-medium text-text-muted">
          {station.brand ? `${station.brand} · ` : ''}
          {formatDistance(distance)}
        </p>
      </div>

      <PriceTag
        price={station.price}
        category={station.category ?? 'unknown'}
        updatedAt={station.reported_at}
        size={featured ? 'lg' : 'md'}
      />
    </button>
  );
}
