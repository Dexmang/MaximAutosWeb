#!/usr/bin/env node
/**
 * build-llms.mjs  ::  generates web_assets/llms.txt from web_assets/llms.template.txt.
 *
 * WHY THIS IS GENERATED NOW
 * llms.txt is the file answer engines read to learn what Maxim Autos is, so a stale claim
 * here propagates into ChatGPT, Perplexity and AI Overviews answers rather than just
 * sitting on a page nobody visits. It was hand authored, and on 2026-07-26 it still
 * carried two live violations that had already been purged everywhere else: the guardrail
 * C8 blanket protection claim, and the "$5,000 to $15,000" band that no car in stock fell
 * inside (14 Ill. Adm. Code 475.390).
 *
 * Hand authored prose plus numbers that move is a drift machine. The template holds the
 * prose, {{tokens}} hold the numbers, and site/src/data/facts.json is the only source of
 * those numbers.
 *
 * Runs as part of the site prebuild, right after build-facts.mjs, so the ledger it reads
 * is always the one built from the same inventory as the pages.
 *
 * Exits non zero ONLY if the template is missing or a token is unresolvable, and it is
 * never wired into the Vercel production build directly for the reason spelled out in
 * scripts/lint-copy.mjs: a failed build keeps the previous deployment serving stale
 * inventory, which is worse than any copy defect.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTokens, KNOWN_TOKENS } from './facts-core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(__dirname, '../web_assets/llms.template.txt');
const OUT = join(__dirname, '../web_assets/llms.txt');
const FACTS = join(__dirname, '../site/src/data/facts.json');

const DRY = process.argv.includes('--dry-run');

function main() {
  if (!existsSync(TEMPLATE)) throw new Error(`template missing: ${TEMPLATE}`);
  if (!existsSync(FACTS)) throw new Error(`ledger missing: ${FACTS}. Run build-facts.mjs first.`);

  const facts = JSON.parse(readFileSync(FACTS, 'utf8'));
  const raw = readFileSync(TEMPLATE, 'utf8');

  // Strip the maintainer note. It is guidance for a human editing the template, not
  // content for a crawler.
  const body = raw.replace(/^(?:#[^\n]*\n)+\n?/, '');

  const out = resolveTokens(body, facts);

  // An unresolved token means a sentence is now missing a number a reader needs. Fail
  // loudly rather than publishing "priced {{price.band}}" to an answer engine.
  const leftover = [...out.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z.]*)\s*\}\}/g)].map(m => m[1]);
  if (leftover.length) {
    throw new Error(
      `unresolved token(s): ${[...new Set(leftover)].join(', ')}\n` +
      `  known tokens: ${KNOWN_TOKENS.join(', ')}`
    );
  }

  console.log('build-llms:');
  console.log(`  band     ${facts.inventory.bandText || '(none)'}`);
  console.log(`  rating   ${facts.reviews.ratingValue ?? '?'}`);
  console.log(`  bytes    ${Buffer.byteLength(out, 'utf8')}`);

  if (DRY) {
    console.log('\n  --dry-run, nothing written.\n');
    console.log(out);
    return;
  }

  let unchanged = false;
  try { unchanged = readFileSync(OUT, 'utf8') === out; } catch (_) { /* first run */ }
  if (unchanged) {
    console.log('  llms.txt unchanged, left alone');
    return;
  }
  writeFileSync(OUT, out, 'utf8');
  console.log(`  wrote ${OUT}`);
}

try {
  main();
} catch (err) {
  console.error(`build-llms FAILED: ${err.message}`);
  process.exit(1);
}
