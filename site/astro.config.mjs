import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import vehicles from './src/data/vehicles.json' with { type: 'json' };
import retiredSlugs from './src/data/retired-slugs.json' with { type: 'json' };

// Vercel sets VERCEL=1 automatically during builds
const isVercel = process.env.VERCEL === '1';

// Retired VDP slugs (pages that were built once but whose VIN left
// vehicles.json, or whose slug changed) 301 instead of soft-404ing.
// Ledger maintained by scripts/sync-from-cargurus.js; vercel.json mirrors it
// for real 301s in production, these entries cover dev/GH Pages builds.
// A slug currently in vehicles.json is skipped — a redirect must never
// shadow a built page.
const liveSlugs = new Set(vehicles.map(v => v.slug));
const retiredRedirects = {};
for (const [slug, info] of Object.entries(retiredSlugs.retired ?? {})) {
  if (liveSlugs.has(slug)) continue;
  retiredRedirects[`/vehicle/${slug}`] = info.redirect_to || '/inventory';
  retiredRedirects[`/vehicle/${slug}/`] = info.redirect_to || '/inventory';
}

export default defineConfig({
  site: isVercel ? 'https://www.maximautos.com' : 'https://dexmang.github.io',
  base: isVercel ? '/' : '/MaximAutosWeb',
  trailingSlash: 'never',
  redirects: {
    ...retiredRedirects,
    '/inventory/hyundai/tucson/j10175': '/inventory',
    '/inventory/hyundai/tucson/j10175/': '/inventory',
    '/es/financing': '/financing',
    '/es/financing/': '/financing',
    '/inventory/honda/cr-v/J10198': '/inventory',
    '/inventory/honda/cr-v/J10198/': '/inventory',
    '/maps': '/',
    '/maps/': '/',
    '/vehicle-specials': '/',
    '/vehicle-specials/': '/',
    '/apply-online': '/apply',
    '/apply-online/': '/apply',
  },
  publicDir: '../web_assets',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      serialize(item) {
        if (item.url.includes('/vehicle/')) {
          // 14-day cutoff: sold VDPs older than this drop out of the sitemap.
          // The page itself still renders (Google can re-crawl via the live
          // index for up to a few weeks), but we stop actively re-submitting it.
          const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
          const slug = item.url.match(/\/vehicle\/([^/]+)/)?.[1];
          const v = vehicles.find(x => x.slug === slug);
          if (v?.status === 'sold') {
            const soldTs = v.sold_date ? Date.parse(v.sold_date) : NaN;
            // If sold_date is missing or older than 14 days → exclude entirely.
            if (!Number.isFinite(soldTs) || soldTs < fourteenDaysAgo) {
              return undefined;
            }
            return {
              ...item,
              changefreq: 'never',
              priority: 0.3,
              lastmod: new Date(soldTs).toISOString(),
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
