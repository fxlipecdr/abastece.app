/**
 * Abastece.app — Schema WatermelonDB (offline-first mobile, Seção 5.2/8.2)
 * -----------------------------------------------------------------------------
 * Espelho local das tabelas necessárias para o app funcionar sem internet.
 * Armazena as últimas estações e preços sincronizados + a fila de operações
 * offline. O sync com o Supabase é gerenciado pelo serviço de sincronização.
 */
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Estações cacheadas localmente (até ~200 últimas vistas).
    tableSchema({
      name: 'stations',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'brand', type: 'string', isOptional: true },
        { name: 'address', type: 'string' },
        { name: 'city', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'is_verified', type: 'boolean' },
        { name: 'amenities', type: 'string' }, // JSON serializado
        { name: 'rating_avg', type: 'number' },
        { name: 'synced_at', type: 'number' }, // epoch ms do último sync
      ],
    }),

    // Preços vigentes por estação/combustível.
    tableSchema({
      name: 'prices',
      columns: [
        { name: 'station_server_id', type: 'string', isIndexed: true },
        { name: 'fuel_type', type: 'string', isIndexed: true },
        { name: 'price', type: 'number' },
        { name: 'reported_at', type: 'number' }, // epoch ms
        { name: 'synced_at', type: 'number' },
      ],
    }),

    // Favoritos do usuário (sincronizáveis).
    tableSchema({
      name: 'favorites',
      columns: [
        { name: 'station_server_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    // Fila de operações offline (report_price, confirm_price, add_favorite).
    tableSchema({
      name: 'offline_queue',
      columns: [
        { name: 'action', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON serializado
        { name: 'created_at', type: 'number' },
        { name: 'retries', type: 'number' },
      ],
    }),
  ],
});
