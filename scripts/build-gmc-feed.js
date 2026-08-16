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
 *      node scripts/build-gmc-feed.js --strict
 *
 * --strict: exit 2 when any active (non-sold) vehicle is skipped or when the
 * feed would be empty. Used by CI so a partial/empty feed never gets
 * committed silently — the workflow's failure alert fires instead.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STRICT = process.argv.includes("--strict");

const SITE_HOST = "https://www.maximautos.com";
const DEALER_NAME = "Maxim Autos";
const DEALER_PHONE = "+18475108947";
const DEALER_ADDRESS_LOCALITY = "Skokie";
const DEALER_ADDRESS_REGION = "IL";
const DEALER_POSTAL = "60077";

const VEHICLES_PATH = join(__dirname, "../site/src/data/vehicles.json");
// dc-inventory.json is the committed snapshot of the NEWEST DealerCenter OAP
// (SFTP) feed. It is the book of record for what is for sale.
const DC_INVENTORY_PATH = join(__dirname, "../site/src/data/dc-inventory.json");
// Optional per-VIN hero overrides: { VIN: photoUrls index }. Used only when a
// gallery does not follow the standard shoot order, so the default hero pick
// (photoUrls[2]) would land on a rear angle. See the file's _comment.
const HERO_OVERRIDES_PATH = join(__dirname, "../site/src/data/gmc-hero-overrides.json");
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

// Note: drivetrain, transmission, and fuel_type mappers were removed —
// none of those attributes are in the Vehicle Ads feed spec. Google was
// rejecting them as "unrecognized attributes". The closest Vehicle Ads
// attribute is `<g:engine>` (gasoline|diesel|electric|hybrid) but it's only
// required for DE/IT/ES, optional for US, so we don't emit it.

/**
 * Body style → Vehicle Ads spec enum.
 * Accepted passenger-car values, verified against the live attribute table at
 * https://support.google.com/merchants/answer/11192663 on 2026-07-25:
 *   city_car | compact_suv | convertible | coupe | crossover | full_size_van |
 *   hatchback | limousine | minivan | notchback | sedan | station_wagon | suv |
 *   truck | ute
 * (the table also carries ATV/UTV/RV values we never emit).
 *
 * NOTE: multi-word values are UNDERSCORE separated. This function previously
 * emitted "station wagon" and "full size van" with spaces, which the Vehicle Ads
 * parser rejects as "Invalid value".
 *
 * Anything outside this list is rejected as "Invalid value" by Vehicle Ads parser.
 * Returns null when no spec value fits → caller omits the tag rather than
 * emitting an unknown value.
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
  if (b.includes("wagon")) return "station_wagon";
  if (b.includes("van")) return "full_size_van";
  if (b.includes("sedan")) return "sedan";
  return null;
}

/**
 * Build a single <item> for a vehicle row.
 * Returns null for vehicles that lack the minimum required fields.
 */
