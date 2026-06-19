/**
 * BottomNav — navegação inferior clean com ícones de linha.
 * Item ativo: cor primária + ponto indicador. Esconde-se em telas cheias.
 */
import { NavLink, useLocation } from 'react-router-dom';
import { BellIcon, MapIcon, SearchIcon, UserIcon } from './icons';

const ITEMS = [
  { to: '/map', label: 'Mapa', Icon: MapIcon },
  { to: '/search', label: 'Buscar', Icon: SearchIcon },
  { to: '/alerts', label: 'Alertas', Icon: BellIcon },
  { to: '/profile', label: 'Perfil', Icon: UserIcon },
];

const HIDDEN_PREFIXES = ['/onboarding', '/auth', '/offline'];

export function BottomNav() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      style={{ zIndex: 'var(--z-banner)' as unknown as number }}
      className="glass sticky bottom-0 flex items-stretch border-t border-border px-2 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      {ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-semibold transition-colors',
              isActive ? 'text-primary' : 'text-text-muted',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
              <span>{label}</span>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-pill bg-primary" aria-hidden="true" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
