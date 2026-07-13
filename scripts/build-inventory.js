#!/usr/bin/env node
/**
 * build-inventory.js  —  DealerCenter feed is the single source of truth.
 *
 * This replaces sync-from-cargurus.js. The old builder SCRAPED CarGurus to decide
 * which cars were in stock, then overlaid DealerCenter data. That was backwards:
 * CarGurus is fed FROM DealerCenter, so the scrape was reading our own inventory
 * second-hand, laggy and fragile (an HTML change could blank the lot; sold
 * detection was a multi-hour "fell off the scrape" tolerance hack).
 *
 * NEW MODEL:
 *   - dc-inventory.json (the committed snapshot of the DealerCenter OAP feed that
 *     landed in our SFTP box) IS the inventory. Every VIN in it is on the site;
 *     every VIN absent from it is off the site. No CarGurus vote on the list.
 *   - CarGurus is a VIN-KEYED OVERLAY ONLY: the "Great/Good/Fair Deal" rating +
 *     "$X below market" savings. It attaches when the VIN matches and can NEVER
 *     add or remove a car. Fetched best-effort; if the scrape fails, the site
 *     still builds from DC (the badge just holds its last value).
 *     [CarGurus VDP view stats are a separate overlay the VDP page already reads
 *      straight from cargurus-vin-stats.json — untouched here.]
 *   - Feed-absent = off immediately (no tolerance window). A sold car keeps its
 *     VDP as a SOLD page (200 OK) for SEO; the inventory grid drops it at once.
 *   - SAFETY GUARD: a suspiciously empty/partial feed (count 0, or a drop past
 *     FEED_GUARD_RATIO of the prior live count) ABORTS the write and keeps the
 *     last good vehicles.json, so one bad pull can never wipe the lot. --force
 *     overrides.
 *
 * Everything downstream is preserved verbatim from the old builder: slug/URL
 * stability, the retired-slug 301 ledger + vercel.json redirects, the
 * url-events.jsonl feed for the post-deploy IndexNow ping, the web-hold list,
 * the DealerCenter photo records, and the Illinois powertrain "qualifying"
 * compliance sanitizer.
 *
 * Usage:
 *   node scripts/build-inventory.js            # writes vehicles.json + ledger/redirects
 *   node scripts/build-inventory.js --dry-run  # prints diff, no writes
 *   node scripts/build-inventory.js --force    # bypass the feed safety guard
 *   node scripts/build-inventory.js --no-cargurus  # skip the rating scrape entirely
 */

import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARGURUS_URL = 'https://www.cargurus.com/Cars/m-Maxim-Autos-sp457703';
const VEHICLES_JSON = resolve(__dirname, '../site/src/data/vehicles.json');
const DC_INVENTORY_PATH = resolve(__dirname, '../site/src/data/dc-inventory.json');
const URL_EVENTS_PATH = resolve(__dirname, '../site/src/data/url-events.jsonl');
const RETIRED_SLUGS_PATH = resolve(__dirname, '../site/src/data/retired-slugs.json');
const VERCEL_JSON_PATH = resolve(__dirname, '../vercel.json');
const HOLD_VINS_PATH = resolve(__dirname, '../site/src/data/hold-vins.json');
const SITE_HOST = 'www.maximautos.com';
const SITE_ORIGIN = `https://${SITE_HOST}`;

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const NO_CARGURUS = process.argv.includes('--no-cargurus');
const DEBUG = process.argv.includes('--debug');

// Refuse a feed that would drop the live count below this fraction of the prior
// live count (0.5 = never accept fewer than half of what we had). A drop past it
// smells like a truncated/empty feed pull, not real sales. Tunable via env.
const FEED_GUARD_RATIO = Number(process.env.FEED_GUARD_RATIO || 0.5);

// ── URL event log (feeds the post-deploy IndexNow ping) ─────────────────────────

function appendEvent({ event, vin, slug, url }) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, vin, slug, url }) + '\n';
  appendFileSync(URL_EVENTS_PATH, line, 'utf8');
}

// Canonical VDP URL — no trailing slash (matches trailingSlash:'never', canonical
// link and the JSON-LD Offer.url / Vehicle.url).
function vdpUrl(slug) {
  return `${SITE_ORIGIN}/vehicle/${slug}`;
}

