#!/usr/bin/env node
/**
 * audit-feed-vdp-parity.js
 *
 * Daily guard against the #1 cause of Vehicle Ads account-level disapproval:
 * mismatches between the Merchant Center feed and the live VDP landing pages
 * (price / availability / VIN drift, dead links, dead images).
 *
 * For every <item> in the GMC feed it:
 *   1. Fetches the g:link VDP and asserts HTTP 200
 *   2. Parses every <script type="application/ld+json"> block and finds the
 *      vehicle object — @type equal to or containing "Car" or "Vehicle"
 *      (string or array form, so ["Car","Vehicle"] is accepted)
 *   3. Asserts schema offers.price equals the feed price number
 *   4. Asserts availability parity: feed in_stock ⇔ schema InStock
 *   5. Asserts schema vehicleIdentificationNumber === g:vin
 *   6. HEADs g:image_link expecting HTTP 200 with an image/* content type
 *      (falls back to GET when the CDN rejects HEAD)
 *
 * When the repo checkout is present (site/src/data/vehicles.json readable) it
 * also cross-checks set parity: every non-sold vehicle with a valid VIN must
 * be in the feed, and the feed must not contain extra VINs.
 *
 * Prints a per-VIN PASS/FAIL table. Exits 1 on any failure.
 *
 * Usage:
 *   node scripts/audit-feed-vdp-parity.js                  # audit live feed
 *   node scripts/audit-feed-vdp-parity.js --local          # audit web_assets/feeds/vehicles.xml
 *   node scripts/audit-feed-vdp-parity.js --feed-url URL   # audit another feed URL
 *   node scripts/audit-feed-vdp-parity.js --json           # machine-readable output
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VEHICLES_JSON = resolve(__dirname, '../site/src/data/vehicles.json');
const LOCAL_FEED = resolve(__dirname, '../web_assets/feeds/vehicles.xml');
const DEFAULT_FEED_URL = 'https://www.maximautos.com/feeds/vehicles.xml';

const args = process.argv.slice(2);
const LOCAL = args.includes('--local');
const JSON_OUT = args.includes('--json');
const feedUrlIdx = args.indexOf('--feed-url');
const FEED_URL = feedUrlIdx !== -1 ? args[feedUrlIdx + 1] : DEFAULT_FEED_URL;

const UA = 'MaximAutos-ParityAudit/1.0 (+https://www.maximautos.com)';

// ── XML helpers (regex-based; the feed is machine-generated and regular) ─────

function xmlUnescape(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Extract the text content of the first <g:NAME> child inside an item blob. */
function gTag(itemXml, name) {
  const m = itemXml.match(new RegExp(`<g:${name}>([\\s\\S]*?)</g:${name}>`));
  return m ? xmlUnescape(m[1].trim()) : null;
}

function parseFeedItems(feedXml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(feedXml)) !== null) {
    const blob = m[1];
    items.push({
      vin: gTag(blob, 'vin'),
      id: gTag(blob, 'id'),
      link: gTag(blob, 'link'),
      imageLink: gTag(blob, 'image_link'),
      price: gTag(blob, 'price'),           // e.g. "10950 USD"
      availability: gTag(blob, 'availability'), // in_stock | out_of_stock
    });
  }
  return items;
}

// ── JSON-LD helpers ──────────────────────────────────────────────────────────

/** True when @type (string or array) is or contains "Car"/"Vehicle". */
function isVehicleType(type) {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === 'string' && (t.includes('Car') || t.includes('Vehicle')));
}

/** Find the vehicle JSON-LD object among all ld+json blocks in a VDP's HTML. */
function findVehicleSchema(html) {
  const blocks = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);

  for (const block of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch (_) {
      continue; // malformed block — other checks will surface real problems
    }
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const obj of candidates) {
      if (obj && typeof obj === 'object' && isVehicleType(obj['@type'])) return obj;
    }
  }
  return null;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const text = await res.text().catch(() => '');
  return { status: res.status, ok: res.ok, text };
}

/** HEAD a URL expecting 200 + image/*. Falls back to GET if HEAD is rejected. */
async function checkImage(url) {
  async function probe(method) {
    try {
      const res = await fetch(url, { method, headers: { 'User-Agent': UA } });
      const type = res.headers.get('content-type') || '';
      if (method === 'GET' && res.body) {
        try { await res.body.cancel(); } catch (_) { /* best effort */ }
      }
      return { status: res.status, type };
    } catch (err) {
      return { status: 0, type: '', error: String(err && err.message || err) };
    }
  }
  let r = await probe('HEAD');
  if (r.status !== 200) r = await probe('GET'); // some CDNs reject HEAD
  const ok = r.status === 200 && r.type.startsWith('image/');
  return { ok, detail: ok ? 'ok' : `status=${r.status} content-type=${r.type || 'n/a'}${r.error ? ' ' + r.error : ''}` };
}

// ── Per-item audit ───────────────────────────────────────────────────────────

