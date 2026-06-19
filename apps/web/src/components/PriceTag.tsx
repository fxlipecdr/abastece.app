/**
 * PriceTag — preço com cor semafórica (assinatura visual), versão clean.
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
  const sizeClass = size === 'lg' ? 'text-[1.6rem]' : size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1.5">
        <span className={`price-dot price-dot--${category}`} aria-hidden="true" />
        <span
          className={`price-value price--${category} ${sizeClass} leading-none`}
          aria-label={`${formatFuelPrice(price)}. ${CATEGORY_LABEL[category]}`}
        >
          {formatFuelPrice(price)}
        </span>
      </div>
      {updatedAt !== undefined && (
        <span className="mt-1 text-[11px] font-medium text-text-muted">
          {timeAgo(updatedAt ?? null)}
        </span>
      )}
    </div>
  );
}
