#!/usr/bin/env node
/**
 * test-url-events.mjs
 *
 * Smoke test for URL event classification + IndexNow URL collection.
 * Mirrors the classifyAndReport function in sync-from-cargurus.js. If you
 * change the production classifier, update this file too.
 *
 * Run: node scripts/test-url-events.mjs
 */

const SITE_ORIGIN = 'https://www.maximautos.com';
const vdpUrl = (slug) => `${SITE_ORIGIN}/vehicle/${slug}/`;

/**
 * Mirror of classifyAndReport (events + URL list only — no console output).
 */
function classify(before, after) {
  const beforeByVin = new Map(before.map(v => [v.vin, v]));
  const events = [];
  const urlSet = new Set();
  const fire = (event, vin, slug) => {
    const url = vdpUrl(slug);
    events.push({ event, vin, slug, url });
    urlSet.add(url);
  };

  // added: VIN brand new
  for (const v of after) {
    if (!beforeByVin.has(v.vin)) fire('added', v.vin, v.slug);
  }
  // sold: was available, now sold
  for (const v of after) {
    const old = beforeByVin.get(v.vin);
    if (old && old.status !== 'sold' && v.status === 'sold') fire('sold', v.vin, v.slug);
  }
  // back_on_market: was sold or off-market, now clean available
  for (const v of after) {
    const old = beforeByVin.get(v.vin);
    if (!old) continue;
    const wasOff = old.status === 'sold' || !!old.missing_since;
    const nowOn = v.status === 'available' && !v.missing_since;
    if (wasOff && nowOn) fire('back_on_market', v.vin, v.slug);
  }
  // slug_changed: VIN known, slug differs
  for (const v of after) {
    const old = beforeByVin.get(v.vin);
    if (old && old.slug && old.slug !== v.slug) {
      fire('slug_changed_old', v.vin, old.slug);
      fire('slug_changed_new', v.vin, v.slug);
    }
  }
  return { events, urls: [...urlSet] };
}

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

console.log('\n=== Scenario 1: brand new VIN → added event ===');
{
  const before = [];
  const after = [{ vin: 'NEW1', slug: '2025-honda-civic-lx', status: 'available' }];
  const { events, urls } = classify(before, after);
  assertEq('one event', events.length, 1);
  assertEq('event type', events[0].event, 'added');
  assertEq('event vin', events[0].vin, 'NEW1');
  assertEq('url collected', urls, [vdpUrl('2025-honda-civic-lx')]);
}

console.log('\n=== Scenario 2: VIN crossed tolerance → sold event ===');
{
  const before = [{ vin: 'FORD', slug: '2017-ford-escape-titanium', status: 'available', missing_since: '2026-04-24T00:00:00Z' }];
  const after  = [{ vin: 'FORD', slug: '2017-ford-escape-titanium', status: 'sold', sold_date: '2026-04-25', missing_since: '2026-04-24T00:00:00Z' }];
  const { events, urls } = classify(before, after);
  assertEq('one event', events.length, 1);
  assertEq('event type', events[0].event, 'sold');
  assertEq('event slug', events[0].slug, '2017-ford-escape-titanium');
  assertEq('url collected', urls, [vdpUrl('2017-ford-escape-titanium')]);
}

console.log('\n=== Scenario 3: sold VIN re-listed → back_on_market event ===');
{
  const before = [{ vin: 'AUDI', slug: '2016-audi-q5', status: 'sold', sold_date: '2026-04-19' }];
  const after  = [{ vin: 'AUDI', slug: '2016-audi-q5', status: 'available' }];
  const { events } = classify(before, after);
  assertEq('one event', events.length, 1);
  assertEq('event type', events[0].event, 'back_on_market');
}

console.log('\n=== Scenario 4: off-market VIN re-listed (no sold yet) → back_on_market ===');
{
  const before = [{ vin: 'TUC', slug: '2020-tucson', status: 'available', missing_since: '2026-04-25T00:00:00Z' }];
  const after  = [{ vin: 'TUC', slug: '2020-tucson', status: 'available' }];
  const { events } = classify(before, after);
  assertEq('one event', events.length, 1);
  assertEq('event type', events[0].event, 'back_on_market');
}

