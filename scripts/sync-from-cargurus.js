#!/usr/bin/env node
/**
 * sync-from-cargurus.js
 *
 * Fetches the live Maxim Autos inventory from CarGurus and updates
 * site/src/data/vehicles.json.
 *
 * Merge rules:
 *   - CarGurus is source of truth for: which cars exist, price, mileage
 *   - Existing vehicles.json data is preserved for: photos (DealerCenter CDN),
 *     features, highlights, description, stockNumber, dealerCenterUrl, slug
 *   - Cars missing from CarGurus are removed (assumed sold)
 *   - New cars get auto-generated description/highlights
 *
 * Usage:
 *   node scripts/sync-from-cargurus.js           # writes vehicles.json
 *   node scripts/sync-from-cargurus.js --dry-run  # prints diff, no write
 *   node scripts/sync-from-cargurus.js --debug    # dumps raw JSON-LD blocks
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARGURUS_URL = 'https://www.cargurus.com/Cars/m-Maxim-Autos-sp457703';
const VEHICLES_JSON = resolve(__dirname, '../site/src/data/vehicles.json');
const DRY_RUN = process.argv.includes('--dry-run');
const DEBUG = process.argv.includes('--debug');

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
 * Fetch all full-size (1024x768) photo URLs from a CarGurus listing detail page.
 * Returns array of https URLs, deduplicated, in order of appearance.
 */
async function fetchListingPhotos(listingId) {
  const url = `https://www.cargurus.com/details/${listingId}`;
  try {
    const html = await fetchHtml(url);
    const matches = [...html.matchAll(/https?:\/\/static\.cargurus\.com\/images\/forsale\/[^\s"'<>&]+?-1024x768\.jpeg/g)];
    const unique = [...new Set(matches.map(m => m[0]))];
    return unique;
  } catch (e) {
    console.warn(`  Could not fetch photos for listing ${listingId}: ${e.message}`);
    return [];
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

  // Price and mileage — CarGurus is authoritative
  const price = n.priceData?.current ?? existing?.price ?? 0;
  const mileage = n.mileageData?.value ?? existing?.mileage ?? 0;

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
    description: existing?.description || generateDescription(year, make, model, trim, mileage),
  };
}

// ── diff summary ──────────────────────────────────────────────────────────────

function printDiff(before, after) {
  const beforeVins = new Set(before.map(v => v.vin));
  const afterVins = new Set(after.map(v => v.vin));

  const added = after.filter(v => !beforeVins.has(v.vin));
  const removed = before.filter(v => !afterVins.has(v.vin));
  const updated = after.filter(v => {
    if (!beforeVins.has(v.vin)) return false;
    const old = before.find(b => b.vin === v.vin);
    return old.price !== v.price || old.mileage !== v.mileage;
  });

  if (added.length) {
    console.log('\nAdded:');
    added.forEach(v => console.log(`  + ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}]`));
  }
  if (removed.length) {
    console.log('\nRemoved (sold / de-listed):');
    removed.forEach(v => console.log(`  - ${v.year} ${v.make} ${v.model} ${v.trim} [${v.vin}]`));
  }
  if (updated.length) {
    console.log('\nUpdated (price / mileage):');
    updated.forEach(v => {
      const old = before.find(b => b.vin === v.vin);
      const changes = [];
      if (old.price !== v.price) changes.push(`price $${old.price.toLocaleString()} → $${v.price.toLocaleString()}`);
      if (old.mileage !== v.mileage) changes.push(`mileage ${old.mileage.toLocaleString()} → ${v.mileage.toLocaleString()}`);
      console.log(`  ~ ${v.year} ${v.make} ${v.model}: ${changes.join(', ')}`);
    });
  }
  if (!added.length && !removed.length && !updated.length) {
    console.log('\nNo changes.');
  }
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

  // Map to schema
  const vehicles = vehicleNodes
    .map(({ node, offer }) => {
      try {
        return mapNode(node, offer, existingByVin);
      } catch (e) {
        console.warn(`Skipped a node: ${e.message}`);
        return null;
      }
    })
    .filter(v => v && v.year && v.make);

  // Fetch full photo galleries from each listing detail page (in parallel)
  console.log(`\nFetching full photo galleries...`);
  await Promise.all(
    vehicleNodes.map(async ({ node }, i) => {
      const listingId = node.id;
      const v = vehicles[i];
      if (!v || !listingId) return;

      // Skip if we already have multiple photos for this VIN
      if (v.photoUrls?.length > 1) {
        console.log(`  ${v.year} ${v.make} ${v.model}: kept ${v.photoUrls.length} existing photos`);
        return;
      }

      const photos = await fetchListingPhotos(listingId);
      if (photos.length > 0) {
        v.primaryPhotoUrl = photos[0];
        v.photoUrls = photos;
        v.photos = { exterior: photos.length, interior: 0, source: 'cargurus' };
        console.log(`  ${v.year} ${v.make} ${v.model}: ${photos.length} photos fetched`);
      } else {
        console.log(`  ${v.year} ${v.make} ${v.model}: no photos found`);
      }
    })
  );

  console.log(`\nMapped ${vehicles.length} vehicles:`);
  vehicles.forEach(v =>
    console.log(`  • ${v.year} ${v.make} ${v.model} ${v.trim} — $${v.price.toLocaleString()} — ${v.mileage.toLocaleString()} mi — ${v.photoUrls?.length ?? 0} photos`)
  );

  // Diff
  printDiff(existing, vehicles);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] vehicles.json not written.');
    return;
  }

  writeFileSync(VEHICLES_JSON, JSON.stringify(vehicles, null, 2) + '\n');
  console.log(`\nWrote ${vehicles.length} vehicles to:\n  ${VEHICLES_JSON}`);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
