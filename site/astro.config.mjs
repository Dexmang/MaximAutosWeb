import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://maximautos.com',
  publicDir: '../web_assets',
  vite: {
    server: {
      watch: {
        usePolling: true
      }
    }
  }
});
