/**
 * Store de preferências do usuário (Zustand + persistência em localStorage).
 * Combustível padrão, raio padrão e tema (claro/escuro/sistema).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FuelType } from '@abastece/types';

type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  defaultFuel: FuelType;
  defaultRadiusKm: number;
  theme: Theme;
  notificationsEnabled: boolean;
  setDefaultFuel: (fuel: FuelType) => void;
  setDefaultRadius: (km: number) => void;
  setTheme: (theme: Theme) => void;
  setNotifications: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultFuel: 'gasolina_comum',
      defaultRadiusKm: 5,
      theme: 'system',
      notificationsEnabled: false,
      setDefaultFuel: (defaultFuel) => set({ defaultFuel }),
      setDefaultRadius: (defaultRadiusKm) => set({ defaultRadiusKm }),
      setTheme: (theme) => set({ theme }),
      setNotifications: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    { name: 'abastece-settings' },
  ),
);

/** Aplica o tema no atributo data-theme do documento. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}
