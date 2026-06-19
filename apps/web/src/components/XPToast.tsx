/**
 * XPToast — celebração ao ganhar XP, com gradiente e mascote.
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
      <div className="flex items-center gap-3 rounded-pill bg-gradient-hero px-5 py-3 shadow-glow-primary">
        <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-white/20">
          <Litro size={34} mood="cheer" />
        </div>
        <div className="flex flex-col">
          {amount > 0 && (
            <span className="price-value text-xl font-black text-accent">+{amount} XP</span>
          )}
          <span className="text-sm font-semibold text-white">{reason}</span>
        </div>
      </div>
    </div>
  );
}
