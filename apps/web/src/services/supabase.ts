/**
 * Cliente Supabase (web).
 * -----------------------------------------------------------------------------
 * As credenciais vêm exclusivamente de variáveis de ambiente (Vite). A anon key
 * é pública por design e protegida por RLS no servidor — ainda assim, nenhuma
 * chave é hardcoded. Falha cedo e de forma clara se a config estiver ausente.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
