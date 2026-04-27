import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import vehicles from './src/data/vehicles.json' with { type: 'json' };

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
      serialize(item) {
        if (item.url.includes('/vehicle/')) {
          const slug = item.url.match(/\/vehicle\/([^/]+)/)?.[1];
          const v = vehicles.find(x => x.slug === slug);
          if (v?.status === 'sold') {
            return {
              ...item,
              changefreq: 'never',
              priority: 0.3,
              lastmod: v.sold_date ? new Date(v.sold_date).toISOString() : item.lastmod,
            };
          }
          return { ...item, priority: 0.8, changefreq: 'weekly' };
        }
        return item;
      },
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
