import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // For GitHub Pages preview: site: 'https://dexmang.github.io', base: '/MaximAutosWeb',
  site: 'https://dexmang.github.io',
  base: '/MaximAutosWeb',
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
