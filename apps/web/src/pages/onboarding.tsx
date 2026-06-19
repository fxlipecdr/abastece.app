/**
 * OnboardingPage — 3 slides com o Litro + pedido de permissão de localização.
 * Fundo em gradiente hero para causar primeira impressão forte.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Litro } from '../components/Litro';

const SLIDES = [
  {
    mood: 'happy' as const,
    title: 'Preços de verdade,\nperto de você',
    text: 'Veja o combustível mais barato da região em tempo real, com o nosso semáforo: verde é barato, vermelho é caro.',
  },
  {
    mood: 'cheer' as const,
    title: 'Colabore e\nganhe XP',
    text: 'Reporte preços, suba de nível e desbloqueie conquistas. Quanto mais você ajuda, mais a comunidade economiza.',
  },
  {
    mood: 'happy' as const,
    title: 'Funciona\naté offline',
    text: 'Sem internet? Sem problema. Seus postos salvos continuam disponíveis e os reportes são enviados quando a conexão voltar.',
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
    <div className="bg-gradient-hero flex min-h-dvh flex-col items-center justify-between px-6 py-10 text-white">
      <button onClick={finish} className="self-end text-sm font-bold text-white/80">
        Pular
      </button>

      <div className="flex flex-col items-center text-center">
        <div className="rounded-pill bg-white/15 p-6 backdrop-blur-sm">
          <Litro size={170} mood={slide.mood} className="animate-float-bob drop-shadow-2xl" />
        </div>
        <h1 className="mt-8 whitespace-pre-line font-display text-4xl font-extrabold leading-tight drop-shadow">
          {slide.title}
        </h1>
        <p className="mt-4 max-w-sm text-lg font-medium text-white/90">{slide.text}</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={[
                'h-2 rounded-pill transition-all',
                i === index ? 'w-8 bg-accent' : 'w-2 bg-white/40',
              ].join(' ')}
            />
          ))}
        </div>
        <button
          onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
          className="w-full rounded-pill bg-white py-4 font-display text-lg font-extrabold text-primary shadow-float transition-transform active:scale-95"
        >
          {isLast ? 'Começar a economizar 🚀' : 'Próximo'}
        </button>
      </div>
    </div>
  );
}

export default OnboardingPage;
