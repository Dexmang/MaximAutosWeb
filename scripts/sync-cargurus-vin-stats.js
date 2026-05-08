#!/usr/bin/env node
/**
 * sync-cargurus-vin-stats.js
 *
 * Calls the CarGurus VIN Level Stats API for the past 7 days and writes
 * normalized output to site/src/data/cargurus-vin-stats.json. The Astro
 * VDP imports that JSON to render a "X shoppers checked this on CarGurus
 * this week" social-proof line near the price block.
 *
 * Failure mode: if the API call fails, log the error and exit 0 so CI/cron
 * keeps moving. The placeholder JSON shipped with the repo guarantees the
 * Astro build never breaks on a missing or malformed file.
 *
 * Usage:
 *   node scripts/sync-cargurus-vin-stats.js
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../site/src/data/cargurus-vin-stats.json');

const API_URL = 'https://www.cargurus.com/Cars/api/2.0/dealerStatsRequest.action';
const APP_ID = 'ea0e8c95-b58f-4390-a345-bb996d5361e2';
const AUTH_TOKEN = 'aa7446f2-13e9-4c2d-9a94-9b61c1f56b88';

// ── helpers ──────────────────────────────────────────────────────────────────

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Pull the first numeric value from a record using a list of candidate keys.
 * The CarGurus stats API has shifted field names a few times (impressions /
 * srp_impressions / search_impressions, vdp_views / detail_views, etc.) so
 * we map best-effort.
 */
function pickNum(rec, keys) {
  for (const k of keys) {
    if (rec[k] != null) return num(rec[k]);
  }
  return 0;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodStart = isoDate(start);
  const periodEnd = isoDate(now);

  const placeholder = {
    last_updated: now.toISOString(),
    period_start: periodStart,
    period_end: periodEnd,
    by_vin: {},
  };

  const bodyJson = JSON.stringify({
    external_dealer_id: 'sp457703',
    start_date: periodStart,
    end_date: periodEnd,
  });
  const formBody = new URLSearchParams({ appId: APP_ID, authToken: AUTH_TOKEN, body: bodyJson });

  console.log(`[cargurus-vin-stats] POST ${API_URL}`);
  console.log(`[cargurus-vin-stats] period: ${periodStart} → ${periodEnd}`);

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });
  } catch (e) {
    console.error(`[cargurus-vin-stats] network error: ${e.message}`);
    writeFileSync(OUT_PATH, JSON.stringify(placeholder, null, 2) + '\n');
    console.log(`[cargurus-vin-stats] wrote placeholder to ${OUT_PATH}`);
    process.exit(0);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`[cargurus-vin-stats] HTTP ${res.status} ${res.statusText}`);
    console.error(`[cargurus-vin-stats] body: ${txt.slice(0, 500)}`);
    writeFileSync(OUT_PATH, JSON.stringify(placeholder, null, 2) + '\n');
    process.exit(0);
  }

  let raw;
  try {
    raw = await res.json();
  } catch (e) {
    console.error(`[cargurus-vin-stats] could not parse JSON: ${e.message}`);
    writeFileSync(OUT_PATH, JSON.stringify(placeholder, null, 2) + '\n');
    process.exit(0);
  }

  // Log raw shape so we can map fields once we see real data
  console.log(`[cargurus-vin-stats] raw keys: ${Object.keys(raw || {}).join(', ')}`);
  const sample = JSON.stringify(raw, null, 2);
  console.log(`[cargurus-vin-stats] raw response (first 2000 chars):\n${sample.slice(0, 2000)}`);

  // CarGurus VIN-level stats response: { vin_stats: [{ vin, srps, vdps, leads_email, phone_leads, chat_leads, website_clicks, ... }] }
  const candidateArrays = [
    raw?.vin_stats, raw?.vinStats,
    raw?.stats, raw?.data, raw?.results,
    raw?.listings, raw?.vehicles,
  ].filter(Array.isArray);

  let by_vin = {};
  let foundVinData = false;

  if (candidateArrays.length > 0) {
    const arr = candidateArrays[0];
    for (const rec of arr) {
      const vin = rec?.vin || rec?.VIN || rec?.vehicleVin;
      if (!vin) continue;
      foundVinData = true;
      by_vin[vin] = {
        srp_views:      pickNum(rec, ['srps', 'srp_views', 'srpViews', 'impressions']),
        vdp_views:      pickNum(rec, ['vdps', 'vdp_views', 'vdpViews', 'detail_views', 'views']),
        leads_email:    pickNum(rec, ['leads_email', 'emailLeads']),
        leads_phone:    pickNum(rec, ['phone_leads', 'leads_phone', 'phoneLeads']),
        leads_chat:     pickNum(rec, ['chat_leads', 'leads_chat', 'chatLeads']),
        website_clicks: pickNum(rec, ['website_clicks', 'websiteClicks']),
        map_clicks:     pickNum(rec, ['map_clicks', 'mapClicks']),
      };
    }
  } else if (raw?.byVin && typeof raw.byVin === 'object') {
    for (const [vin, rec] of Object.entries(raw.byVin)) {
      foundVinData = true;
      by_vin[vin] = {
        srp_views:      pickNum(rec, ['srps', 'srp_views', 'srpViews', 'impressions']),
        vdp_views:      pickNum(rec, ['vdps', 'vdp_views', 'vdpViews', 'detail_views', 'views']),
        leads_email:    pickNum(rec, ['leads_email', 'emailLeads']),
        leads_phone:    pickNum(rec, ['phone_leads', 'leads_phone', 'phoneLeads']),
        leads_chat:     pickNum(rec, ['chat_leads', 'leads_chat', 'chatLeads']),
        website_clicks: pickNum(rec, ['website_clicks', 'websiteClicks']),
        map_clicks:     pickNum(rec, ['map_clicks', 'mapClicks']),
      };
    }
  }

  const out = {
    last_updated: now.toISOString(),
    period_start: periodStart,
    period_end: periodEnd,
    by_vin,
  };

  // If the API actually returned dealer-level totals (no VIN-level rows),
  // surface them under dealer_level so we still capture the run.
  if (!foundVinData) {
    out.dealer_level = raw;
    console.warn('[cargurus-vin-stats] no VIN-level rows detected; saved raw under dealer_level.');
  } else {
    console.log(`[cargurus-vin-stats] mapped ${Object.keys(by_vin).length} VIN(s).`);
  }

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`[cargurus-vin-stats] wrote ${OUT_PATH}`);
}

main().catch(err => {
  console.error('[cargurus-vin-stats] fatal:', err.message);
  // Don't break CI — write placeholder and exit 0.
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    writeFileSync(OUT_PATH, JSON.stringify({
      last_updated: now.toISOString(),
      period_start: isoDate(start),
      period_end: isoDate(now),
      by_vin: {},
    }, null, 2) + '\n');
  } catch (_) {}
  process.exit(0);
});
