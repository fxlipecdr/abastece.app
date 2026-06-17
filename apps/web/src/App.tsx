/**
 * App — roteamento principal do PWA (Seção 6, telas obrigatórias).
 * Inicializa sessão e tema, controla onboarding e renderiza a navegação inferior.
 */
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MapPage } from './pages/map';
import { ReportPage } from './pages/report';
import { OfflinePage } from './pages/offline';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { ProfilePage } from './pages/profile';
import { SettingsPage } from './pages/settings';
import { SearchPage } from './pages/search';
import { AlertsPage } from './pages/alerts';
import { OnboardingPage, ONBOARDING_KEY } from './pages/onboarding';
import { RequireAuth } from './components/RequireAuth';
import { BottomNav } from './components/BottomNav';
import { useAuthStore } from './stores/auth';
import { applyTheme, useSettingsStore } from './stores/settings';

const StationDetailPage = lazy(() => import('./pages/station/[id]'));

function Loading() {
  return <p className="p-6 text-center text-text-muted">Carregando…</p>;
}

/** Decide a rota inicial: onboarding na primeira visita, senão o mapa. */
function Root() {
  const onboarded = localStorage.getItem(ONBOARDING_KEY) === '1';
  return <Navigate to={onboarded ? '/map' : '/onboarding'} replace />;
}

export function App() {
  const theme = useSettingsStore((s) => s.theme);

  // Inicializa o listener de autenticação uma única vez.
  useEffect(() => useAuthStore.getState().init(), []);
  // Aplica o tema salvo ao montar e quando mudar.
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <BrowserRouter>
      <div className="flex h-dvh flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Root />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/station/:id" element={<StationDetailPage />} />
              <Route
                path="/report"
                element={
                  <RequireAuth>
                    <ReportPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/alerts"
                element={
                  <RequireAuth>
                    <AlertsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/offline" element={<OfflinePage />} />
              <Route path="*" element={<Navigate to="/map" replace />} />
            </Routes>
          </Suspense>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
