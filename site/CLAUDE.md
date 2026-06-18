# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (default port 4321; PKA launch config uses --port 4324 via "maxim-dev")
npm run build     # Production build (outputs to dist/)
npm run preview   # Serve the production build locally
```

Dev server is launched from the PKA root via `.claude/launch.json` config named `maxim-dev`, pointing to `businesses/maxim-autos/website/site` on port 4324.

## Architecture

**Stack:** Astro 5 (static output) + Tailwind CSS 3 + vanilla JS only. No React/Vue/Svelte — everything is `.astro` files or inline `<script is:inline>` blocks.

**Base URL:** `astro.config.mjs` sets `base: isVercel ? '/' : '/MaximAutosWeb'`. Every internal link and asset reference must use `const base = import.meta.env.BASE_URL.replace(/\/$/, '')` and prefix with `${base}/`. Forgetting this breaks dev but works on Vercel — always use the prefix.

**Public assets:** `publicDir: '../web_assets'` — the public directory is one level up from the site root, at `businesses/maxim-autos/website/web_assets/`. Brand assets live in `web_assets/brand/`, vehicle photos in `web_assets/vehicles/`.

**Deployment:** GitHub → Vercel auto-deploy on push to `main` at `github.com/Dexmang/MaximAutosWeb`. Vercel sets `VERCEL=1`, which switches the site/base config to production values.

## Data Layer

`src/data/vehicles.json` is the data file the site renders, but it is GENERATED, not
hand-edited. **DealerCenter is the source of truth** (cars + photos); CarGurus is a
deal-rating/stats overlay. `scripts/sync-from-cargurus.js` writes `vehicles.json` by
scraping CarGurus for the active list + `dealRating`/`priceSavings`, then overlaying
DealerCenter photos and adding DC-only cars from the snapshots below. Full pipeline:
`businesses/maxim-autos/operations/inventory-pipeline.md`. Key vehicle fields: `slug`,
`status` (`available`/`sold`), `price`, `photoPath`, `photoPrefix`, `primaryPhotoUrl`,
`dealRating`, `priceSavings`, `stockNumber`.

DealerCenter snapshot files (exported from `pka_hub.db` by the OAP pull, read by the
sync — `pka_hub.db` is unreachable from CI, hence the committed snapshots):
- `dc-photos.json` — VIN → DealerCenter CDN photo URLs (photos for cars CarGurus knows)
- `dc-inventory.json` — VIN → full DC record + VIN-decoded specs (adds new cars)
- `vin-trims.json` — VIN → cleaned trim fallback
- `inventory-meta.json` — `lastUpdated` heartbeat; the footer's `IUlive`/`IUverify` code

Other data files:
- `reviews.json` / `reviews_meta.json` — Google review content and aggregate rating
- `suburbs.json` — powers the `used-cars-[city]-il.astro` dynamic SEO pages
- `cargurus-vin-stats.json` / `cargurus-dealer-stats.json` — VDP view counts + dealer stats
- `faq.json` — FAQ page content

## Page & Component Structure

`src/layouts/Layout.astro` — the universal shell. Handles `<head>`, GA4 (pageview + `generate_lead` events), and the orange trust strip that appears on every page. Accepts named slots: `header`, `footer`, `structured-data`.

`src/components/Header.astro` — sticky nav with mobile menu. Nav links are defined as arrays (`primaryLinks`, `secondaryLinks`) at the top of the frontmatter.

`src/components/VehicleCard.astro` — inventory card used on the inventory page and homepage. Computes an estimated monthly payment inline (10% down, 9.9% APR, 60 months). Uses a stretched `<a>` link pattern with a `z-20` financing link layered on top.

`src/pages/vehicle/[slug].astro` — vehicle detail page. Has two separate slider-based payment calculators: mobile (prefix `m-fin-`) and desktop sidebar (prefix `sb-fin-`). The page reads vehicle price from `data-vehicle-price` on a DOM element.

## Design Tokens

Defined in `tailwind.config.mjs`:
- `navy` (#0a2540) — primary dark color
- `orange` (#f08010) — brand accent / CTAs
- `surface` (#f8f9fa) — page background
- `font-headline` — Manrope (bold headings)
- `font-body` — Inter (body text)

Icons: Google Material Symbols font (`material-symbols-outlined` class), not SVG. Use `style="font-variation-settings:'FILL' 1;"` for filled variants.

## SEO Pages

Suburb landing pages at `used-cars-[city]-il.astro` are generated from `suburbs.json`. Additional static SEO pages target specific makes (`used-toyota-skokie.astro`, etc.) and price brackets (`used-cars-under-10000-skokie.astro`). All pages include inline JSON-LD structured data via the `structured-data` slot.

Sold VDPs older than 14 days are excluded from the sitemap (see `astro.config.mjs` sitemap serializer) but the pages remain live with `noIndex: true` passed to Layout.

## Integrations

- **Live chat** — NOT installed. Tawk.to was never added (a GHL widget is present but commented out in Layout.astro). Layout.astro ships a defensive `Tawk_API.onChatStarted` hook that fires a `generate_lead` chat event if a Tawk widget is ever installed.
- **GA4** — Measurement ID `G-H05CD3EHE9`, loaded in every page `<head>` via Layout. Layout also fires `generate_lead` events (lead_channel: phone / sms / contact_form / financing_form / credit_app / sell_trade_form / form / chat).
- **Formspree** — pre-qual form endpoint on the financing and apply pages.
- **CarGurus** — deal ratings and VIN badge widget (`cg-vin-badge`) on VDPs.
