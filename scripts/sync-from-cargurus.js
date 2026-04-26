#!/usr/bin/env node
/**
 * sync-from-cargurus.js
 *
 * Fetches the live Maxim Autos inventory from CarGurus and updates
 * site/src/data/vehicles.json.
 *
 * Merge rules (CarGurus is the source of truth for live/sold):
 *   - CarGurus is source of truth for: which cars exist, price, mileage, dealRating
 *   - Description is always regenerated from current data (stays fresh with price/mileage)
 *   - Existing vehicles.json data is preserved for: photos (DealerCenter CDN),
 *     features, highlights, stockNumber, dealerCenterUrl, slug
 *   - VIN re-appears in feed → status auto-flips to "available", missing_since
 *     and sold_date are deleted. Cars can come back from off-market.
 *   - VIN missing from feed → tolerance window before declaring sold. First miss
 *     stamps missing_since (status stays "available", site renders normally).
 *     Once a VIN has been missing ≥ OFF_MARKET_TOLERANCE_HOURS (default 24h),
 *     status flips to "sold" and sold_date is stamped. missing_since is kept
 *     for analytics ("how long off-market before flagged sold").
 *   - Sold VDPs render with a SOLD treatment so Google sees a 200 OK with
 *     rich content instead of a 404 (see site/src/pages/vehicle/[slug].astro).
 *   - New cars get auto-generated highlights
 *
 * Side effects (each sync run, in order):
 *   1. Writes site/src/data/vehicles.json
 *   2. Appends one line per URL transition to site/src/data/url-events.jsonl
 *      (events: added / sold / back_on_market / slug_changed_old / _new)
 *   3. POSTs the deduped URL list to IndexNow (Bing, Yandex, Seznam, Naver,
 *      ChatGPT-via-Bing). Failures retry once after 5s; never throw.
 *
 * Usage:
 *   node scripts/sync-from-cargurus.js           # writes vehicles.json + pings
 *   node scripts/sync-from-cargurus.js --dry-run  # prints diff, no write, no ping
 *   node scripts/sync-from-cargurus.js --debug    # dumps raw JSON-LD blocks
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARGURUS_URL = 'https://www.cargurus.com/Cars/m-Maxim-Autos-sp457703';
const VEHICLES_JSON = resolve(__dirname, '../site/src/data/vehicles.json');
const URL_EVENTS_PATH = resolve(__dirname, '../site/src/data/url-events.jsonl');
const INDEXNOW_KEY_PATH = resolve(__dirname, '../.indexnow-key');
const SITE_HOST = 'www.maximautos.com';
const SITE_ORIGIN = `https://${SITE_HOST}`;
const DRY_RUN = process.argv.includes('--dry-run');
const DEBUG = process.argv.includes('--debug');

// Tolerance: a VIN must be missing from the CarGurus feed for at least this
// many hours before status flips to "sold". Sync runs every 6h, so 24h ≈ 4
// consecutive misses. Tunable via env if Jerry wants to widen/narrow.
const OFF_MARKET_TOLERANCE_HOURS = Number(process.env.OFF_MARKET_TOLERANCE_HOURS || 24);

// ── URL event log + IndexNow ──────────────────────────────────────────────────

/**
 * Append one transition event to url-events.jsonl. Append-only; never rewrite.
 * Each line is a single JSON object so the file stays git-friendly and crash-safe.
 */
function appendEvent({ event, vin, slug, url }) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    vin,
    slug,
    url,
  }) + '\n';
  appendFileSync(URL_EVENTS_PATH, line, 'utf8');
}

function vdpUrl(slug) {
  return `${SITE_ORIGIN}/vehicle/${slug}/`;
}

function loadIndexNowKey() {
  try {
    return readFileSync(INDEXNOW_KEY_PATH, 'utf8').trim();
  } catch (_) {
    return '';
  }
}

/**
 * Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver — and ChatGPT
 * web-search via Bing's index). One POST per sync; deduped; capped at 10000
 * per spec. Returns { ok, status, body } for the log. Failures don't throw.
 */