// ── Retired-slug ledger + redirect regeneration ─────────────────────────────────
// Every slug whose VDP is no longer built (VIN dropped from vehicles.json, e.g.
// web-held or pruned, or the slug changed) is recorded permanently so the old URL
// 301s instead of soft-404ing:  removed VIN → /inventory ; slug change → new VDP.
// astro.config.mjs consumes the ledger at build; syncVercelRedirects mirrors it
// into vercel.json (real 301s in production). A slug that comes back into service
// is un-retired so a redirect can never shadow a live page.

function updateRetiredSlugs(before, after) {
  let data;
  try {
    data = JSON.parse(readFileSync(RETIRED_SLUGS_PATH, 'utf8'));
  } catch (_) {
    data = {
      note: 'Ledger of VDP slugs that were built once but are no longer in vehicles.json. Maintained by scripts/build-inventory.js — do not hand-edit casually. astro.config.mjs and vercel.json generate 301 redirects from it.',
      retired: {},
    };
  }
  if (!data.retired || typeof data.retired !== 'object') data.retired = {};

  const liveSlugs = new Set(after.map(v => v.slug));
  const afterByVin = new Map(after.filter(v => v.vin && v.vin !== 'TBD').map(v => [v.vin, v]));
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;

  for (const old of before) {
    if (!old.slug || liveSlugs.has(old.slug)) continue;   // still built → nothing to do
    const nv = afterByVin.get(old.vin);
    const redirectTo = nv ? `/vehicle/${nv.slug}` : '/inventory';
    const cur = data.retired[old.slug];
    if (!cur || cur.redirect_to !== redirectTo) {
      data.retired[old.slug] = {
        vin: old.vin || '',
        stockNumber: old.stockNumber || '',
        retired_at: cur?.retired_at || today,
        redirect_to: redirectTo,
      };
      changed = true;
      console.log(`  Retired slug: /vehicle/${old.slug} → ${redirectTo}`);
    }
  }

  // Un-retire any slug being built again (re-listed / slug reused).
  for (const slug of Object.keys(data.retired)) {
    if (liveSlugs.has(slug)) {
      delete data.retired[slug];
      changed = true;
      console.log(`  Un-retired slug (back in service): /vehicle/${slug}`);
    }
  }

  if (changed) {
    writeFileSync(RETIRED_SLUGS_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`  Wrote ${Object.keys(data.retired).length} retired slug(s) to retired-slugs.json`);
  }
  return data.retired;
}

function syncVercelRedirects(retired, after) {
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(VERCEL_JSON_PATH, 'utf8'));
  } catch (e) {
    console.warn(`  vercel.json unreadable — skipping redirect regeneration: ${e.message}`);
    return;
  }
  if (!Array.isArray(cfg.redirects)) cfg.redirects = [];
  const liveSlugs = new Set(after.map(v => v.slug));
  let changed = false;

  const beforeLen = cfg.redirects.length;
  cfg.redirects = cfg.redirects.filter(r => {
    const m = /^\/vehicle\/([^/]+?)\/?$/.exec(r.source || '');
    if (m && liveSlugs.has(m[1])) {
      console.log(`  vercel.json: removed redirect shadowing live page ${r.source}`);
      return false;
    }
    return true;
  });
  if (cfg.redirects.length !== beforeLen) changed = true;

  for (const [slug, info] of Object.entries(retired)) {
    for (const source of [`/vehicle/${slug}`, `/vehicle/${slug}/`]) {
      const entry = cfg.redirects.find(r => r.source === source);
      if (!entry) {
        cfg.redirects.push({ source, destination: info.redirect_to, permanent: true });
        changed = true;
      } else if (entry.destination !== info.redirect_to || entry.permanent !== true) {
        entry.destination = info.redirect_to;
        entry.permanent = true;
        changed = true;
      }
    }
  }

  if (changed) {
    writeFileSync(VERCEL_JSON_PATH, JSON.stringify(cfg, null, 2) + '\n');
    console.log('  vercel.json redirects updated from retired-slug ledger.');
  } else {
    console.log('  vercel.json redirects already in sync.');
  }
}

// ── string helpers ──────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// New-vehicle slug format (since 2026-07-04): {year}-{make}-{model}-{trim}-{stock}.
// Existing slugs are never regenerated (existing?.slug wins) so published URLs stay frozen.
function generateVehicleSlug(year, make, model, trim, stockNumber) {
  return slugify([year, make, model, trim, stockNumber].filter(Boolean).join('-'));
}

