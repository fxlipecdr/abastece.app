/**
 * SettingsPage — preferências (Seção 6): combustível padrão, raio, tema,
 * notificações. Persistido via store (localStorage).
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FUEL_LABELS, PRIMARY_FUELS, type FuelType } from '@abastece/types';
import { applyTheme, useSettingsStore } from '../stores/settings';

const RADIUS_OPTIONS = [2, 5, 10, 20, 50];
const THEMES: { value: 'light' | 'dark' | 'system'; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const {
    defaultFuel,
    defaultRadiusKm,
    theme,
    notificationsEnabled,
    setDefaultFuel,
    setDefaultRadius,
    setTheme,
    setNotifications,
  } = useSettingsStore();

  // Reaplica o tema sempre que mudar.
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <div className="min-h-dvh bg-surface px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-text-secondary">
        ← Voltar
      </button>
      <h1 className="mb-6 font-display text-2xl font-extrabold">Configurações</h1>

      <Field label="Combustível padrão">
        <div className="flex flex-wrap gap-2">
          {PRIMARY_FUELS.map((f: FuelType) => (
            <Chip key={f} active={defaultFuel === f} onClick={() => setDefaultFuel(f)}>
              {FUEL_LABELS[f]}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Raio de busca padrão">
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <Chip key={r} active={defaultRadiusKm === r} onClick={() => setDefaultRadius(r)}>
              {r} km
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Tema">
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <Chip key={t.value} active={theme === t.value} onClick={() => setTheme(t.value)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Notificações">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => setNotifications(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-primary)]"
          />
          <span className="text-text-secondary">Receber alertas de preço</span>
        </label>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 font-display text-sm font-bold text-text-primary">{label}</h2>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-pill px-4 py-2 text-sm font-semibold',
        active ? 'bg-primary text-white' : 'bg-surface-card border border-border text-text-secondary',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default SettingsPage;
