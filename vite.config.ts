import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OMNIA Journal',
        short_name: 'OMNIA',
        description: 'Gestion des opérations Mobile Money',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'fr',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/',
        runtimeCaching: [
          {
            // Les requêtes Supabase ne sont jamais mises en cache par le SW
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ]
});
