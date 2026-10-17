import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readdirSync } from 'node:fs'

const SITE_URL = 'https://mintype.app'

// Lists the landing page and every Markdown file in docs/ (see src/pages/docs/docsContent.js).
function sitemap() {
  return {
    name: 'mintype-sitemap',
    apply: 'build',
    generateBundle() {
      const docs = readdirSync('docs').filter((file) => file.endsWith('.md') && file !== 'README.md')
      const paths = ['/', '/docs', ...docs.map((file) => `/docs/${file.slice(0, -3)}`)]
      const urls = paths.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sitemap(),
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
        description: 'Encrypted notes and whiteboards that work offline and sync to your own Google Drive.',
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
