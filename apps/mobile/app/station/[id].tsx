/**
 * Detalhe do posto (mobile). Mostra preços vigentes por combustível.
 */
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FUEL_LABELS, type FuelType, type Station } from '@abastece/types';
import {
  categorizePrice,
  computePriceThresholds,
  formatFuelPrice,
  CATEGORY_COLORS,
} from '@abastece/utils/price';
import { supabase } from '../../services/supabase';

interface CurrentPrice {
  fuel_type: FuelType;
  price: number;
  reported_at: string;
}

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [station, setStation] = useState<Station | null>(null);
  const [prices, setPrices] = useState<CurrentPrice[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: s } = await supabase.from('stations').select('*').eq('id', id).single();
      setStation((s as Station) ?? null);
      const { data: p } = await supabase
        .from('current_prices')
        .select('fuel_type, price, reported_at')
        .eq('station_id', id);
      setPrices((p as CurrentPrice[]) ?? []);
    })();
  }, [id]);

  if (!station) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-text-muted">Carregando posto…</Text>
      </View>
    );
  }

  const thresholds = computePriceThresholds(prices.map((p) => p.price));
  const byFuel = new Map(prices.map((p) => [p.fuel_type, p]));
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <ScrollView className="flex-1 bg-surface px-4 pt-4">
      <Text className="font-bold text-2xl text-text-primary">{station.name}</Text>
      <Text className="text-text-secondary">
        {station.brand ? `${station.brand} • ` : ''}
        {station.address}
      </Text>

      <Pressable
        onPress={() => Linking.openURL(navUrl)}
        className="mt-3 self-start rounded-full bg-accent px-4 py-2"
      >
        <Text className="font-bold text-text-primary">🧭 Navegar</Text>
      </Pressable>

      <View className="mt-6 rounded-2xl bg-surface-card p-4">
        <Text className="mb-2 font-bold text-text-primary">Preços</Text>
        {(['gasolina_comum', 'etanol', 'diesel_s10', 'gnv'] as FuelType[]).map((fuel) => {
          const p = byFuel.get(fuel);
          const category = categorizePrice(p?.price ?? null, thresholds);
          return (
            <View key={fuel} className="flex-row items-center justify-between py-2">
              <Text className="text-text-secondary">{FUEL_LABELS[fuel]}</Text>
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    marginRight: 8,
                    backgroundColor: CATEGORY_COLORS[category],
                  }}
                />
                <Text className="font-mono font-bold text-text-primary">
                  {formatFuelPrice(p?.price ?? null)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
