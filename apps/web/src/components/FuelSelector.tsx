/**
 * FuelSelector — tabs horizontais com scroll para escolher o combustível.
 * Acessível por teclado (role=tablist) e com transição suave de seleção.
 */
import { FUEL_LABELS, PRIMARY_FUELS, type FuelType } from '@abastece/types';

interface FuelSelectorProps {
  selected: FuelType;
  onChange: (fuel: FuelType) => void;
  /** Lista opcional de combustíveis a exibir (padrão: principais). */
  options?: FuelType[];
}

export function FuelSelector({ selected, onChange, options = PRIMARY_FUELS }: FuelSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de combustível"
      className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar"
    >
      {options.map((fuel) => {
        const active = fuel === selected;
        return (
          <button
            key={fuel}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(fuel)}
            className={[
              'whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold transition-colors',
              active
                ? 'bg-primary text-white shadow-card'
                : 'bg-surface-card text-text-secondary border border-border',
            ].join(' ')}
          >
            {FUEL_LABELS[fuel]}
          </button>
        );
      })}
    </div>
  );
}
