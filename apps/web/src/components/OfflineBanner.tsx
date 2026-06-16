/**
 * OfflineBanner — banner discreto de status de conexão (Seção 5.2).
 * Mostra desde quando os dados em cache são válidos.
 */
import { useEffect, useState } from 'react';

interface OfflineBannerProps {
  /** Horário do último sync bem-sucedido, para a mensagem "dados de...". */
  lastSyncLabel?: string;
}

/** Hook que observa o estado de conexão do navegador. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export function OfflineBanner({ lastSyncLabel }: OfflineBannerProps) {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ zIndex: 'var(--z-banner)' as unknown as number }}
      className="sticky top-0 flex items-center justify-center gap-2 bg-accent-warm px-4 py-2 text-sm font-semibold text-text-primary"
    >
      <span aria-hidden="true">📡</span>
      Modo offline — mostrando dados salvos
      {lastSyncLabel ? ` de ${lastSyncLabel}` : ''}
    </div>
  );
}
