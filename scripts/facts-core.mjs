/**
 * facts-core.mjs  ::  the ONE derivation of every live number the site states.
 *
 * WHY THIS FILE EXISTS
 * On 2026-07-25 an audit found "$5,000 to $15,000" stated on 15 pages, including the
 * AutoDealer priceRange JSON-LD that Google reads and the answer text of several
 * FAQPage blocks, against a real live band of $8,995 to $15,995. A stated price range
 * that no vehicle in stock falls inside is a violation of 14 Ill. Adm. Code 475.390.
 * The root cause was not carelessness: the band was hardcoded in prose in 19 files and
 * in compliance-guardrails.md itself, so every copy was correct on the day it was
 * written and wrong a few sales later.
 *
 * The rule that follows from that: NO NUMBER LIVES IN A PAGE. Price band, unit count,
 * review count, rating and the service city list are derived here, once, and every
 * consumer reads the generated output. A hardcoded ledger value anywhere else is a
 * lint failure.
 *
 * Consumers of the generated site/src/data/facts.json:
 *   - Astro pages and components (import the JSON directly)
 *   - scripts/build-facts.mjs (writes it; runs as site prebuild and from build-inventory)
 *   - web_assets/llms.txt generation
 *   - operations/build_ai_knowledge_base.py (the GoHighLevel assistant's fact sheet)
 *   - scripts/lint-copy.mjs (asserts no page states these numbers independently)
 *
 * This module is pure: it takes parsed JSON in and returns a plain object. It reads no
 * files and writes none, so it is trivially testable and cannot fail a build on IO.
 */

const US = new Intl.NumberFormat('en-US');

/** Money with no cents, the only price format the site uses. */
function usd(n) {
  return `$${US.format(Math.round(n))}`;
}

