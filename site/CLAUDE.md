# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ## ⚠️ COMPLIANCE HARD RULES — read before ANY change
> Anything touching maximautos.com, the Google Business Profile, or Maxim ad copy MUST follow
> **`businesses/maxim-autos/operations/compliance-guardrails.md`**. Non-negotiables:
> - **Never render a `VehicleCard` payment ("$X/mo est.") without the Reg Z footnote on that page**
>   (down payment + APR + term). Canonical text is in the guardrails doc §D3.
> - **Never imply guaranteed financing/approval.** Keep "all credit levels" conditional.
> - **Never call a car "certified"** (no CPO program). **Keep the all-in zero-doc-fee price.**
> - **No overpromise:** never "Total Protection"/"total/complete/full protection"/"guaranteed" (cars are AS-IS). Powertrain claims must always say **"qualifying"** — never "on every sale" or unqualified.
> - **NAP must match exactly:** Maxim Autos · 9101 Terminal Ave, Skokie, IL 60077 · (847) 510-8947 · lic. DL7667.
> - **GBP is frozen** (reinstated 7/14 but still UNVERIFIED — edits don't publish; support case 3-6365000041662 open): no profile edits/posts/photos until verification clears; no badge-graphic images ever.
> If a change would break a rule, STOP and flag it.

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
hand-edited. **DealerCenter is the single source of truth** (cars + price + photos +
copy): the committed `dc-inventory.json` snapshot of the latest OAP feed IS the
in-stock list. `scripts/build-inventory.js` writes `vehicles.json` from that snapshot;
CarGurus is only a VIN-keyed `dealRating`/`priceSavings` overlay (best-effort scrape)
and can never add or remove a car. Feed-absent = sold immediately (VDP kept for SEO),
guarded so a bad feed can't wipe the lot. Full pipeline:
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
- `hold-vins.json` — "web hold" list. VINs here are OMITTED from `vehicles.json`
  entirely (no card, no SOLD VDP, absent from the Google feed) instead of being
  marked sold when they leave the DC feed. For DealerCenter "Inbound" units: the OAP
  feed has no status, so a pulled car looks identical to a sold one. The hold
  auto-releases when the VIN returns to the DC feed. Maintain with
  `operations/hold_unit.py`; full rationale in `operations/inventory-pipeline.md`.
- `reviews.json` — on-page review content, MIXED platforms, newest first. Every entry needs a
  `source` (`"Google"`, `"Cars.com"`, ...) and a real `rating`; both drive rendering (see
  `ReviewRotator.astro`). Hero rotators take `slice(0, 6)`; the grids and testimonials show all.
  Hand-curated, not scraped — the scraper was retired 2026-05-25.
- `reviews_meta.json` — aggregate rating + count. **Must equal the LIVE Google figure**
  (guardrail A9/D2), Google-only regardless of what platforms `reviews.json` mixes in.
  Also mirrored in prose in `web_assets/llms.txt` — update both together.
- `suburbs.json` — powers the `used-cars-[city]-il.astro` dynamic SEO pages
- `cargurus-vin-stats.json` / `cargurus-dealer-stats.json` — VDP view counts + dealer stats
- `faq.json` — FAQ page content

## Page & Component Structure

`src/layouts/Layout.astro` — the universal shell. Handles `<head>`, GA4 (pageview + `generate_lead` events), and the orange trust strip that appears on every page. Accepts named slots: `header`, `footer`, `structured-data`.

`src/components/Header.astro` — sticky nav with mobile menu. Nav links are defined as arrays (`primaryLinks`, `secondaryLinks`) at the top of the frontmatter.

`src/components/ReviewRotator.astro` — rotating review card, rendered TWICE per homepage (desktop card absolutely positioned over the hero photo, plus a mobile card in the hero content flow — the desktop one can't just be unhidden because on mobile the photo is a clipped 176px strip). Because it renders more than once, everything is scoped via `data-*` on the card, never ids; one hoisted script self-wires every `[data-review-rotator]`. `lang` prop switches EN/ES copy. **Compliance: attribution is driven by each review's `source` — the Google logo + "Google Review" label render ONLY for `source === 'Google'`. Never hardcode a platform label, and never emit non-Google reviews as `Review` JSON-LD.**

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
