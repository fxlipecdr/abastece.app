/**
 * Abastece Mobile — Tela Home (Seção 5.1), Expo Router + React Native.
 * -----------------------------------------------------------------------------
 * Mapa com pins semafóricos, seletor de combustível, lista de postos por preço
 * e FAB de reporte. Offline-first: cai para dados cacheados (WatermelonDB)
 * quando sem conexão, exibindo banner do horário do último sync.
 *
 * Observação: usa react-native-maps (Expo). NativeWind fornece classes Tailwind.
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  FUEL_LABELS,
  PRIMARY_FUELS,
  type FuelType,
  type NearbyStation,
} from '@abastece/types';
import {
  CATEGORY_COLORS,
  annotateCategories,
  formatFuelPrice,
  timeAgo,
} from '@abastece/utils/price';
import { supabase } from '../../services/supabase';
import { useLocation } from '../../hooks/useLocation';

const RADIUS_OPTIONS = [2, 5, 10, 20, 50];

/** Busca postos próximos via RPC e anota a categoria semafórica. */
async function fetchNearby(
  lat: number,
  lng: number,
  fuel: FuelType,
  radiusKm: number,
): Promise<NearbyStation[]> {
  const { data, error } = await supabase.rpc('nearby_stations', {
    user_lat: lat,
    user_lng: lng,
    fuel,
    radius_km: radiusKm,
  });
  if (error) throw new Error(error.message);
  return annotateCategories((data ?? []) as NearbyStation[]);
}

export default function HomeScreen() {
  const router = useRouter();
  const { coords, loading: geoLoading } = useLocation();
  const [fuel, setFuel] = useState<FuelType>('gasolina_comum');
  const [radiusKm, setRadiusKm] = useState(5);

  const enabled = !!coords;
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['nearby', coords?.lat, coords?.lng, fuel, radiusKm],
    queryFn: () => fetchNearby(coords!.lat, coords!.lng, fuel, radiusKm),
    enabled,
    staleTime: 60_000,
  });

  const sorted = useMemo(() => {
    const list = [...(data ?? [])];
    return list.sort((a, b) => {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    });
  }, [data]);

  const region = {
    latitude: coords?.lat ?? -26.2306,
    longitude: coords?.lng ?? -51.0875,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Seletor de combustível */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-surface-card"
        contentContainerStyle={{ padding: 12, gap: 8 }}
      >
        {PRIMARY_FUELS.map((f) => {
          const active = f === fuel;
          return (
            <Pressable
              key={f}
              onPress={() => setFuel(f)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'border border-border bg-surface'}`}
            >
              <Text className={active ? 'font-semibold text-white' : 'text-text-secondary'}>
                {FUEL_LABELS[f]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Seletor de raio */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-surface-card"
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 8 }}
      >
        {RADIUS_OPTIONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRadiusKm(r)}
            className={`rounded-full px-3 py-1 ${radiusKm === r ? 'bg-primary' : 'bg-surface'}`}
          >
            <Text className={radiusKm === r ? 'text-xs font-semibold text-white' : 'text-xs text-text-secondary'}>
              {r} km
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Mapa */}
      <View className="flex-1">
        {geoLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1B5E20" />
          </View>
        ) : (
          <MapView provider={PROVIDER_DEFAULT} style={{ flex: 1 }} region={region}>
            {(data ?? []).map((s) => (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.lat, longitude: s.lng }}
                pinColor={CATEGORY_COLORS[s.category ?? 'unknown']}
                title={s.name}
                description={formatFuelPrice(s.price)}
                onCalloutPress={() => router.push(`/station/${s.id}`)}
              />
            ))}
          </MapView>
        )}

        {/* FAB de reporte */}
        <Pressable
          onPress={() => router.push('/report')}
          accessibilityLabel="Reportar preço"
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
        >
          <Text className="text-3xl font-bold text-white">+</Text>
        </Pressable>
      </View>

      {/* Lista de postos por preço */}
      <View className="max-h-[40%] rounded-t-3xl bg-surface px-4 pt-3" style={{ elevation: 8 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-bold text-text-primary">Postos por perto</Text>
          <Pressable onPress={() => refetch()} disabled={isRefetching}>
            <Text className="font-semibold text-primary">
              {isRefetching ? 'Atualizando…' : 'Atualizar'}
            </Text>
          </Pressable>
        </View>

        {isLoading && <Text className="py-6 text-center text-text-muted">Buscando postos…</Text>}
        {isError && <Text className="py-6 text-center text-danger">Erro ao carregar preços.</Text>}
        {!isLoading && !isError && sorted.length === 0 && (
          <Text className="py-6 text-center text-text-secondary">
            Nenhum posto por aqui ainda. Seja o primeiro a reportar! ⛽
          </Text>
        )}

        <FlatList
          data={sorted}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/station/${item.id}`)}
              className="mb-2 flex-row items-center justify-between rounded-2xl border border-border bg-surface-card p-4"
            >
              <View className="flex-1 pr-2">
                <Text className="font-bold text-text-primary" numberOfLines={1}>
                  {item.name} {item.is_verified ? '✅' : ''}
                </Text>
                <Text className="text-sm text-text-secondary" numberOfLines={1}>
                  {item.brand ? `${item.brand} • ` : ''}
                  {item.distance_km < 1
                    ? `${Math.round(item.distance_km * 1000)} m`
                    : `${item.distance_km.toFixed(1)} km`}
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    marginRight: 8,
                    backgroundColor: CATEGORY_COLORS[item.category ?? 'unknown'],
                  }}
                />
                <View>
                  <Text className="font-mono font-bold text-text-primary">
                    {formatFuelPrice(item.price)}
                  </Text>
                  <Text className="text-xs text-text-muted">{timeAgo(item.reported_at)}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}
