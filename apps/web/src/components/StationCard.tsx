/**
 * StationCard — card resumo do posto na lista (bottom sheet do mapa).
 */
import type { NearbyStation } from '@abastece/types';
import { PriceTag } from './PriceTag';

interface StationCardProps {
  station: NearbyStation;
  distance: number;
  featured?: boolean;
  onClick?: () => void;
}

/** Formata distância: metros abaixo de 1km, senão km com 1 casa. */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function StationCard({ station, distance, featured = false, onClick }: StationCardProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-md p-4 transition-shadow',
        'bg-surface-card border flex items-center justify-between gap-3',
        featured ? 'border-accent shadow-float' : 'border-border shadow-card',
      ].join(' ')}
      aria-label={`${station.name}, ${formatDistance(distance)}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {featured && (
            <span className="rounded-pill bg-accent px-2 py-0.5 text-xs font-bold text-text-primary">
              Anúncio
            </span>
          )}
          <h3 className="truncate font-display text-base font-bold text-text-primary">
            {station.name}
          </h3>
          {station.is_verified && (
            <span title="Posto verificado" aria-label="Posto verificado">✅</span>
          )}
        </div>
        <p className="truncate text-sm text-text-secondary">
          {station.brand ? `${station.brand} • ` : ''}
          {formatDistance(distance)}
        </p>
      </div>
      <PriceTag
        price={station.price}
        category={station.category ?? 'unknown'}
        updatedAt={station.reported_at}
        size="md"
      />
    </button>
  );
}
