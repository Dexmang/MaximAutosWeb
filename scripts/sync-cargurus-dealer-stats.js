#!/usr/bin/env node
/**
 * sync-cargurus-dealer-stats.js
 *
 * Calls the CarGurus Dealer Level Stats API for the past 7 days and writes
 * a normalized totals/daily file to site/src/data/cargurus-dealer-stats.json.
 *
 * NOTE: The Astro build does NOT import this file. It is for internal
 * reporting only (Larry / LEDGER / MaxMarket can read it for weekly
 * dashboards).
 *
 * Failure mode: if the API call fails, log the error and exit 0 so CI/cron
 * keeps moving.
 *
 * Usage:
 *   node scripts/sync-cargurus-dealer-stats.js
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../site/src/data/cargurus-dealer-stats.json');

const API_URL = 'https://www.cargurus.com/Cars/api/2.0/dealerStatsRequest.action';
const APP_ID = '87fae513-516a-46c8-be26-0a53788c9612';
const AUTH_TOKEN = 'f568b144-68e9-4911-8960-653a40efc2cb';

// ── helpers ──────────────────────────────────────────────────────────────────

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickNum(rec, keys) {
  for (const k of keys) {
    if (rec[k] != null) return num(rec[k]);
  }
  return 0;
}

const FIELDS = {
  impressions:    ['impressions', 'srp_impressions', 'search_impressions', 'srpImpressions'],
  srp_views:      ['srps', 'srp_views', 'srpViews', 'search_views', 'searchViews'],
  vdp_views:      ['vdps', 'vdp_views', 'vdpViews', 'detail_views', 'detailViews', 'views'],
  leads_total:    ['leads', 'leads_total', 'leadsTotal', 'totalLeads', 'lead_count'],
  leads_email:    ['leads_email', 'emailLeads', 'email_leads'],
  leads_phone:    ['phone_leads', 'leads_phone', 'phoneLeads', 'calls'],
  leads_chat:     ['chat_leads', 'leads_chat', 'chatLeads'],
  website_clicks: ['website_clicks', 'websiteClicks'],
  map_clicks:     ['map_clicks', 'mapClicks'],
};

function mapRow(rec) {
  const out = {};
  for (const [k, keys] of Object.entries(FIELDS)) {
    out[k] = pickNum(rec, keys);
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodStart = isoDate(start);
  const periodEnd = isoDate(now);

  const emptyTotals = {
    impressions: 0, srp_views: 0, vdp_views: 0,
    leads_total: 0, leads_email: 0, leads_phone: 0, leads_chat: 0,
    website_clicks: 0, map_clicks: 0,
  };

  const placeholder = {
    last_updated: now.toISOString(),
    period: { start: periodStart, end: periodEnd },
    totals: { ...emptyTotals },
    daily: [],
  };

  const bodyJson = JSON.stringify({
    external_dealer_id: 'sp457703',
    start_date: periodStart,
    end_date: periodEnd,
  });
  const formBody = new URLSearchParams({ appId: APP_ID, authToken: AUTH_TOKEN, body: bodyJson });

  console.log(`[cargurus-dealer-stats] POST ${API_URL}`);
  console.log(`[cargurus-dealer-stats] period: ${periodStart} → ${periodEnd}`);

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });
  } catch (e) {
    console.error(`[cargurus-dealer-stats] network error: ${e.message}`);
    writeFileSync(OUT_PATH, JSON.stringify(placeholder, null, 2) + '\n');
    process.exit(0);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`[cargurus-dealer-stats] HTTP ${res.status} ${res.statusText}`);
    console.error(`[cargurus-dealer-stats] body: ${txt.slice(0, 500)}`);
    writeFileSync(OUT_PATH, JSON.stringify(placeholder, null, 2) + '\n');
    process.exit(0);
  }

  let raw;
  try {
    raw = await res.json();
  } catch (e) {
    console.error(`[cargurus-dealer-stats] could not parse JSON: ${e.message}`);
    writeFileSync(OUT_PATH, JSON.stringify(placeholder, null, 2) + '\n');
    process.exit(0);
  }

  console.log(`[cargurus-dealer-stats] raw keys: ${Object.keys(raw || {}).join(', ')}`);
  const sample = JSON.stringify(raw, null, 2);
  console.log(`[cargurus-dealer-stats] raw response (first 2000 chars):\n${sample.slice(0, 2000)}`);

  // Try to find a daily-rows array first.
  const candidateDaily = [
    raw?.daily_stats, raw?.daily, raw?.dailyStats,
    raw?.byDay, raw?.by_day,
    raw?.stats, raw?.data, raw?.results,
  ].filter(Array.isArray);

  const daily = [];
  if (candidateDaily.length > 0) {
    for (const rec of candidateDaily[0]) {
      const date = rec?.date || rec?.day || rec?.report_date || rec?.reportDate || null;
      daily.push({ date, ...mapRow(rec) });
    }
  }

  // Totals: CarGurus returns aggregate fields at the top level of the response
  // alongside daily_stats. Map directly from raw first; fall back to summing daily rows.
  let totals = { ...emptyTotals };
  const topLevelCandidate = mapRow(raw || {});
  if (Object.values(topLevelCandidate).some(v => v > 0)) {
    totals = topLevelCandidate;
  } else if (daily.length > 0) {
    for (const d of daily) {
      for (const k of Object.keys(totals)) totals[k] += num(d[k]);
    }
  }

  const out = {
    last_updated: now.toISOString(),
    period: { start: periodStart, end: periodEnd },
    totals,
    daily,
  };

  // Always preserve the raw payload alongside, so we can refine the mapping
  // once we see what CarGurus actually returns.
  out.raw = raw;

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`[cargurus-dealer-stats] totals: ${JSON.stringify(totals)}`);
  console.log(`[cargurus-dealer-stats] daily rows: ${daily.length}`);
  console.log(`[cargurus-dealer-stats] wrote ${OUT_PATH}`);
}

main().catch(err => {
  console.error('[cargurus-dealer-stats] fatal:', err.message);
  process.exit(0);
});
