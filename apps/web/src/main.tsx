/**
 * Ponto de entrada do PWA. Monta o React, o React Query e o auto-flush da
 * fila offline. Importa Leaflet CSS e o design system.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import './styles/index.css';
import { App } from './App';
import { registerAutoFlush } from './services/offlineQueue';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// Reenvia operações enfileiradas assim que a conexão voltar.
registerAutoFlush();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Elemento #root não encontrado');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
