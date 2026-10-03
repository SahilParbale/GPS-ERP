import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'logo.jpg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'apple-touch-icon.png'
      ],
      manifest: {
        name: 'GPS Spindle ERP',
        short_name: 'GPS ERP',
        description: 'Industrial Manufacturing Management System for GPS Spindle',
        theme_color: '#7A1F3D',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Manufacturing Operations Dashboard',
            url: '/?screen=dashboard',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Production Flow',
            short_name: 'Production',
            description: 'Floor Operations & Active Work Orders',
            url: '/?screen=production',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Spindles Registry',
            short_name: 'Spindles',
            description: 'Serialized Spindle Fleet & Digital Twins',
            url: '/?screen=spindles',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Inventory & Stock',
            short_name: 'Inventory',
            description: 'Raw Materials & Components Warehouse',
            url: '/?screen=inventory',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Google Fonts Stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // Google Fonts Webfonts
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Supabase REST Database API — NEVER CACHE (NetworkOnly)
            urlPattern: ({ url }) => url.pathname.includes('/rest/v1/'),
            handler: 'NetworkOnly',
            options: {
              plugins: [
                {
                  fetchDidFail: async () => {
                    console.warn('[PWA SW] Supabase REST request failed - network unavailable.');
                  }
                }
              ]
            }
          },
          {
            // Supabase Auth API — NEVER CACHE (NetworkOnly)
            urlPattern: ({ url }) => url.pathname.includes('/auth/v1/'),
            handler: 'NetworkOnly'
          },
          {
            // Supabase Storage API — NEVER CACHE (NetworkOnly)
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/'),
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})

