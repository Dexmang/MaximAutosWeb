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
> - **GBP is no longer frozen** (verified 2026-07-24, day-0 audit; support case 3-6365000041662 is moot and retired). New rule: **every GBP mutation needs Jerry's explicit per-change approval first**, capped at 2 touches/week in the cooling window (one per session, 48-72h apart). No badge-graphic images ever. See `businesses/maxim-autos/operations/compliance-guardrails.md` Part A and `businesses/maxim-autos/operations/google-local-domination-2026-07/design/SPEC.md`.
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
- `inventory-meta.json` — feed heartbeat. `lastUpdated` drives the footer's
  `IUlive`/`IUverify` flip; `recent` is a newest-first list of successful publishes
  (capped at 5) and the footer renders the top two as the last two feed updates.
  Written by `operations/pull_oap_sftp.py` on publish only, never by a no-op poll.

**Owner-excluded stock:** units whose stock number starts with **E** (e.g. E613770)
belong to Choni, not Maxim Autos, and must NEVER appear on the site or in the Google
feed — no card, no VDP (live or SOLD), no feed row. The single predicate lives in
`scripts/stock-rules.mjs` and is applied by BOTH `build-inventory.js` (drops them
from the DC set, purges strays from `vehicles.json`) and `build-gmc-feed.js`
(drops them from the parity book of record so a photo-less E-unit can't fail
`--strict` and freeze the sync). Owner's standing rule, 2026-08-31.

Other data files:
- `hold-vins.json` — "web hold" list. VINs here are OMITTED from `vehicles.json`
  entirely (no card, no SOLD VDP, absent from the Google feed) instead of being
  marked sold when they leave the DC feed. For DealerCenter "Inbound" units: the OAP
  feed has no status, so a pulled car looks identical to a sold one. The hold
  auto-releases when the VIN returns to the DC feed. Maintain with
  `operations/hold_unit.py`; full rationale in `operations/inventory-pipeline.md`.
- `sold-override.json` — owner-declared SOLD list, the bridge between a car selling and
  DealerCenter being updated that evening. `build_vehicles_json.py` subtracts these VINs
  from the active feed set, so the car drops out of `dc-inventory.json` and is soldified
  normally: off the grid, SOLD VDP kept for SEO, out of the Google feed. Entries prune
  themselves once the VIN really leaves the feed. Unlike `hold-vins.json` this keeps a
  SOLD page; unlike the retired `manual_sold` flag it works while the VIN is still in the
  feed, so use it ONLY for a sale Jerry has confirmed. Rationale:
  `operations/inventory-pipeline.md`.
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
- `icon-names.json` — GENERATED by `scripts/build-icons.mjs` in the prebuild: the Material Symbols glyphs the source and data use. `Layout.astro` passes them to Google Fonts as `icon_names`, so the icon font is a few tens of KB, not 1.14 MB. An icon that arrives through data is picked up by the build that first renders it; `node scripts/build-icons.mjs --check` after a build proves every rendered icon is in the list.
- `hours.json` — store hours for `OpenToday.astro` (the "open today" line on the vehicle page): the weekly table plus dated `special` entries (closed, custom hours, or `unconfirmed` for a holiday Jerry has not answered yet). The footer, the contact page and the LocalBusiness schema still type the weekly hours themselves; change all of them together, and the Google Business Profile with them.

## Page & Component Structure

`src/layouts/Layout.astro` — the universal shell. Handles `<head>`, GA4 (pageview + `generate_lead` events), and the orange trust strip that appears on every page. Accepts named slots: `header`, `footer`, `structured-data`.

`src/components/Header.astro` — sticky nav with mobile menu. Nav links are defined as arrays (`primaryLinks`, `secondaryLinks`) at the top of the frontmatter.