function buildItem(v) {
  // Required field gate. Any of these missing → skip the row to avoid
  // tripping account-level disapproval.
  // mileage and color are REQUIRED by the Vehicle Ads spec, not recommended —
  // the older note in google-vehicle-ads-ops.md listing them as recommended was
  // wrong. Emitting an item without them ships a spec-incomplete offer, and
  // item-level rejections escalate to account-level issues. Skipping the row is
  // strictly safer than shipping it incomplete.
  // Ref: https://support.google.com/merchants/answer/11192663
  if (!v.slug || !v.vin || v.vin === "TBD" || !v.year || !v.make || !v.model) {
    console.warn(`SKIP ${v.slug || "(no slug)"} — missing required field (vin/year/make/model)`);
    return null;
  }
  if (!(Number(v.mileage) > 0)) {
    console.warn(`SKIP ${v.slug} — missing required field (mileage)`);
    return null;
  }
  if (!v.exteriorColor) {
    console.warn(`SKIP ${v.slug} — missing required field (color)`);
    return null;
  }

  // NO TRAILING SLASH. astro.config.mjs sets trailingSlash: 'never', so the VDP
  // canonical and the Offer.url both read /vehicle/<slug> with no slash. Both forms
  // return 200 (verified live 2026-07-26), so a slashed g:link sends Merchant Center to
  // a duplicate URL whose canonical points somewhere else. That landing page versus
  // canonical mismatch is the disapproval pattern behind DB tasks #114, #132 and #154.
  // This string must stay byte identical to the canonical the VDP emits.
  const link = `${SITE_HOST}/vehicle/${v.slug}`;

  // ---------------------------------------------------------------------------
  // IMAGES — the feed must never carry the branded lead photo.
  //
  // DealerCenter burns a promotional overlay into the FIRST photo of every unit:
  // the Maxim Autos logo, feature callout pills, "NO DEALER FEES. EVER.", a
  // "CALL / TEXT 847-510-8947" button, a CARFAX Advantage Dealer badge, and a
  // Google 5.0/5 stars graphic (which also reuses Google's own logo).
  //
  // Google's Vehicle Ads image guidelines disapprove images with overlaid
  // watermarks or superimposed logos/text, and promotional-overlay images are
  // the CONFIRMED trigger of the 2026-07-11 GBP suspension (guardrail A2).
  // Ref: https://support.google.com/merchants/answer/11190670
  //
  // Verified 2026-07-25 by downloading every image_link in the live feed (7/7
  // branded) plus all 10 additional_image_link entries for two units (20/20
  // clean). The overlay is applied to photo[0] only; photos[1..] are genuine
  // unedited photographs.
  //
  // So Google gets the clean set only. The website and Facebook Marketplace keep
  // the branded lead, where overlays are permitted and convert well — do not
  // propagate this change to those surfaces.
  //
  // Hero angle: DealerCenter's shoot order is consistent across all 7 units —
  // [0] branded lead, [1] straight-on front, [2] front-to-side ~45°. Google
  // recommends a front-to-side ~45° main image and explicitly warns against a
  // rear angle, so the hero is photo[2] when it exists. Verified by eye on all
  // 7 units. Falls back to the first clean photo for short galleries.
  // ---------------------------------------------------------------------------
  const BRANDED_LEAD_PHOTOS = 1; // photo[0] carries the promotional overlay
  const HERO_OFFSET = 1; // within cleanPhotos: the front-to-side ~45° shot
  const cleanPhotos = (v.photoUrls || []).slice(BRANDED_LEAD_PHOTOS);
  let heroIndex = cleanPhotos.length > HERO_OFFSET ? HERO_OFFSET : 0;
  // Per-VIN override (gmc-hero-overrides.json), expressed as a photoUrls index.
  // Index 0 is the branded lead and is refused; out-of-range values are ignored
  // with a warning so a stale entry can never blank a hero.
  const override = HERO_OVERRIDES[(v.vin || "").toUpperCase()];
  if (override !== undefined) {
    const idx = Number(override) - BRANDED_LEAD_PHOTOS;
    if (Number.isInteger(idx) && idx >= 0 && idx < cleanPhotos.length) {
      heroIndex = idx;
    } else {
      console.warn(`WARN ${v.slug} — hero override ${override} ignored (branded lead or out of range)`);
    }
  }
  const imageLink = cleanPhotos[heroIndex];
  if (!imageLink) {
    console.warn(`SKIP ${v.slug} — no unbranded image available for image_link`);
    return null;
  }

  const title = `${v.year} ${v.make} ${v.model} ${v.trim || ""}`.trim();
  const description = (v.description || `${title} — ${v.mileage > 0 ? v.mileage.toLocaleString() + " miles" : ""} ${v.engine || ""} ${v.transmission || ""} ${v.drivetrain || ""}. Fully inspected. CARFAX included. Maxim Autos, Skokie IL.`).slice(0, 5000);

  // Extra image_link entries (Google accepts up to 10 additional images).
  // Drawn from the same clean set, skipping the one already used as image_link.
  const extraImages = cleanPhotos
    .filter((_, i) => i !== heroIndex)
    .slice(0, 10)
    .map((u) => `    <g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>\n`)
    .join("");

  // -------------------------------------------------------------------------
  // VEHICLE ADS SPEC — only emit attributes that are listed in the Vehicle Ads
  // feed spec. Anything else (drivetrain, fuel_type, transmission, vehicle_id,
  // vehicle_color) was shown by Google as "unrecognized attributes" and just
  // creates noise without helping.
  // Refs:
  //   - Vehicle Ads attribute spec: https://support.google.com/merchants/answer/11190480
  //   - link_template: https://support.google.com/merchants/answer/13871172
  //   - mileage:       https://support.google.com/google-ads/answer/14156166
  //   - vehicle_fulfillment: https://support.google.com/google-ads/answer/14154094
  //   - store_code:    https://support.google.com/merchants/answer/13869896
  //   - VIN:           https://support.google.com/google-ads/answer/14154510
  // -------------------------------------------------------------------------
  let item = "  <item>\n";

  // Universal product fields (also used by Vehicle Ads)
  item += tag("id", v.vin); // unique offer id; VIN is naturally unique
  item += tag("title", title);
  item += tag("description", description);
  item += tag("link", link);
  // link_template MUST include {store_code} ValueTrack placeholder, must start
  // with http(s)://. At serve time {store_code} is replaced with the actual
  // store_code value for the matching Business Profile location.
  item += tag("link_template", `${link}?store={store_code}`);
  item += tag("image_link", imageLink);
  item += extraImages;
  item += tag("condition", mapCondition(v));
  item += tag("price", `${v.price} USD`);
  // Membership is decided by presence in the newest DC feed (see buildFeed), and
  // a VIN in that feed is for sale by definition — so every row written here is
  // in_stock. Deriving this from the local status flag would let a stale flag
  // advertise a live car as out_of_stock.
  item += tag("availability", "in_stock");
  // brand and google_product_category — Google's per-product evaluator
  // flagged BOTH as required after I removed them. The Vehicle Ads attribute
  // spec table I read didn't list them but the actual Vehicle Ads policy
  // checker treats them as required. Re-added.
  item += tag("brand", v.make);
  item += tag("google_product_category", "Vehicles & Parts > Vehicles > Motor Vehicles > Cars, Trucks & Vans");

  // Destination targeting — vehicles MUST target the Vehicle ads program ONLY.
  // Google bans cars from standard Shopping ads + Free listings ("Unsupported
  // Shopping content (vehicles)"), which triggered the Jun 2026 suspension
  // warning (account 5555218279, deadline 2026-06-21). Explicitly excluding
  // these destinations at the feed level keeps the vehicles out of Shopping/Free
  // listings even if the MC data source defaults back to all destinations on a
  // refetch. Ref: support.google.com/merchants/answer/6150006 (Unsupported
  // Shopping content) + answer/11189169 (Vehicle ads overview).
  item += `    <g:excluded_destination>Shopping_ads</g:excluded_destination>\n`;
  item += `    <g:excluded_destination>Free_listings</g:excluded_destination>\n`;

  // Vehicle Ads required attributes
  item += tag("vin", v.vin);
  item += tag("year", v.year);
  item += tag("model", v.model);
  // mileage: value+unit in same field. Only "Miles/MILES/miles" or
  // "Km/KM/km" accepted as units — "MI" is rejected.
  item += tag("mileage", `${v.mileage} Miles`);

  // store_code — must match the Business Profile location's code. The GBP
  // for Maxim Autos auto-assigned 08861907241419503398 (visible at
  // business.google.com/locations). Top-level store_code is sufficient when
  // vehicle_fulfillment uses option=in_store (per spec the inner store_code
  // sub-attribute is optional in that case).
  item += tag("store_code", "08861907241419503398");

  // vehicle_fulfillment is a STRUCTURED/nested field, not a simple string.
  // Accepted option values: in_store | ship_to_store | online.
  // "own_inventory" (which I had before) is NOT a valid value — that was
  // confused with the Performance Max for Vehicle Ads fulfillment_type field.
  item += `    <g:vehicle_fulfillment>\n`;
  item += `      <g:option>in_store</g:option>\n`;
  item += `    </g:vehicle_fulfillment>\n`;

  // color is REQUIRED (gated above), so emit unconditionally.
  item += tag("color", v.exteriorColor);

  // Vehicle Ads optional but recommended attributes
  if (v.trim) item += tag("trim", v.trim);
  const bodyStyle = mapBodyStyle(v);
  if (bodyStyle) item += tag("body_style", bodyStyle);

  item += "  </item>\n";
  return item;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
/**
 * Load the optional hero override map. Missing file or a non-object is an
 * empty map; keys are upper-cased VINs, the `_comment` key is dropped.
 */
function loadHeroOverrides() {
  if (!existsSync(HERO_OVERRIDES_PATH)) return {};
  try {
    const raw = JSON.parse(readFileSync(HERO_OVERRIDES_PATH, "utf-8"));
    const out = {};
    for (const [k, val] of Object.entries(raw || {})) {
      if (k.startsWith("_")) continue;
      out[k.toUpperCase()] = val;
    }
    return out;
  } catch (err) {
    console.warn(`WARN could not read ${HERO_OVERRIDES_PATH}: ${err.message}; ignoring overrides`);
    return {};
  }
}
const HERO_OVERRIDES = loadHeroOverrides();

function buildFeed() {
  const vehicles = JSON.parse(readFileSync(VEHICLES_PATH, "utf-8"));

  // ---------------------------------------------------------------------------
  // MEMBERSHIP RULE (owner's standing instruction, 2026-07-25):
  // "The Google feed units should always match the latest FTP from DealerCenter,
  //  no matter sold or not."
  //
  // So membership is decided by PRESENCE IN THE NEWEST DC OAP FEED — never by a
  // status flag we keep on our side. DealerCenter is the book of record: a VIN in
  // the feed is for sale, a VIN that drops out is gone. Selecting on
  // `status !== "sold"` (the previous behaviour) let any stale or erroneous local
  // flag silently add or drop a car. That is exactly how J10210 ended up marked
  // sold in ma_vehicles while sitting live in tonight's feed and on the site.
  //
  // Anything not in the newest DC feed is excluded, which keeps the 20 sold VDPs
  // (kept live for SEO) out of the feed automatically.
  // ---------------------------------------------------------------------------
  const dcRaw = JSON.parse(readFileSync(DC_INVENTORY_PATH, "utf-8"));
  const dcByVin = dcRaw.by_vin || dcRaw;
  const dcVins = new Set(Object.keys(dcByVin).map((k) => k.toUpperCase()));
  if (dcVins.size === 0) {
    throw new Error("dc-inventory.json carries zero VINs — refusing to build an empty feed");
  }
  const available = vehicles.filter((v) => dcVins.has((v.vin || "").toUpperCase()));

  // Every VIN in the DC feed is for sale by definition, so nothing here can be
  // out_of_stock. A row whose local status still says sold is a local-flag bug,
  // not a signal — report it rather than letting it change the feed.
  const staleSold = available.filter((v) => v.status === "sold");

  // Parity check in the other direction: a DC VIN we cannot represent (no row in
  // vehicles.json yet) would silently shrink the feed.
  const vehicleVins = new Set(vehicles.map((v) => (v.vin || "").toUpperCase()));
  const dcMissingFromSite = [...dcVins].filter((vin) => !vehicleVins.has(vin));

  const now = new Date().toISOString();
  const skippedRows = [];
  const items = [];
  for (const v of available) {
    const item = buildItem(v);
    if (item === null) {
      skippedRows.push(v.slug || v.vin || v.stockNumber || "(unidentified row)");
    } else {
      items.push(item);
    }
  }
  const itemsXml = items.join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${xmlEscape(DEALER_NAME)} Vehicle Inventory</title>
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

  const written = items.length;
  console.log(`GMC feed written to ${FEED_PATH}`);
  console.log(`  VINs in newest DC feed (book of record): ${dcVins.size}`);
  console.log(`  total rows in vehicles.json: ${vehicles.length}`);
  console.log(`  matched to a DC VIN: ${available.length}`);
  console.log(`  written to feed: ${written}`);

  // Parity must be exact: feed VINs == DC feed VINs. Anything else is drift.
  if (dcMissingFromSite.length) {
    console.warn(
      `  WARNING: ${dcMissingFromSite.length} DC VIN(s) have no row in vehicles.json ` +
        `and are therefore missing from the Google feed: ${dcMissingFromSite.join(", ")}`
    );
  }
  if (staleSold.length) {
    console.warn(
      `  WARNING: ${staleSold.length} row(s) are in the DC feed but flagged sold locally ` +
        `(local-flag bug; included anyway per the DC-is-authoritative rule): ` +
        staleSold.map((v) => `${v.stockNumber || v.vin}`).join(", ")
    );
  }
  if (written === dcVins.size) {
    console.log(`  PARITY OK: feed matches the newest DC feed exactly (${written}/${dcVins.size})`);
  } else {
    console.warn(`  PARITY DRIFT: feed has ${written} of ${dcVins.size} DC VINs`);
  }

  if (STRICT && (written === 0 || written < available.length || dcMissingFromSite.length)) {
    console.error(
      `STRICT FAILURE: wrote ${written} of ${available.length} active vehicles` +
        (written === 0 ? " (feed is empty)" : "")
    );
    if (skippedRows.length > 0) {
      console.error(`  skipped rows: ${skippedRows.join(", ")}`);
    }
    process.exit(2);
  }
}

try {
  buildFeed();
} catch (err) {
  console.error("Feed build failed:", err);
  process.exit(1);
}
