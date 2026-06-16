/**
 * XPToast — animação de celebração ao ganhar XP.
 * Auto-dispensa após alguns segundos. Respeita prefers-reduced-motion via CSS.
 */
import { useEffect } from 'react';
import { Litro } from './Litro';

interface XPToastProps {
  amount: number;
  reason: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function XPToast({ amount, reason, onDismiss, durationMs = 3500 }: XPToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ zIndex: 'var(--z-toast)' as unknown as number }}
      className="fixed left-1/2 top-6 -translate-x-1/2 animate-xp-pop"
    >
      <div className="flex items-center gap-3 rounded-pill bg-primary px-5 py-3 shadow-float">
        <Litro size={36} mood="cheer" />
        <div className="flex flex-col">
          <span className="price-value text-lg font-bold text-accent">+{amount} XP</span>
          <span className="text-sm font-medium text-white">{reason}</span>
        </div>
      </div>
    </div>
  );
}
