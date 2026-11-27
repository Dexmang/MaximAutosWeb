#!/usr/bin/env node
/**
 * build-icons.mjs  ::  the list of Material Symbols glyphs the site actually uses.
 *
 * WHY
 * Layout.astro loaded the whole Material Symbols variable font: 1.14 MB on every first
 * visit, 73% of everything a vehicle page sent (site review, 2026-11-26). Google Fonts
 * serves a subset when the stylesheet URL carries `icon_names=`; with the names below
 * the same font is a few tens of KB. Measured 2026-11-26: full 1,144,980 bytes, five
 * icons 3,676 bytes.
 *
 * HOW
 * Runs in the site prebuild, after build-facts.mjs. It scans the source and the data the
 * pages render from and writes site/src/data/icon-names.json, which Layout.astro reads
 * to build the stylesheet URL. Because it runs on every build, an icon that arrives
 * through data (the winter kit and feature tiers in vehicles.json come from the hub)
 * is picked up by the same build that first renders it.
 *
 * SAFE BY CONSTRUCTION
 *   - Google ignores a name it does not know (verified: a bogus name still returns 200),
 *     so a false positive from the scan costs nothing.
 *   - If the scan finds nothing, the list is written empty and Layout falls back to the
 *     full font. A broken scan can make the page heavier, never iconless.
 *   - ALWAYS below covers a glyph that only ever appears from script at run time.
 *
 * After a build, `node scripts/build-icons.mjs --check` compares the list against every
 * icon span in site/dist and exits 1 if a rendered icon is missing from the list.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '../site/src');
const DIST = join(__dirname, '../site/dist');
const OUT = join(SRC, 'data/icon-names.json');

// Glyphs injected only by script at run time, never present in a scanned template.
const ALWAYS = ['check_circle', 'sync', 'sms'];

const NAME = '[a-z][a-z0-9_]*';
const PATTERNS = [
  new RegExp(`<Icon\\b[^>]*?\\bname="(${NAME})"`, 'g'),
  new RegExp(`material-symbols-outlined[^>]*>\\s*(${NAME})\\s*<`, 'g'),
  new RegExp(`\\bicon\\s*[:=]\\s*['"](${NAME})['"]`, 'g'),
  new RegExp(`"icon"\\s*:\\s*"(${NAME})"`, 'g'),
];
// <Icon name={open ? 'expand_less' : 'expand_more'} />: every quoted token in the braces.
const NAME_EXPR = /<Icon\b[^>]*?\bname=\{([^}]*)\}/g;
const QUOTED = new RegExp(`['"](${NAME})['"]`, 'g');

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

function scanSource() {
  const names = new Set(ALWAYS);
  for (const file of walk(SRC, ['.astro', '.ts', '.mjs', '.js', '.json'])) {
    if (file === OUT) continue;
    const text = readFileSync(file, 'utf8');
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) names.add(m[1]);
    }
    NAME_EXPR.lastIndex = 0;
    let e;
    while ((e = NAME_EXPR.exec(text))) {
      QUOTED.lastIndex = 0;
      let q;
      while ((q = QUOTED.exec(e[1]))) names.add(q[1]);
    }
  }
  return [...names].sort();
}

function renderedIcons() {
  const found = new Set();
  const re = new RegExp(`material-symbols-outlined[^>]*>\\s*(${NAME})\\s*<`, 'g');
  for (const file of walk(DIST, ['.html'])) {
    const text = readFileSync(file, 'utf8');
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) found.add(m[1]);
  }
  return found;
}

if (process.argv.includes('--check')) {
  if (!existsSync(DIST)) { console.error('no site/dist: build first'); process.exit(1); }
  const listed = new Set(JSON.parse(readFileSync(OUT, 'utf8')).names);
  const missing = [...renderedIcons()].filter((n) => !listed.has(n)).sort();
  if (missing.length) {
    console.error(`icon check FAILED: rendered but not in the font subset: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`icon check ok: every rendered icon is in the subset (${listed.size} names)`);
} else {
  const names = scanSource();
  writeFileSync(OUT, JSON.stringify({ names }, null, 2) + '\n', 'utf8');
  console.log(`build-icons: ${names.length} icon names -> site/src/data/icon-names.json`);
}
