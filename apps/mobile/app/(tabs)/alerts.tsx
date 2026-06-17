/**
 * Tela de alertas (mobile) — placeholder funcional do MVP.
 * Lista alertas do usuário; a criação completa fica para a próxima rodada.
 */
import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { FUEL_LABELS, type PriceAlert } from '@abastece/types';
import { formatFuelPrice } from '@abastece/utils/price';
import { supabase } from '../../services/supabase';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', auth.user.id);
      setAlerts((data as PriceAlert[]) ?? []);
    })();
  }, []);

  return (
    <View className="flex-1 bg-surface px-4 pt-4">
      {alerts.length === 0 ? (
        <Text className="mt-8 text-center text-text-secondary">
          Você ainda não tem alertas de preço. ⛽
        </Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <View className="mb-2 rounded-2xl border border-border bg-surface-card p-3">
              <Text className="font-semibold text-text-primary">
                {FUEL_LABELS[item.fuel_type]} abaixo de {formatFuelPrice(item.target_price)}
              </Text>
              <Text className="text-sm text-text-secondary">Raio {item.radius_km} km</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
