/**
 * Cliente Supabase (mobile/Expo).
 * -----------------------------------------------------------------------------
 * Credenciais vêm de variáveis públicas do Expo (EXPO_PUBLIC_*). A anon key é
 * pública por design e protegida por RLS — nenhuma chave é hardcoded. Usa
 * AsyncStorage para persistir a sessão entre aberturas do app.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Configuração ausente: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // não aplicável em RN
  },
});
