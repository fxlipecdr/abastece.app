/**
 * Tela de perfil (mobile) — XP, nível e estatísticas básicas.
 * Carrega o profile do usuário logado; oferece login se anônimo.
 */
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Profile } from '@abastece/types';
import { levelFromXp, levelProgress } from '@abastece/utils/price';
import { supabase } from '../../services/supabase';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', auth.user.id)
          .single();
        setProfile((data as Profile) ?? null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-text-muted">Carregando…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="mb-4 text-center text-text-secondary">
          Entre para ver seu perfil e conquistas.
        </Text>
      </View>
    );
  }

  const info = levelFromXp(profile.xp);
  const progress = levelProgress(profile.xp);

  return (
    <View className="flex-1 bg-surface px-4 pt-6">
      <Text className="font-bold text-2xl text-text-primary">
        {profile.display_name || profile.username}
      </Text>
      <Text className="text-text-secondary">@{profile.username}</Text>

      <View className="mt-6 rounded-2xl bg-surface-card p-4">
        <Text className="font-bold text-text-primary">
          Nível {info.level} • {info.name}
        </Text>
        <View className="mt-2 h-3 w-full overflow-hidden rounded-full bg-border">
          <View className="h-full rounded-full bg-primary-bright" style={{ width: `${progress}%` }} />
        </View>
        <Text className="mt-1 font-mono text-xs text-text-secondary">{profile.xp} XP</Text>
      </View>

      <View className="mt-4 flex-row gap-3">
        <Stat label="Reports" value={profile.total_reports} />
        <Stat label="Sequência" value={`${profile.streak_days}d`} />
      </View>

      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="mt-8 rounded-2xl border border-border py-3"
      >
        <Text className="text-center font-semibold text-danger">Sair</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-1 rounded-2xl bg-surface-card p-3">
      <Text className="text-center font-mono text-xl font-bold text-primary">{value}</Text>
      <Text className="text-center text-xs text-text-muted">{label}</Text>
    </View>
  );
}
