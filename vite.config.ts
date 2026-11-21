import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const siteVerificationToken = (
    env.VITE_GOOGLE_SITE_VERIFICATION ||
    env.GOOGLE_SITE_VERIFICATION ||
    ''
  ).trim();

  return {
    plugins: [
      {
        name: 'google-site-verification-html',
        transformIndexHtml(html) {
          const escaped = siteVerificationToken.replace(/"/g, '&quot;');
          return html.replace(/%VITE_GOOGLE_SITE_VERIFICATION%/g, escaped);
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'icon-192.png',
          'icon-512.png',
          'pwa-maskable-512x512.png',
          'logo.svg',
          'og-image.jpg',
        ],
        manifest: {
          id: '/',
          name: 'DNS Locator',
          short_name: 'DNS Locator',
          description:
            'Global DNS Propagation & Record Lookup — Verify live DNS records across 18 regions in seconds.',
          theme_color: '#0F172A',
          background_color: '#F8FAFC',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff,woff2,webmanifest}'],
          navigateFallbackDenylist: [/^\/api\//, /^\/robots\.txt$/, /^\/sitemap\.xml$/],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                !url.pathname.startsWith('/api/') &&
                (request.destination === 'script' ||
                  request.destination === 'style' ||
                  request.destination === 'image' ||
                  request.destination === 'font' ||
                  request.destination === 'manifest'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'core-site-assets',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                request.mode === 'navigate' &&
                !url.pathname.startsWith('/api/') &&
                url.pathname !== '/robots.txt' &&
                url.pathname !== '/sitemap.xml',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'core-pages-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: process.env.DISABLE_HMR !== 'true',
          type: 'module',
        },
      }),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          // Ensure robots.txt is present in dist/ with optional APP_URL sitemap origin
          const publicRobots = path.resolve(__dirname, 'public/robots.txt');
          const distRobots = path.resolve(distDir, 'robots.txt');
          if (fs.existsSync(distDir) && fs.existsSync(publicRobots)) {
            const rawRobots = fs.readFileSync(publicRobots, 'utf-8');
            const appOrigin = (env.APP_URL || env.VITE_APP_URL || '').trim().replace(/\/$/, '');
            const outputRobots = appOrigin
              ? rawRobots.replace(/https:\/\/dnslocator\.online/g, appOrigin)
              : rawRobots;
            fs.writeFileSync(distRobots, outputRobots, 'utf-8');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
