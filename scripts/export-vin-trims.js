#!/usr/bin/env node
/**
 * export-vin-trims.js
 *
 * Exports a VIN → trim map from the PKA hub database (ma_vehicles table)
 * to site/src/data/vin-trims.json.
 *
 * Why this exists: CarGurus normalizes dealer-supplied trims against its own
 * catalog and blanks any that don't match, so the inventory sync sometimes
 * receives an empty trim. sync-from-cargurus.js falls back to this snapshot
 * (matched on VIN). The sync runs in GitHub Actions where pka_hub.db is not
 * available, so the snapshot must be generated locally and committed.
 *
 * Run it (locally, on the PKA machine) whenever new units land in
 * DealerCenter / ma_vehicles, then commit the updated JSON:
 *   node scripts/export-vin-trims.js
 *
 * DB path defaults to the PKA hub layout (four levels up from scripts/);
 * override with the PKA_HUB_DB env var if the repo lives elsewhere.
 */

import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.PKA_HUB_DB || resolve(__dirname, '../../../../pka_hub.db');
const OUT_PATH = resolve(__dirname, '../site/src/data/vin-trims.json');

/**
 * ma_vehicles trims come from DealerCenter and often carry a body-style
 * suffix and odd casing ("Le Sedan 4d", "2.0t Premium Plus Sport Utility 4d").
 * Strip the suffix and restore trim-code casing so the value is display-ready
 * for page titles and spec tables.
 */
function cleanDbTrim(raw) {
  let t = String(raw || '').trim();
  if (!t) return '';

  // Drop the trailing body-style descriptor and everything after it.
  t = t.replace(/\s+(sport utility|sedan|coupe|wagon|minivan|convertible|hatchback|pickup|van)\b.*$/i, '');

  // Restore casing on trim codes: "le" → "LE", "ex-l" → "EX-L", "1.8t" → "1.8T".
  // Short tokens that are real words, not trim codes, keep their casing.
  const NOT_A_CODE = new Set(['cab', 'fe', 'van']);
  t = t
    .split(/\s+/)
    .map(word =>
      word
        .split('-')
        .map(part => {
          if (NOT_A_CODE.has(part.toLowerCase())) return part;
          if (/^\d+(\.\d+)?[a-z]$/i.test(part)) return part.toUpperCase(); // 2.0t → 2.0T
          if (/^[a-z0-9.]{1,3}$/i.test(part) && /[a-z]/i.test(part)) return part.toUpperCase(); // le, xlt, t6, 4xe
          return part;
        })
        .join('-')
    )
    .join(' ');

  return t.trim();
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = db
  .prepare("SELECT vin, trim FROM ma_vehicles WHERE vin IS NOT NULL AND vin != '' AND trim IS NOT NULL AND trim != ''")
  .all();
db.close();

const byVin = {};
for (const { vin, trim } of rows) {
  const cleaned = cleanDbTrim(trim);
  if (cleaned) byVin[vin.toUpperCase()] = cleaned;
}

writeFileSync(
  OUT_PATH,
  JSON.stringify({ source: 'pka_hub.db ma_vehicles', generated_at: new Date().toISOString(), by_vin: byVin }, null, 2) + '\n'
);
console.log(`Wrote ${Object.keys(byVin).length} VIN → trim entries to ${OUT_PATH}`);
