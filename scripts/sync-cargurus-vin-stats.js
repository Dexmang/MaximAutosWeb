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
const APP_ID = 'e67a59c9-d052-425f-9c93-3f2f125bd35d';
const AUTH_TOKEN = 'b6522852-244b-4ef9-add6-13ab544ec34f';

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

  const body = {
    appId: APP_ID,
    authToken: AUTH_TOKEN,
    start_date: periodStart,
    end_date: periodEnd,
  };

  console.log(`[cargurus-vin-stats] POST ${API_URL}`);
  console.log(`[cargurus-vin-stats] period: ${periodStart} → ${periodEnd}`);

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  // Try to find a per-VIN array. Common shapes seen in the wild:
  //   { vinStats: [{ vin, impressions, vdp_views, leads }, ...] }
  //   { stats: [{ vin, ... }] }
  //   { data: [{ vin, ... }] }
  //   { results: [{ vin, ... }] }
  //   { byVin: { VIN: { ... } } }
  const candidateArrays = [
    raw?.vinStats, raw?.vin_stats,
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
        impressions: pickNum(rec, ['impressions', 'srp_impressions', 'search_impressions', 'srpImpressions']),
        vdp_views: pickNum(rec, ['vdp_views', 'vdpViews', 'detail_views', 'detailViews', 'views']),
        leads: pickNum(rec, ['leads', 'leads_total', 'leadsTotal', 'totalLeads', 'lead_count']),
      };
    }
  } else if (raw?.byVin && typeof raw.byVin === 'object') {
    for (const [vin, rec] of Object.entries(raw.byVin)) {
      foundVinData = true;
      by_vin[vin] = {
        impressions: pickNum(rec, ['impressions', 'srp_impressions', 'search_impressions']),
        vdp_views: pickNum(rec, ['vdp_views', 'vdpViews', 'detail_views', 'views']),
        leads: pickNum(rec, ['leads', 'leads_total', 'totalLeads']),
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
