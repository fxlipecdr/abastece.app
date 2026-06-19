/**
 * AlertsPage — gerenciar alertas de preço (Seção 5.5).
 * MVP: 1 alerta ativo no plano gratuito; acima disso, sugere o Premium.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FUEL_LABELS,
  PRIMARY_FUELS,
  type FuelType,
  type PriceAlert,
} from '@abastece/types';
import { formatFuelPrice } from '@abastece/utils/price';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth';

const FREE_ALERT_LIMIT = 1;

async function fetchAlerts(userId: string): Promise<PriceAlert[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PriceAlert[];
}

export function AlertsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuthStore();
  const userId = user?.id ?? null;

  const [fuel, setFuel] = useState<FuelType>('gasolina_comum');
  const [target, setTarget] = useState('');
  const [radius, setRadius] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', userId],
    queryFn: () => fetchAlerts(userId!),
    enabled: Boolean(userId),
  });

  const activeCount = alerts.filter((a) => a.is_active).length;
  const limit = profile?.is_premium ? Infinity : FREE_ALERT_LIMIT;

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Faça login para criar alertas.');
      const price = Number(target.replace(',', '.'));
      if (!(price > 0 && price < 20)) throw new Error('Informe um preço válido.');
      if (activeCount >= limit) {
        throw new Error('Limite de alertas atingido. Conheça o Premium para alertas ilimitados.');
      }
      const { error: insErr } = await supabase.from('price_alerts').insert({
        user_id: userId,
        fuel_type: fuel,
        target_price: price,
        radius_km: radius,
      });
      if (insErr) throw new Error(insErr.message);
    },
    onSuccess: () => {
      setTarget('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Falha ao criar alerta.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: delErr } = await supabase.from('price_alerts').delete().eq('id', id);
      if (delErr) throw new Error(delErr.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', userId] }),
  });

  if (!userId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-text-secondary">Entre para configurar alertas de preço.</p>
        <button
          onClick={() => navigate('/auth/login')}
          className="rounded-pill bg-primary px-6 py-3 font-semibold text-white"
        >
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-text-secondary">
        ← Voltar
      </button>
      <h1 className="mb-6 font-display text-2xl font-extrabold">Alertas de preço</h1>

      {error && (
        <p className="mb-4 rounded-md tint-danger p-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* Novo alerta */}
      <section className="rounded-md bg-surface-card p-4 shadow-card">
        <h2 className="mb-3 font-display font-bold">Novo alerta</h2>
        <p className="mb-2 text-sm text-text-secondary">Me avise quando o preço baixar de:</p>

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

        <input
          type="text"
          inputMode="decimal"
          placeholder="5,80"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="price-value mb-3 w-full rounded-md border border-border bg-surface p-3 text-xl"
        />

        <label className="mb-1 block text-sm text-text-secondary">
          Raio: {radius} km
        </label>
        <input
          type="range"
          min={2}
          max={50}
          step={1}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="mb-4 w-full accent-[var(--color-primary)]"
        />

        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="w-full rounded-md bg-primary py-3 font-semibold text-white disabled:opacity-50"
        >
          {create.isPending ? 'Criando…' : 'Criar alerta'}
        </button>
      </section>

      {/* Lista */}
      <section className="mt-6">
        <h2 className="mb-2 font-display font-bold">
          Ativos ({activeCount}
          {limit === Infinity ? '' : `/${limit}`})
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhum alerta ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface-card p-3"
              >
                <div>
                  <p className="font-semibold">
                    {FUEL_LABELS[a.fuel_type]} abaixo de {formatFuelPrice(a.target_price)}
                  </p>
                  <p className="text-sm text-text-secondary">Raio {a.radius_km} km</p>
                </div>
                <button
                  onClick={() => remove.mutate(a.id)}
                  className="text-sm font-semibold text-danger"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        {!profile?.is_premium && activeCount >= FREE_ALERT_LIMIT && (
          <p className="mt-3 rounded-md tint-accent p-3 text-sm text-text-primary">
            🔓 Quer mais alertas? O Abastece Premium libera alertas ilimitados.
          </p>
        )}
      </section>
    </div>
  );
}

export default AlertsPage;
