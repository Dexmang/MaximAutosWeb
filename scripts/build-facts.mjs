#!/usr/bin/env node
/**
 * build-facts.mjs  ::  writes site/src/data/facts.json, the live number ledger.
 *
 * Runs in three places so the ledger can never be stale on any surface:
 *   1. site/package.json "prebuild"  -> fires on every Astro build, including the
 *      Vercel production build (buildCommand is `cd site && npm ci && npm run build`).
 *      This is the one that matters: production regenerates the ledger from the
 *      vehicles.json in the commit it is building, so a page can never state a band
 *      from a different inventory than the one it renders.
 *   2. the tail of scripts/build-inventory.js -> the 6 hourly sync commits a fresh
 *      copy, which keeps the non Astro consumers (llms.txt, the GoHighLevel fact
 *      sheet, the linter) reading current numbers without running a site build.
 *   3. by hand: `node scripts/build-facts.mjs`
 *
 * Exit code is ALWAYS 0 unless an input file is unreadable. This script must never be
 * the reason a deploy fails: on Vercel a failed build keeps the previous deployment
 * live, which would mean serving yesterday's inventory at yesterday's prices. That is
 * a worse outcome than any formatting problem this script could have.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveFacts } from './facts-core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../site/src/data');
const OUT_PATH = join(DATA_DIR, 'facts.json');

const DRY = process.argv.includes('--dry-run');

function readJson(name, fallback) {
  const p = join(DATA_DIR, name);
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    if (fallback !== undefined) {
      console.warn(`build-facts: could not read ${name} (${err.code || err.message}), using fallback`);
      return fallback;
    }
    throw new Error(`build-facts: required input ${name} is unreadable: ${err.message}`);
  }
}

function main() {
  const vehicles = readJson('vehicles.json');
  const reviews = readJson('reviews_meta.json', {});
  const suburbs = readJson('suburbs.json', []);

  const facts = deriveFacts({ vehicles, reviews, suburbs });

  const inv = facts.inventory;

  console.log('build-facts:');
  console.log(`  units for sale   ${inv.unitCount}`);
  console.log(`  price band       ${inv.bandText || '(none: no priced live unit)'}`);
  console.log(`  rating / count   ${facts.reviews.rating ?? '?'} / ${facts.reviews.count ?? '?'} (read ${facts.reviews.updated ?? 'unknown'})`);
  console.log(`  service cities   ${facts.cities.length}`);

  // Loud, because a band with no live unit inside it is the exact defect this ledger
  // exists to prevent, and a silent null would let a page render an empty range.
  if (!inv.usable) {
    console.warn('  ! NO PRICED LIVE UNIT. Price strings resolve to the open ended fallback.');
    console.warn('    Check the DealerCenter feed pull before trusting the site.');
  }

  if (DRY) {
    console.log('\n  --dry-run, nothing written. Would write:');
    console.log(JSON.stringify(facts, null, 2));
    return;
  }

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // Compare on everything except the timestamp, so an unchanged ledger does not
  // produce a git diff on every build and churn the repo history.
  let unchanged = false;
  try {
    const prev = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    const strip = o => JSON.stringify({ ...o, generated: null });
    unchanged = strip(prev) === strip(facts);
  } catch (_) {
    /* first run, or unreadable previous file: write it */
  }

  if (unchanged) {
    console.log(`  facts.json unchanged, left alone (no timestamp churn)`);
    return;
  }

  writeFileSync(OUT_PATH, JSON.stringify(facts, null, 2) + '\n', 'utf8');
  console.log(`  wrote ${OUT_PATH}`);
}

try {
  main();
} catch (err) {
  console.error(`build-facts FAILED: ${err.message}`);
  process.exit(1);
}