// ── Illinois powertrain "qualifying" compliance sanitizer ───────────────────────
// 815 ILCS 505/2L exempts high-mileage / rebuilt / heavy / antique units, so the
// statutory powertrain protection must always be stated as applying to QUALIFYING
// vehicles. DealerCenter ad copy that omits the qualifier is corrected here so it
// can never reach a live VDP unqualified. Mirrors the rule in compliance-guardrails.md.
function sanitizeDescription(text) {
  return String(text || '').replace(
    /Illinois powertrain protection(?! on qualifying)/g,
    'Illinois powertrain protection on qualifying vehicles'
  );
}

// ── Web hold list (DealerCenter "Inbound" / off-web units) ──────────────────────
// The OAP feed carries no status column, so a unit Jerry sets to Inbound (in recon,
// not for sale yet) just drops out of the feed — indistinguishable from a sold car,
// which would otherwise be soldified below. Any VIN in hold-vins.json is instead
// hidden QUIETLY: omitted from vehicles.json entirely (no card, no SOLD VDP, absent
// from the Google feed). A hold is honored ONLY while the VIN is out of the DC feed;
// the moment it returns to dc-inventory.json (front-lined again) it reappears on its
// own, so a stale hold entry can never permanently hide a relisted car. Maintained
// by operations/hold_unit.py.
function loadHoldVins() {
  try {
    const raw = JSON.parse(readFileSync(HOLD_VINS_PATH, 'utf8'));
    const vins = Array.isArray(raw?.vins) ? raw.vins : Object.keys(raw?.by_vin || {});
    return new Set(vins.map(v => String(v).toUpperCase()));
  } catch (_) {
    return new Set();
  }
}

// ── CarGurus rating overlay (VIN-keyed, best-effort, never decides the list) ─────
// Fetches the dealer page and extracts ONLY the proprietary badge fields per VIN:
// dealRating (GREAT_PRICE/GOOD_PRICE/FAIR_PRICE) and priceSavings ($ below market).
// A failure — HTML change, network, CarGurus down — returns an empty map and the
// site still builds from DealerCenter with each car's last-known rating.

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

// Bracket-match the "tiles":[ ... ] JSON array CarGurus embeds in its HTML.
function extractTilesFromHtml(html) {
  const marker = '"tiles":[';
  const start = html.indexOf(marker);
  if (start < 0) return null;
  let pos = start + marker.length - 1;
  let depth = 0, inString = false, escape = false;
  const arrayStart = pos;
  for (; pos < html.length; pos++) {
    const ch = html[pos];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.substring(arrayStart, pos + 1)); }
        catch (e) { throw new Error(`Failed to parse tiles JSON: ${e.message}`); }
      }
    }
  }
  throw new Error('"tiles" array not properly closed in HTML');
}

async function buildCargurusRatingOverlay() {
  if (NO_CARGURUS) {
    console.log('CarGurus overlay skipped (--no-cargurus). Ratings hold their last values.');
    return {};
  }
  try {
    console.log(`\nCarGurus rating overlay — fetching ${CARGURUS_URL}`);
    const html = await fetchHtml(CARGURUS_URL);
    const tiles = extractTilesFromHtml(html);
    if (!tiles) throw new Error('no "tiles" array in HTML (page structure changed?)');
    const overlay = {};
    for (const t of tiles) {
      if (t.type !== 'LISTING_USED_STANDARD' || !t.data) continue;
      const n = t.data;
      const vin = (n.vin || '').toUpperCase();
      if (!vin) continue;
      // Only trust a live price row — a null current price means CarGurus is mid-edit
      // and its rating/savings are unreliable this pass; skip so the DC-carried value holds.
      if (n.priceData?.current == null) continue;
      if (overlay[vin]) continue; // first tile per VIN wins (spotlight + standard dupes)
      overlay[vin] = {
        dealRating: n.dealRating || '',
        priceSavings: n.priceData?.differential ?? 0,
      };
    }
    console.log(`  Got ratings for ${Object.keys(overlay).length} VIN(s).`);
    return overlay;
  } catch (e) {
    console.warn(`  CarGurus overlay unavailable (${e.message}). Building from DealerCenter with last-known ratings.`);
    return {};
  }
}

// ── diff summary + URL event classification (verbatim behavior from old builder) ──

