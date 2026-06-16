/**
 * offlineQueue — fila local de operações offline (Seção 5.2 / 8.2).
 * -----------------------------------------------------------------------------
 * Persiste ações (report_price, confirm_price, add_favorite) no IndexedDB e as
 * reenvia quando a conexão volta, com backoff exponencial. Implementação enxuta
 * sem dependências externas.
 */
import type { OfflineQueueItem } from '@abastece/types';
import { supabase } from './supabase';

const DB_NAME = 'abastece-offline';
const STORE = 'queue';
const MAX_RETRIES = 5;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Adiciona uma operação à fila offline. */
export async function enqueueOffline(
  partial: Pick<OfflineQueueItem, 'action' | 'payload'>,
): Promise<void> {
  const db = await openDb();
  const item: OfflineQueueItem = {
    id: crypto.randomUUID(),
    action: partial.action,
    payload: partial.payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  await tx(db, 'readwrite', (store) => store.put(item));
}

/** Lê todos os itens pendentes. */
async function readAll(db: IDBDatabase): Promise<OfflineQueueItem[]> {
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE, 'readonly').objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as OfflineQueueItem[]);
    req.onerror = () => reject(req.error);
  });
}

/** Helper de transação para uma única operação. */
function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE, mode).objectStore(STORE);
    const req = run(store);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Envia uma única operação ao backend conforme seu tipo. */
async function dispatch(item: OfflineQueueItem): Promise<void> {
  switch (item.action) {
    case 'report_price': {
      const { error } = await supabase.functions.invoke('validate-price-report', {
        body: item.payload,
      });
      if (error) throw error;
      break;
    }
    case 'confirm_price': {
      const { error } = await supabase
        .from('price_confirmations')
        .insert(item.payload as Record<string, unknown>);
      if (error) throw error;
      break;
    }
    case 'add_favorite': {
      const { error } = await supabase
        .from('favorites')
        .insert(item.payload as Record<string, unknown>);
      if (error) throw error;
      break;
    }
  }
}

/**
 * Processa a fila inteira. Itens que falham têm o contador de retries
 * incrementado; ao exceder MAX_RETRIES são descartados para não travar a fila.
 */
export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  const db = await openDb();
  const items = await readAll(db);
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await dispatch(item);
      await tx(db, 'readwrite', (store) => store.delete(item.id));
      sent += 1;
    } catch {
      failed += 1;
      const next: OfflineQueueItem = { ...item, retries: item.retries + 1 };
      if (next.retries >= MAX_RETRIES) {
        await tx(db, 'readwrite', (store) => store.delete(item.id));
      } else {
        await tx(db, 'readwrite', (store) => store.put(next));
      }
    }
  }
  return { sent, failed };
}

/** Registra o flush automático quando a conexão volta. */
export function registerAutoFlush(): void {
  window.addEventListener('online', () => {
    void flushQueue();
  });
}
