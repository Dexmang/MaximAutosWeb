#!/usr/bin/env node
/**
 * lint-copy.mjs  ::  the one copy and compliance gate for maximautos.com.
 *
 * WHY ONE LINTER
 * The July 2026 design run proposed three separate linters. Three copies of one rule set
 * is three places to write a rule wrong, which is the same defect class as the 13
 * duplicated AggregateRating blocks and the two divergent Spanish Reg Z strings this
 * file exists to catch. There is one rule table, here.
 *
 * WHERE IT RUNS, AND WHY IT NEVER FAILS A PRODUCTION BUILD
 *   --strict   pull request CI. Exit 1 on any error. This is the real gate: nothing
 *              merges to main with a violation, and main is what Vercel deploys.
 *   (default)  advisory. Prints everything, exits 0, ALWAYS.
 *
 * It must never be wired into the Vercel production build or into sync-inventory.yml.
 * Vercel's buildCommand is `cd site && npm ci && npm run build`; on a non zero exit
 * Vercel keeps the PREVIOUS deployment live. A prose style rule would therefore freeze
 * the site and the Google vehicle feed at yesterday's inventory, advertising a sold car
 * at a stale price. Merchant Center has already disapproved this account three times
 * (DB tasks #114, #132, #154). The gate's failure mode must stay cheaper than the
 * defects it prevents.
 *
 * WHAT IT SCANS
 *   built HTML in site/dist   customer facing output, which is the only thing that can
 *                             actually harm anyone. Source comments are NOT scanned:
 *                             the existing codebase uses em dashes in comments
 *                             legitimately and they never reach a reader.
 *   web_assets/feeds/*.xml    the feed Google ingests.
 *   web_assets/llms.txt       what answer engines read.
 *   site/src/data/*.json      data files, for hardcoded ledger values and unresolved
 *                             placeholder tokens.
 *
 * Usage:
 *   node scripts/lint-copy.mjs               advisory, scans dist if built
 *   node scripts/lint-copy.mjs --strict      exit 1 on error (PR CI)
 *   node scripts/lint-copy.mjs --json        machine readable
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'site/dist');
const DATA = join(ROOT, 'site/src/data');
const ASSETS = join(ROOT, 'web_assets');

const STRICT = process.argv.includes('--strict');
const AS_JSON = process.argv.includes('--json');

const EM = '—';
const EN = '–';

// ── The rule table ────────────────────────────────────────────────────────────────
// severity: 'error'   real world harm. Compliance, false claim, legal exposure.
//           'warn'    house style. Reads as AI writing, no legal exposure.
// Every rule carries WHY, because a linter message with no reason gets suppressed.
const RULES = [
  // Compliance. These are the ones that matter.
  {
    id: 'C8-protection',
    severity: 'error',
    find: /\b(?:every customer protected|cada cliente protegido|total protection|complete protection|full protection)\b/gi,
    why: 'Guardrail C8. Maxim offers no dealer warranty, so protection on every car is a claim it cannot document. Live on 56 pages until 2026-07-25.',
  },
  {
    id: 'false-warranty',
    severity: 'error',
    find: /\b\d+[-\s]*month\b[^.!?]{0,40}\bwarrant/gi,
    why: 'Maxim sells AS IS. Only Illinois 15 day / 500 mile statutory powertrain protection on qualifying cars may be claimed. This exact claim was found live on GBP and purged.',
  },
  {
    id: 'certified',
    severity: 'error',
    find: /\bcertified\b/gi,
    why: 'No CPO program exists. "Certified" implies manufacturer backing Maxim cannot claim.',
  },
  {
    id: 'guaranteed-financing',
    severity: 'error',
    find: /\b(?:guaranteed\s+(?:approval|financing|credit)|approval\s+guaranteed)\b/gi,
    why: 'Regulatory violation. Approval is never guaranteed and Maxim always runs credit.',
    // Two compliant forms the site already uses well, both of which must not be flagged
    // or everyone learns to ignore this rule, which is how a linter dies:
    //   1. A negated sentence. "No dealer can honestly guarantee approval, and Maxim
    //      Autos does not."
    //   2. A QUESTION. "Is approval guaranteed at Maxim Autos?" is an FAQ heading, not a
    //      claim, and its answer is the correct denial. A question asserts nothing.
    unless: sentence =>
      /\b(?:no|not|never|cannot|can't|does not|doesn't|nobody|no one)\b/i.test(sentence) ||
      sentence.trim().endsWith('?'),
  },
  {
    id: 'no-credit-check',
    severity: 'error',
    find: /\bno\s+credit\s+check\b/gi,
    why: 'Regulatory violation when claimed about FINANCING. Maxim always runs credit to place a loan.',
    // "No credit check to browse" is true, compliant, and a genuinely good trust line:
    // looking at inventory really does not touch your credit. Only a claim about
    // financing or approval without a credit pull is the violation.
    unless: sentence => /\b(?:to\s+browse|to\s+shop|to\s+look|to\s+view|browsing|shopping)\b/i.test(sentence),
  },
  {
    id: 'all-credit-truncated',
    severity: 'error',
    // "all credit" used as a quantifier is ordinary English and not a claim about who
    // qualifies: "if your file is all credit cards", "all credit bureaus report it".
    // Only the standalone welcome-style claim is the guardrail B4 violation.
    find: /\ball credit\b(?!\s+(?:levels|situations|cards|unions|bureaus|reports|reporting|accounts|types|histories|history|files?|scores?))/gi,
    why: 'Guardrail B4. "All credit" alone reads as guaranteed approval. Must be "all credit levels".',
  },
  {
    id: 'unqualified-powertrain',
    severity: 'error',
    find: /powertrain protection(?!\s+on\s+qualifying)/gi,
    why: '815 ILCS 505/2L exempts high mileage, rebuilt, heavy and antique units, so the claim must always say "on qualifying".',
  },
  {
    id: 'stale-price-band',
    severity: 'error',
    find: /\$5,?000\s*(?:to|a|and|[-–—])\s*\$?15,?000|\$5K\s*(?:to|[-–—])\s*\$?15K/gi,
    why: 'A stated range no live unit falls inside violates 14 Ill. Adm. Code 475.390. Read the band from site/src/data/facts.json instead.',
  },
  {
    id: 'named-competitor',
    severity: 'error',
    find: /\b(?:Carvana|CarMax|Napleton|Berman|iCars Chicago|Sherman Dodge|Old Orchard Nissan|Go Autos|Northshore Auto Connect)\b/gi,
    why: '14 Ill. Adm. Code 475.360(b) bans comparing Maxim\'s price with another dealer\'s, and 475.340 bans lowest price claims without ongoing monitoring. Naming a competitor also gives them Lanham Act standing.',
  },
  {
    id: 'unresolved-token',
    severity: 'error',
    find: /\{\{\s*[a-zA-Z][a-zA-Z.]*\s*\}\}/g,
    why: 'A placeholder reached output. The sentence is now missing a number a reader needs. Check the token name against KNOWN_TOKENS in scripts/facts-core.mjs.',
  },

  // House style. Real, but nobody gets hurt.
  {
    id: 'em-dash',
    severity: 'warn',
    find: new RegExp(`[${EM}${EN}]`, 'g'),
    why: 'House rule: no em or en dashes in copy. Both read as AI writing.',
  },
  {
    id: 'hyphenated-compound',
    severity: 'warn',
    find: /\b(?:on-the-spot|hassle-free|same-day|first-time|worry-free|top-notch|state-of-the-art)\b/gi,
    why: 'House rule: no hyphenated compound modifiers. Rephrase naturally.',
  },
];

/**
 * Verbatim strings that OUTRANK the style rules. The Reg Z footnote is quoted exactly as
 * the regulation requires, and its "60-month" hyphen is protected. Any span matching one
 * of these is excused from every warn level rule.
 */
