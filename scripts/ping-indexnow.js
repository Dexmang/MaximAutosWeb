#!/usr/bin/env node
/**
 * IndexNow ping script for maximautos.com
 * Notifies Bing (and Yandex/Seznam/Naver) about site URLs for fast indexing.
 * Bing indexation = ChatGPT browse visibility.
 *
 * WHEN IT RUNS: automatically after every successful deploy — the
 * ping-indexnow job in .github/workflows/deploy.yml (which sync-inventory.yml
 * dispatches after committing inventory changes). Pinging only AFTER deploy
 * guarantees engines recrawl the NEW content, never the pre-deploy state.
 *
 * WHAT IT SUBMITS (deduped, no trailing slashes — matches the site's
 * trailingSlash 'never' canonicals):
 *   1. Static pages + suburb SEO pages
 *   2. Every available vehicle VDP
 *   3. URLs from recent url-events.jsonl transitions (sold / removed /
 *      slug_changed / back_on_market in the last RECENT_EVENT_DAYS) so
 *      engines recrawl pages that flipped to noindex or now 301
 *   4. Recently retired slugs from retired-slugs.json (their URLs 301 to
 *      /inventory or the replacement VDP)
 *
 * NON-FATAL BY DESIGN: every failure logs and exits 0. An indexing ping must
 * never break the deploy pipeline. Safe to re-run any number of times
 * (IndexNow submissions are idempotent).
 *
 * Run: node scripts/ping-indexnow.js            # build list + POST
 *      node scripts/ping-indexnow.js --dry-run  # build + print list, no POST
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KEY = "76980478ce9702418ac38bb19b2d39db";
const HOST = "www.maximautos.com";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const BASE_URL = `https://${HOST}`;
const API_ENDPOINT = "https://api.indexnow.org/indexnow";
const DRY_RUN = process.argv.includes("--dry-run");

// 14, not 7, to match how long a sold VDP is retained in the sitemap by the custom
// serializer in astro.config.mjs. At 7 a car that sold 10 days ago was still in the
// sitemap but no longer being announced, so the transition Google most needed to hear
// about was the one it was not told.
const RECENT_EVENT_DAYS = 14;   // url-events.jsonl lookback
const RECENT_RETIRED_DAYS = 30; // retired-slugs.json lookback

// ---------------------------------------------------------------------------
// FALLBACK ONLY. buildSitemapUrls() is the real source; this list is used only when
// the site has not been built. Kept deliberately short and does not need maintaining.
// (no trailing slashes, canonical form)
// ---------------------------------------------------------------------------
const STATIC_PATHS = [
  "/",
  "/inventory",
  "/about",
  "/contact",
  "/faq",
  "/financing",
  "/apply",
  "/testimonials",
  "/sell-trade",
  "/ship",
  "/used-cars-chicago-north-shore",
  "/used-cars-under-10000-skokie",
  "/used-cars-under-15000-skokie",
  "/used-subaru-skokie",
  "/used-toyota-skokie",
  "/used-honda-skokie",
];

function readJson(relPath) {
  return JSON.parse(readFileSync(join(__dirname, relPath), "utf-8"));
}

// Normalize any site URL/path to canonical absolute form (no trailing slash).
function canonicalUrl(pathOrUrl) {
  let u = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  if (u.length > BASE_URL.length + 1 && u.endsWith("/")) u = u.slice(0, -1);
  return u;
}

// ---------------------------------------------------------------------------
// Dynamic pages — suburbs
// ---------------------------------------------------------------------------
function buildSuburbUrls() {
  const suburbs = readJson("../site/src/data/suburbs.json");
  return suburbs.map((s) => `/used-cars-${s.slug}-il`);
}

// ---------------------------------------------------------------------------
// Dynamic pages — vehicles (available only)
// ---------------------------------------------------------------------------
function buildVehicleUrls() {
  const vehicles = readJson("../site/src/data/vehicles.json");
  return vehicles
    .filter((v) => v.status === "available")
    .map((v) => `/vehicle/${v.slug}`);
}

// ---------------------------------------------------------------------------
// Recent URL transitions (sold / removed / slug changes / back_on_market).
// Sold VDPs are 200+noindex and retired slugs 301 — engines only learn that
// by recrawling, so the changed URLs must be in the submission.
// ---------------------------------------------------------------------------
function buildRecentEventUrls() {
  const eventsPath = join(__dirname, "../site/src/data/url-events.jsonl");
  if (!existsSync(eventsPath)) return [];
  const cutoff = Date.now() - RECENT_EVENT_DAYS * 24 * 60 * 60 * 1000;
  const urls = [];
  for (const line of readFileSync(eventsPath, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.url && Date.parse(e.ts) >= cutoff) urls.push(canonicalUrl(e.url));
    } catch (_) {
      /* skip malformed line */
    }
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Recently retired slugs (pages no longer built; URLs now 301)
// ---------------------------------------------------------------------------
function buildRetiredUrls() {
  const retiredPath = join(__dirname, "../site/src/data/retired-slugs.json");
  if (!existsSync(retiredPath)) return [];
  const cutoff = Date.now() - RECENT_RETIRED_DAYS * 24 * 60 * 60 * 1000;
  let retired = {};
  try {
    retired = JSON.parse(readFileSync(retiredPath, "utf-8"))?.retired || {};
  } catch (_) {
    return [];
  }
  return Object.entries(retired)
    .filter(([, info]) => !info.retired_at || Date.parse(info.retired_at) >= cutoff)
    .map(([slug]) => `/vehicle/${slug}`);
}

