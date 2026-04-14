import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Vercel sets VERCEL=1 automatically during builds
const isVercel = process.env.VERCEL === '1';

export default defineConfig({
  site: isVercel ? 'https://maximautos.com' : 'https://dexmang.github.io',
  base: isVercel ? '/' : '/MaximAutosWeb',
  publicDir: '../web_assets',
  integrations: [
    sitemap(),
  ],
  vite: {
    server: {
      watch: {
        usePolling: true
      }
    }
  }
});
