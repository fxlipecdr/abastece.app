/**
 * OnboardingPage — 3 slides com o Litro + pedido de permissão de localização.
 * Marca conclusão no localStorage para não repetir.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Litro } from '../components/Litro';

const SLIDES = [
  {
    mood: 'happy' as const,
    title: 'Preços de verdade, perto de você',
    text: 'Veja o combustível mais barato da sua região em tempo real, com nosso sistema de cores: verde é barato, vermelho é caro.',
  },
  {
    mood: 'cheer' as const,
    title: 'Colabore e ganhe XP',
    text: 'Reporte preços, suba de nível e desbloqueie conquistas. Quanto mais você ajuda, mais a comunidade economiza.',
  },
  {
    mood: 'happy' as const,
    title: 'Funciona até offline',
    text: 'Sem internet? Sem problema. Seus postos salvos continuam disponíveis e seus reportes são enviados quando a conexão voltar.',
  },
];

export const ONBOARDING_KEY = 'abastece-onboarded';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    // Pede permissão de localização antes de entrar no mapa.
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => navigate('/map', { replace: true }),
        () => navigate('/map', { replace: true }),
      );
    } else {
      navigate('/map', { replace: true });
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-surface px-6 py-10">
      <button
        onClick={finish}
        className="self-end text-sm font-semibold text-text-muted"
      >
        Pular
      </button>

      <div className="flex flex-col items-center text-center">
        <Litro size={180} mood={slide.mood} />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-text-primary">
          {slide.title}
        </h1>
        <p className="mt-3 max-w-sm text-text-secondary">{slide.text}</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-center gap-2" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={[
                'h-2 rounded-pill transition-all',
                i === index ? 'w-6 bg-primary' : 'w-2 bg-border',
              ].join(' ')}
            />
          ))}
        </div>
        <button
          onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
          className="w-full rounded-pill bg-primary py-4 font-semibold text-white"
        >
          {isLast ? 'Começar a economizar' : 'Próximo'}
        </button>
      </div>
    </div>
  );
}

export default OnboardingPage;
