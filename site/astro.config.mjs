import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// Vercel sets VERCEL=1 automatically during builds
const isVercel = process.env.VERCEL === '1';

export default defineConfig({
  site: isVercel ? 'https://www.maximautos.com' : 'https://dexmang.github.io',
  base: isVercel ? '/' : '/MaximAutosWeb',
  publicDir: '../web_assets',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
    tailwind(),
  ],
  vite: {
    server: {
      watch: {
        usePolling: true
      }
    }
  }
});
