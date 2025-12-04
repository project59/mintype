import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      workbox: {
        maximumFileSizeToCacheInBytes: 3000000
      },
      registerType: 'autoUpdate', // service worker auto updates
      includeAssets: ['favicon.svg',
        // 'robots.txt', 
        // 'apple-touch-icon.png'
      ],
      manifest: {
        name: 'Mintype',
        short_name: 'Mintype',
        description: 'Install the Mintype app on your device',
        theme_color: "#10101e",
        display: "standalone",
        background_color: "#10101e", // fallback
        icons: [
          {
            "src": "pwa-64x64.png",
            "sizes": "64x64",
            "type": "image/png"
          },
          {
            "src": "pwa-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": "pwa-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
          },
          {
            "src": "maskable-icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ]
      }
    })
  ],
})
