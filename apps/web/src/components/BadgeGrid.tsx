/**
 * BadgeGrid — galeria de conquistas. Mostra badges conquistadas e bloqueadas.
 */
import type { Badge } from '@abastece/types';

interface BadgeGridProps {
  /** Catálogo completo de badges. */
  catalog: Badge[];
  /** IDs das badges já conquistadas pelo usuário. */
  earned: string[];
}

export function BadgeGrid({ catalog, earned }: BadgeGridProps) {
  const earnedSet = new Set(earned);

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {catalog.map((badge) => {
        const has = earnedSet.has(badge.id);
        return (
          <li
            key={badge.id}
            className={[
              'flex flex-col items-center rounded-md border p-3 text-center',
              has
                ? 'border-primary bg-surface-card shadow-card'
                : 'border-border bg-surface opacity-60',
            ].join(' ')}
            title={badge.description}
          >
            <span
              className="text-3xl"
              aria-hidden="true"
              style={{ filter: has ? 'none' : 'grayscale(1)' }}
            >
              {badge.icon}
            </span>
            <span className="mt-1 text-xs font-semibold text-text-primary">{badge.name}</span>
            <span className="text-[10px] text-text-muted">
              {has ? 'Conquistada' : `${badge.description}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