`src/components/ReviewRotator.astro` — rotating review card, rendered TWICE per homepage (desktop card absolutely positioned over the hero photo, plus a mobile card in the hero content flow — the desktop one can't just be unhidden because on mobile the photo is a clipped 176px strip). Because it renders more than once, everything is scoped via `data-*` on the card, never ids; one hoisted script self-wires every `[data-review-rotator]`. `lang` prop switches EN/ES copy. **Compliance: attribution is driven by each review's `source` — the Google logo + "Google Review" label render ONLY for `source === 'Google'`. Never hardcode a platform label, and never emit non-Google reviews as `Review` JSON-LD.**

`src/components/VehicleCard.astro` — inventory card used on the inventory page and homepage. Uses a stretched `<a>` link pattern. Since 2026-11-26: the photo box is 4:3, the shape of the photo, so the whole picture and its baked overlay show; the picture is a self hosted WebP at 400, 640 and 1024 px cut from the DealerCenter 1024/768 file (`src/lib/dc-image.ts`), with the CDN JPG list and `window.maximImgFallback` behind it; the CarGurus badge shows for Good and Great only, never Fair (same rule on the vehicle page); `headingTag` lets the inventory grid render the car name as an h2.

`src/components/OpenToday.astro` — one line in the vehicle page call ahead box: open now, opens later today, closed, by appointment, or holiday hours, computed in the visitor's browser in Chicago time from `hours.json`.

`src/components/TextJerryDialog.astro` — vehicle page only. On a device with a mouse, a click on any `sms:` link opens this dialog instead (the switch lives in Layout's click listener): the number, a build time QR code (`src/lib/qr-svg.ts`) that opens a text naming the car, and a question form posting to the contact Formspree endpoint with a subject starting `Vehicle Question:`. Phones are untouched.

`src/pages/vehicle/[slug].astro` — vehicle detail page. Has two separate slider-based payment calculators: mobile (prefix `m-fin-`) and desktop sidebar (prefix `sb-fin-`). The page reads vehicle price from `data-vehicle-price` on a DOM element.

Two layouts share one source (Jerry, 2026-11-26). **Desktop, lg and up:** header card, photo grid, two columns with the sidebar; unchanged apart from the 4:3 main photo. **Below lg:** photos first (the gallery section is shown ahead of the header card with CSS `order`, so the h1 stays first in the source), on phones as a swipe strip whose slides after the first load on approach; then name and price, the facts line with MPG, the estimate folded to its total (`OtdEstimate collapsible`, a `<details>` that opens in place), the cap line (`TrustPair vdp-cap`), the call ahead box, the features as chips (`VdpFeatures variant="chips"`), then specs and description, and `Price and payment` (fee chip, fee sentence, Google row, payment estimate with its Reg Z line, payment calculator) ahead of the FAQ. The vehicle price must stay the largest dollar figure on the page: 30 px in the header against 18 px for the folded total and 20 px open.

## Design Tokens

Defined in `tailwind.config.mjs`:
- `navy` (#0a2540) — primary dark color
- `orange` (#f08010) — brand accent / CTAs
- `surface` (#f8f9fa) — page background
- `font-headline` — Manrope (bold headings)
- `font-body` — Inter (body text)

Icons: Google Material Symbols font (`material-symbols-outlined` class), not SVG. Use `style="font-variation-settings:'FILL' 1;"` for filled variants. The font is subset to the glyphs in use (`icon-names.json`, above); a new icon needs nothing beyond using it in a template or in data.

`orange-ink` (#a85400) is the orange for TEXT on a light background; the brand `orange` is 2.69:1 on white. Brand orange stays for fills, icons, text on navy, the strip (white on orange, Jerry's call 2026-09-24) and the CARFAX "SHOW ME THE" lockup (Jerry, 2026-10-15).

## SEO Pages

Suburb landing pages at `used-cars-[city]-il.astro` are generated from `suburbs.json`. Additional static SEO pages target specific makes (`used-toyota-skokie.astro`, etc.) and price brackets (`used-cars-under-10000-skokie.astro`). All pages include inline JSON-LD structured data via the `structured-data` slot.

A sold VDP leaves the sitemap the day it sells (since 2026-11-26; it was a 14 day window that left noindex pages listed) and stays live with `noIndex: true` passed to Layout. `<lastmod>` is real, never the build time: a car page carries its newest `added` or `back_on_market` event from `url-events.jsonl` (else `dateAdded`), pages whose content is the inventory carry `inventory-meta.json`'s `lastUpdated`, and every other page carries none. See the sitemap block in `astro.config.mjs`.

## Integrations

- **Live chat** — NOT installed. Tawk.to was never added (a GHL widget is present but commented out in Layout.astro). Layout.astro ships a defensive `Tawk_API.onChatStarted` hook that fires a `generate_lead` chat event if a Tawk widget is ever installed.
- **GA4** — Measurement ID `G-H05CD3EHE9`, loaded in every page `<head>` via Layout. Layout also fires `generate_lead` events (lead_channel: phone / sms / contact_form / financing_form / credit_app / sell_trade_form / form / chat).
- **Formspree** — contact, financing prequalification, sell or trade, and the vehicle page question form. A script at the end of `Layout.astro` adds hidden context fields to every Formspree form: `form_page`, `lang`, and when known `car_viewed`, `car_viewed_stock`, `car_viewed_page`. The hub's lead ingest (`operations/ingest_lead_email.py`, source `website`) reads those names and the form subjects; change both or neither. GA4: the question form reports `generate_lead` with `lead_channel` `vehicle_question_form`; a desktop click on a text link on a vehicle page reports `cta_click` `text_dialog_open` instead of an sms lead.
- **CarGurus** — deal ratings and VIN badge widget (`cg-vin-badge`) on VDPs.
