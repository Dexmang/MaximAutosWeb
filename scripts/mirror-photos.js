#!/usr/bin/env node
/**
 * mirror-photos.js
 *
 * Mirrors CarGurus-hosted vehicle photos into the repo so the site can stop
 * depending on static.cargurus.com availability/hotlinking policy.
 *
 * MIRROR ONLY — this script does NOT touch vehicles.json or photoUrls, and it
 * is NOT wired into the sync workflow. The VDP/feed URL rewrite (phase 3b) is
 * gated on Merchant Center findings and ships separately.
 *
 * Layout per vehicle:
 *   web_assets/photos/vins/<VIN>/01.jpg, 02.jpg, ...
 *   web_assets/photos/vins/<VIN>/manifest.json
 *     { vin, photos: [{ sourceUrl, localFile, fetchedAt }] }
 *
 * Idempotent: a photo is only downloaded when its slot is missing or its
 * manifest sourceUrl no longer matches (listing photos changed). Re-runs are
 * cheap no-ops.
 *
 * Prune: directories for vehicles sold more than PRUNE_AFTER_DAYS days ago
 * (per vehicles.json sold_date) are deleted to keep the repo lean.
 *
 * Usage:
 *   node scripts/mirror-photos.js             # mirror + prune
 *   node scripts/mirror-photos.js --dry-run   # print actions, write nothing
 *   node scripts/mirror-photos.js --revert    # stub — see phase 3b note
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VEHICLES_JSON = resolve(__dirname, '../site/src/data/vehicles.json');
const MIRROR_ROOT = resolve(__dirname, '../web_assets/photos/vins');

const PRUNE_AFTER_DAYS = 14;
const UA = 'MaximAutos-PhotoMirror/1.0 (+https://www.maximautos.com)';

function isCarGurusUrl(u) {
  return typeof u === 'string' && u.includes('cargurus.com');
}

function slotName(i) {
  return `${String(i + 1).padStart(2, '0')}.jpg`;
}

function loadManifest(dir) {
  const p = join(dir, 'manifest.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (_) {
    return null; // corrupt manifest → rebuild from scratch
  }
}

async function downloadTo(url, filePath) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`not an image: content-type=${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`suspiciously small (${buf.length} bytes)`);
  writeFileSync(filePath, buf);
  return buf.length;
}

/**
 * Mirror photos for every non-sold vehicle that has CarGurus-hosted photoUrls.
 * Sequential downloads (one CDN, be polite). Returns a summary object.
 */
export async function mirrorVehiclePhotos(vehicles, { dryRun = false } = {}) {
  const summary = { vehicles: 0, downloaded: 0, skipped: 0, failed: 0, bytes: 0 };

  for (const v of vehicles) {
    if (v.status === 'sold') continue;
    const urls = Array.isArray(v.photoUrls) ? v.photoUrls : [];
    if (urls.length === 0 || !urls.some(isCarGurusUrl)) continue;
    if (!v.vin || v.vin === 'TBD') {
      console.warn(`  WARN ${v.slug || '(no slug)'} — no usable VIN, cannot mirror`);
      continue;
    }

    summary.vehicles += 1;
    const dir = join(MIRROR_ROOT, v.vin);
    const manifest = loadManifest(dir) || { vin: v.vin, photos: [] };
    const photosOut = [];

    console.log(`${v.vin} (${v.slug}) — ${urls.length} photos`);
    if (!dryRun) mkdirSync(dir, { recursive: true });

    for (let i = 0; i < urls.length; i++) {
      const sourceUrl = urls[i];
      const localFile = slotName(i);
      const filePath = join(dir, localFile);
      const existing = manifest.photos.find((p) => p.localFile === localFile);

      if (existing && existing.sourceUrl === sourceUrl && existsSync(filePath)) {
        photosOut.push(existing);
        summary.skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`  would download ${sourceUrl} -> ${localFile}`);
        photosOut.push({ sourceUrl, localFile, fetchedAt: null });
        continue;
      }

      try {
        const bytes = await downloadTo(sourceUrl, filePath);
        photosOut.push({ sourceUrl, localFile, fetchedAt: new Date().toISOString() });
        summary.downloaded += 1;
        summary.bytes += bytes;
        console.log(`  ${localFile} <- ${sourceUrl} (${(bytes / 1024).toFixed(0)} KB)`);
      } catch (err) {
        summary.failed += 1;
        console.warn(`  FAIL ${localFile} <- ${sourceUrl}: ${err.message}`);
      }
    }

    if (!dryRun) {
      writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ vin: v.vin, photos: photosOut }, null, 2) + '\n', 'utf8');
    }
  }

  return summary;
}

/**
 * Delete mirror directories for vehicles sold more than `days` days ago.
 * Directories whose VIN is not in vehicles.json at all are left in place and
 * flagged — deletion needs positive evidence of a stale sold unit.
 */
export function prunePhotoMirror(vehicles, { dryRun = false, days = PRUNE_AFTER_DAYS } = {}) {
  const summary = { pruned: 0, kept: 0, unknown: 0 };
  if (!existsSync(MIRROR_ROOT)) return summary;

  const byVin = new Map(vehicles.filter((v) => v.vin).map((v) => [v.vin, v]));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  for (const entry of readdirSync(MIRROR_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const vin = entry.name;
    const v = byVin.get(vin);
    if (!v) {
      summary.unknown += 1;
      console.warn(`  prune: ${vin} not in vehicles.json — leaving in place (review manually)`);
      continue;
    }
    const soldAt = v.status === 'sold' && v.sold_date ? Date.parse(v.sold_date) : NaN;
    if (Number.isFinite(soldAt) && soldAt < cutoff) {
      console.log(`  prune: ${vin} sold ${v.sold_date} (> ${days}d) — ${dryRun ? 'would delete' : 'deleting'}`);
      if (!dryRun) rmSync(join(MIRROR_ROOT, vin), { recursive: true, force: true });
      summary.pruned += 1;
    } else {
      summary.kept += 1;
    }
  }
  return summary;
}

/**
 * Revert stub — phase 3b (rewriting photoUrls/feed to local mirror URLs) has
 * not shipped, so there is nothing to revert yet. When 3b lands, this mode
 * will restore the original CarGurus URLs from each manifest's sourceUrl map.
 */
export function revertPhotoRewrite() {
  console.log('Nothing to revert: the photo URL rewrite (phase 3b) has not shipped.');
  console.log('Mirrored files under web_assets/photos/vins/ are additive and harmless.');
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (process.argv.includes('--revert')) {
    revertPhotoRewrite();
    return;
  }

  const vehicles = JSON.parse(readFileSync(VEHICLES_JSON, 'utf8'));
  console.log(`Mirroring photos for non-sold vehicles${dryRun ? ' (dry run)' : ''}...`);
  const mirror = await mirrorVehiclePhotos(vehicles, { dryRun });
  console.log(`\nPruning mirrors for vehicles sold > ${PRUNE_AFTER_DAYS} days...`);
  const prune = prunePhotoMirror(vehicles, { dryRun });

  console.log('\nSummary:');
  console.log(`  vehicles mirrored: ${mirror.vehicles}`);
  console.log(`  downloaded: ${mirror.downloaded} (${(mirror.bytes / 1024 / 1024).toFixed(1)} MB), skipped: ${mirror.skipped}, failed: ${mirror.failed}`);
  console.log(`  pruned dirs: ${prune.pruned}, kept: ${prune.kept}, unknown: ${prune.unknown}`);

  if (mirror.failed > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error('Mirror crashed:', err);
    process.exit(1);
  });
}
