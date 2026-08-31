/**
 * stock-rules.mjs  ::  which DealerCenter units belong on maximautos.com at all.
 *
 * The DealerCenter account carries units for more than one owner, and the stock
 * number prefix is the ownership tag: Jerry's retail units are J-prefixed
 * (J10240, ...), while E-prefixed stock numbers (E613770, ...) are Choni's
 * cars. Owner's standing rule (Jerry, 2026-08-31): a unit whose stock number
 * starts with E must NEVER appear on maximautos.com — no inventory card, no
 * VDP (live or SOLD), no row in the Google vehicle feed.
 *
 * One predicate, imported by BOTH feed consumers so they can never disagree:
 *   - build-inventory.js  drops them from the DC set before vehicles.json is
 *     built, and purges any that ever slipped into vehicles.json.
 *   - build-gmc-feed.js   drops them from the feed's book-of-record count, so
 *     a photo-less E-unit cannot fail the --strict parity gate and freeze the
 *     whole sync. That is exactly what E613770 (2016 Subaru Outback, zero
 *     photos) did from 2026-08-30 00:00 UTC on: every sync run failed, and the
 *     site sat frozen on 2026-08-29 data.
 */

// Stock-number prefixes that mark a unit as another owner's, compared
// case-insensitively against the trimmed stock number. Extend this list if
// another partner's prefix ever shows up in the feed.
const EXCLUDED_STOCK_PREFIXES = ['E'];

/** True when the unit belongs to another owner and must never be listed. */
export function isExcludedStock(stockNumber) {
  const s = String(stockNumber || '').trim().toUpperCase();
  return s !== '' && EXCLUDED_STOCK_PREFIXES.some(p => s.startsWith(p));
}
