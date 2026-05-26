#!/usr/bin/env node
/**
 * Google Merchant Center — Vehicle Listings feed generator
 *
 * 2026 context: Google deprecated organic Vehicle Listings panels populated
 * from on-site Car schema. The only remaining path for "Cars for Sale"
 * surfaces on Search + Maps is a Merchant Center automotive feed registered
 * as a Vehicle Ads / Vehicle Listings program.
 *
 * Reads:   site/src/data/vehicles.json
 * Writes:  web_assets/feeds/vehicles.xml
 *
 * Submit by hosting at https://www.maximautos.com/feeds/vehicles.xml and
 * registering the URL as a "Vehicle inventory feed" inside Merchant Center.
 * Daily fetch cadence is the recommended minimum.
 *
 * Spec reference:
 *   https://support.google.com/merchants/answer/9080793   (vehicle ads spec)
 *   https://support.google.com/merchants/answer/9136320   (feed attributes)
 *
 * 2026 rejection-reason watchlist (avoid these or the whole account gets
 * disapproved, not just the affected row, per March 2026 enforcement
 * tightening):
 *   - Price / mileage / VIN mismatch between feed and live VDP landing page
 *   - Used vehicle accidentally tagged build_to_order
 *   - Duplicate VIN across rows (each row must be unique by id)
 *   - Missing required image (image_link must be ≥250x250, publicly reachable)
 *   - Condition mismatch (used inventory must declare condition=used)
 *
 * Run: node scripts/build-gmc-feed.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_HOST = "https://www.maximautos.com";
const DEALER_NAME = "Maxim Autos";
const DEALER_PHONE = "+18475108947";
const DEALER_ADDRESS_LOCALITY = "Skokie";
const DEALER_ADDRESS_REGION = "IL";
const DEALER_POSTAL = "60077";

const VEHICLES_PATH = join(__dirname, "../site/src/data/vehicles.json");
const FEED_DIR = join(__dirname, "../web_assets/feeds");
const FEED_PATH = join(FEED_DIR, "vehicles.xml");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape XML entities. Mandatory for any text we drop into element bodies.
 */