function classifyAndReport(before, after, { emit = true } = {}) {
  const beforeByVin = new Map(before.map(v => [v.vin, v]));
  const afterByVin = new Map(after.map(v => [v.vin, v]));

  const added = after.filter(v => !beforeByVin.has(v.vin));
  const removed = before.filter(v => v.vin && !afterByVin.has(v.vin));

  const markedSold = after.filter(v => {
    const old = beforeByVin.get(v.vin);
    return old && old.status !== 'sold' && v.status === 'sold';
  });
  const backOnMarket = after.filter(v => {
    const old = beforeByVin.get(v.vin);
    if (!old) return false;
    return (old.status === 'sold' || !!old.missing_since) && v.status === 'available' && !v.missing_since;
  });
  const slugChanged = after
    .map(v => {
      const old = beforeByVin.get(v.vin);
      if (!old || !old.slug || old.slug === v.slug) return null;
      return { v, oldSlug: old.slug };
    })
    .filter(Boolean);
  const updated = after.filter(v => {
    const old = beforeByVin.get(v.vin);
    if (!old || v.status === 'sold') return false;
    return old.price !== v.price || old.mileage !== v.mileage || old.dealRating !== v.dealRating;
  });

  if (added.length) {
    console.log('\nAdded:');
    added.forEach(v => console.log(`  + ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}]`));
  }
  if (backOnMarket.length) {
    console.log('\nBack on market (re-listed):');
    backOnMarket.forEach(v => console.log(`  ↺ ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] → available`));
  }
  if (slugChanged.length) {
    console.log('\nSlug changed (will ping both URLs):');
    slugChanged.forEach(({ v, oldSlug }) => console.log(`  ⇄ [${v.vin}] ${oldSlug} → ${v.slug}`));
  }
  if (markedSold.length) {
    console.log('\nMarked sold (gone from DC feed — VDP kept as SOLD for SEO):');
    markedSold.forEach(v => console.log(`  ~ ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] → sold ${v.sold_date}`));
  }
  if (removed.length) {
    console.log('\nRemoved from vehicles.json (VDP no longer built — slug 301s):');
    removed.forEach(v => console.log(`  ✕ ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] slug=${v.slug}`));
  }
  if (updated.length) {
    console.log('\nUpdated (price / mileage / rating):');
    updated.forEach(v => {
      const old = beforeByVin.get(v.vin);
      const c = [];
      if (old.price !== v.price) c.push(`price $${old.price.toLocaleString()} → $${v.price.toLocaleString()}`);
      if (old.mileage !== v.mileage) c.push(`mileage ${old.mileage.toLocaleString()} → ${v.mileage.toLocaleString()}`);
      if (old.dealRating !== v.dealRating) c.push(`rating ${old.dealRating || '—'} → ${v.dealRating || '—'}`);
      console.log(`  ~ ${v.year} ${v.make} ${v.model}: ${c.join(', ')}`);
    });
  }
  if (!added.length && !backOnMarket.length && !markedSold.length && !updated.length && !slugChanged.length && !removed.length) {
    console.log('\nNo changes.');
  }

  const urlSet = new Set();
  const fire = (event, vin, slug, url) => { if (emit) appendEvent({ event, vin, slug, url }); urlSet.add(url); };
  for (const v of added) fire('added', v.vin, v.slug, vdpUrl(v.slug));
  for (const v of markedSold) fire('sold', v.vin, v.slug, vdpUrl(v.slug));
  for (const v of removed) fire('removed', v.vin, v.slug, vdpUrl(v.slug));
  for (const v of backOnMarket) fire('back_on_market', v.vin, v.slug, vdpUrl(v.slug));
  for (const { v, oldSlug } of slugChanged) {
    fire('slug_changed_old', v.vin, oldSlug, vdpUrl(oldSlug));
    fire('slug_changed_new', v.vin, v.slug, vdpUrl(v.slug));
  }
  return { urls: [...urlSet] };
}