async function submitToIndexNow(urls) {
  if (urls.length === 0) return { ok: true, status: 0, body: 'no urls' };
  const key = loadIndexNowKey();
  if (!key) {
    console.warn('  IndexNow: .indexnow-key not found, skipping ping.');
    return { ok: false, status: 0, body: 'missing key' };
  }
  const body = JSON.stringify({
    host: SITE_HOST,
    key,
    keyLocation: `${SITE_ORIGIN}/${key}.txt`,
    urlList: urls.slice(0, 10000),
  });

  async function attempt() {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text };
  }

  let result;
  try {
    result = await attempt();
    if (!result.ok) {
      console.warn(`  IndexNow attempt 1 failed: ${result.status} ${result.body}. Retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      result = await attempt();
    }
  } catch (e) {
    console.warn(`  IndexNow network error: ${e.message}. Retrying in 5s...`);
    await new Promise(r => setTimeout(r, 5000));
    try {
      result = await attempt();
    } catch (e2) {
      result = { ok: false, status: 0, body: `network: ${e2.message}` };
    }
  }
  return result;
}

// ── string helpers ────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const BODY_STYLE_SLUG = {
  'suv': 'suvs', 'suvs': 'suvs', 'crossover': 'suvs',
  'sedan': 'sedans', 'sedans': 'sedans',
  'coupe': 'coupes', 'coupes': 'coupes',
  'truck': 'trucks', 'trucks': 'trucks', 'pickup': 'trucks', 'pickup truck': 'trucks',
  'van': 'vans', 'vans': 'vans', 'minivan': 'vans',
  'wagon': 'wagons', 'wagons': 'wagons',
  'convertible': 'convertibles',
  'hatchback': 'hatchbacks',
};

function toBodyStyleSlug(bs) {
  const key = (bs || '').toLowerCase().split('/')[0].trim();
  return BODY_STYLE_SLUG[key] || slugify(bs || 'other');
}

function normalizeBodyStyle(raw) {
  if (!raw) return 'Other';
  const lower = raw.toLowerCase();
  if (lower.includes('suv') || lower.includes('crossover')) return 'SUV';
  if (lower.includes('pickup') || lower.includes('truck')) return 'Truck';
  if (lower.includes('minivan') || lower.includes('van')) return 'Van';
  if (lower.includes('wagon')) return 'Wagon';
  if (lower.includes('convertible')) return 'Convertible';
  if (lower.includes('hatchback')) return 'Hatchback';
  if (lower.includes('coupe')) return 'Coupe';
  if (lower.includes('sedan')) return 'Sedan';
  return raw.split('/')[0].trim();
}

function normalizeDrivetrain(raw) {
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower.includes('all-wheel') || lower.includes('awd') || lower.includes('all wheel')) return 'AWD';
  if (lower.includes('four-wheel') || lower.includes('4wd') || lower.includes('4x4')) return '4WD';
  if (lower.includes('front') || lower.includes('fwd')) return 'FWD';
  if (lower.includes('rear') || lower.includes('rwd')) return 'RWD';
  return raw;
}

function normalizeTransmission(raw) {
  if (!raw) return 'Automatic';
  const lower = raw.toLowerCase();
  if (lower.includes('manual') || lower.includes('stick')) return 'Manual';
  if (lower.includes('cvt') || lower.includes('continuously variable')) return 'CVT';
  return 'Automatic';
}

function generateVehicleSlug(year, make, model, trim) {
  return slugify([year, make, model, trim].filter(Boolean).join('-'));
}

function generateHighlights(year, make, model, trim, mileage) {
  const h = [];
  if (trim) h.push(`${trim} trim`);
  if (mileage) h.push(`${Number(mileage).toLocaleString()} miles`);
  h.push('Fully inspected, 3-Month Warranty');
  return h.slice(0, 3);
}

function generateDescription(year, make, model, trim, mileage) {
  const miStr = mileage ? `${Number(mileage).toLocaleString()} miles` : 'low miles';
  const trimStr = trim ? ` ${trim}` : '';
  return `${year} ${make} ${model}${trimStr} with ${miStr}. Fully inspected, 3-Month Warranty. Same-day metal plates. Financing available. Located at Maxim Autos in Skokie, IL.`;
}

// ── fetch + parse ─────────────────────────────────────────────────────────────

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

/**
 * Extract the "tiles" array embedded in CarGurus HTML.
 * CarGurus embeds all listing data as a large JSON blob — the relevant part is:
 *   ..."tiles":[{"type":"LISTING_USED_STANDARD","data":{...}},...]...
 * We bracket-match to extract the full array without a full JSON parser.
 */
function extractTilesFromHtml(html) {
  const marker = '"tiles":[';
  const start = html.indexOf(marker);
  if (start < 0) return null;

  // Start of the array (the '[')
  let pos = start + marker.length - 1;
  let depth = 0;
  let inString = false;
  let escape = false;
  let arrayStart = pos;

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
        const json = html.substring(arrayStart, pos + 1);
        try {
          return JSON.parse(json);
        } catch (e) {
          throw new Error(`Failed to parse tiles JSON: ${e.message}`);
        }
      }
    }
  }
  throw new Error('"tiles" array not properly closed in HTML');
}

function extractVehicleNodes(tiles) {
  return tiles
    .filter(t => t.type === 'LISTING_USED_STANDARD' && t.data)
    .map(t => ({ node: t.data, offer: null }));
}

/**
 * Extract the dealer/seller description from a CarGurus detail page.
 * The description is embedded as the first non-null "description" JSON field on the page.
 */
function extractDealerDescription(html) {
  // Match "description":"<value>" where value is not null
  const idx = html.indexOf('"description":"');
  if (idx < 0) return '';
  // Walk the string value (handles escaped chars)
  let pos = idx + '"description":"'.length;
  let result = '';
  while (pos < html.length) {
    const ch = html[pos];
    if (ch === '\\') { pos += 2; result += ' '; continue; }
    if (ch === '"') break;
    result += ch;
    pos++;
  }
  return result.trim();
}

/**
 * Fetch all full-size (1024x768) photo URLs and the dealer description
 * from a CarGurus listing detail page.
 * Filters photos to only those matching the vehicle's year and make.
 * Returns { photos: string[], description: string }.
 */
async function fetchListingDetail(listingId, year, make) {
  const url = `https://www.cargurus.com/details/${listingId}`;
  try {
    const html = await fetchHtml(url);

    // Photos
    const matches = [...html.matchAll(/https?:\/\/static\.cargurus\.com\/images\/forsale\/[^\s"'<>&]+?-1024x768\.jpeg/g)];
    const unique = [...new Set(matches.map(m => m[0]))];
    let photos = unique;
    if (year && make) {
      const makeKey = make.toLowerCase().replace(/\s+/g, '_');
      const prefix = `${year}_${makeKey}`;
      const filtered = unique.filter(u => (u.split('/').pop() || '').startsWith(prefix));
      if (filtered.length > 0) photos = filtered;
    }

    // Dealer description
    const description = extractDealerDescription(html);

    return { photos, description };
  } catch (e) {
    console.warn(`  Could not fetch detail page for listing ${listingId}: ${e.message}`);
    return { photos: [], description: '' };
  }
}

/**
 * Map a CarGurus tile data object to our vehicles.json schema.
 *
 * CarGurus tile.data structure (key fields):
 *   listingTitle, vin, stockNumber
 *   priceData.current  (authoritative price)
 *   mileageData.value  (authoritative mileage)
 *   ontologyData: { makeName, modelName, trimName, bodyTypeName, carYear }
 *   exteriorColorData.name, interiorColorData.name
 *   localizedDrivetrain, localizedEngineName, localizedTransmission
 *   fuelData.localizedType
 *   pictureData.url, pictureCount
 *   vehicleFeatures[]  (array of feature strings)
 */
function mapNode(node, _offer, existingByVin) {
  const n = node;

  const vin = n.vin || '';
  const existing = vin ? existingByVin[vin] : null;

  // Year / Make / Model / Trim from ontology (most reliable)
  const onto = n.ontologyData || {};
  const year = parseInt(onto.carYear || n.carYear || '') || 0;
  const make = onto.makeName || '';
  const model = onto.modelName || '';
  const trim = onto.trimName || '';

  // Price, mileage, dealRating, and priceSavings — CarGurus is authoritative
  const price = n.priceData?.current ?? existing?.price ?? 0;
  const mileage = n.mileageData?.value ?? existing?.mileage ?? 0;
  const dealRating = n.dealRating || '';
  // priceSavings: positive = below market (good), negative = above market
  const priceSavings = n.priceData?.differential ?? 0;

  // Body style
  const bodyStyleRaw = onto.bodyTypeName || existing?.bodyStyle || '';
  const bodyStyle = normalizeBodyStyle(bodyStyleRaw);

  // Specs
  const drivetrain = normalizeDrivetrain(n.localizedDrivetrain || existing?.drivetrain || '');
  const engine = n.localizedEngineName || existing?.engine || '';
  const transmission = normalizeTransmission(n.localizedTransmission || existing?.transmission || '');
  const fuelType = n.fuelData?.localizedType || existing?.fuelType || 'Gasoline';

  // Colors
  const exteriorColor = n.exteriorColorData?.name || existing?.exteriorColor || '';
  const interiorColor = n.interiorColorData?.name || existing?.interiorColor || '';

  // Stock number
  const stockNumber = n.stockNumber || existing?.stockNumber || '';

  // Photos — prefer DealerCenter CDN if already in existing (more photos, better quality)
  const cgPhotoUrl = n.pictureData?.url || '';
  const cgPhotoCount = n.pictureCount || 0;
  const hasDcPhotos = existing?.primaryPhotoUrl?.includes('dealercenter') && (existing?.photoUrls?.length ?? 0) > 0;
  const primaryPhotoUrl = hasDcPhotos ? existing.primaryPhotoUrl : (cgPhotoUrl || existing?.primaryPhotoUrl || '');
  const photoUrls = hasDcPhotos ? existing.photoUrls : ([cgPhotoUrl].filter(Boolean));
  // Derive source from actual URL — VehicleCard uses 'dealercenter' to decide CDN vs local path
  const photoSource = primaryPhotoUrl.includes('dealercenter') ? 'dealercenter' : 'cargurus';
  const photos = hasDcPhotos
    ? { ...existing.photos, source: photoSource }
    : { exterior: cgPhotoCount || (cgPhotoUrl ? 1 : 0), interior: 0, source: photoSource };

  // Features — use CarGurus if we don't have them, otherwise keep existing
  const features = (existing?.features?.length > 0)
    ? existing.features
    : (n.vehicleFeatures || []);

  // Slug — always preserve existing to avoid breaking VDP URLs
  const slug = existing?.slug || generateVehicleSlug(year, make, model, trim);

  return {
    slug,
    year,
    make,
    model,
    trim,
    price,
    mileage,
    exteriorColor,
    interiorColor,
    engine,
    transmission,
    drivetrain,
    fuelType,
    bodyStyle,
    vin: vin || 'TBD',
    condition: 'Used',
    inspected: true,
    warranty: '3-Month Warranty',
    carfax: true,
    inspection: true,
    features,
    highlights: existing?.highlights || generateHighlights(year, make, model, trim, mileage),
    // VIN appears in CarGurus feed → always live. Missing/sold fields are
    // cleared here; tolerance/sold logic for missing VINs lives in the merge
    // block below (so re-listed cars auto-flip back to available).
    status: 'available',
    dateAdded: existing?.dateAdded || new Date().toISOString().split('T')[0],
    featured: existing?.featured ?? true,
    sortOrder: existing?.sortOrder ?? 0,
    stockNumber,
    dealerCenterUrl: existing?.dealerCenterUrl || '',
    primaryPhotoUrl,
    photoUrls,
    photos,
    photoPath: existing?.photoPath || '',
    photoPrefix: existing?.photoPrefix || slugify(`${year}-${make}-${model}-${trim}`),
    makeSlug: slugify(make),
    bodyStyleSlug: toBodyStyleSlug(bodyStyle),
    description: generateDescription(year, make, model, trim, mileage),
    dealRating,
    priceSavings,
  };
}

// ── diff summary + URL event classification ──────────────────────────────────

/**
 * Classify transitions, print a human diff, emit url-events.jsonl entries,
 * and return the deduped list of URLs that should be pinged at IndexNow.
 *
 * Emits four event types per the IndexNow integration spec:
 *   - "added"             new VIN, fresh URL
 *   - "sold"              VIN crossed 24h tolerance, status flipped to sold
 *   - "back_on_market"    sold (or off-market) VIN reappeared in feed
 *   - "slug_changed_old"  VIN known, slug differs from prior — prior URL
 *   - "slug_changed_new"  VIN known, slug differs from prior — new URL
 *
 * Off-market 1st-miss / continuing / price-mileage-only updates do NOT emit
 * events — they are noise to search engines and the URL hasn't materially
 * changed. They're still printed for operator visibility.
 */
function classifyAndReport(before, after, { emit = true } = {}) {
  const beforeByVin = new Map(before.map(v => [v.vin, v]));

  // Truly new VINs (not present before at all)
  const added = after.filter(v => !beforeByVin.has(v.vin));

  // Off-market 1st miss: previously available, now still available but with
  // a missing_since stamp it didn't have before.
  const offMarketNew = after.filter(v => {
    const old = beforeByVin.get(v.vin);
    return old && old.status !== 'sold' && v.status === 'available'
      && v.missing_since && !old.missing_since;
  });

  // Off-market continuing: missing_since carried over and still within window
  const offMarketContinuing = after.filter(v => {
    const old = beforeByVin.get(v.vin);
    return old && old.status !== 'sold' && v.status === 'available'
      && v.missing_since && old.missing_since;
  });

  // Marked sold this run: was previously available, is now sold
  const markedSold = after.filter(v => {
    const old = beforeByVin.get(v.vin);
    return old && old.status !== 'sold' && v.status === 'sold';
  });

  // Back on market: was sold (or had missing_since), now available without
  // either flag (mapNode wipes them on re-list).
  const backOnMarket = after.filter(v => {
    const old = beforeByVin.get(v.vin);
    if (!old) return false;
    const wasOff = old.status === 'sold' || !!old.missing_since;
    const nowOn = v.status === 'available' && !v.missing_since;
    return wasOff && nowOn;
  });

  // Slug change: VIN known, slug differs. Independent of status flips.
  const slugChanged = after
    .map(v => {
      const old = beforeByVin.get(v.vin);
      if (!old || !old.slug || old.slug === v.slug) return null;
      return { v, oldSlug: old.slug };
    })
    .filter(Boolean);

  // Updates on still-live cars (price/mileage). No event emitted.
  const updated = after.filter(v => {
    const old = beforeByVin.get(v.vin);
    if (!old) return false;
    if (v.status === 'sold') return false;
    return old.price !== v.price || old.mileage !== v.mileage;
  });

  // ── print human diff ───────────────────────────────────────────────────
  if (added.length) {
    console.log('\nAdded:');
    added.forEach(v => console.log(`  + ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}]`));
  }
  if (backOnMarket.length) {
    console.log('\nBack on market (re-listed from off-market or sold):');
    backOnMarket.forEach(v => console.log(`  ↺ ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] → status=available`));
  }
  if (slugChanged.length) {
    console.log('\nSlug changed (will ping both old and new URL):');
    slugChanged.forEach(({ v, oldSlug }) => console.log(`  ⇄ [${v.vin}] ${oldSlug} → ${v.slug}`));
  }
  if (offMarketNew.length) {
    console.log('\nOff-market (1st miss, still showing as live):');
    offMarketNew.forEach(v => console.log(`  ? ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] missing_since=${v.missing_since}`));
  }
  if (offMarketContinuing.length) {
    console.log('\nOff-market (continuing, still within tolerance):');
    offMarketContinuing.forEach(v => {
      const hours = ((Date.now() - Date.parse(v.missing_since)) / 3_600_000).toFixed(1);
      console.log(`  ? ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] missing for ${hours}h (tolerance ${OFF_MARKET_TOLERANCE_HOURS}h)`);
    });
  }
  if (markedSold.length) {
    console.log(`\nMarked sold (after ${OFF_MARKET_TOLERANCE_HOURS}h off-market, kept VDP for SEO):`);
    markedSold.forEach(v => console.log(`  ~ ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}] → status=sold, sold_date=${v.sold_date}`));
  }
  if (updated.length) {
    console.log('\nUpdated (price / mileage):');
    updated.forEach(v => {
      const old = beforeByVin.get(v.vin);
      const changes = [];
      if (old.price !== v.price) changes.push(`price $${old.price.toLocaleString()} → $${v.price.toLocaleString()}`);
      if (old.mileage !== v.mileage) changes.push(`mileage ${old.mileage.toLocaleString()} → ${v.mileage.toLocaleString()}`);
      console.log(`  ~ ${v.year} ${v.make} ${v.model}: ${changes.join(', ')}`);
    });
  }
  if (!added.length && !backOnMarket.length && !offMarketNew.length && !offMarketContinuing.length && !markedSold.length && !updated.length && !slugChanged.length) {
    console.log('\nNo changes.');
  }

  // ── emit events + collect URLs ─────────────────────────────────────────
  const urlSet = new Set();

  function fire(event, vin, slug, url) {
    if (emit) appendEvent({ event, vin, slug, url });
    urlSet.add(url);
  }

  for (const v of added) {
    fire('added', v.vin, v.slug, vdpUrl(v.slug));
  }
  for (const v of markedSold) {
    fire('sold', v.vin, v.slug, vdpUrl(v.slug));
  }
  for (const v of backOnMarket) {
    fire('back_on_market', v.vin, v.slug, vdpUrl(v.slug));
  }
  for (const { v, oldSlug } of slugChanged) {
    fire('slug_changed_old', v.vin, oldSlug, vdpUrl(oldSlug));
    fire('slug_changed_new', v.vin, v.slug, vdpUrl(v.slug));
  }

  return { urls: [...urlSet] };
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load existing
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

  // Fetch CarGurus
  console.log(`\nFetching: ${CARGURUS_URL}`);
  const html = await fetchHtml(CARGURUS_URL);
  console.log(`  Response: ${html.length.toLocaleString()} bytes`);

  const tiles = extractTilesFromHtml(html);
  if (!tiles) {
    console.error('\nERROR: Could not find "tiles" array in CarGurus HTML.');
    console.error('The page structure may have changed — check the URL and try again.');
    process.exit(1);
  }

  if (DEBUG) {
    console.log(`\n[DEBUG] Raw tiles (${tiles.length}):`);
    console.log(JSON.stringify(tiles.slice(0, 2), null, 2).slice(0, 3000));
  }

  const vehicleNodes = extractVehicleNodes(tiles);
  console.log(`Extracted ${vehicleNodes.length} vehicle node(s) from tiles.`);

  if (vehicleNodes.length === 0) {
    console.error('\nERROR: No vehicles found in CarGurus JSON-LD.');
    console.error('Re-run with --debug to inspect the raw JSON-LD structure.');
    process.exit(1);
  }

  // Map to schema (live cars from CarGurus)
  const liveVehicles = vehicleNodes
    .map(({ node, offer }) => {
      try {
        return mapNode(node, offer, existingByVin);
      } catch (e) {
        console.warn(`Skipped a node: ${e.message}`);
        return null;
      }
    })
    .filter(v => v && v.year && v.make);

  // ─── Tolerance-window merge ────────────────────────────────────────────────
  // CarGurus is source of truth for live vs sold. A VIN can flip back and
  // forth (Jerry sometimes pulls cars temporarily for photos / rotation).
  //
  //   - VIN in feed → status="available" (cleared in mapNode above; missing_since
  //     and sold_date are dropped here so re-listed cars auto-flip back).
  //   - VIN NOT in feed:
  //       * 1st miss → set missing_since=now, keep status="available"
  //       * still missing & (now - missing_since) < 24h → keep both
  //       * still missing & (now - missing_since) >= 24h → set status="sold",
  //         sold_date=now (keep missing_since for analytics)
  //   - Already sold + still missing → no-op (preserve VDP for SEO)
  const liveVins = new Set(liveVehicles.map(v => v.vin));
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  // Reappearance: any liveVehicle whose existing entry had missing_since or
  // was previously sold, force-clear those flags. mapNode already set
  // status='available'; we just have to NOT carry over the legacy fields.
  // (mapNode doesn't echo unknown fields back, so this is automatic — no
  // explicit cleanup needed here. Comment kept for future readers.)

  const offMarketEntries = existing
    .filter(e => e.vin && e.vin !== 'TBD' && !liveVins.has(e.vin))
    .map(e => {
      // Already declared sold — leave as-is (preserve sold_date and
      // missing_since for analytics; VDP keeps rendering SOLD).
      if (e.status === 'sold') return e;

      const missingSince = e.missing_since || nowIso;
      const hoursMissing = (Date.parse(nowIso) - Date.parse(missingSince)) / 3_600_000;

      if (hoursMissing >= OFF_MARKET_TOLERANCE_HOURS) {
        // Tolerance exceeded → mark sold. Keep missing_since for analytics.
        return { ...e, status: 'sold', sold_date: todayDate, missing_since: missingSince };
      }
      // Within tolerance → still "available", just stamp first-miss timestamp.
      return { ...e, status: 'available', missing_since: missingSince };
    });

  const vehicles = [...liveVehicles, ...offMarketEntries];

  // Counts for log noise
  const offMarketWithinWindow = offMarketEntries.filter(e => e.status === 'available').length;
  const newlySoldThisRun = offMarketEntries.filter(e => {
    if (e.status !== 'sold') return false;
    const prior = existingByVin[e.vin];
    return prior && prior.status !== 'sold';
  }).length;
  const stillSoldCount = offMarketEntries.filter(e => {
    const prior = existingByVin[e.vin];
    return prior && prior.status === 'sold';
  }).length;

  if (offMarketWithinWindow > 0) {
    console.log(`\nOff-market within ${OFF_MARKET_TOLERANCE_HOURS}h tolerance: ${offMarketWithinWindow} vehicle(s). Site still shows them live.`);
  }
  if (newlySoldThisRun > 0) {
    console.log(`Marked sold (missing > ${OFF_MARKET_TOLERANCE_HOURS}h): ${newlySoldThisRun} vehicle(s).`);
  }
  if (stillSoldCount > 0) {
    console.log(`Preserving ${stillSoldCount} previously-sold vehicle(s) for SEO.`);
  }

  // Fetch detail pages for photos + dealer description (in parallel)
  console.log(`\nFetching detail pages (photos + description)...`);
  await Promise.all(
    vehicleNodes.map(async ({ node }, i) => {
      const listingId = node.id;
      const v = vehicles[i];
      if (!v || !listingId) return;

      const skipPhotos = (v.photoUrls?.length ?? 0) > 1;
      if (skipPhotos) {
        console.log(`  ${v.year} ${v.make} ${v.model}: kept ${v.photoUrls.length} existing photos`);
      }

      const { photos, description } = await fetchListingDetail(listingId, v.year, v.make);

      if (!skipPhotos) {
        if (photos.length > 0) {
          v.primaryPhotoUrl = photos[0];
          v.photoUrls = photos;
          v.photos = { exterior: photos.length, interior: 0, source: 'cargurus' };
          console.log(`  ${v.year} ${v.make} ${v.model}: ${photos.length} photos fetched`);
        } else {
          console.log(`  ${v.year} ${v.make} ${v.model}: no photos found`);
        }
      }

      if (description) {
        v.description = description;
        console.log(`  ${v.year} ${v.make} ${v.model}: description captured (${description.length} chars)`);
      }
    })
  );

  console.log(`\nMapped ${vehicles.length} vehicles:`);
  vehicles.forEach(v =>
    console.log(`  • ${v.year} ${v.make} ${v.model} ${v.trim} — $${v.price.toLocaleString()} — ${v.mileage.toLocaleString()} mi — ${v.photoUrls?.length ?? 0} photos`)
  );

  // Diff + URL event classification (events are appended, not on dry-run).
  const { urls } = classifyAndReport(existing, vehicles, { emit: !DRY_RUN });

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] vehicles.json not written. Would emit ${urls.length} URL event(s).`);
    return;
  }

  writeFileSync(VEHICLES_JSON, JSON.stringify(vehicles, null, 2) + '\n');
  console.log(`\nWrote ${vehicles.length} vehicles to:\n  ${VEHICLES_JSON}`);

  // IndexNow: ping Bing/Yandex/Seznam/Naver (and ChatGPT via Bing). One POST,
  // deduped URLs. Skipped when no transitions occurred this cycle.
  if (urls.length === 0) {
    console.log('\nIndexNow: no URL transitions this cycle, no ping sent.');
  } else {
    console.log(`\nIndexNow: pinging ${urls.length} URL(s)...`);
    urls.forEach(u => console.log(`  → ${u}`));
    const result = await submitToIndexNow(urls);
    console.log(`  IndexNow response: ${result.status} ${result.ok ? 'OK' : 'FAIL'}${result.body ? ' — ' + result.body.slice(0, 200) : ''}`);
  }
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