function xmlEscape(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build an opening + closing tag pair around an escaped value.
 * Returns an empty string when the value is missing — Google rejects
 * empty-string required attributes, but unset attributes are tolerated
 * for everything that isn't strictly required.
 */
function tag(name, value) {
  if (value === undefined || value === null || value === "") return "";
  return `    <g:${name}>${xmlEscape(value)}</g:${name}>\n`;
}

/**
 * Map our internal condition string to Google's enum.
 */
function mapCondition(v) {
  const c = (v.condition || "Used").toLowerCase();
  if (c === "new") return "new";
  if (c === "certified" || c === "cpo") return "certified_pre_owned";
  return "used";
}

/**
 * Map drivetrain string to Google's drivetrain enum.
 * Google accepts: 2WD, 4WD, AWD, FWD, RWD.
 */
function mapDrivetrain(v) {
  const d = (v.drivetrain || "").toUpperCase();
  if (["FWD", "RWD", "AWD", "4WD", "2WD"].includes(d)) return d;
  return undefined;
}

/**
 * Map transmission to Google's enum: automatic | manual | other.
 */
function mapTransmission(v) {
  const t = (v.transmission || "").toLowerCase();
  if (t.includes("manual")) return "manual";
  if (t.includes("auto") || t.includes("cvt") || t.includes("dct") || t.includes("dual-clutch")) return "automatic";
  return undefined;
}

/**
 * Map fuel type string to Google's enum.
 * Google accepts: gasoline | diesel | biodiesel | ethanol_flex_fuel |
 *                 natural_gas | hydrogen | hybrid | plugin_hybrid | electric.
 */
function mapFuelType(v) {
  const f = (v.fuelType || "").toLowerCase();
  if (f.includes("electric") && !f.includes("hybrid")) return "electric";
  if (f.includes("plug")) return "plugin_hybrid";
  if (f.includes("hybrid")) return "hybrid";
  if (f.includes("diesel")) return "diesel";
  if (f.includes("flex")) return "ethanol_flex_fuel";
  if (f.includes("natural")) return "natural_gas";
  if (f.includes("hydrogen")) return "hydrogen";
  return "gasoline";
}

/**
 * Body style → Google enum.
 * Accepts: convertible | coupe | hatchback | minivan | suv | sedan | truck | wagon | crossover | van | other
 */
function mapBodyStyle(v) {
  const b = (v.bodyStyle || "").toLowerCase();
  if (b.includes("convert")) return "convertible";
  if (b.includes("coupe")) return "coupe";
  if (b.includes("hatch")) return "hatchback";
  if (b.includes("minivan")) return "minivan";
  if (b.includes("crossover")) return "crossover";
  if (b.includes("suv")) return "suv";
  if (b.includes("truck") || b.includes("pickup")) return "truck";
  if (b.includes("wagon")) return "wagon";
  if (b.includes("van")) return "van";
  if (b.includes("sedan")) return "sedan";
  return "other";
}

/**
 * Build a single <item> for a vehicle row.
 * Returns null for vehicles that lack the minimum required fields.
 */
function buildItem(v) {
  // Required field gate. Any of these missing → skip the row to avoid
  // tripping account-level disapproval.
  if (!v.slug || !v.vin || v.vin === "TBD" || !v.year || !v.make || !v.model) {
    console.warn(`SKIP ${v.slug || "(no slug)"} — missing required field (vin/year/make/model)`);
    return null;
  }

  const link = `${SITE_HOST}/vehicle/${v.slug}/`;
  const imageLink = (v.photoUrls && v.photoUrls[0]) || v.primaryPhotoUrl;
  if (!imageLink) {
    console.warn(`SKIP ${v.slug} — no image_link`);
    return null;
  }

  const title = `${v.year} ${v.make} ${v.model} ${v.trim || ""}`.trim();
  const description = (v.description || `${title} — ${v.mileage > 0 ? v.mileage.toLocaleString() + " miles" : ""} ${v.engine || ""} ${v.transmission || ""} ${v.drivetrain || ""}. Fully inspected. CARFAX included. Maxim Autos, Skokie IL.`).slice(0, 5000);

  // Extra image_link entries (Google accepts up to 10 additional images).
  const extraImages = (v.photoUrls || [])
    .slice(1, 11)
    .map((u) => `    <g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>\n`)
    .join("");

  let item = "  <item>\n";
  item += tag("id", v.vin); // VIN is the natural unique id for vehicle feeds
  item += tag("title", title);
  item += tag("description", description);
  item += tag("link", link);
  item += tag("image_link", imageLink);
  item += extraImages;
  item += tag("condition", mapCondition(v));
  item += tag("price", `${v.price} USD`);
  item += tag("availability", v.status === "sold" ? "out_of_stock" : "in_stock");
  item += tag("brand", v.make);

  // Required vehicle attributes
  item += tag("vehicle_fulfillment", "own_inventory");
  item += tag("vehicle_id", v.vin);
  item += tag("vin", v.vin);
  item += tag("year", v.year);
  item += tag("make", v.make);
  item += tag("model", v.model);
  item += tag("trim", v.trim);
  item += tag("mileage", `${v.mileage} MI`);
  item += tag("body_style", mapBodyStyle(v));

  // Recommended
  const dt = mapDrivetrain(v);
  if (dt) item += tag("drivetrain", dt);
  const trans = mapTransmission(v);
  if (trans) item += tag("transmission", trans);
  item += tag("fuel_type", mapFuelType(v));
  item += tag("vehicle_color", v.exteriorColor);

  // Dealer location — strictly speaking Google reads this from MC settings,
  // but echoing it here makes the feed self-describing and easier to debug.
  item += tag("store_code", "maxim-autos-skokie");

  item += "  </item>\n";
  return item;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function buildFeed() {
  const vehicles = JSON.parse(readFileSync(VEHICLES_PATH, "utf-8"));
  const available = vehicles.filter((v) => v.status !== "sold");

  const now = new Date().toISOString();
  const itemsXml = available
    .map(buildItem)
    .filter((x) => x !== null)
    .join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${xmlEscape(DEALER_NAME)} — Vehicle Inventory</title>
  <link>${SITE_HOST}/</link>
  <description>Used vehicles for sale at ${xmlEscape(DEALER_NAME)} in ${xmlEscape(DEALER_ADDRESS_LOCALITY)}, ${xmlEscape(DEALER_ADDRESS_REGION)} ${xmlEscape(DEALER_POSTAL)}. Phone ${xmlEscape(DEALER_PHONE)}.</description>
  <lastBuildDate>${now}</lastBuildDate>
${itemsXml}</channel>
</rss>
`;

  if (!existsSync(FEED_DIR)) {
    mkdirSync(FEED_DIR, { recursive: true });
  }
  writeFileSync(FEED_PATH, feed, "utf-8");

  const skipped = vehicles.length - available.length;
  const written = (feed.match(/<item>/g) || []).length;
  console.log(`GMC feed written to ${FEED_PATH}`);
  console.log(`  total vehicles in vehicles.json: ${vehicles.length}`);
  console.log(`  excluded (sold): ${skipped}`);
  console.log(`  written to feed: ${written}`);
}

try {
  buildFeed();
} catch (err) {
  console.error("Feed build failed:", err);
  process.exit(1);
}
