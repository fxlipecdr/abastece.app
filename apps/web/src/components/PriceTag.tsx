/**
 * PriceTag — exibe um preço com a cor semafórica (assinatura visual do app).
 */
import type { FuelType, PriceCategory } from '@abastece/types';
import { formatFuelPrice, timeAgo } from '@abastece/utils/price';

interface PriceTagProps {
  price: number | null;
  category: PriceCategory;
  fuel?: FuelType;
  updatedAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const CATEGORY_LABEL: Record<PriceCategory, string> = {
  cheap: 'Mais barato da região',
  mid: 'Preço médio',
  expensive: 'Acima da média',
  unknown: 'Sem preço recente',
};

export function PriceTag({ price, category, updatedAt, size = 'md' }: PriceTagProps) {
  const sizeClass =
    size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`price-dot price-dot--${category}`}
        aria-hidden="true"
      />
      <div className="flex flex-col">
        <span
          className={`price-value price--${category} ${sizeClass}`}
          aria-label={`${formatFuelPrice(price)}. ${CATEGORY_LABEL[category]}`}
        >
          {formatFuelPrice(price)}
        </span>
        {updatedAt !== undefined && (
          <span className="text-xs text-text-muted">
            Atualizado {timeAgo(updatedAt ?? null)}
          </span>
        )}
      </div>
    </div>
  );
}
