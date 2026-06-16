/**
 * App — roteamento principal do PWA (Seção 6, telas obrigatórias).
 * Inicializa o listener de sessão e protege as rotas que exigem login.
 */
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MapPage } from './pages/map';
import { ReportPage } from './pages/report';
import { OfflinePage } from './pages/offline';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { RequireAuth } from './components/RequireAuth';
import { useAuthStore } from './stores/auth';

const StationDetailPage = lazy(() => import('./pages/station/[id]'));

function Loading() {
  return <p className="p-6 text-center text-text-muted">Carregando…</p>;
}

export function App() {
  // Inicializa o listener de autenticação uma única vez.
  useEffect(() => useAuthStore.getState().init(), []);

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/station/:id" element={<StationDetailPage />} />
          <Route
            path="/report"
            element={
              <RequireAuth>
                <ReportPage />
              </RequireAuth>
            }
          />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
