/**
 * Litro — mascote do Abastece (galo estilizado verde e amarelo).
 * -----------------------------------------------------------------------------
 * SVG inline em estilo flat, traços suaves, escalável de 24px a 256px.
 * Usado em onboarding, estados vazios, celebrações e página offline.
 */

interface LitroProps {
  size?: number;
  /** Variação de humor do mascote para diferentes contextos. */
  mood?: 'happy' | 'cheer' | 'sleepy';
  className?: string;
  title?: string;
}

export function Litro({ size = 96, mood = 'happy', className, title = 'Litro, o mascote do Abastece' }: LitroProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Crista (amarelo combustível) */}
      <path
        d="M42 30c-2-9 4-15 9-13 2-7 10-7 12 0 6-3 12 3 9 11-8-4-21-4-30 2z"
        fill="var(--color-accent)"
      />
      {/* Corpo (verde floresta) */}
      <path
        d="M60 34c18 0 30 13 30 31 0 20-14 33-30 33S30 85 30 65c0-18 12-31 30-31z"
        fill="var(--color-primary)"
      />
      {/* Barriga clara */}
      <ellipse cx="60" cy="76" rx="16" ry="20" fill="var(--color-primary-bright)" />
      {/* Bico (laranja) */}
      <path d="M86 58l14 5-14 6z" fill="var(--color-accent-warm)" />
      {/* Olho */}
      <circle cx="74" cy="54" r="6" fill="#FFFFFF" />
      <circle cx={mood === 'sleepy' ? 75 : 76} cy="55" r="3" fill="var(--color-text-primary)" />
      {mood === 'sleepy' && <path d="M68 52h12" stroke="var(--color-text-primary)" strokeWidth="2" strokeLinecap="round" />}
      {/* Bochecha de alegria */}
      {mood === 'cheer' && <circle cx="64" cy="62" r="4" fill="var(--color-accent-warm)" opacity="0.5" />}
      {/* Pernas */}
      <path d="M50 96v10M70 96v10" stroke="var(--color-accent-warm)" strokeWidth="4" strokeLinecap="round" />
      {/* Gota de combustível (assinatura) */}
      <path
        d="M60 12c3 5 6 8 6 12a6 6 0 11-12 0c0-4 3-7 6-12z"
        fill="var(--color-accent)"
        opacity={mood === 'cheer' ? 1 : 0.85}
      />
    </svg>
  );
}
