#!/usr/bin/env node
/**
 * export-dc-photos.js
 *
 * Exports a VIN → DealerCenter photo map from the PKA hub database (ma_vehicles)
 * to site/src/data/dc-photos.json.
 *
 * Why this exists: maximautos.com uses DealerCenter's own CDN photos (the dealer's
 * uploads, pushed via the OAP SFTP feed) instead of CarGurus-scraped images. The
 * inventory sync (sync-from-cargurus.js) runs in GitHub Actions where pka_hub.db is
 * NOT reachable, so the DC photo URLs must be exported locally and committed, then
 * the sync reads this snapshot (matched on VIN) and applies DC photos to every car
 * -- including brand-new arrivals CarGurus is still showing with its own photos.
 *
 * This mirrors export-vin-trims.js exactly. Run it locally (on the PKA machine)
 * whenever new units / new photos land in DealerCenter, then commit the JSON.
 * The pull pipeline (pull_oap_sftp.py --rebuild-site) runs it automatically.
 *
 *   node scripts/export-dc-photos.js
 *
 * DB path defaults to the PKA hub layout (four levels up from scripts/); override
 * with PKA_HUB_DB.
 */

import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.PKA_HUB_DB || resolve(__dirname, '../../../../pka_hub.db');
const OUT_PATH = resolve(__dirname, '../site/src/data/dc-photos.json');

const db = new DatabaseSync(DB_PATH, { readOnly: true });
// Only non-archived units that actually carry DealerCenter CDN photos.
const rows = db
  .prepare("SELECT vin, photo_urls FROM ma_vehicles WHERE vin IS NOT NULL AND vin != '' AND photo_urls IS NOT NULL AND photo_urls != '' AND is_archived = 0")
  .all();
db.close();

const byVin = {};
for (const { vin, photo_urls } of rows) {
  let urls;
  try {
    urls = JSON.parse(photo_urls);
  } catch (_) {
    continue;
  }
  // DealerCenter CDN only — never let a stray CarGurus URL into the DC snapshot.
  urls = (Array.isArray(urls) ? urls : []).filter(u => typeof u === 'string' && u.includes('dealercenter'));
  if (!urls.length) continue;
  byVin[vin.toUpperCase()] = {
    primaryPhotoUrl: urls[0],
    photoUrls: urls,
    count: urls.length,
  };
}

writeFileSync(
  OUT_PATH,
  JSON.stringify({ source: 'pka_hub.db ma_vehicles', generated_at: new Date().toISOString(), by_vin: byVin }, null, 2) + '\n'
);
console.log(`Wrote ${Object.keys(byVin).length} VIN → DC-photo entries to ${OUT_PATH}`);