console.log('\n=== Scenario 5: slug change → emits both old and new, both URLs ===');
{
  const before = [{ vin: 'JAG', slug: '2008-jaguar-xj-vanden-plas-l', status: 'available' }];
  const after  = [{ vin: 'JAG', slug: '2008-jaguar-xj-series-xj8-l-rwd', status: 'available' }];
  const { events, urls } = classify(before, after);
  assertEq('two events', events.length, 2);
  assertEq('first is _old', events[0].event, 'slug_changed_old');
  assertEq('first uses old slug', events[0].slug, '2008-jaguar-xj-vanden-plas-l');
  assertEq('second is _new', events[1].event, 'slug_changed_new');
  assertEq('second uses new slug', events[1].slug, '2008-jaguar-xj-series-xj8-l-rwd');
  assertEq('two distinct urls', urls.length, 2);
  assertEq('urls deduped correctly', urls.sort(), [vdpUrl('2008-jaguar-xj-series-xj8-l-rwd'), vdpUrl('2008-jaguar-xj-vanden-plas-l')].sort());
}

console.log('\n=== Scenario 6: 1st miss / continuing miss / price change → no events ===');
{
  // 1st miss: was available, now available with missing_since
  const before1 = [{ vin: 'A', slug: 'a', status: 'available' }];
  const after1  = [{ vin: 'A', slug: 'a', status: 'available', missing_since: '2026-04-25T00:00:00Z' }];
  const r1 = classify(before1, after1);
  assertEq('1st miss emits zero events', r1.events.length, 0);

  // continuing miss: missing_since carried over
  const before2 = [{ vin: 'A', slug: 'a', status: 'available', missing_since: '2026-04-25T00:00:00Z' }];
  const after2  = [{ vin: 'A', slug: 'a', status: 'available', missing_since: '2026-04-25T00:00:00Z' }];
  const r2 = classify(before2, after2);
  assertEq('continuing miss emits zero events', r2.events.length, 0);

  // price-only change
  const before3 = [{ vin: 'A', slug: 'a', status: 'available', price: 12000 }];
  const after3  = [{ vin: 'A', slug: 'a', status: 'available', price: 11500 }];
  const r3 = classify(before3, after3);
  assertEq('price change emits zero events', r3.events.length, 0);
}

console.log('\n=== Scenario 7: empty diff (steady state) → zero events, zero urls ===');
{
  const before = [{ vin: 'A', slug: 'a', status: 'available' }];
  const after  = [{ vin: 'A', slug: 'a', status: 'available' }];
  const { events, urls } = classify(before, after);
  assertEq('zero events', events.length, 0);
  assertEq('zero urls', urls, []);
}

console.log('\n=== Scenario 8: mixed (1 added + 1 sold + 1 slug change) ===');
{
  const before = [
    { vin: 'OLD',   slug: 'old-slug',          status: 'available', missing_since: '2026-04-24T00:00:00Z' },
    { vin: 'STAY',  slug: 'stay-slug',         status: 'available' },
    { vin: 'SLUG',  slug: 'jaguar-old',        status: 'available' },
  ];
  const after = [
    { vin: 'OLD',  slug: 'old-slug',     status: 'sold', sold_date: '2026-04-25', missing_since: '2026-04-24T00:00:00Z' },
    { vin: 'STAY', slug: 'stay-slug',    status: 'available' },
    { vin: 'SLUG', slug: 'jaguar-new',   status: 'available' },
    { vin: 'NEW',  slug: 'fresh-honda',  status: 'available' },
  ];
  const { events, urls } = classify(before, after);
  assertEq('total events', events.length, 4); // added + sold + 2x slug
  assertEq('total unique urls', urls.length, 4);
  const types = events.map(e => e.event).sort();
  assertEq('event types', types, ['added', 'slug_changed_new', 'slug_changed_old', 'sold']);
}

console.log(`\n=== Result: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===\n`);
process.exit(failures === 0 ? 0 : 1);
