/**
 * Store de autenticação (Zustand).
 * -----------------------------------------------------------------------------
 * Centraliza sessão e perfil do usuário. Inicializa ouvindo o onAuthStateChange
 * do Supabase para manter o estado sincronizado em todas as abas.
 */
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@abastece/types';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Inicializa o listener de sessão. Retorna a função de cleanup. */
  init: () => () => void;
  loadProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  init: () => {
    // Sessão atual (ao montar a app).
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, loading: false });
      if (data.session?.user) void get().loadProfile(data.session.user.id);
    });

    // Mantém o estado sincronizado em login/logout/refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) void get().loadProfile(session.user.id);
      else set({ profile: null });
    });

    return () => sub.subscription.unsubscribe();
  },

  loadProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) set({ profile: data as Profile });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));