const PROTECTED_VERBATIM = [
  'Est. payment based on 10% down, 9.9% APR, 60-month term. For illustrative purposes only. Actual terms vary by credit.',
  'Pago estimado con 10% de enganche, 9.9% APR, plazo de 60 meses. Solo para fines ilustrativos. Los términos reales varían según el crédito.',
];

// Files that legitimately hold the banned strings because their job is to name them.
const EXEMPT_PATHS = [
  /dominance-2026-07/, /gbp-compliance-audit/, /legal-rebuild/,   // design docs
  /_retired/,                                                     // archived on purpose
  /scripts[\\/]lint-copy\.mjs$/,                                  // this file
  /scripts[\\/]facts-core\.mjs$/,
  /scripts[\\/]build-inventory\.js$/,                             // the sanitizer names them
  /[\\/]terms[\\/]?|[\\/]return-policy[\\/]?|[\\/]privacy-policy[\\/]?/, // legal pages state exclusions
  // dc-inventory.json is the committed snapshot of the RAW DealerCenter feed. It is an
  // input, not output. It legitimately holds whatever Jerry typed into DealerCenter, and
  // sanitizeDescription() in build-inventory.js is what cleans it on the way to
  // vehicles.json and the Google feed. Verified: the 3 month warranty appears 4x here
  // and 0x in vehicles.json, which is the sanitizer working exactly as intended.
  /data[\\/]dc-inventory\.json$/,
  // *.template.* files are INPUTS whose entire purpose is to hold {{tokens}} and the
  // prose around them. build-facts.mjs renders them into the .json the pages import, and
  // an unresolved token in that RENDERED output is what the linter must catch.
  /\.template\.(?:json|txt)$/,
];

