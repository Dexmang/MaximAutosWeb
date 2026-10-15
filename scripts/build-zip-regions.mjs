#!/usr/bin/env node
/**
 * build-zip-regions.mjs  ::  writes site/src/data/zip-regions.json, the ZIP to Illinois
 * vehicle tax region table the out the door estimate reads.
 *
 * WHY A TABLE AND NOT AN API
 * Illinois publishes no vehicle tax rate API. The IDOR rate finder is an interactive form,
 * and vehicle (ST-556) rates change on fixed dates (January 1, July 1, and the special
 * August 1, 2026 collar county change), so a build time table refreshed on those dates is
 * more reliable than anything "live". Three rates cover almost every Maxim buyer:
 *   cook     Cook County suburb        (state 6.25% + NITA 1.25%)
 *   chicago  Chicago registration      (cook + Chicago home rule 1.25%)
 *   collar   DuPage, Kane, Lake, McHenry, Will (state 6.25% + NITA 1.00%, from 2026-08-01)
 *   il       the rest of Illinois      (state 6.25%, local rate confirmed at signing)
 * The RATES themselves live in facts.json (scripts/facts-core.mjs), not here. This file
 * only decides which region a ZIP belongs to.
 *
 * INPUT
 * The Census 2020 ZCTA to county relationship file, pipe delimited, national:
 *   https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt
 * It is 6.8 MB and is NOT committed. Download it, then:
 *   node scripts/build-zip-regions.mjs <path-to-tab20_zcta520_county20_natl.txt>
 * The output is small and IS committed, so a clean checkout builds without the download.
 *
 * NEVER UNDERSTATE RULE (SPEC 2026-10-11)
 * A ZCTA that touches more than one county takes the HIGHER rate: any Cook land means
 * cook, else any collar land means collar, else il. The estimate can therefore only
 * overstate in a split ZIP, never understate. The exact figure is always computed on the
 * buyer's registration address at signing, and the block says so.
 *
 * CHICAGO
 * The county crosswalk knows counties, not city limits. Every 606xx ZIP is inside Chicago, so
 * those are listed as chicago by prefix. A Cook ZIP outside 606 that ALSO contains Chicago
 * addresses (60707 Elmwood Park and Galewood, 60827 Riverdale and Altgeld Gardens, 60804
 * Cicero's Chicago edge) is listed in `chicagoSplit`, read from the Census 2020 ZCTA to PLACE
 * file (second argument): any ZCTA whose land inside the City of Chicago (place 1714000) is
 * at least SPLIT_SHARE of its area. The estimate starts those ZIPs with the Chicago switch ON,
 * so they overstate rather than understate (pax check 2026-10-13: the understatement was $68
 * to $212 on today's cars). Slivers under the share (O'Hare land inside 60018, 60007, 60106,
 * 60131, 60176) stay plain Cook: nobody lives on the airport.
 *   https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_place20_natl.txt
 *
 * ZCTAs are not USPS ZIPs. A PO box only ZIP has no ZCTA, so the estimate falls back to
 * the ZIP prefix (600 to 608 is treated as cook, the higher rate) and then to il.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../site/src/data/zip-regions.json');

const COOK = '17031';
const COLLAR = new Set(['17043', '17089', '17097', '17111', '17197']); // DuPage, Kane, Lake, McHenry, Will

const src = process.argv[2];
const placeSrc = process.argv[3];
if (!src || !placeSrc) {
  console.error('usage: node scripts/build-zip-regions.mjs <tab20_zcta520_county20_natl.txt> <tab20_zcta520_place20_natl.txt>');
  process.exit(2);
}
const CHICAGO_PLACE = '1714000';
const SPLIT_SHARE = 0.10;
// Land share is the only measure the Census file offers, and O'Hare's runways are Chicago
// land: 60018 Des Plaines reads 47% Chicago and 60106 Bensenville 28% on area alone, with no
// one registering a car on the airfield. Those two are suburbs for the estimate.
const AIRPORT_ZIPS = new Set(['60018', '60106']);

const lines = readFileSync(src, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
const header = lines[0].split('|');
const col = name => header.indexOf(name);
const iZip = col('GEOID_ZCTA5_20');
const iCounty = col('GEOID_COUNTY_20');
const iLand = col('AREALAND_PART');
if (iZip < 0 || iCounty < 0 || iLand < 0) {
  console.error('build-zip-regions: unexpected header, columns not found');
  process.exit(2);
}

// zip -> { cook: land, collar: land, il: land }
const acc = new Map();
let rows = 0;
for (const line of lines.slice(1)) {
  if (!line) continue;
  const f = line.split('|');
  const zip = f[iZip];
  const county = f[iCounty];
  if (!zip || !county || !county.startsWith('17')) continue;   // Illinois only
  rows++;
  const land = Number(f[iLand]) || 0;
  const key = county === COOK ? 'cook' : COLLAR.has(county) ? 'collar' : 'il';
  const a = acc.get(zip) || { cook: 0, collar: 0, il: 0 };
  a[key] += land;
  acc.set(zip, a);
}

const cook = [];
const collar = [];
const il = [];
for (const [zip, a] of [...acc.entries()].sort()) {
  if (zip.startsWith('606')) continue;                 // Chicago, handled by prefix
  if (a.cook > 0) cook.push(zip);
  else if (a.collar > 0) collar.push(zip);
  else il.push(zip);
}

// Chicago split ZIPs from the place file: Chicago land share of the ZCTA, outside the 606 prefix.
const plines = readFileSync(placeSrc, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
const ph = plines[0].split('|');
const pZip = ph.indexOf('GEOID_ZCTA5_20');
const pPlace = ph.indexOf('GEOID_PLACE_20');
const pZipLand = ph.indexOf('AREALAND_ZCTA5_20');
const pPart = ph.indexOf('AREALAND_PART');
const chicagoSplit = [];
const shares = [];
for (const line of plines.slice(1)) {
  if (!line) continue;
  const f = line.split('|');
  if (f[pPlace] !== CHICAGO_PLACE) continue;
  const zip = f[pZip];
  if (!zip || zip.startsWith('606')) continue;
  const share = (Number(f[pPart]) || 0) / (Number(f[pZipLand]) || 1);
  shares.push(`${zip} ${(share * 100).toFixed(1)}%${AIRPORT_ZIPS.has(zip) ? ' (airport, excluded)' : ''}`);
  if (share >= SPLIT_SHARE && !AIRPORT_ZIPS.has(zip)) chicagoSplit.push(zip);
}
chicagoSplit.sort();

const out = {
  generated: new Date().toISOString(),
  source:
    'GENERATED by scripts/build-zip-regions.mjs from the Census 2020 ZCTA to county ' +
    'relationship file (tab20_zcta520_county20_natl.txt). Never hand edit. Split ZIPs take ' +
    'the higher rate (cook over collar over il) so the estimate never understates.',
  rules: {
    chicagoPrefix: '606',
    cookFallbackPrefixes: ['600', '601', '602', '603', '604', '605', '607', '608'],
    illinoisRange: ['60000', '62999'],
  },
  cook,
  collar,
  il,
  // Cook ZIPs outside 606 with real Chicago land: the estimate starts them on the Chicago rate.
  chicagoSplit,
};

writeFileSync(OUT, JSON.stringify(out) + '\n', 'utf8');
console.log(`build-zip-regions: ${rows} Illinois rows, ${acc.size} ZCTAs`);
console.log(`  cook ${cook.length}  collar ${collar.length}  il ${il.length}  -> ${OUT}`);
console.log(`  Chicago land share outside 606: ${shares.join(', ')}`);
console.log(`  chicagoSplit (>= ${SPLIT_SHARE * 100}%): ${chicagoSplit.join(', ') || 'none'}`);
