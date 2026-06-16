/**
 * ReportStepper — fluxo de reporte de preço em 3 passos (Seção 5.3).
 *   1. Selecionar posto (próximos num raio de 500m)
 *   2. Inserir preço + tipo de combustível
 *   3. Confirmar
 * Componente controlado: a persistência fica a cargo do container (página).
 */
import { useState } from 'react';
import {
  FUEL_LABELS,
  PRIMARY_FUELS,
  type FuelType,
  type NearbyStation,
} from '@abastece/types';
import { formatFuelPrice } from '@abastece/utils/price';

export interface ReportDraft {
  station: NearbyStation;
  fuel: FuelType;
  price: number;
}

interface ReportStepperProps {
  /** Postos detectados num raio de 500m da posição do usuário. */
  nearbyStations: NearbyStation[];
  submitting?: boolean;
  onSubmit: (draft: ReportDraft) => void;
  onCancel: () => void;
}

export function ReportStepper({ nearbyStations, submitting, onSubmit, onCancel }: ReportStepperProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [station, setStation] = useState<NearbyStation | null>(null);
  const [fuel, setFuel] = useState<FuelType>('gasolina_comum');
  const [priceText, setPriceText] = useState('');

  // Converte "5,899" -> 5.899. Aceita vírgula ou ponto.
  const price = Number(priceText.replace(',', '.'));
  const priceValid = price > 0 && price < 20;

  return (
    <div className="flex flex-col gap-4">
      {/* Indicador de passos */}
      <ol className="flex items-center justify-center gap-2" aria-label="Progresso do reporte">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            aria-current={step === n ? 'step' : undefined}
            className={[
              'h-2 w-10 rounded-pill transition-colors',
              n <= step ? 'bg-primary' : 'bg-border',
            ].join(' ')}
          />
        ))}
      </ol>

      {/* Passo 1: selecionar posto */}
      {step === 1 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Onde você está?</h2>
          {nearbyStations.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nenhum posto detectado por perto. Aproxime-se de um posto (até 500m) para reportar.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {nearbyStations.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      setStation(s);
                      setStep(2);
                    }}
                    className="w-full rounded-md border border-border bg-surface-card p-3 text-left"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="block text-sm text-text-secondary">
                      {s.brand ?? 'Posto'} • {Math.round(s.distance_km * 1000)} m
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Passo 2: preço + combustível */}
      {step === 2 && station && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Qual o preço?</h2>
          <p className="mb-3 text-sm text-text-secondary">{station.name}</p>

          <div className="mb-3 flex flex-wrap gap-2">
            {PRIMARY_FUELS.map((f) => (
              <button
                key={f}
                onClick={() => setFuel(f)}
                aria-pressed={fuel === f}
                className={[
                  'rounded-pill px-3 py-2 text-sm font-semibold',
                  fuel === f ? 'bg-primary text-white' : 'bg-surface border border-border',
                ].join(' ')}
              >
                {FUEL_LABELS[f]}
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-text-secondary" htmlFor="price-input">
            Preço por litro (R$)
          </label>
          <input
            id="price-input"
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder="5,899"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            className="price-value mt-1 w-full rounded-md border border-border bg-surface-card p-4 text-2xl"
          />
          {priceText && !priceValid && (
            <p className="mt-1 text-sm text-danger">Informe um preço entre R$ 0 e R$ 20.</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-md border border-border py-3 font-semibold"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!priceValid}
              className="flex-1 rounded-md bg-primary py-3 font-semibold text-white disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {/* Passo 3: confirmar */}
      {step === 3 && station && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Confirmar reporte</h2>
          <div className="rounded-md border border-border bg-surface-card p-4">
            <p className="font-semibold">{station.name}</p>
            <p className="text-sm text-text-secondary">{FUEL_LABELS[fuel]}</p>
            <p className="price-value mt-2 text-3xl text-primary">{formatFuelPrice(price)}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-md border border-border py-3 font-semibold"
            >
              Editar
            </button>
            <button
              onClick={() => onSubmit({ station, fuel, price })}
              disabled={submitting}
              className="flex-1 rounded-md bg-primary py-3 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Enviando…' : 'Confirmar e ganhar XP'}
            </button>
          </div>
        </section>
      )}

      <button onClick={onCancel} className="text-sm text-text-muted underline">
        Cancelar
      </button>
    </div>
  );
}
