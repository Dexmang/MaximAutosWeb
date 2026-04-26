#!/usr/bin/env node
/**
 * test-tolerance-logic.mjs
 *
 * Self-contained smoke test for the off-market tolerance window.
 * Re-implements the merge logic from sync-from-cargurus.js (kept in sync
 * by hand) and walks a VIN through several sync cycles, asserting the
 * status transitions match Jerry's spec.
 *
 * Run: node scripts/test-tolerance-logic.mjs
 */

const OFF_MARKET_TOLERANCE_HOURS = 24;

// Same shape as the production merge in sync-from-cargurus.js. If you
// touch the production logic, mirror the change here.
function applySync(existing, liveVins, nowMs) {
  const nowIso = new Date(nowMs).toISOString();
  const todayDate = nowIso.slice(0, 10);

  // Live cars: the VIN appeared in the feed → status="available", drop
  // missing_since and sold_date.
  const liveVehicles = [...liveVins].map(vin => {
    const e = existing.find(x => x.vin === vin) || { vin };
    const { missing_since, sold_date, ...rest } = e;
    return { ...rest, status: 'available' };
  });

  // Off-market: VIN not in feed.
  const offMarketEntries = existing
    .filter(e => !liveVins.has(e.vin))
    .map(e => {
      if (e.status === 'sold') return e; // already sold, no-op
      const missingSince = e.missing_since || nowIso;
      const hoursMissing = (nowMs - Date.parse(missingSince)) / 3_600_000;
      if (hoursMissing >= OFF_MARKET_TOLERANCE_HOURS) {
        return { ...e, status: 'sold', sold_date: todayDate, missing_since: missingSince };
      }
      return { ...e, status: 'available', missing_since: missingSince };
    });

  return [...liveVehicles, ...offMarketEntries];
}

// ── tiny assertion helpers ────────────────────────────────────────────────

