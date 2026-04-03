import { defineConfig } from 'astro/config';
export default defineConfig({
  // For GitHub Pages preview: site: 'https://dexmang.github.io', base: '/MaximAutosWeb',
  site: 'https://dexmang.github.io',
  base: '/MaximAutosWeb',
  publicDir: '../web_assets',
  vite: {
    server: {
      watch: {
        usePolling: true
      }
    }
  }
});
