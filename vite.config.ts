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
  const bingVerificationToken = (
    env.VITE_BING_SITE_VERIFICATION ||
    env.BING_SITE_VERIFICATION ||
    ''
  ).trim();

  return {
    plugins: [
      {
        name: 'site-verification-html',
        transformIndexHtml(html) {
          const escapedGoogle = siteVerificationToken.replace(/"/g, '&quot;');
          const escapedBing = bingVerificationToken.replace(/"/g, '&quot;');
          let out = escapedGoogle
            ? html.replace(/%VITE_GOOGLE_SITE_VERIFICATION%/g, escapedGoogle)
            : html.replace(/\s*<meta name="google-site-verification" content="%VITE_GOOGLE_SITE_VERIFICATION%" \/>/g, '');
          out = escapedBing
            ? out.replace(/%VITE_BING_SITE_VERIFICATION%/g, escapedBing)
            : out.replace(/\s*<meta name="msvalidate\.01" content="%VITE_BING_SITE_VERIFICATION%" \/>/g, '');
          return out;
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
          navigateFallback: null,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,ico,png,jpg,svg,woff2,webmanifest}'],
          navigateFallbackDenylist: [/^\/api\//, /^\/robots\.txt$/, /^\/sitemap\.xml$/, /^\/llms\.txt$/],
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
                url.pathname !== '/sitemap.xml' &&
                url.pathname !== '/llms.txt',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'core-pages-cache',
                expiration: {
                  maxEntries: 40,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                cacheableResponse: {
                  statuses: [200],
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

          const publicRobots = path.resolve(__dirname, 'public/robots.txt');
          const distRobots = path.resolve(distDir, 'robots.txt');
          if (fs.existsSync(distDir) && fs.existsSync(publicRobots)) {
            const rawRobots = fs.readFileSync(publicRobots, 'utf-8');
            const canonicalEnv = (env.CANONICAL_ORIGIN || '').trim().replace(/\/$/, '');
            const outputRobots = canonicalEnv
              ? rawRobots.replace(/https:\/\/dnslocator\.online/g, canonicalEnv)
              : rawRobots;
            fs.writeFileSync(distRobots, outputRobots, 'utf-8');
          }
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/three')) return 'vendor-three';
            if (id.includes('node_modules/d3')) return 'vendor-d3';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          },
        },
      },
    },
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
