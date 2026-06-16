/**
 * LevelProgress — barra de progresso de nível com nome e XP restante.
 */
import { levelFromXp, levelProgress, xpToNextLevel } from '@abastece/utils/price';

interface LevelProgressProps {
  xp: number;
}

export function LevelProgress({ xp }: LevelProgressProps) {
  const info = levelFromXp(xp);
  const progress = levelProgress(xp);
  const remaining = xpToNextLevel(xp);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-sm font-bold text-text-primary">
          Nível {info.level} • {info.name}
        </span>
        <span className="price-value text-xs text-text-secondary">{xp} XP</span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-pill bg-border"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso do nível: ${progress}%`}
      >
        <div
          className="h-full rounded-pill bg-primary-bright transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {remaining === null
          ? 'Nível máximo alcançado! 🛡️'
          : `Faltam ${remaining} XP para o próximo nível`}
      </p>
    </div>
  );
}