let failures = 0;
function assertEq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  PASS: ${label}`);
  } else {
    console.log(`  FAIL: ${label}\n    expected: ${e}\n    actual:   ${a}`);
    failures++;
  }
}

// ── scenarios ─────────────────────────────────────────────────────────────

const HOUR = 3_600_000;

console.log('\n=== Scenario 1: VIN missing for 1st time → stays available with missing_since ===');
{
  const t0 = Date.parse('2026-04-25T12:00:00Z');
  const before = [{ vin: 'AUDI', status: 'available' }];
  const after = applySync(before, new Set(/* feed empty */), t0);
  const audi = after.find(v => v.vin === 'AUDI');
  assertEq('status stays available on 1st miss', audi.status, 'available');
  assertEq('missing_since stamped', audi.missing_since, new Date(t0).toISOString());
  assertEq('no sold_date yet', audi.sold_date, undefined);
}

console.log('\n=== Scenario 2: VIN still missing 6h later → still available, missing_since unchanged ===');
{
  const t0 = Date.parse('2026-04-25T12:00:00Z');
  const t1 = t0 + 6 * HOUR;
  const before = [{ vin: 'AUDI', status: 'available', missing_since: new Date(t0).toISOString() }];
  const after = applySync(before, new Set(), t1);
  const audi = after.find(v => v.vin === 'AUDI');
  assertEq('status still available after 6h', audi.status, 'available');
  assertEq('missing_since not bumped', audi.missing_since, new Date(t0).toISOString());
  assertEq('still no sold_date', audi.sold_date, undefined);
}

console.log('\n=== Scenario 3: VIN comes back at 12h → status auto-flips to available, missing_since cleared ===');
{
  const t0 = Date.parse('2026-04-25T12:00:00Z');
  const t1 = t0 + 12 * HOUR;
  const before = [{ vin: 'AUDI', status: 'available', missing_since: new Date(t0).toISOString(), price: 12000 }];
  const after = applySync(before, new Set(['AUDI']), t1);
  const audi = after.find(v => v.vin === 'AUDI');
  assertEq('status available', audi.status, 'available');
  assertEq('missing_since cleared', audi.missing_since, undefined);
  assertEq('sold_date cleared', audi.sold_date, undefined);
  assertEq('other fields preserved (price)', audi.price, 12000);
}

console.log('\n=== Scenario 4: VIN missing for 24h → flips to sold, missing_since kept ===');
{
  const t0 = Date.parse('2026-04-25T12:00:00Z');
  const t1 = t0 + 24 * HOUR;
  const before = [{ vin: 'AUDI', status: 'available', missing_since: new Date(t0).toISOString() }];
  const after = applySync(before, new Set(), t1);
  const audi = after.find(v => v.vin === 'AUDI');
  assertEq('status flipped to sold at 24h', audi.status, 'sold');
  assertEq('sold_date stamped', audi.sold_date, '2026-04-26');
  assertEq('missing_since kept for analytics', audi.missing_since, new Date(t0).toISOString());
}

console.log('\n=== Scenario 5: Sold VIN still missing → no-op (preserve sold_date) ===');
{
  const t0 = Date.parse('2026-04-25T00:00:00Z');
  const t1 = t0 + 7 * 24 * HOUR;
  const before = [{ vin: 'FORD', status: 'sold', sold_date: '2026-04-25', missing_since: new Date(t0).toISOString() }];
  const after = applySync(before, new Set(), t1);
  const ford = after.find(v => v.vin === 'FORD');
  assertEq('still sold', ford.status, 'sold');
  assertEq('sold_date unchanged', ford.sold_date, '2026-04-25');
}

console.log('\n=== Scenario 6: Sold VIN comes back → flips to available, all flags wiped ===');
{
  const t0 = Date.parse('2026-04-25T00:00:00Z');
  const t1 = t0 + 7 * 24 * HOUR;
  const before = [{ vin: 'FORD', status: 'sold', sold_date: '2026-04-25', missing_since: new Date(t0).toISOString(), price: 14000 }];
  const after = applySync(before, new Set(['FORD']), t1);
  const ford = after.find(v => v.vin === 'FORD');
  assertEq('back on market: status', ford.status, 'available');
  assertEq('back on market: sold_date cleared', ford.sold_date, undefined);
  assertEq('back on market: missing_since cleared', ford.missing_since, undefined);
  assertEq('back on market: price preserved', ford.price, 14000);
}

console.log('\n=== Scenario 7: 4-cycle drip (Jerry pulls Audi for retouching, returns at 18h) ===');
{
  const t0 = Date.parse('2026-04-25T12:00:00Z');
  let state = [{ vin: 'AUDI', status: 'available', price: 12000 }];

  // Cycle 1: t+0h, missing
  state = applySync(state, new Set(), t0);
  let audi = state.find(v => v.vin === 'AUDI');
  assertEq('cycle1 status', audi.status, 'available');
  assertEq('cycle1 has missing_since', !!audi.missing_since, true);

  // Cycle 2: t+6h, still missing
  state = applySync(state, new Set(), t0 + 6 * HOUR);
  audi = state.find(v => v.vin === 'AUDI');
  assertEq('cycle2 status (12h before tolerance)', audi.status, 'available');

  // Cycle 3: t+12h, still missing
  state = applySync(state, new Set(), t0 + 12 * HOUR);
  audi = state.find(v => v.vin === 'AUDI');
  assertEq('cycle3 status (still within tolerance)', audi.status, 'available');

  // Cycle 4: t+18h, Audi BACK
  state = applySync(state, new Set(['AUDI']), t0 + 18 * HOUR);
  audi = state.find(v => v.vin === 'AUDI');
  assertEq('cycle4 audi back', audi.status, 'available');
  assertEq('cycle4 missing_since cleared', audi.missing_since, undefined);
  assertEq('cycle4 price preserved', audi.price, 12000);
}

console.log('\n=== Scenario 8: 5-cycle drip (Audi pulled, never returns within 24h → sold) ===');
{
  const t0 = Date.parse('2026-04-25T12:00:00Z');
  let state = [{ vin: 'AUDI', status: 'available' }];

  for (let i = 0; i < 4; i++) {
    state = applySync(state, new Set(), t0 + i * 6 * HOUR);
    const audi = state.find(v => v.vin === 'AUDI');
    assertEq(`drip cycle ${i + 1} (h=${i * 6}) status`, audi.status, 'available');
  }

  // Cycle 5: 24h elapsed → sold
  state = applySync(state, new Set(), t0 + 24 * HOUR);
  const audi = state.find(v => v.vin === 'AUDI');
  assertEq('drip cycle 5 (24h) → sold', audi.status, 'sold');
  assertEq('drip cycle 5 has sold_date', !!audi.sold_date, true);
}

console.log(`\n=== Result: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===\n`);
process.exit(failures === 0 ? 0 : 1);
