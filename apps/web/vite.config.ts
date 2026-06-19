import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Configuração do Vite + PWA (Workbox). O Service Worker faz cache-first dos
// assets e network-first com fallback para os dados de postos (Seção 5.2).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'litro-icon.svg'],
      manifest: {
        name: 'Abastece',
        short_name: 'Abastece',
        description: 'O preço certo, na hora certa, perto de você.',
        theme_color: '#0E8C43',
        background_color: '#F4FBF6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'litro-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'litro-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/offline',
        runtimeCaching: [
          {
            // Tiles do OpenStreetMap: cache-first com expiração.
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Dados de postos via Supabase REST/RPC: network-first com fallback.
            urlPattern: /\/rest\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@abastece/types': path.resolve(__dirname, '../../packages/types/index.ts'),
      '@abastece/utils': path.resolve(__dirname, '../../packages/utils'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
