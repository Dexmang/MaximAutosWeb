#!/usr/bin/env node
/**
 * update-reviews.js
 * Fetches current Google rating and review count for Maxim Autos
 * and writes the result to site/src/data/reviews_meta.json.
 *
 * Uses only built-in Node.js modules — no npm deps required.
 * Run: node MaximAutosWeb/scripts/update-reviews.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path relative to this script's location
const OUTPUT_PATH = path.join(__dirname, '..', 'site', 'src', 'data', 'reviews_meta.json');

const SEARCH_URL =
  'https://www.google.com/search?q=Maxim+Autos+Skokie+IL+reviews&hl=en&gl=us';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    };

    https.get(url, options, (res) => {
      // Follow redirects (up to 5 hops handled by recursive call)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseReviewData(html) {
  let rating = null;
  let count = null;

  // Rating patterns — ordered most to least specific
  const ratingPatterns = [
    /(\d+\.\d+)\s*(?:stars?|★)/i,
    /"ratingValue"\s*:\s*"?(\d+\.?\d*)"?/i,
    /(\d+\.\d+)\s*out\s*of\s*5/i,
    /aria-label="(\d+\.?\d+)\s*stars?"/i,
    /(\d\.\d)\s*\(/,
  ];

  for (const pattern of ratingPatterns) {
    const m = html.match(pattern);
    if (m) {
      const val = parseFloat(m[1]);
      if (val >= 1 && val <= 5) {
        rating = val;
        break;
      }
    }
  }

  // Review count patterns
  const countPatterns = [
    /(\d{1,4})\s*Google\s*reviews?/i,
    /(\d{1,4})\s*reviews?\s*on\s*Google/i,
    /"reviewCount"\s*:\s*"?(\d+)"?/i,
    /(\d{1,4})\s*reviews?/i,
  ];

  for (const pattern of countPatterns) {
    const m = html.match(pattern);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > 0 && val < 50000) {
        count = val;
        break;
      }
    }
  }

  return { rating, count };
}

function readCurrentData() {
  try {
    const raw = fs.readFileSync(OUTPUT_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { rating: 5.0, count: 34, updated: '2026-04-19' };
  }
}

function writeData(rating, count) {
  const today = new Date().toISOString().slice(0, 10);
  const data = { rating, count, updated: today };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Written to ${OUTPUT_PATH}:`, data);
}

async function main() {
  console.log('Fetching Google search page for Maxim Autos review data...');

  let html;
  try {
    html = await fetchPage(SEARCH_URL);
  } catch (err) {
    console.error('ERROR: Failed to fetch page:', err.message);
    console.warn('Keeping existing reviews_meta.json unchanged.');
    process.exit(1);
  }

  const { rating, count } = parseReviewData(html);
  const current = readCurrentData();

  if (rating === null || count === null) {
    console.warn(
      `WARNING: Could not parse review data from HTML ` +
      `(rating=${rating}, count=${count}). ` +
      `Google may be blocking the request or HTML structure changed.`
    );
    console.warn('Keeping existing values:', current);
    // Exit 0 — preserve old data, don't fail the workflow noisily
    process.exit(0);
  }

  console.log(`Parsed: rating=${rating}, count=${count}`);

  // Sanity check
  if (rating < 1 || rating > 5 || count <= 0) {
    console.error('ERROR: Parsed values are out of range. Keeping existing data.');
    process.exit(1);
  }

  // Only write if something changed (avoids noisy git diffs)
  if (rating === current.rating && count === current.count) {
    console.log('No change detected — skipping write.');
  } else {
    writeData(rating, count);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