async function auditItem(item) {
  const failures = [];
  const vin = item.vin || item.id || '(no vin)';

  if (!item.link) {
    failures.push('feed item has no g:link');
    return { vin, link: '', failures };
  }

  // 1. VDP fetch
  const page = await fetchText(item.link);
  if (page.status !== 200) {
    failures.push(`VDP HTTP ${page.status} (expected 200)`);
    return { vin, link: item.link, failures };
  }

  // 2. Vehicle JSON-LD present
  const schema = findVehicleSchema(page.text);
  if (!schema) {
    failures.push('no Car/Vehicle JSON-LD object on VDP');
    return { vin, link: item.link, failures };
  }

  // 3. Price parity
  const feedPrice = parseFloat(item.price);
  const schemaPrice = schema.offers ? Number(schema.offers.price) : NaN;
  if (!Number.isFinite(feedPrice)) {
    failures.push(`feed price unparseable: "${item.price}"`);
  } else if (schemaPrice !== feedPrice) {
    failures.push(`price mismatch: feed=${feedPrice} schema=${schemaPrice}`);
  }

  // 4. Availability parity: feed in_stock ⇔ schema InStock
  const schemaAvail = String((schema.offers && schema.offers.availability) || '');
  const schemaInStock = schemaAvail.includes('InStock');
  const feedInStock = item.availability === 'in_stock';
  if (feedInStock !== schemaInStock) {
    failures.push(`availability mismatch: feed=${item.availability} schema=${schemaAvail || '(none)'}`);
  }

  // 5. VIN parity
  if (schema.vehicleIdentificationNumber !== item.vin) {
    failures.push(`VIN mismatch: feed=${item.vin} schema=${schema.vehicleIdentificationNumber || '(none)'}`);
  }

  // 6. Image reachable
  if (!item.imageLink) {
    failures.push('feed item has no g:image_link');
  } else {
    const img = await checkImage(item.imageLink);
    if (!img.ok) failures.push(`image_link not 200 image/*: ${img.detail}`);
  }

  return { vin, link: item.link, failures };
}

// ── Set parity vs vehicles.json (only when the repo checkout is present) ─────

function crossCheckVehiclesJson(feedVins) {
  const findings = [];
  if (!existsSync(VEHICLES_JSON)) {
    return { skipped: true, findings };
  }
  const vehicles = JSON.parse(readFileSync(VEHICLES_JSON, 'utf8'));
  const expected = new Set(
    vehicles
      .filter((v) => v.status !== 'sold' && v.vin && v.vin !== 'TBD' && String(v.vin).length === 17)
      .map((v) => v.vin)
  );
  for (const vin of expected) {
    if (!feedVins.has(vin)) findings.push(`MISSING from feed: ${vin} (active in vehicles.json)`);
  }
  for (const vin of feedVins) {
    if (!expected.has(vin)) findings.push(`EXTRA in feed: ${vin} (not an active vehicle in vehicles.json)`);
  }
  return { skipped: false, findings };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let feedXml;
  let source;
  if (LOCAL) {
    source = LOCAL_FEED;
    feedXml = readFileSync(LOCAL_FEED, 'utf8');
  } else {
    source = FEED_URL;
    const res = await fetchText(FEED_URL);
    if (res.status !== 200) {
      console.error(`Feed fetch failed: HTTP ${res.status} from ${FEED_URL}`);
      process.exit(1);
    }
    feedXml = res.text;
  }

  const items = parseFeedItems(feedXml);
  if (!JSON_OUT) {
    console.log(`Feed source: ${source}`);
    console.log(`Items in feed: ${items.length}\n`);
  }

  const results = [];
  for (const item of items) {
    results.push(await auditItem(item)); // sequential — 8 cars, be polite
  }

  const cross = crossCheckVehiclesJson(new Set(items.map((i) => i.vin).filter(Boolean)));
  const failedItems = results.filter((r) => r.failures.length > 0);
  const anyFailure = failedItems.length > 0 || cross.findings.length > 0 || items.length === 0;

  if (JSON_OUT) {
    console.log(JSON.stringify({
      source,
      itemCount: items.length,
      pass: !anyFailure,
      results,
      crossCheck: cross,
    }, null, 2));
  } else {
    console.log('VIN                 RESULT  DETAIL');
    console.log('─'.repeat(72));
    for (const r of results) {
      if (r.failures.length === 0) {
        console.log(`${r.vin.padEnd(20)}PASS`);
      } else {
        console.log(`${r.vin.padEnd(20)}FAIL    ${r.failures.join('; ')}`);
      }
    }
    console.log('─'.repeat(72));
    if (cross.skipped) {
      console.log('Cross-check vs vehicles.json: skipped (no repo checkout)');
    } else if (cross.findings.length === 0) {
      console.log('Cross-check vs vehicles.json: PASS (feed VINs == active VINs)');
    } else {
      console.log('Cross-check vs vehicles.json: FAIL');
      for (const f of cross.findings) console.log(`  ${f}`);
    }
    if (items.length === 0) console.log('FAIL: feed contains zero items');
    console.log(`\n${results.length - failedItems.length}/${results.length} items passed.`);
  }

  process.exit(anyFailure ? 1 : 0);
}

main().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
