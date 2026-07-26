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

/**
 * Reviewers who must never be published. Loaded from data so the list is editable without
 * touching this file, and so a future rebuild of reviews.json from a live Google read
 * cannot quietly reintroduce one. See site/src/data/reviews-excluded.json for why.
 */
function loadExcludedReviewers() {
  try {
    const d = JSON.parse(readFileSync(join(DATA, 'reviews-excluded.json'), 'utf8'));
    return (d.excluded || []).flatMap(e => [e.name, ...(e.aliases || [])]).filter(Boolean);
  } catch (_) {
    return [];
  }
}
const EXCLUDED_REVIEWERS = loadExcludedReviewers();

/**
 * The live price band, in every phrasing the site can render it, read from the generated
 * ledger. Used by the unpaired-segment-band rule to decide whether a "$5,000 to $15,000"
 * segment claim has the real current range beside it.
 *
 * Read from facts.json rather than hardcoded, because hardcoding a price band in a file
 * is the exact defect this whole linter exists to catch.
 */
function loadLiveBandPatterns() {
  try {
    const f = JSON.parse(readFileSync(join(DATA, 'facts.json'), 'utf8'));
    const inv = f.inventory || {};
    return [inv.bandText, inv.bandTextEs, inv.priceMinText, inv.fromText, inv.fromTextEs]
      .filter(Boolean);
  } catch (_) {
    // No ledger means the rule cannot verify a pairing, so it must not excuse anything.
    return [];
  }
}
const LIVE_BAND_PATTERNS = loadLiveBandPatterns();

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
    // Widened 2026-07-26. The original rule only matched the literal "no credit check" and
    // therefore missed "Get pre-approved quickly with no impact to your credit score",
    // which was live on all 27 VDPs and inside the FAQPage JSON-LD Google ingests. A
    // pre-approval IS a credit pull. Same false claim, different words.
    find: /\b(?:no\s+credit\s+check|no\s+impact\s+to\s+your\s+credit|without\s+affecting\s+your\s+credit|won'?t\s+affect\s+your\s+credit|does\s+not\s+affect\s+your\s+credit)\b/gi,
    why: 'Regulatory violation when claimed about APPROVAL or FINANCING. A pre-approval is a credit pull. Only browsing, a conversation, or the no-SSN prequalifier form genuinely leave credit untouched.',
    // These uses are true and are good trust lines: looking at inventory, talking to Jerry,
    // and the four question form with no SSN really do not touch anyone's credit.
    // 220 chars because on /financing the qualifier is a card title and the claim is the
    // card body, two sentences apart.
    contextChars: 220,
    unless: ctx =>
      /\b(?:to\s+browse|to\s+shop|to\s+look|to\s+view|browsing|shopping|explore\s+our|explore\s+the|neither\s+touches|does\s+not\s+touch|nothing\s+is\s+pulled|no\s+Social\s+Security|Pre-?Qualify\s+Now|No\s+obligation)\b/i.test(ctx),
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
    find: /powertrain protection/gi,
    why: '815 ILCS 505/2L exempts units over 150,000 miles, rebuilt or flood titles, GVWR at or above 8,000 lb, and antiques, so the claim must always carry a qualifier.',
    // The first version demanded the literal "on qualifying" immediately after the phrase.
    // The audit on 2026-07-26 showed the legal pages qualify it correctly in other words:
    // "every QUALIFYING retail buyer", "and the vehicle is NOT EXEMPT", "for vehicles WHERE
    // Illinois law provides". Those are all compliant, so demanding one exact phrasing would
    // have flagged correct copy the moment it appeared on a non-exempt page.
    contextChars: 200,
    unless: ctx => /\bqualif(?:y|ying|ies)\b|\bnot exempt\b|\bexempt(?:ions?)?\b|\bwhere Illinois law provides\b|\beligible\b/i.test(ctx),
  },
  {
    id: 'unpaired-segment-band',
    severity: 'error',
    // "a" is included for Spanish on BOTH the full and the K notation forms. The Spanish
    // hero read "De $5K a $15K" and slipped past the first version of this rule, which
    // accepted "a" only on the $5,000 form. Any new phrasing of the segment claim must be
    // added here or it is unpoliced.
    find: /\$5,?000\s*(?:to|a|and|[-–—])\s*\$?15,?000|\$5\s?K\s*(?:to|a|and|[-–—])\s*\$?15\s?K/gi,
    why: 'The "$5,000 to $15,000" segment claim is allowed by Jerry\'s decision 2026-07-26, but ONLY when the actual live band appears beside it. Alone it is a 14 Ill. Adm. Code 475.390 range-of-prices violation: of 38 J-series cars ever listed, zero were under $5,000 and 5 were over $15,000. Render <PriceBandNote /> next to it, or use facts.inventory.bandText instead.',
    // 400 chars, which comfortably covers a hero paragraph plus the note underneath it.
    // The pairing has to be on the SAME SURFACE to count: a disclosure on the landing page
    // does not travel with a meta description into a search snippet, which is why meta tags
    // and JSON-LD carry live values rather than the segment claim.
    contextChars: 400,
    unless: ctx => LIVE_BAND_PATTERNS.some(p => ctx.includes(p)),
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
  // Built dynamically so the denylist lives in data, not in code. Skipped entirely when
  // the list is empty, so an empty file never produces a match-everything regex.
  ...(EXCLUDED_REVIEWERS.length ? [{
    id: 'excluded-reviewer',
    severity: 'error',
    find: new RegExp(
      '\\b(?:' + EXCLUDED_REVIEWERS.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
      'gi'
    ),
    why: 'This reviewer is on the publication denylist in site/src/data/reviews-excluded.json (undisclosed material connection, FTC Act Section 5). They may still count toward the live Google total, but their words must never appear on the site or in Review JSON-LD.',
  }] : []),

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

/**
 * Customer review bodies, treated as protected verbatim for STYLE rules.
 *
 * Three reviews contain em dashes. Those words appear in built HTML on the homepage,
 * /es/ and /testimonials, so a naive style scan reports 11 permanent warnings that can
 * never be fixed, because fixing them would mean rewriting what a named customer wrote.
 * A rule that always fires and can never be satisfied is a rule everyone learns to
 * ignore, which then hides the real ones. Masking them keeps the count honest.
 *
 * Compliance rules still see the unmasked text, so a review claiming a warranty or
 * "certified" would still be caught.
 */
function loadReviewBodies() {
  try {
    const raw = JSON.parse(readFileSync(join(DATA, 'reviews.json'), 'utf8'));
    const rows = Array.isArray(raw) ? raw : (raw.reviews || []);
    return rows.map(r => r && r.text).filter(t => typeof t === 'string' && t.length > 20);
  } catch (_) {
    return [];
  }
}
const REVIEW_BODIES = loadReviewBodies();

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
  // The denylist names the excluded reviewers on purpose. Scanning it would make the
  // rule fail on its own configuration.
  /data[\\/]reviews-excluded\.json$/,
];

