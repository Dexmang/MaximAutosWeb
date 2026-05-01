#!/usr/bin/env node
/**
 * IndexNow ping script for maximautos.com
 * Notifies Bing (and Yandex) about all site URLs for fast indexing.
 * Bing indexation = ChatGPT browse visibility.
 *
 * Run: node scripts/ping-indexnow.js
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KEY = "fcffbfb8b0ce72330d941855ad80fd56";
const HOST = "www.maximautos.com";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const BASE_URL = `https://${HOST}`;
const API_ENDPOINT = "https://api.indexnow.org/indexnow";

// ---------------------------------------------------------------------------
// Static pages
// ---------------------------------------------------------------------------
const STATIC_PATHS = [
  "/",
  "/inventory/",
  "/about/",
  "/contact/",
  "/faq/",
  "/financing/",
  "/apply/",
  "/testimonials/",
  "/sell-trade/",
  "/ship/",
  "/used-cars-chicago-north-shore/",
  "/used-cars-under-10000-skokie/",
  "/used-cars-under-15000-skokie/",
  "/used-subaru-skokie/",
  "/used-toyota-skokie/",
  "/used-honda-skokie/",
  "/used-audi-skokie/",
];

// ---------------------------------------------------------------------------
// Dynamic pages — suburbs
// ---------------------------------------------------------------------------
function buildSuburbUrls() {
  const dataPath = join(__dirname, "../site/src/data/suburbs.json");
  const suburbs = JSON.parse(readFileSync(dataPath, "utf-8"));
  return suburbs.map((s) => `/used-cars-${s.slug}-il/`);
}

// ---------------------------------------------------------------------------
// Dynamic pages — vehicles (available only)
// ---------------------------------------------------------------------------
function buildVehicleUrls() {
  const dataPath = join(__dirname, "../site/src/data/vehicles.json");
  const vehicles = JSON.parse(readFileSync(dataPath, "utf-8"));
  return vehicles
    .filter((v) => v.status === "available")
    .map((v) => `/vehicle/${v.slug}/`);
}

// ---------------------------------------------------------------------------
// Build full URL list
// ---------------------------------------------------------------------------
function buildUrlList() {
  const suburbPaths = buildSuburbUrls();
  const vehiclePaths = buildVehicleUrls();
  const allPaths = [...STATIC_PATHS, ...suburbPaths, ...vehiclePaths];
  return allPaths.map((p) => `${BASE_URL}${p}`);
}

// ---------------------------------------------------------------------------
// POST to IndexNow
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

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    console.log(`\nSuccess: HTTP ${response.status} — Bing accepted the ping.`);
  } else {
    const body = await response.text().catch(() => "(no body)");
    console.error(`\nFailed: HTTP ${response.status}`);
    console.error(`Response: ${body}`);
    process.exit(1);
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
    process.exit(1);
  }
})();
