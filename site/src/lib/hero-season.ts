// Which home page hero picture to show today (Jerry, 2026-11-26: the spring picture, green
// trees and light jackets, was still up in late November).
//
// The dates live in src/data/hero-seasons.json. This runs at build time only. A season
// whose two files are not in web_assets/brand is skipped, so the hero can fall back to the
// default but never to a broken image.
//
// To see another date locally: HERO_DATE=2027-04-15 npm run build
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cfg from '../data/hero-seasons.json';

// astro.config.mjs: publicDir is ../web_assets, one level above the site root the build runs in.
const BRAND_DIR = join(process.cwd(), '..', 'web_assets', 'brand');

function chicagoMonthDay(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const pick = (t: string) => parts.find(p => p.type === t)?.value ?? '01';
  return `${pick('month')}-${pick('day')}`;
}

// "11-01" to "03-31" runs across New Year; "06-01" to "08-31" does not.
const inRange = (md: string, from: string, to: string): boolean =>
  from <= to ? md >= from && md <= to : md >= from || md <= to;

const hasFiles = (name: string): boolean =>
  existsSync(join(BRAND_DIR, `${name}.jpg`)) && existsSync(join(BRAND_DIR, `${name}.webp`));

/** File name, without extension, of today's hero picture in web_assets/brand. */
export function heroName(now?: Date): string {
  const override = process.env.HERO_DATE;
  const day = now ?? (override ? new Date(`${override}T12:00:00-06:00`) : new Date());
  const md = chicagoMonthDay(day);
  for (const s of (cfg as any).seasons ?? []) {
    if (inRange(md, s.from, s.to) && hasFiles(s.name)) return s.name;
  }
  return (cfg as any).default;
}
