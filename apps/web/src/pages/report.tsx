/**
 * ReportPage — container do fluxo de reporte (Seção 5.3).
 * -----------------------------------------------------------------------------
 * Detecta postos num raio de 500m, delega o passo a passo ao ReportStepper e
 * envia o reporte pela Edge Function validate-price-report (anti-fraude no
 * servidor). Offline: enfileira localmente para reenvio posterior.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XP_REWARDS } from '@abastece/types';
import { ReportStepper, type ReportDraft } from '../components/ReportStepper';
import { XPToast } from '../components/XPToast';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNearbyStations } from '../hooks/useNearbyStations';
import { useOnlineStatus } from '../components/OfflineBanner';
import { supabase } from '../services/supabase';
import { enqueueOffline } from '../services/offlineQueue';

export function ReportPage() {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const online = useOnlineStatus();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ amount: number; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Postos a até 500m para o passo 1 (raio fixo de detecção).
  const { data: nearby } = useNearbyStations({
    lat: geo.lat,
    lng: geo.lng,
    fuel: 'gasolina_comum',
    radiusKm: 1,
  });

  const within500m = (nearby ?? []).filter((s) => s.distance_km <= 0.5);

  async function handleSubmit(draft: ReportDraft) {
    setError(null);
    setSubmitting(true);
    try {
      if (geo.lat === null || geo.lng === null) {
        throw new Error('Não foi possível obter sua localização.');
      }

      const payload = {
        station_id: draft.station.id,
        fuel_type: draft.fuel,
        price: draft.price,
        user_lat: geo.lat,
        user_lng: geo.lng,
      };

      // Offline: enfileira e sai com feedback otimista.
      if (!online) {
        await enqueueOffline({ action: 'report_price', payload });
        setToast({ amount: 0, reason: 'Reporte salvo — será enviado ao reconectar' });
        setTimeout(() => navigate('/'), 1800);
        return;
      }

      // Online: chama a Edge Function (validação no servidor).
      const { data, error: fnError } = await supabase.functions.invoke(
        'validate-price-report',
        { body: payload },
      );
      if (fnError) throw new Error(fnError.message);
      if (data && data.accepted === false) {
        throw new Error(data.reason ?? 'Reporte recusado.');
      }

      setToast({
        amount: XP_REWARDS.firstReportOfDay,
        reason: data?.reason ?? 'Report enviado!',
      });
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar o reporte.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-extrabold">Reportar preço</h1>

      {error && (
        <p className="mb-4 rounded-md tint-danger p-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <ReportStepper
        nearbyStations={within500m}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
      />

      {toast && (
        <XPToast amount={toast.amount} reason={toast.reason} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

export default ReportPage;
