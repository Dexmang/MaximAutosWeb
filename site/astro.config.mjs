import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { readFileSync } from 'node:fs';
import vehicles from './src/data/vehicles.json' with { type: 'json' };
import retiredSlugs from './src/data/retired-slugs.json' with { type: 'json' };
import inventoryMeta from './src/data/inventory-meta.json' with { type: 'json' };

// Vercel sets VERCEL=1 automatically during builds
const isVercel = process.env.VERCEL === '1';

// ── Sitemap dates that mean something (2026-11-26) ──────────────────────────
// Every URL used to carry the build time as <lastmod>: 62 of 66 entries identical on the
// day it was measured, which teaches a crawler to ignore the field. Now:
//   - a car page carries the last time that car changed on the site (its newest "added"
//     or "back on market" event, else the day it was added);
//   - pages whose content is the inventory (home, the grids, the landing and town pages)
//     carry the time of the last DealerCenter feed publish;
//   - every other page carries no <lastmod> at all. No date beats a false one.
const iso = (v) => {
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
};
const feedChangedAt = iso(inventoryMeta?.lastUpdated);
const lastEventBySlug = new Map();
try {
  const lines = readFileSync(new URL('./src/data/url-events.jsonl', import.meta.url), 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    if (!e.slug || !e.ts || !['added', 'back_on_market', 'slug_changed_new'].includes(e.event)) continue;
    const prev = lastEventBySlug.get(e.slug);
    if (!prev || Date.parse(e.ts) > Date.parse(prev)) lastEventBySlug.set(e.slug, e.ts);
  }
} catch (_) {
  // No event log: car pages fall back to dateAdded.
}
// Paths whose content changes whenever the inventory does. Matched after the base path is
// stripped, with no trailing slash.
const INVENTORY_DRIVEN = [
  /^\/$/, /^\/es$/, /^\/inventory$/, /^\/es\/inventario$/,
  /^\/used-[^/]+$/, /^\/no-dealer-fees$/, /^\/es\/sin-cargos-de-dealer$/,
];

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
  // Authorize the DealerCenter CDN so Astro/Sharp can reencode the VDP hero JPG
  // to WebP at build time (task #202 LCP). Only the in-stock VDP hero is
  // optimized (see vehicle/[slug].astro); the reencode is wrapped so a CDN
  // failure falls back to the hotlinked JPG and never breaks the build.
  image: {
    remotePatterns: [{ protocol: 'https', hostname: '**.dealercenter.net' }],
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      serialize(item) {
        if (item.url.includes('/vehicle/')) {
          const slug = item.url.match(/\/vehicle\/([^/]+)/)?.[1];
          const v = vehicles.find(x => x.slug === slug);
          // A sold car leaves the sitemap the day it sells (Jerry, 2026-11-26). Its page
          // stays up for anyone holding the link, but it is noindex, and a sitemap that
          // lists noindex pages sends Google two answers at once: four sold cars were still
          // listed on 2026-11-26 under the old 14 day grace window. Search engines hear
          // about the change from the post deploy IndexNow ping (scripts/ping-indexnow.js).
          if (v?.status === 'sold') return undefined;
          const changed = [iso(lastEventBySlug.get(slug)), iso(v?.dateAdded)]
            .filter(Boolean).sort().pop();
          return { ...item, priority: 0.8, changefreq: 'weekly', lastmod: changed };
        }
        let path = '/';
        try { path = new URL(item.url).pathname; } catch (_) { /* keep '/' */ }
        path = path.replace(/^\/MaximAutosWeb/, '').replace(/\/+$/, '') || '/';
        if (feedChangedAt && INVENTORY_DRIVEN.some((re) => re.test(path))) {
          return { ...item, lastmod: feedChangedAt };
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