// Guarantee slug uniqueness across the written set. Two same-trim units generate the
// same slug; getStaticPaths would emit duplicate routes and the build would fail.
// Keep the slug for any VIN that already owned it (URL stability) and disambiguate
// the rest with the stock number, then a numeric counter. Every change is logged.
function ensureUniqueSlugs(vehicles, existingByVin) {
  const taken = new Set();
  for (const v of vehicles) {
    const prior = existingByVin[v.vin];
    if (prior?.slug && prior.slug === v.slug) taken.add(v.slug);
  }
  for (const v of vehicles) {
    const prior = existingByVin[v.vin];
    if (prior?.slug && prior.slug === v.slug) continue;
    if (!taken.has(v.slug)) { taken.add(v.slug); continue; }
    let tag = slugify(v.stockNumber || (v.vin && v.vin !== 'TBD' ? v.vin.slice(-6) : '')) || 'x';
    if (tag !== 'x' && v.slug.endsWith(`-${tag}`)) {
      tag = (v.vin && v.vin !== 'TBD' ? slugify(v.vin.slice(-6)) : '') || 'x';
    }
    let next = `${v.slug}-${tag}`, n = 2;
    while (taken.has(next)) next = `${v.slug}-${tag}-${n++}`;
    console.log(`  Slug de-dupe: ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] "${v.slug}" -> "${next}"`);
    v.slug = next;
    v.photoPrefix = v.photoPrefix || next;
    taken.add(next);
  }
  return vehicles;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Existing site file — for URL/SEO stability + rating fallback + the diff.
  let existing = [];
  try {
    existing = JSON.parse(readFileSync(VEHICLES_JSON, 'utf8'));
    console.log(`Loaded ${existing.length} existing vehicles from vehicles.json`);
  } catch (_) {
    console.warn('vehicles.json not found or unreadable — starting fresh.');
  }
  const existingByVin = Object.fromEntries(
    existing.filter(v => v.vin && v.vin !== 'TBD').map(v => [v.vin, v])
  );

  // The DealerCenter feed snapshot — THE source of truth for what's in stock.
  let dcByVin = {};
  try {
    dcByVin = JSON.parse(readFileSync(DC_INVENTORY_PATH, 'utf8'))?.by_vin || {};
  } catch (e) {
    console.error(`\nFATAL: dc-inventory.json unreadable (${e.message}). Cannot build inventory without the DC feed.`);
    process.exit(1);
  }
  // Normalize keys to uppercase VIN.
  dcByVin = Object.fromEntries(Object.entries(dcByVin).map(([k, v]) => [k.toUpperCase(), v]));
  const dcVins = new Set(Object.keys(dcByVin));
  const HOLD_VINS = loadHoldVins();
  const isHeld = (vin) => HOLD_VINS.has((vin || '').toUpperCase()) && !dcVins.has((vin || '').toUpperCase());

  // ── SAFETY GUARD ──────────────────────────────────────────────────────────────
  // One truncated/empty feed pull must never wipe the lot. Compare the incoming
  // active count to the prior live (non-sold, non-held) count.
  const prevAvailable = existing.filter(v => v.status !== 'sold' && !isHeld(v.vin)).length;
  const dcCount = dcVins.size;
  const floor = Math.floor(prevAvailable * FEED_GUARD_RATIO);
  const guardTripped =
    (prevAvailable > 0 && dcCount === 0) ||
    (prevAvailable >= 4 && dcCount < floor);
  if (guardTripped && !FORCE) {
    console.error('\n' + '='.repeat(72));
    console.error('FEED SAFETY GUARD TRIPPED — refusing to write.');
    console.error(`  Prior live count: ${prevAvailable}`);
    console.error(`  DC feed count now: ${dcCount}  (floor at ratio ${FEED_GUARD_RATIO} = ${floor})`);
    console.error('  This looks like a truncated or empty DC feed, not real sales.');
    console.error('  vehicles.json was NOT changed. Investigate the OAP pull / dc-inventory.json.');
    console.error('  If this drop is real, re-run with --force.');
    console.error('='.repeat(72));
    process.exit(2);
  }
  if (guardTripped && FORCE) {
    console.warn(`\nFeed guard tripped (prev ${prevAvailable} → now ${dcCount}) but --force set; proceeding.`);
  }

  // CarGurus rating overlay (VIN-keyed, best-effort).
  const cgOverlay = await buildCargurusRatingOverlay();

  // ── Build the active set straight from the DC feed ──────────────────────────────
  const active = [];
  for (const [vin, rec] of Object.entries(dcByVin)) {
    const ex = existingByVin[vin];

    // Manual sold override: a human marked this VIN sold; honor it even though the
    // feed still shows it (rare; clears only by removing manual_sold from vehicles.json).
    if (ex?.manual_sold) {
      active.push({ ...ex, manual_sold: true });
      continue;
    }

    // Start from the DC record (authoritative: price, mileage, photos, specs, copy).
    const out = { ...rec, vin };

    // URL / SEO / manual fields survive from the existing record.
    if (ex) {
      out.slug = ex.slug || rec.slug;
      out.dateAdded = ex.dateAdded || rec.dateAdded;
      out.sortOrder = ex.sortOrder ?? rec.sortOrder ?? 0;
      out.featured = ex.featured ?? rec.featured ?? true;
      out.dealerCenterUrl = ex.dealerCenterUrl || rec.dealerCenterUrl || '';
      out.photoPrefix = ex.photoPrefix || rec.photoPrefix;
      if (ex.highlights?.length) out.highlights = ex.highlights;
      if (ex.features?.length && !(rec.features?.length)) out.features = ex.features;
    }

    // Deal badge: freshest CarGurus scrape → DC-carried value → prior value → none.
    const ov = cgOverlay[vin];
    out.dealRating = ov?.dealRating || rec.dealRating || ex?.dealRating || '';
    out.priceSavings = ov ? (ov.priceSavings ?? 0) : (rec.priceSavings ?? ex?.priceSavings ?? 0);

    // Compliance sanitizer on the ad copy.
    out.description = sanitizeDescription(rec.description || ex?.description || '');

    // In the feed ⇒ live. Clear any stale off-market/sold flags.
    out.status = 'available';
    delete out.missing_since;
    delete out.sold_date;

    active.push(out);
  }

  // ── Removed cars: existing VINs absent from the DC feed ──────────────────────────
  // Feed-absent = off the site immediately (no tolerance window). Keep the record as a
  // SOLD VDP (200 OK) for SEO; the inventory grid filters sold out, so the card is gone
  // at once. Held units are skipped here — the web-hold omits them entirely below.
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const sold = [];
  for (const ex of existing) {
    if (!ex.vin || ex.vin === 'TBD') continue;
    if (dcVins.has(ex.vin.toUpperCase())) continue; // still in feed → handled above
    if (isHeld(ex.vin)) continue;                    // web-held → omit, never soldify
    if (ex.status === 'sold') { sold.push(ex); continue; } // already sold → preserve for SEO
    sold.push({ ...ex, status: 'sold', sold_date: today, missing_since: ex.missing_since || nowIso });
  }

  const vehicles = [...active, ...sold];

  // Web hold: drop held (Inbound / off-web) units before classify + write, so they are
  // simply absent — never soldified, never emitting a "sold" URL event. They return on
  // their own once back in the DC feed (isHeld auto-releases).
  const heldNow = vehicles.filter(v => isHeld(v.vin));
  if (heldNow.length) {
    console.log(`\nWeb hold — hiding ${heldNow.length} inbound/off-web unit(s) (omitted, NOT sold):`);
    heldNow.forEach(v => console.log(`  ⊘ ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] stock ${v.stockNumber || '—'}`));
  }
  const visible = vehicles.filter(v => !isHeld(v.vin));

  // Guarantee unique slugs so two same-trim units never collide on the VDP route.
  ensureUniqueSlugs(visible, existingByVin);

  console.log(`\nInventory: ${active.length} live (from DC feed), ${sold.length} sold/retained, ${heldNow.length} held.`);
  visible.filter(v => v.status !== 'sold').forEach(v =>
    console.log(`  • ${v.year} ${v.make} ${v.model} ${v.trim} — $${(v.price || 0).toLocaleString()} — ${(v.mileage || 0).toLocaleString()} mi — ${v.dealRating || 'no rating'} — ${v.photoUrls?.length ?? 0} photos`)
  );

  // Diff + URL event classification (events appended unless dry-run).
  const { urls } = classifyAndReport(existing, visible, { emit: !DRY_RUN });

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] vehicles.json not written. Would emit ${urls.length} URL event(s).`);
    return;
  }

  writeFileSync(VEHICLES_JSON, JSON.stringify(visible, null, 2) + '\n');
  console.log(`\nWrote ${visible.length} vehicles to:\n  ${VEHICLES_JSON}`);

  console.log('\nRetired-slug ledger...');
  const retired = updateRetiredSlugs(existing, visible);
  syncVercelRedirects(retired, visible);

  if (urls.length === 0) {
    console.log('\nIndexNow: no URL transitions this cycle.');
  } else {
    console.log(`\nIndexNow: ${urls.length} changed URL(s) logged for the post-deploy ping:`);
    urls.forEach(u => console.log(`  → ${u}`));
  }
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