function isExempt(path) {
  return EXEMPT_PATHS.some(re => re.test(path));
}

/** Strip HTML tags, script and style bodies, and JSON-LD, leaving reader visible text. */
function visibleText(html) {
  return html
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/** JSON-LD blocks only. Google reads these, so they are scanned separately and strictly. */
function jsonLdText(html) {
  return [...html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1])
    .join('\n');
}

function maskProtected(text) {
  let out = text;
  for (const v of PROTECTED_VERBATIM) {
    out = out.split(v).join(' '.repeat(v.length));
  }
  return out;
}

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

const findings = [];

/** The sentence a match sits in, so context aware rules can judge it. */
function sentenceAround(text, index) {
  const start = Math.max(
    text.lastIndexOf('.', index), text.lastIndexOf('!', index),
    text.lastIndexOf('?', index), text.lastIndexOf('\n', index), -1
  ) + 1;
  let end = text.length;
  for (const p of ['.', '!', '?', '\n']) {
    const i = text.indexOf(p, index);
    if (i !== -1 && i < end) end = i + 1;
  }
  return text.slice(start, end);
}

function scan(path, text, label) {
  if (isExempt(path)) return;
  const masked = maskProtected(text);
  for (const rule of RULES) {
    // Style rules are excused inside protected verbatim spans; compliance rules never are.
    const subject = rule.severity === 'warn' ? masked : text;
    let hits = [...subject.matchAll(rule.find)];

    // Context aware rules drop the hits their `unless` predicate excuses.
    if (rule.unless) {
      hits = hits.filter(h => !rule.unless(sentenceAround(subject, h.index)));
    }
    if (!hits.length) continue;

    findings.push({
      file: relative(ROOT, path).replace(/\\/g, '/'),
      where: label,
      rule: rule.id,
      severity: rule.severity,
      count: hits.length,
      sample: hits[0][0].slice(0, 60),
      why: rule.why,
    });
  }
}

// ── Built HTML ───────────────────────────────────────────────────────────────────
const htmlFiles = walk(DIST, ['.html']);
for (const f of htmlFiles) {
  const raw = readFileSync(f, 'utf8');
  scan(f, visibleText(raw), 'visible text');
  scan(f, jsonLdText(raw), 'JSON-LD');
}

// ── Feed and AI surfaces ─────────────────────────────────────────────────────────
for (const f of [...walk(join(ASSETS, 'feeds'), ['.xml']), join(ASSETS, 'llms.txt')]) {
  if (existsSync(f)) scan(f, readFileSync(f, 'utf8'), 'machine surface');
}

// ── Data files ───────────────────────────────────────────────────────────────────
// Scanned as raw text: a hardcoded band inside hand authored prose in suburbs.json is
// exactly how the 475.390 violation propagated to 15 pages.
for (const f of walk(DATA, ['.json'])) {
  if (/facts\.json$/.test(f)) continue;  // the ledger IS the numbers
  scan(f, readFileSync(f, 'utf8'), 'source data');
}

// ── Report ───────────────────────────────────────────────────────────────────────
const errors = findings.filter(f => f.severity === 'error');
const warns = findings.filter(f => f.severity === 'warn');

if (AS_JSON) {
  console.log(JSON.stringify({ errors, warns, scanned: { html: htmlFiles.length } }, null, 2));
} else {
  if (!htmlFiles.length) {
    console.log('lint-copy: site/dist is empty, so no built HTML was scanned.');
    console.log('           Run `npm run build` in site/ first for a full check.\n');
  }

  const group = (list, title) => {
    if (!list.length) return;
    console.log(`\n${title}`);
    const byRule = {};
    for (const f of list) (byRule[f.rule] ||= []).push(f);
    for (const [rule, items] of Object.entries(byRule)) {
      const total = items.reduce((n, i) => n + i.count, 0);
      console.log(`\n  [${rule}]  ${total} hit(s) in ${items.length} file(s)`);
      console.log(`    why: ${items[0].why}`);
      for (const i of items.slice(0, 12)) {
        console.log(`    ${i.file}  (${i.where}, ${i.count}x)  e.g. "${i.sample}"`);
      }
      if (items.length > 12) console.log(`    ... and ${items.length - 12} more file(s)`);
    }
  };

  group(errors, 'ERRORS  (compliance, false claims, legal exposure)');
  group(warns, 'WARNINGS  (house style)');

  console.log(
    `\nlint-copy: ${errors.length} error group(s), ${warns.length} warning group(s), ` +
    `${htmlFiles.length} built page(s) scanned.`
  );
  if (!errors.length && !warns.length) console.log('  clean.');
  if (errors.length && !STRICT) {
    console.log('  advisory mode, exiting 0. Run with --strict in CI to make these block.');
  }
}

process.exit(STRICT && errors.length ? 1 : 0);
