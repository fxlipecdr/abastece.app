/**
 * RequireAuth — protege rotas que exigem usuário autenticado.
 * Redireciona ao login preservando o destino pretendido.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <p className="p-6 text-center text-text-muted">Carregando…</p>;
  }
  if (!session) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