// ---------------------------------------------------------------------------
// Build full URL list
// ---------------------------------------------------------------------------
/**
 * Every <loc> in the built sitemap.
 *
 * The sitemap is the right source and the hand written STATIC_PATHS list was not. On
 * 2026-07-26 that array was missing /used-suvs-skokie-il, /privacy-policy, /return-policy,
 * /terms and all 8 Spanish pages, while still listing /used-audi-skokie, which had just
 * been retired to a 301. A hand list of URLs drifts for exactly the same reason a hand
 * written price band drifts.
 *
 * The sitemap also already encodes the rules this script was trying to reimplement: the
 * custom serializer in astro.config.mjs drops sold VDPs after 14 days and excludes
 * anything noindexed. Reading it means one source of truth for "which URLs exist".
 *
 * Returns [] if the site has not been built, and the caller falls back to the hand list.
 */
function buildSitemapUrls() {
  const candidates = [
    join(__dirname, '../site/dist/sitemap-0.xml'),
    join(__dirname, '../site/dist/sitemap-index.xml'),
  ];
  for (const file of candidates) {
    try {
      const xml = readFileSync(file, 'utf-8');
      const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
      // sitemap-index only lists other sitemaps, so ignore it if that is all we got.
      const pages = locs.filter(u => !/sitemap[-\w]*\.xml$/i.test(u));
      if (pages.length) {
        console.log(`URL source: ${file.replace(/.*[\\/]/, '')} (${pages.length} locs)`);
        return pages;
      }
    } catch (_) {
      /* not built yet, try the next candidate */
    }
  }
  return [];
}

function buildUrlList() {
  const fromSitemap = buildSitemapUrls();

  // The sitemap covers every live page. The extra sources below cover URLs that
  // deliberately are NOT in it but still need announcing: retired slugs now 301ing, and
  // recent added/sold/slug_changed transitions.
  const base = fromSitemap.length
    ? fromSitemap
    : (console.warn('URL source: sitemap not found, falling back to the hand written STATIC_PATHS'),
       [...STATIC_PATHS, ...buildSuburbUrls(), ...buildVehicleUrls()]);

  const allPaths = [...base, ...buildRetiredUrls()].map(canonicalUrl);
  const withEvents = [...allPaths, ...buildRecentEventUrls()];
  return [...new Set(withEvents)].slice(0, 10000); // IndexNow spec cap
}

// ---------------------------------------------------------------------------
// POST to IndexNow (never throws, never exits non-zero)
// ---------------------------------------------------------------------------
async function pingIndexNow(urlList) {
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  console.log(`\nIndexNow ping — ${urlList.length} URLs to ${API_ENDPOINT}`);
  console.log("URLs being submitted:");
  urlList.forEach((u) => console.log(`  ${u}`));

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No POST sent. This list fires automatically after the next deploy.");
    return;
  }

  async function attempt() {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const body = await response.text().catch(() => "(no body)");
    return { ok: response.ok, status: response.status, body };
  }

  let result;
  try {
    result = await attempt();
    if (!result.ok) {
      console.warn(`\nAttempt 1 failed: HTTP ${result.status} ${result.body}. Retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
      result = await attempt();
    }
  } catch (e) {
    console.warn(`\nNetwork error: ${e.message}. Retrying in 5s...`);
    await new Promise((r) => setTimeout(r, 5000));
    try {
      result = await attempt();
    } catch (e2) {
      result = { ok: false, status: 0, body: `network: ${e2.message}` };
    }
  }

  if (result.ok) {
    console.log(`\nSuccess: HTTP ${result.status} — IndexNow accepted the ping.`);
  } else {
    // Non-fatal: log loudly but do NOT fail the pipeline over an indexing ping.
    console.error(`\nFailed after retry: HTTP ${result.status} — ${result.body}`);
    console.error("Continuing anyway (non-fatal by design; next deploy re-pings everything).");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  try {
    const urlList = buildUrlList();
    await pingIndexNow(urlList);
    console.log("\nIndexNow ping complete.");
  } catch (err) {
    console.error("\nUnexpected error:", err.message);
    console.error("Exiting 0 anyway — the ping must never break a deploy.");
  }
})();