function isExempt(path) {
  return EXEMPT_PATHS.some(re => re.test(path));
}

/**
 * Files exempt from HOUSE STYLE rules only. Compliance rules still apply in full.
 *
 * reviews.json holds real customers' own words. Three of them contain em dashes
 * (Eduard, Ken, Jim). Editing a testimonial to satisfy a punctuation preference means
 * publishing words the customer did not write and attributing them to that customer by
 * name, which is a materially worse problem than the dash. The style rule yields; the
 * compliance rules do not, so a review that made a warranty or "certified" claim would
 * still be caught.
 *
 * The operational data files carry em dashes inside internal `note` fields that describe
 * how the pipeline works. Those never render on a page.
 */
const STYLE_EXEMPT_PATHS = [
  /data[\\/]reviews\.json$/,          // customers' own words
  /data[\\/]hold-vins\.json$/,        // internal note fields only
  /data[\\/]retired-slugs\.json$/,    // internal note fields only
  /data[\\/]url-events\.jsonl$/,
];

function isStyleExempt(path) {
  return STYLE_EXEMPT_PATHS.some(re => re.test(path));
}

/**
 * Decode the HTML entities Astro emits, so rules match what a READER sees.
 *
 * This is not cosmetic. Astro escapes apostrophes to &#39;, so a rule looking for a
 * phrase containing an apostrophe silently missed it in built output, and the masking of
 * protected verbatim strings failed for the same reason. Any compliance rule whose phrase
 * contains a quote or an ampersand was only half working before this.
 */
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');   // last, so &amp;#39; does not double decode
}

/** Strip HTML tags, script and style bodies, and JSON-LD, leaving reader visible text. */
function visibleText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

/** JSON-LD blocks only. Google reads these, so they are scanned separately and strictly. */
function jsonLdText(html) {
  // Decoded for the same reason as visibleText: Astro's set:html escapes apostrophes to
  // &#39;, so any rule whose phrase contains a quote was only half working against
  // structured data, which is precisely the copy Google ingests.
  return decodeEntities(
    [...html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(m => m[1])
      .join('\n')
  );
}

function maskProtected(text) {
  let out = text;
  for (const v of [...PROTECTED_VERBATIM, ...REVIEW_BODIES]) {
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
  const styleExempt = isStyleExempt(path);
  const masked = maskProtected(text);
  for (const rule of RULES) {
    if (styleExempt && rule.severity === 'warn') continue;
    // Style rules are excused inside protected verbatim spans; compliance rules never are.
    const subject = rule.severity === 'warn' ? masked : text;
    let hits = [...subject.matchAll(rule.find)];

    // Context aware rules drop the hits their `unless` predicate excuses.
    //
    // `contextChars` widens what the predicate sees. The credit rules need it: on the
    // financing page the qualifier and the claim are in DIFFERENT sentences ("No Credit
    // Check to Browse" is a card title, "No impact to your credit score." is the body),
    // so a sentence-only window reported two true statements as violations. A rule that
    // flags correct copy is worse than no rule.
    if (rule.unless) {
      hits = hits.filter(h => {
        const ctx = rule.contextChars
          ? subject.slice(Math.max(0, h.index - rule.contextChars), h.index + rule.contextChars)
          : sentenceAround(subject, h.index);
        return !rule.unless(ctx);
      });
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
