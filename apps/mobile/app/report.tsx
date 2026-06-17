/**
 * Tela de reporte de preço (mobile). Envia pela Edge Function validate-price-report
 * (validação anti-fraude no servidor). Detecta postos a até 500m.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  FUEL_LABELS,
  PRIMARY_FUELS,
  type FuelType,
  type NearbyStation,
} from '@abastece/types';
import { supabase } from '../services/supabase';
import { useLocation } from '../hooks/useLocation';

export default function ReportScreen() {
  const router = useRouter();
  const { coords } = useLocation();
  const [stations, setStations] = useState<NearbyStation[]>([]);
  const [selected, setSelected] = useState<NearbyStation | null>(null);
  const [fuel, setFuel] = useState<FuelType>('gasolina_comum');
  const [priceText, setPriceText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Busca postos a até 500m.
  useEffect(() => {
    if (!coords) return;
    (async () => {
      const { data } = await supabase.rpc('nearby_stations', {
        user_lat: coords.lat,
        user_lng: coords.lng,
        fuel: 'gasolina_comum',
        radius_km: 1,
      });
      const near = ((data ?? []) as NearbyStation[]).filter((s) => s.distance_km <= 0.5);
      setStations(near);
    })();
  }, [coords]);

  async function submit() {
    setError(null);
    const price = Number(priceText.replace(',', '.'));
    if (!selected || !coords || !(price > 0 && price < 20)) {
      setError('Selecione um posto e informe um preço válido.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('validate-price-report', {
        body: {
          station_id: selected.id,
          fuel_type: fuel,
          price,
          user_lat: coords.lat,
          user_lng: coords.lng,
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.accepted === false) throw new Error(data.reason ?? 'Reporte recusado.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-surface px-4 pt-4">
      {error && <Text className="mb-3 text-danger">{error}</Text>}

      <Text className="mb-2 font-bold text-text-primary">Posto (até 500m)</Text>
      {stations.length === 0 ? (
        <Text className="text-text-muted">Aproxime-se de um posto para reportar.</Text>
      ) : (
        stations.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSelected(s)}
            className={`mb-2 rounded-2xl border p-3 ${
              selected?.id === s.id ? 'border-primary bg-surface-card' : 'border-border bg-surface-card'
            }`}
          >
            <Text className="font-semibold text-text-primary">{s.name}</Text>
            <Text className="text-sm text-text-secondary">{Math.round(s.distance_km * 1000)} m</Text>
          </Pressable>
        ))
      )}

      {selected && (
        <>
          <Text className="mb-2 mt-4 font-bold text-text-primary">Combustível</Text>
          <View className="flex-row flex-wrap gap-2">
            {PRIMARY_FUELS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFuel(f)}
                className={`rounded-full px-3 py-2 ${fuel === f ? 'bg-primary' : 'border border-border'}`}
              >
                <Text className={fuel === f ? 'font-semibold text-white' : 'text-text-secondary'}>
                  {FUEL_LABELS[f]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-1 mt-4 font-bold text-text-primary">Preço por litro</Text>
          <TextInput
            value={priceText}
            onChangeText={setPriceText}
            keyboardType="decimal-pad"
            placeholder="5,899"
            className="rounded-2xl border border-border bg-surface-card p-4 font-mono text-2xl"
          />

          <Pressable
            onPress={submit}
            disabled={submitting}
            className="mt-6 rounded-2xl bg-primary py-4"
          >
            <Text className="text-center font-semibold text-white">
              {submitting ? 'Enviando…' : 'Confirmar e ganhar XP'}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
