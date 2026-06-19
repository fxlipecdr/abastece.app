/**
 * Litro — mascote do Abastece (galo simpático, estilo flat moderno).
 * -----------------------------------------------------------------------------
 * SVG com gradientes suaves, formas arredondadas e expressão amigável.
 * Escalável de 24px a 256px. useId garante gradientes únicos por instância.
 */
import { useId } from 'react';

interface LitroProps {
  size?: number;
  mood?: 'happy' | 'cheer' | 'sleepy';
  className?: string;
  title?: string;
}

export function Litro({
  size = 96,
  mood = 'happy',
  className,
  title = 'Litro, o mascote do Abastece',
}: LitroProps) {
  const uid = useId();
  const body = `body-${uid}`;
  const belly = `belly-${uid}`;
  const crest = `crest-${uid}`;
  const drop = `drop-${uid}`;

  const eyeY = mood === 'sleepy' ? 92 : 90;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 170"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="55%" stopColor="#16A34A" />
          <stop offset="100%" stopColor="#0B7A3B" />
        </linearGradient>
        <linearGradient id={belly} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E9FBEF" />
        </linearGradient>
        <linearGradient id={crest} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE14D" />
          <stop offset="55%" stopColor="#FFD60A" />
          <stop offset="100%" stopColor="#FF8F00" />
        </linearGradient>
        <linearGradient id={drop} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE14D" />
          <stop offset="100%" stopColor="#FF8F00" />
        </linearGradient>
      </defs>

      {/* Sombra de contato */}
      <ellipse cx="80" cy="158" rx="40" ry="7" fill="#0B7A3B" opacity="0.14" />

      {/* Crista (3 bolhas) */}
      <g fill={`url(#${crest})`}>
        <circle cx="62" cy="22" r="11" />
        <circle cx="80" cy="15" r="13" />
        <circle cx="97" cy="23" r="11" />
      </g>

      {/* Pernas */}
      <path d="M66 142v14M94 142v14" stroke="#FF8F00" strokeWidth="6" strokeLinecap="round" />
      <path d="M60 156h12M88 156h12" stroke="#FF8F00" strokeWidth="6" strokeLinecap="round" />

      {/* Corpo */}
      <path
        d="M80 30c30 0 50 23 50 56 0 34-22 58-50 58S30 120 30 86c0-33 20-56 50-56z"
        fill={`url(#${body})`}
      />

      {/* Asa */}
      <path
        d="M118 78c8 6 9 22 0 34-6 8-15 9-20 4 6-13 10-26 9-40 4-1 8-1 11 2z"
        fill="#0B7A3B"
        opacity="0.55"
      />

      {/* Barriga clara */}
      <ellipse cx="78" cy="104" rx="30" ry="34" fill={`url(#${belly})`} />

      {/* Gota de combustível no peito (assinatura) */}
      <path
        d="M78 86c5 8 9 12 9 18a9 9 0 11-18 0c0-6 4-10 9-18z"
        fill={`url(#${drop})`}
      />

      {/* Bico */}
      <path d="M44 84l-16 6 16 7z" fill="#FF8F00" />
      {/* Papo */}
      <circle cx="46" cy="100" r="6" fill="#FF8F00" />

      {/* Olhos */}
      {mood === 'sleepy' ? (
        <>
          <path d="M52 90q7 5 14 0" stroke="#0B1F12" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M74 90q7 5 14 0" stroke="#0B1F12" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="59" cy={eyeY} r="8" fill="#FFFFFF" />
          <circle cx="81" cy={eyeY} r="8" fill="#FFFFFF" />
          <circle cx="61" cy={eyeY + 1} r="4" fill="#0B1F12" />
          <circle cx="83" cy={eyeY + 1} r="4" fill="#0B1F12" />
          <circle cx="62.5" cy={eyeY - 0.5} r="1.4" fill="#FFFFFF" />
          <circle cx="84.5" cy={eyeY - 0.5} r="1.4" fill="#FFFFFF" />
        </>
      )}

      {/* Bochechas */}
      <circle cx="50" cy="104" r="5" fill="#FF8F00" opacity={mood === 'cheer' ? 0.55 : 0.3} />
      <circle cx="92" cy="104" r="5" fill="#FF8F00" opacity={mood === 'cheer' ? 0.55 : 0.3} />

      {/* Sorriso */}
      {mood === 'cheer' ? (
        <path d="M64 112q10 12 20 0" stroke="#0B1F12" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M68 112q7 6 14 0" stroke="#0B1F12" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}