/** Money with cents, for the state fee figures the estimate block prints. */
function usd2(n) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(rate) {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Illinois vehicle (ST-556) tax rates and Secretary of State fees, for the estimated total
 * at signing (website/otd-estimator-2026-10/design/SPEC.md). These are the ONLY typed
 * dollar figures in the ledger, and they are typed here for the same reason the price band
 * is derived here: one place, dated, with a source, so a January or July change is a one
 * line edit and every surface moves together.
 *
 * Rates change on fixed dates (January 1, July 1, and the special August 1, 2026 collar
 * county change). Refresh validFrom and the figures when IDOR publishes a change, and the
 * doc fee cap every January. Illinois has no vehicle rate API; the IDOR finder is a form.
 *
 * Verified 2026-10-11:
 *   cook     IDOR MyTax Tax Rate Finder, address lookup 9101 Terminal Ave, Skokie 60077:
 *            "Vehicle (ST-556 and ST-556-LSE) 7.500%" (6.25% state + 1.25% NITA; Skokie's own
 *            home rule tax does not apply to titled vehicles).
 *   chicago  Same lookup, the finder's own note: a Chicago registration adds the 1.25%
 *            Chicago home rule tax on titled property, 8.75%.
 *   collar   IDOR Informational Bulletin FY 2026-34: NITA on titled items 1.00% in DuPage,
 *            Kane, Lake, McHenry and Will from 2026-08-01, plus 6.25% state.
 *   state    6.25%. A handful of downstate counties add a local vehicle tax; the block says
 *            "local rate confirmed at signing".
 *   fees     ilsos.gov fee schedule: title $165, new passenger plates $151, plate transfer $25.
 *   ert      Electronic Registration and Title (ERT) filing: the $35 per deal cost of the CVR
 *            electronic filing that issues metal plates the same visit. ABSORBED. Jerry decided
 *            2026-10-13 (task 330) that Maxim pays it and it is never a line on the buyer's
 *            contract, so it is 0 here and no surface shows it. The plumbing stays: if it were
 *            ever charged again it would be its own labelled line inside the title and plates
 *            group on every surface that states a total, never a surprise at the desk.
 *   docCap   Illinois 2026 documentary service fee cap, operations/pricing-policy.md,
 *            taxable in Illinois. Maxim charges $0; the cap is quoted only beside that $0.
 */
export const IL_VEHICLE_TAX = {
  validFrom: '2026-08-01',
  source: 'IDOR MyTax Tax Rate Finder (9101 Terminal Ave, Skokie, read 2026-10-11); IDOR Informational Bulletin FY 2026-34',
  cook: 0.075,
  chicago: 0.0875,
  collar: 0.0725,
  state: 0.0625,
};

export const IL_FEES = {
  validFrom: '2026-01-01',
  source: 'Illinois Secretary of State fee schedule (ilsos.gov); 2026 documentary service fee cap per operations/pricing-policy.md',
  title: 165,
  plates: 151,
  transfer: 25,
  ert: 0,
  docCap: 377.63,
  docCapYear: 2026,
};

/**
 * Derive every live fact.
 *
 * @param {object}   input
 * @param {Array}    input.vehicles  parsed vehicles.json (all records, sold included)
 * @param {object}   input.reviews   parsed reviews_meta.json  { rating, count, updated }
 * @param {Array}    input.suburbs   parsed suburbs.json (for the service city list)
 * @param {string}  [input.now]      ISO timestamp, injectable so builds are reproducible
 * @returns {object} the facts ledger
 */
export function deriveFacts({ vehicles = [], reviews = {}, suburbs = [], now = null } = {}) {
  // A car is for sale when it is not sold. build-inventory.js already guarantees the
  // active set equals the newest DealerCenter feed, so this needs no other filter.
  const live = vehicles.filter(v => v && v.status !== 'sold');
  const prices = live
    .map(v => Number(v.price))
    .filter(p => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);

  const unitCount = live.length;
  const priced = prices.length;

  // Degrade honestly rather than throwing. A thrown error here would fail the Astro
  // build, and on Vercel a failed build keeps the PREVIOUS deployment serving, which
  // means yesterday's inventory at yesterday's prices. Advertising a sold car is a
  // worse outcome than omitting a price range for one build, so this never throws.
  const usable = priced > 0;

  const priceMin = usable ? prices[0] : null;
  const priceMax = usable ? prices[priced - 1] : null;

  const carWord = unitCount === 1 ? 'car' : 'cars';
  const carWordEs = unitCount === 1 ? 'auto' : 'autos';

  const cities = suburbs
    .map(s => s && s.city)
    .filter(Boolean);

  return {
    // Provenance, so a human opening the file knows not to edit it.
    generated: now || new Date().toISOString(),
    source:
      'GENERATED by scripts/build-facts.mjs from vehicles.json, reviews_meta.json and ' +
      'suburbs.json. Never hand edit. See scripts/facts-core.mjs for why.',

    inventory: {
      usable,
      unitCount,
      pricedCount: priced,
      priceMin,
      priceMax,

      // Preformatted strings, so no consumer reimplements currency formatting and
      // drifts on the comma or the cents.
      priceMinText: usable ? usd(priceMin) : null,
      priceMaxText: usable ? usd(priceMax) : null,

      // The band. Written "to", never with a dash, because a hyphen or en dash between
      // two prices is both a house style violation and harder to read aloud, which
      // matters for the answer engines that now quote this text.
      bandText: usable ? `${usd(priceMin)} to ${usd(priceMax)}` : null,
      bandTextEs: usable ? `de ${usd(priceMin)} a ${usd(priceMax)}` : null,

      // ── The SEGMENT claim, which is a different thing from the live band ──────────
      // Jerry's decision 2026-07-26: keep "$5,000 to $15,000" as the description of the
      // market Maxim buys in, paired with the live band so both statements are true.
      //
      // This is NOT interchangeable with bandText. Across all 38 J-series cars ever
      // listed, ZERO were priced under $5,000 and 5 were priced over $15,000, so stating
      // this alone AS the inventory's price range is what tripped 14 Ill. Adm. Code
      // 475.390. A disclaimer cannot cure a claim it contradicts; what works is stating
      // the segment and the actual current range together, on the same surface.
      //
      // Rule enforced by scripts/lint-copy.mjs: wherever segmentText appears in built
      // output, the live band must appear within 400 characters. The PriceBandNote
      // component is how that pairing is satisfied.
      segmentText: '$5,000 to $15,000',
      segmentTextEs: '$5,000 a $15,000',
      segmentLabel: 'the cars Maxim Autos buys and sells',

      // The pairing partner for segmentText in hand authored prose. PriceBandNote covers
      // the two homepages; these cover the suburb pages and the FAQ, where the copy is a
      // {{token}} in a JSON template rather than a component. Deliberately carries no
      // trailing period so a sentence can end or continue after it.
      //
      // Any template sentence that states the SEGMENT must render this within the same
      // paragraph, or lint-copy.mjs fails it as an unpaired segment claim.
      stockLineText: usable
        ? `In stock today: ${unitCount} ${unitCount === 1 ? 'car' : 'cars'}, ${usd(priceMin)} to ${usd(priceMax)}`
        : 'Pricing for each vehicle is listed on its own page',
      stockLineTextEs: usable
        ? `Disponibles hoy: ${unitCount} ${unitCount === 1 ? 'auto' : 'autos'}, de ${usd(priceMin)} a ${usd(priceMax)}`
        : 'El precio de cada vehiculo aparece en su pagina',

      // The single safest phrasing: an open ended floor cannot go stale upward the way
      // a ceiling can, so this is the default for prose that does not need the full band.
      fromText: usable
        ? `Inventory currently priced from ${usd(priceMin)}`
        : 'Inventory pricing is listed on each vehicle',
      fromTextEs: usable
        ? `Inventario disponible desde ${usd(priceMin)}`
        : 'El precio de cada vehiculo aparece en su pagina',

      stockText: `${unitCount} ${carWord} in stock today`,
      stockTextEs: `${unitCount} ${carWordEs} disponibles hoy`,

      // For the AutoDealer priceRange property. Schema.org takes a free text range;
      // Google reads it, so it must match what the pages say.
      priceRange: usable ? `${usd(priceMin)} to ${usd(priceMax)}` : null,
      priceRangeEs: usable ? `${usd(priceMin)} a ${usd(priceMax)}` : null,
    },

    reviews: {
      // Never hardcoded anywhere else. reviews_meta.json is refreshed from a live
      // Google read inside the daily GBP routine; the scraper that used to write it
      // went blind and was disabled, so this is the only sanctioned path.
      rating: reviews.rating ?? null,
      count: reviews.count ?? null,
      updated: reviews.updated ?? null,

      // Always one decimal. JSON 5.0 parses to the JS number 5, so naive
      // interpolation yields "Rated 5 on Google" while every existing surface and the
      // approved canonical string say "5.0". toFixed(1) also renders 4.8 correctly.
      ratingValue: reviews.rating != null ? Number(reviews.rating).toFixed(1) : null,

      // "Rated 5.0 on Google" style. A count is deliberately NOT baked into a phrase:
      // review counts move weekly and a stale count is the drift that started this.
      ratingText: reviews.rating != null ? `Rated ${Number(reviews.rating).toFixed(1)} on Google` : null,
      ratingTextEs: reviews.rating != null ? `Calificacion de ${Number(reviews.rating).toFixed(1)} en Google` : null,
    },

    cities,
    citiesText: cities.length ? cities.join(', ') : null,

    // ── Illinois tax and fee figures for the estimated total at signing ─────────────
    // Typed once above (IL_VEHICLE_TAX, IL_FEES), formatted once here. Consumers:
    // OtdEstimate.astro (the block), the /no-dealer-fees pages, the FAQ and suburb
    // templates ({{fees.capLine}}), llms.txt, and lint-copy.mjs (unpaired-doc-cap).
    taxes: {
      validFrom: IL_VEHICLE_TAX.validFrom,
      source: IL_VEHICLE_TAX.source,
      cook: IL_VEHICLE_TAX.cook,
      chicago: IL_VEHICLE_TAX.chicago,
      collar: IL_VEHICLE_TAX.collar,
      state: IL_VEHICLE_TAX.state,
      cookPct: pct(IL_VEHICLE_TAX.cook),
      chicagoPct: pct(IL_VEHICLE_TAX.chicago),
      collarPct: pct(IL_VEHICLE_TAX.collar),
      statePct: pct(IL_VEHICLE_TAX.state),
    },
    fees: {
      validFrom: IL_FEES.validFrom,
      source: IL_FEES.source,
      title: IL_FEES.title,
      plates: IL_FEES.plates,
      transfer: IL_FEES.transfer,
      ert: IL_FEES.ert,
      docCap: IL_FEES.docCap,
      docCapYear: IL_FEES.docCapYear,
      titleText: usd(IL_FEES.title),
      platesText: usd(IL_FEES.plates),
      transferText: usd(IL_FEES.transfer),
      ertText: usd(IL_FEES.ert),
      docCapText: usd2(IL_FEES.docCap),
      // The complete list of what is added at signing, in one sentence, so every surface
      // says the same thing. Drops the ERT clause automatically when ert is 0.
      addedLine: IL_FEES.ert > 0
        ? `At signing you add only Illinois sales tax, the state title and plate fees, and the ${usd(IL_FEES.ert)} electronic title and registration filing that issues your metal plates the same visit.`
        : 'At signing you add only Illinois sales tax and the state title and plate fees.',
      addedLineEs: IL_FEES.ert > 0
        ? `Al firmar solo agregas el impuesto de venta de Illinois, las tarifas estatales de titulo y placas, y los ${usd(IL_FEES.ert)} del tramite electronico de titulo y registro que entrega tus placas el mismo dia.`
        : 'Al firmar solo agregas el impuesto de venta de Illinois y las tarifas estatales de titulo y placas.',
      // The cap is taxable, so this is what the capped fee costs a Cook suburb buyer.
      docCapTaxedCookText: usd2(Math.round(IL_FEES.docCap * (1 + IL_VEHICLE_TAX.cook) * 100) / 100),

      // The cap line: the one approved way to quote the cap, always with the $0 beside it.
      // lint-copy.mjs fails the gate if the cap figure ever appears without "$0" or "zero"
      // within 200 characters. The cap is never typed into a page, a description, a post
      // or a print: it changes every January and only this ledger follows it.
      capLine: `Illinois lets dealers add up to ${usd2(IL_FEES.docCap)} in doc fees in ${IL_FEES.docCapYear}. At Maxim Autos that line is $0.`,
      capLineEs: `Illinois permite a los dealers agregar hasta ${usd2(IL_FEES.docCap)} en cargos de documentacion en ${IL_FEES.docCapYear}. En Maxim Autos esa linea es $0.`,
      capShort: `Illinois allows up to ${usd2(IL_FEES.docCap)} in doc fees. Here it is $0.`,
      capShortEs: `Illinois permite hasta ${usd2(IL_FEES.docCap)} en cargos de documentacion. Aqui es $0.`,
    },
  };
}

/**
 * Placeholder resolution for prose that lives inside JSON (suburbs.json, faq.json).
 * Those files are hand authored narrative, so the numbers inside them are written as
 * {{tokens}} and substituted at build time. Unknown tokens are left untouched on
 * purpose: silently deleting one would quietly change the meaning of a sentence, and
 * lint-copy.mjs fails the check when an unresolved token reaches built output.
 *
 * @param {string} text
 * @param {object} facts  output of deriveFacts
 */
export function resolveTokens(text, facts) {
  if (typeof text !== 'string' || !text.includes('{{')) return text;

  const table = {
    'price.band': facts.inventory.bandText,
    'price.bandEs': facts.inventory.bandTextEs,
    'price.segment': facts.inventory.segmentText,
    'price.segmentEs': facts.inventory.segmentTextEs,
    'price.stockLine': facts.inventory.stockLineText,
    'price.stockLineEs': facts.inventory.stockLineTextEs,
    'price.min': facts.inventory.priceMinText,
    'price.max': facts.inventory.priceMaxText,
    'price.from': facts.inventory.fromText,
    'price.fromEs': facts.inventory.fromTextEs,
    'inventory.count': facts.inventory.unitCount == null ? null : String(facts.inventory.unitCount),
    'inventory.stock': facts.inventory.stockText,
    'inventory.stockEs': facts.inventory.stockTextEs,
    'reviews.rating': facts.reviews.ratingValue,
    'reviews.count': facts.reviews.count == null ? null : String(facts.reviews.count),
    'reviews.ratingText': facts.reviews.ratingText,
    'cities': facts.citiesText,
    'fees.docCap': facts.fees?.docCapText,
    'fees.capYear': facts.fees?.docCapYear == null ? null : String(facts.fees.docCapYear),
    'fees.capLine': facts.fees?.capLine,
    'fees.capLineEs': facts.fees?.capLineEs,
    'fees.capShort': facts.fees?.capShort,
    'fees.capShortEs': facts.fees?.capShortEs,
    'fees.title': facts.fees?.titleText,
    'fees.plates': facts.fees?.platesText,
    'fees.transfer': facts.fees?.transferText,
    'fees.ert': facts.fees?.ertText,
    'fees.addedLine': facts.fees?.addedLine,
    'fees.addedLineEs': facts.fees?.addedLineEs,
    'taxes.cook': facts.taxes?.cookPct,
    'taxes.chicago': facts.taxes?.chicagoPct,
    'taxes.collar': facts.taxes?.collarPct,
    'taxes.state': facts.taxes?.statePct,
  };

  return text.replace(/\{\{\s*([a-zA-Z.]+)\s*\}\}/g, (whole, key) => {
    const val = table[key];
    return val == null ? whole : val;
  });
}

/** Every token name resolveTokens understands, for the linter's error messages. */
export const KNOWN_TOKENS = [
  'price.band', 'price.bandEs', 'price.min', 'price.max', 'price.from', 'price.fromEs',
  'price.segment', 'price.segmentEs', 'price.stockLine', 'price.stockLineEs',
  'inventory.count', 'inventory.stock', 'inventory.stockEs',
  'reviews.rating', 'reviews.count', 'reviews.ratingText', 'cities',
  'fees.docCap', 'fees.capYear', 'fees.capLine', 'fees.capLineEs', 'fees.capShort', 'fees.capShortEs',
  'fees.title', 'fees.plates', 'fees.transfer', 'fees.ert', 'fees.addedLine', 'fees.addedLineEs',
  'taxes.cook', 'taxes.chicago', 'taxes.collar', 'taxes.state',
];
