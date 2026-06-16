/**
 * OfflinePage — fallback do Service Worker quando não há conexão (Seção 5.2).
 * Mostra o mascote Litro e mensagem encorajadora.
 */
import { Litro } from '../components/Litro';

export function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <Litro size={140} mood="sleepy" />
      <h1 className="font-display text-2xl font-extrabold text-text-primary">
        Você está offline
      </h1>
      <p className="max-w-sm text-text-secondary">
        Sem problemas! Estamos mostrando os últimos dados que você salvou. Assim que a
        conexão voltar, tudo volta a atualizar automaticamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-pill bg-primary px-6 py-3 font-semibold text-white"
      >
        Tentar reconectar
      </button>
    </div>
  );
}

export default OfflinePage;
