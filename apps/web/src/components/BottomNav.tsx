/**
 * BottomNav — navegação inferior persistente do app (mapa, busca, alertas, perfil).
 * Esconde-se em rotas de tela cheia (onboarding, auth).
 */
import { NavLink, useLocation } from 'react-router-dom';

const ITEMS = [
  { to: '/map', label: 'Mapa', icon: '🗺️' },
  { to: '/search', label: 'Buscar', icon: '🔍' },
  { to: '/alerts', label: 'Alertas', icon: '🔔' },
  { to: '/profile', label: 'Perfil', icon: '👤' },
];

const HIDDEN_PREFIXES = ['/onboarding', '/auth', '/offline'];

export function BottomNav() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      style={{ zIndex: 'var(--z-banner)' as unknown as number }}
      className="sticky bottom-0 flex items-stretch border-t border-border bg-surface-card"
      aria-label="Navegação principal"
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold',
              isActive ? 'text-primary' : 'text-text-muted',
            ].join(' ')
          }
        >
          <span className="text-lg" aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
