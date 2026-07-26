# Red Team: Compliance and Risk

**Run:** dominance-2026-07 · **Date:** 2026-07-25 · **Role:** compliance and risk skeptic
**Posture:** default to flagging. Severity `critical` means do not ship under any circumstances.
**Scope:** Maxim Autos only (`ma_vehicles`, J series). Sherman Dodge is not in this document.

Everything below was verified this session against a primary source, a live fetch, or a file on
disk. Where a source could not be reached it is marked UNVERIFIED and the finding is downgraded.
Nothing here is asserted from memory.

---

## 0. What I verified before writing a word

| Claim relied on | How verified | Result |
|---|---|---|
| Guardrails text | Read `businesses/maxim-autos/operations/compliance-guardrails.md` in full, 97 lines | Read |
| Google spam policy definitions | `developers.google.com/search/docs/essentials/spam-policies`, page last updated 2026-05-15 | Quoted below |
| FTC CARS Rule status | Fifth Circuit vacated 2025-01-27; FTC withdrew from the rulebook effective 2026-02-12; no re proposal | **Vacated. Do not cite it as binding.** |
| FTC current enforcement posture | 97 warning letters to dealer groups, announced 2026-03-13, Section 5 total price theory | Live and directly on point |
| Illinois advertising rules | 14 Ill. Adm. Code Part 475, full part pulled from ilga.gov | Quoted verbatim below |
| Illinois powertrain statute | 815 ILCS 505/2L via the Illinois AG dealer FAQ (already cited in the guardrails) | Confirmed |
| Illinois vehicle tax sourcing | IDOR Form ST-556 instructions, tax.illinois.gov | **Purchaser address governs.** See F4 |
| Title fee $165 / plate fee $151 | Corroborated across sources; ilsos.gov unreachable from here | Corroborated, not primary |
| Live site state | `curl` against www.maximautos.com and `/feeds/vehicles.xml` this session | See F1, F5, F6 |
| Make page duplication | `diff` on the four `used-<make>-skokie.astro` files, CRLF normalized | **10 differing lines of 226** |
| Suburb page uniqueness | Jaccard over `localCopy` across all 9 entries in `suburbs.json` | **Max pairwise 0.263.** They pass |
| Review integrity | Parsed live homepage JSON-LD; read `reviews.json` and `reviews_meta.json` | See F14 |
| Vehicle descriptions | Parsed all 7 live records in `vehicles.json` for banned vocabulary | **7 of 7 violate C8** |

---

## PART 1 — GOOGLE SPAM POLICY

### The policy text, quoted

Scaled content abuse, verbatim from Google's spam policies page (last updated 2026-05-15):

> "Scaled content abuse is when many pages are generated for the primary purpose of manipulating
> search rankings and not helping users."

Site reputation abuse, verbatim:

> "Site reputation abuse is a tactic where third-party content is published on a host site mainly
> because of that host's already-established ranking signals."

Doorway abuse is defined as creating multiple pages targeting specific queries that funnel users to
intermediate pages lacking utility relative to the final destination, with regional domain variations
given as an example.

### Honest judgment: site reputation abuse does not apply here, at all

No design in this run proposes hosting third party content. Every proposed page is authored by Maxim
about Maxim. Site reputation abuse is not a live risk and I will not manufacture one. Anyone who
raises it against this run is wrong.

### Honest judgment: the 9 suburb pages are clean

I measured them rather than eyeballing them. Each of the 9 entries in
`site/src/data/suburbs.json` carries between 571 and 646 words of body copy that is unique to that
city (`localCopy` plus `whyVisit` plus `directionsBlurb` plus 5 FAQ pairs). Maximum pairwise Jaccard
similarity of the body copy across all 36 city pairs is **0.263**. That is not a template with a city
name swapped in. The technical audit independently found unique titles, unique meta descriptions, and
705 to 1442 words per rendered page. These pages help a user decide where to buy a car. They are not
scaled content abuse and they are not doorways. Do not weaken them defensively.

### Critical: the 4 make pages ARE the doorway pattern, live, today

This is the single largest Google policy exposure in the run and no auditor caught it.

```
diff used-toyota-skokie.astro used-honda-skokie.astro  ->  10 differing lines
diff used-toyota-skokie.astro used-subaru-skokie.astro ->  10 differing lines
diff used-toyota-skokie.astro used-audi-skokie.astro   ->  10 differing lines
(files are 226 lines each; CRLF normalized before diffing)
```

**95.6 percent identical.** The 10 lines that differ are: one `const MAKE` assignment, one FAQ question,
one FAQ answer, and two body paragraphs. Everything else, including the entire page structure, the
schema, the CTAs, and the rest of the prose, is byte identical across four URLs.

That is precisely "many pages generated for the primary purpose of manipulating search rankings."
The demand audit already found `used-audi-skokie` matches zero inventory, live and sold, which makes
it a page that exists only to hold a keyword.

Both the content engine design and the demand audit recommend **adding a Volvo page** to this set.
That takes the pattern from 4 to 5 and is the wrong direction.

### Also inside those 4 pages: a false claim carried in structured data

Line 77 and line 85 of every make page, emitted as `FAQPage` JSON-LD:

> "with current rotating inventory in the $5,000 to $15,000 range"

Live band is $8,995 to $15,995. See F5. The make pages are the worst offender because the false band
sits inside machine readable answer text, not just prose.

---

## PART 2 — FINDINGS

Numbered F1 onward. Severity, target, attack, fix.

---

### F1 · CRITICAL · brand.md mandates a C8 violation that is live on 7 of 7 cars and inside the Google Merchant Center feed

**Target:** `memory/context/maxim-autos-brand.md` (D9), and every design that reads it.

`maxim-autos-brand.md` line 10 names pillar 1 **"TOTAL PROTECTION"**, the exact phrase guardrail C8
bans. Worse, line 27 makes the violation a standing production rule:

> **Brand Tagline (use as closing line in all car descriptions)**
> *Every car inspected. Every price transparent. Every customer protected.*
> **Rule:** Closing tagline in vehicle descriptions and Maxim Autos marketing copy stands alone.

Verified live this session, not theoretical:

- **7 of 7 live vehicle descriptions** in `site/src/data/vehicles.json` contain "Every customer protected"
  (J10210, J10216, J10205, J10218, J10217, J10215, J10206).
- **7 occurrences of "Every customer protected" are live inside
  `https://www.maximautos.com/feeds/vehicles.xml`**, the Google Merchant Center vehicle feed.
- The operator audit separately found 62 occurrences across 56 site pages via the shared footer.

Guardrail C8 bans "any phrase implying comprehensive coverage" because cars are sold AS IS with an
FTC Buyer's Guide in the window stating exactly that. "Every customer protected" is an unqualified
coverage claim about an AS IS car. It is the same defect class as the purged 3 month warranty, and it
is being fed to Google on an account whose Business Profile was suspended on 2026-07-11 and only
re verified on 2026-07-24.

**Why every proposed linter misses it.** The operator design's banned phrase scan fixes the *footer
string* only. The content engine's CG rules and the ai visibility linter both scan generated
artifacts. None of them touch `maxim-autos-brand.md`, which is the file a copy agent reads before
Jerry types a description into DealerCenter. The source keeps re injecting the claim.

**Fix, exactly:**

1. `memory/context/maxim-autos-brand.md` line 10: rename pillar 1 from `### 1. TOTAL PROTECTION` to
   `### 1. INSPECTED AND DOCUMENTED`. That is the replacement guardrail C8 itself names.
2. Same file line 27, replace the mandated closing tagline with:
   `Every car inspected. Every price transparent. Every car documented.`
3. Same file, add a line directly under the tagline: `BANNED in this tagline and anywhere else:
   "protected", "total protection", "complete protection", "full protection", "guaranteed",
   "certified", "warranty on every car". See operations/compliance-guardrails.md C7 and C8.`
4. Same file line 5, change `Status: Active` to
   `Status: Active. Subordinate to operations/compliance-guardrails.md. Where they conflict, the
   guardrails win.`
5. Same file line 15, `Metal Plates Issued On-The-Spot` is a hyphenated compound and violates the
   house style rule. Change to `Metal plates issued the same visit`.
6. Same file line 35, `34 reviews as of April 9, 2026` is stale against a live 46. Replace the number
   with `read live from site/src/data/reviews_meta.json, never hardcoded`.
7. Same file line 47, `Price range: $5,000–$15,000` carries an en dash and a false band. Delete the
   line and replace with a pointer to the live ledger.
8. Add `memory/context/maxim-autos-brand.md` and `memory/context/maxim-autos-copy-playbook.md` to the
   scan target list of the content engine's `content-guard.mjs` and the ai visibility
   `lint-compliance.js`. **A linter that only scans generated output cannot catch a poisoned source.**
9. Rewrite the 7 live descriptions and push the corrected strings back into DealerCenter. The operator
   design's "screen the DealerCenter description field at ingest" proposal is the right durable
   control and should ship in the first wave, not later.

---

### F2 · CRITICAL · copy-playbook.md teaches the false 3 month warranty as the approved substitute for the banned word "certified"

**Target:** `memory/context/maxim-autos-copy-playbook.md` (D9).

The technical audit called this 11 places. It is worse. I counted the references and the structural
problem is not the count, it is the role the false claim plays in the document.

Line 533, in the section the file itself calls the rule that establishes the entire forbidden words list:

> "Every Maxim vehicle is *inspected* and comes with a *3-month Peace of Mind Warranty* — those are
> the real, true, factual claims and they are the language we use."

The document instructs any agent reading it that the false claim is **the correction** for the banned
word. An agent that correctly avoids "certified" will land on "3-month Peace of Mind Warranty" because
this file told it to. That is how a false warranty claim reached 15 places and stayed there for months,
and it is why the ai citation audit still finds it being served to answer engines through a stale Bing
index of 6 live URLs.

Additional violations in the same file that nobody has flagged:

- Line 648 and line 713 render it as a bullet in a shipping template: `• 3-Month Maxim Peace of Mind
  Warranty Included`.
- Line 753: *"you'll get a financing decision today, not 'we'll let you know.'"* That is an approval
  promise. Guardrail B4 and ECOA require approval language to stay conditional. This is the single
  most dangerous sentence in the file after the warranty claim.
- Line 708 and 753: *"financing is available no matter your credit"* is a functional restatement of
  guaranteed approval. B4 permits "financing for all credit levels" and nothing stronger.
- Line 25 and line 39 bake the warranty into the four paragraph description recipe that MEMORY.md
  points at as the canonical listing format.

**Do not edit this file line by line.** Fifteen plus edits to a 770 line document will miss instances
and will leave the document's teaching intact.

**Fix, exactly:**

1. Move the file to `memory/context/_retired/maxim-autos-copy-playbook-2026-04.md` and add a header
   block at line 1:
   `RETIRED 2026-07-25. This document contains a FALSE claim (a "3-month Peace of Mind Warranty" that
   Maxim has never offered) taught as approved copy in 15+ places, and non conditional credit approval
   language banned by ECOA and guardrail B4. It is preserved for provenance only. It is NOT admissible
   as evidence for any claim and MUST NOT be used to generate copy.`
2. Write a replacement `memory/context/maxim-autos-copy-playbook.md` that keeps only the structural
   craft (the four paragraph narrative shape, the slot model, the single phone CTA rule, the specific
   numbers discipline) and sources every factual claim from `claims.json` rather than restating it.
   The content engine's claim registry proposal is the correct destination.
3. The replacement's warranty slot must read, verbatim and as the only permitted phrasing:
   `Illinois 15 day / 500 mile statutory powertrain protection on qualifying cars.`
4. Update MEMORY.md's pointer (`Listing descriptions use the lean four-paragraph narrative format`) to
   the new path in the same commit, or the retired file gets loaded anyway.
5. The content engine's `maxverify` agent already declares brand.md and copy-playbook.md inadmissible
   as evidence. Keep that. It is the single best idea in the run. Extend it to
   `build_ai_knowledge_base.py` and `SPEC.md` section 5A.

---

### F3 · CRITICAL · /out-the-door quotes a fixed 9.9 percent APR to an audience the design explicitly identifies as subprime

**Target:** design ux, "SIGNATURE: /out-the-door budget first page", and the Out The Door VDP module's
payment pair.

The design's own justification, quoted from the proposal: *"Subprime buyers shop by monthly budget,
not price."* The page then computes payments with a hardcoded rate. From the design doc, section 5:

```js
const i = 0.099 / 12, n = 60;   // matches the Reg Z disclosure exactly
```

There is no rate control. Every result renders at 9.9 percent APR.

**This is a regression from a surface that is already compliant.** `site/src/pages/financing.astro`
line 104 ships an APR slider with `min="3.9" max="24.9" step="0.5" value="9.9"`. The existing
calculator lets a shopper see what a 22.9 percent rate actually costs. The new page, aimed
specifically at the buyers most likely to land near the top of that range, removes the control and
shows only the bottom of it.

The exposures, in order of severity:

- **14 Ill. Adm. Code 475.620, Advertised Terms Unavailable**, and **475.630, Advertised Finance Rate.**
  Illinois treats advertising credit terms a buyer cannot get as an unfair or deceptive act. A page
  that tells a credit challenged shopper "these cars land in your $300 range" at 9.9 percent, when the
  lender book for that buyer is materially higher, is advertising terms unavailable to the audience
  it was built for.
- **14 Ill. Adm. Code 475.610.** Illinois lists five closed end credit triggering terms, verbatim:
  *"amount or percentage of down payment; number of payments; period of repayment; amount of any
  payment (expressed as percentage or dollar amount); or amount of any finance charge."* The page's
  two sliders are **down payment** and **amount of payment**. Two triggers, deliberately, as the
  primary interface. Disclosure is mandatory and the disclosure must not be contradicted by the
  headline, per 475.210 and 475.220.
- **12 CFR 1026.24 (Reg Z) and guardrail B1.** The footnote is present in the design, which is
  necessary but not sufficient. B6 bans deceptive omission and hidden conditions behind asterisks that
  change the headline offer. A footnote reading "actual terms vary by credit" underneath a page whose
  entire premise is "here is what you can afford" is the asterisk contradicting the headline.
- **FTC Act Section 5.** The FTC's March 2026 letters to 97 dealer groups name, among the deceptive
  practices, *"advertising prices that do not clearly account for required down payments"* and
  *"advertising prices that incorporate rebates or discounts not generally available to all
  consumers."* An illustrative rate available to some consumers, presented as the affordability
  answer for all of them, is the same theory.
- **ICFA, 815 ILCS 505/2.** Part 475 is promulgated under it. Private right of action, fee shifting,
  and the Illinois AG's consumer protection line is printed on Maxim's own Terms page.

**Fix, exactly:**

1. **Do not ship a fixed rate anywhere.** Port the existing `financing.astro` APR slider (3.9 to 24.9,
   default 9.9) onto `/out-the-door` and onto the VDP Out The Door module's payment pair. One
   component, per the design's own PaymentEstimator consolidation proposal.
2. Add a required rate context line directly adjacent to the payment output, in both languages, not in
   a footnote:
   EN: `Rate shown is an example. Approved rates at Maxim Autos have ranged from about 3.9 percent to
   about 24.9 percent depending on credit. Move the rate slider to see your range.`
   ES: `La tasa mostrada es un ejemplo. Las tasas aprobadas en Maxim Autos han variado de
   aproximadamente 3.9 por ciento a aproximadamente 24.9 por ciento segun el credito. Mueva el control
   de tasa para ver su rango.`
   **Gate:** Jerry must confirm that 3.9 to 24.9 is the real approved range before this string ships.
   If he cannot, drop the numbers and say `Your rate depends on your credit and the lender.`
3. Change the results heading. The design already proposes *"Cars whose estimated payment lands in your
   range."* Keep that exact string and forbid "you qualify", "approved", "you can afford",
   "guaranteed", and "pre approved" anywhere on the page. Add all five to `content-guard.mjs` scoped to
   this route.
4. Reg Z footnote must render **above the fold on the results block**, not only at page bottom. 475.210
   requires material terms clear and conspicuous *at the outset of the offer*.
5. `content-guard.mjs` gets a new rule: any route emitting a `$X/mo` string must also emit, on the same
   route, a down payment value, a term in months, and the literal token `APR`. That is the Reg Z triad
   and the Illinois 475.610 disclosure in one assertion.

---

### F4 · CRITICAL · The Out The Door total is wrong for a whole class of buyers in Maxim's own trade area

**Target:** design ux, Out The Door module (`il-fees.json`, `taxRate.rate = 0.0725`).

The designer did real work here and got one thing right and one thing wrong.

**Right:** local home rule *sales* tax does not apply to titled vehicles. Skokie's own FAQ confirming
7.25 percent for a motor vehicle versus 10.25 percent general merchandise is a good primary source and
I am not challenging it.

**Wrong, and it is the load bearing part:** the rate is not a property of Skokie. It is a property of
the **buyer**. Quoted from the Illinois Department of Revenue Form ST-556 instructions
(`tax.illinois.gov/forms/sales/vehicleusetax/st-556-sales-tax-transaction-return-instructions.html`):

> "This tax rate is determined by the purchaser's address entered in Section 1."

And, specifically defeating the design's home rule reasoning:

> "If your sales location is in Cook, DuPage, Kane, Lake, McHenry, or Will County and the purchaser's
> address on Form ST-556, Section 1, is within the corporate limits of the city of Chicago, you must
> collect an additional 1.25 percent (.0125) Chicago Home Rule Use Tax."

Maxim's sales location is Skokie, in Cook County. The Chicago Home Rule **Use** Tax is a separate tax
from the home rule *sales* tax the design correctly excluded, and it **does** reach titled vehicles,
keyed to the purchaser's address.

Consequence, using the design's own worked example: a Chicago buyer of the $15,995 Crosstrek owes
8.50 percent, not 7.25 percent. That is **$200 more** than the navy bar says. The design prints
`Estimated out the door $17,471` in extrabold 3xl white on navy, labelled `Total`. Maxim actively
markets into the Chicago corridor: `used-cars-chicago-north-shore` is a live page, and the
competitive audit names the near north Chicago dealer corridor as trade area.

An understated total presented as a total, on the page whose entire selling proposition is *"we are
the only honest number in the market"*, is the worst possible place to be wrong. It is also directly
in FTC total price territory and 475.310 territory.

**Fix, exactly:**

1. `il-fees.json` gains a `taxRates` object, not a scalar:
   `{"default": {"rate": 0.0725, "label": "Illinois motor vehicle rate, Cook County suburbs"},
   "chicago": {"rate": 0.0850, "label": "Illinois motor vehicle rate plus Chicago Home Rule Use Tax"}}`
   with `source: "https://tax.illinois.gov/forms/sales/vehicleusetax/st-556-sales-tax-transaction-return-instructions.html"`
   and a `verifiedOn` date on each.
2. The module renders a two option control labeled `I will register the car in: [Cook County suburbs]
   [City of Chicago]`, defaulting to suburbs. Two radio buttons. No geolocation, no address field, no
   personal data collected.
3. Relabel the navy bar. Not `Total`. Not `Estimated out the door` as a bare noun phrase. Use:
   `Estimated out the door, Cook County suburbs` (or `, City of Chicago`), with the estimate word
   inside the label, not only in a footnote.
4. Add to the disclosure block, both languages, in the same visual weight as the total, not smaller:
   EN: `Illinois taxes a vehicle at the rate for the address where you register it, not where you buy
   it. If you register outside Cook County or the City of Chicago your rate will differ. Plate fee
   assumes new plates. If you transfer plates from a vehicle you already own, the fee is lower. Tax,
   title and plate amounts are estimates and are set by the State of Illinois, not by Maxim Autos.`
   ES: the matching string, required by guardrail D4, and it must exist in the same commit.
5. The $151 plate fee overstates for any buyer transferring plates, which at this price point is a
   large share of buyers. Point 4 covers it in copy. Do not model it, an unrequested extra input costs
   more than it earns.
6. **Build gate, hard:** the design already declares `titleFee`, `plateFee`, and the `$377.63` doc fee
   cap as corroborated but not primary because `ilsos.gov` and `illinoisdealers.com` were unreachable.
   That gate is correct and must be enforced. **If the $377.63 figure cannot be confirmed against a
   primary Illinois source before ship, the line renders as `Illinois allows dealers to charge a
   documentary service fee. We charge zero.` with no number.** A fabricated ceiling in a comparative
   context is a Lanham Act and ICFA exposure, not a typo.

---

### F5 · CRITICAL · "$5,000 to $15,000" is not copy drift, it is an Illinois range of prices advertising violation, live in structured data

**Target:** every design that treats D8 as a formatting bug. All four do.

Verified live this session:

- `https://www.maximautos.com/` homepage `AutoDealer` JSON-LD: `"priceRange": "$5,000 to $15,000"`.
- `https://www.maximautos.com/used-toyota-skokie`: three occurrences, two of them inside `FAQPage`
  answer text.
- Live band from `vehicles.json`: **$8,995 to $15,995**. Nothing on the lot is within $3,995 of the
  advertised floor.

14 Ill. Adm. Code 475.390, Range of Savings or Price Comparison Claims, quoted verbatim:

> "It is an unfair or deceptive act to advertise that any vehicles are being offered for sale at a
> range of prices ... unless: a) the highest price or lowest discount in the range is clearly and
> conspicuously disclosed in the advertisement; and b) a reasonable number of these vehicles in the
> advertisement are offered with at least the largest advertised discount; and c) the vehicles are
> readily available for sale in sufficient quantity likely to meet reasonable expectable public demand."

Maxim fails (b) and (c) outright. Zero vehicles at the low end of the advertised range. And
475.310 closes it:

> "Purchasers shall be able to purchase all vehicles described by the advertisement at the advertised
> price."

Plus the FTC's March 2026 letters name *"advertising vehicles that are unavailable or nonexistent"*
as deceptive under Section 5.

The guardrails document is itself the vector. `compliance-guardrails.md` line 13 hardcodes
`Price band: $5,000–$15,000` under "Canonical business identity (use verbatim everywhere)". The
content engine caught this and it is the sharpest observation in the run: a verifier checking pages
against the guardrail doc would confirm the wrong number with confidence.

**Fix, exactly:**

1. `compliance-guardrails.md` line 13: delete the hardcoded band. Replace with
   `Price band: NEVER hardcoded. Read live from site/src/data/vehicles.json via the facts ledger. A
   stated range that no live unit sits inside violates 14 Ill. Adm. Code 475.390 and 475.310.`
2. Ship the content engine's `facts.json` ledger. It is the correct structural fix and it is the only
   proposal in the run that removes the defect class rather than the instance. Priority 1.
3. Until the ledger ships, **stop stating a range at all.** A single computed floor phrased
   `Most cars $9,000 to $16,000` is still a 475.390 range claim. The safe interim string is
   `Inventory currently priced from $8,995` computed live, with the count and the highest price
   disclosed adjacent, satisfying 475.390(a) and 475.320.
4. `content-guard.mjs` rule CG for this: any rendered `$X,XXX to $Y,YYY` string must equal live
   `priceLow` and `priceHigh` from the ledger to the dollar, on prose, on `priceRange` JSON-LD, on
   `FAQPage` answer text, on `llms.txt`, and on the GMC feed. Build fails otherwise. Both the ai
   visibility linter and the content engine guard proposed a version of this. Merge them, do not ship
   two linters.
5. `add`: the GBP business description also carries this band per the ground truth. That is a GBP
   mutation and needs Jerry's specific approval under A1, at most 2 GBP surface touches per week. It is
   a **correction of a false statement**, which makes it the highest priority GBP touch available.
   Queue it as its own approval card line. Do not bundle it with anything else.

---

### F6 · CRITICAL · Adding a Volvo make page multiplies a live doorway pattern

**Target:** design content engine ("KILL the programmatic crossproducts and retire used-audi-skokie",
which nonetheless ships Volvo); audit demand ("Build a used-volvo-skokie make page (reuse the existing
226-line make-page template)").

The content engine deserves credit: it kills the 45 URL city by make crossproduct, sets a
5 percent uniqueness estimate, and defines an inventory gate. That is the right instinct applied to the
wrong page. Its own publish test T2 requires *"at least 40 percent of body cannot be produced by
swapping one template variable."* Measured, the existing make pages are **4.4 percent** unique. They
fail the design's own test by a factor of nine, and the design proposes adding a fifth built from the
same template.

The demand audit's phrasing gives it away: *"reuse the existing 226-line make-page template."*

**Fix, exactly:**

1. **Do not build `used-volvo-skokie`.** Not now, not under the inventory gate. The gate controls
   whether a thin page exists, not whether it is thin.
2. Retire `used-audi-skokie` immediately via the existing retired slug ledger, 301 to `/inventory`.
   Zero Audi across all 27 records, live or sold. It is a keyword holder and the FTC's
   "vehicles that are unavailable or nonexistent" language reaches it.
3. Rebuild the three surviving make pages to clear T2 before any fifth page is discussed. Each needs
   at least 40 percent body copy that cannot be produced by variable substitution. The only material
   Maxim actually has that satisfies this is its **own sold history for that make**: real units, real
   mileages, real days on lot, real asking prices, from `vehicles.json`. Subject to F8's disclosure
   requirements.
4. Add a `content-guard.mjs` rule, and this is the one rule that would have prevented the whole class:
   **pairwise body text similarity across any set of sibling generated pages must be below 0.60
   Jaccard. Build fails above it.** Run it over make pages, suburb pages, price bracket pages, and any
   future set. The suburb pages pass today at 0.263, so the rule ships green and only bites the
   genuinely thin sets. The content engine's T2 is the right idea expressed as a judgment call. This
   makes it a number the build can enforce.
5. `used-cars-under-10000-skokie` and `used-cars-under-15000-skokie` differ by 40 lines of 187. Run
   them through the same rule. They are borderline and need real content, not retirement.

---

### F7 · HIGH · The doc fee comparison page names competitors, and Illinois regulates that specific act

**Target:** design content engine, "Ship exactly one comparison page (doc fees), gate the rest".

The design is right that this is the highest legal exposure on its list and right to cut it to one
page. It is not right that a URL plus a fetch date plus a verbatim quote plus a 90 day expiry is
enough. Two Illinois sections it does not address:

14 Ill. Adm. Code 475.360(b), verbatim:

> "It is an unfair or deceptive act to use any advertising term(s) which compare the dealer's current
> selling price with a price currently being offered by another dealer for an identical vehicle,
> explicitly or implicitly, unless the stated higher comparative price is at or below the price at
> which the identical vehicle is currently being offered in the dealer's trade area by: 1) a
> reasonable number of other dealers in the same trade area; or 2) another dealer(s) is specifically
> identified in the advertisement."

A doc fee is a component of the price a buyer pays. A page saying "they charge $377.63, we charge $0"
is an implicit total price comparison. The design's own framing, *"copying the line item costs them
$377.63 per car"* (design ux), is a superiority claim about price, whatever the page's headline says.

14 Ill. Adm. Code 475.340, verbatim:

> "It is an unfair or deceptive act to advertise the terms 'lowest prices,' 'guaranteed lowest
> prices,' 'prices lower than anyone else', or words of similar import ... unless the dealer
> systematically monitors and continues to monitor competitive prices in the trade area and can
> substantiate such claim."

"No dealer inside 50 miles publishes an itemized out the door total. Maxim becomes 1" is words of
similar import. **Systematically monitors and continues to monitor** is an ongoing obligation, and the
governing brief for this whole run forbids proposals that require recurring human work. A staleness
timer that hides the page is not monitoring, it is the absence of monitoring with a graceful failure.

The competitive audit also found that four named competitors returned 403 or Cloudflare challenges to
this session's fetches. A page whose substantiation depends on periodically re fetching competitor
sites is built on an evidence source that already fails for a third of the field.

Federal exposure: Lanham Act 15 U.S.C. 1125(a) false advertising, which reaches comparative claims
about an identified competitor and gives that competitor standing to sue directly. Carvana and CarMax
have in house counsel. Maxim is one person.

**Fix, exactly:**

1. **Do not name any competitor.** Not Carvana, not CarMax, not iCars Chicago, not a franchise store,
   not "the dealer down Dempster." Naming is what converts an educational page into comparative
   advertising with a plaintiff.
2. Ship the page as `/illinois-doc-fee` and write it in the second person about the reader's own
   transaction, sourced entirely to Illinois law and to Maxim's own pricing. The provable, permanent,
   competitor free version:
   - What a documentary service fee is, citing 14 Ill. Adm. Code 475.310, which permits it to be
     excluded from an advertised price if clearly disclosed.
   - What the Illinois statutory maximum is, **only if confirmed against a primary source** (see F4.6).
   - `Maxim Autos charges $0. The advertised price plus tax, title and license is what you pay.`
   - `What to ask any dealer: what is the documentary service fee on this car, and what else is added
     between the advertised price and the contract.`
   None of that goes stale, none of it needs monitoring, and none of it can be sued over.
3. Add the disclosure the page needs to survive 475.310 scrutiny of its own claim, both languages:
   `Illinois lets a dealer exclude tax, title and license fees and a documentary service fee from an
   advertised price. Maxim Autos excludes only tax, title and license. There is no documentary service
   fee, no preparation fee, no reconditioning fee, and no addendum.`
4. Delete the "0 of 6 competitors publish this, Maxim becomes 1" success metric from the design doc.
   It is unfalsifiable, it is a lowest prices claim in disguise under 475.340, and once it appears in a
   design doc some agent will eventually put it on a page.
5. If Jerry insists on a named comparison, that is a lawyer's call, not an architect's, and it needs an
   opinion letter before a line of code. Say that in the recap and stop.

---

### F8 · HIGH · /sold publishes prices for vehicles nobody can buy, which is the exact thing the FTC just sent 97 letters about

**Target:** design content engine, P2 `/sold`. Also design ux, which proposes putting it on
`/out-the-door`. Directly contradicted by design ai visibility, which kills it.

The content engine already did the honest thing and killed the pitched framing, because `ma_sales`
holds 1 row against 119 sold vehicles, so "what we sold it for" would be fabricated 118 times. Correct
call. But the survivor still has three problems.

**14 Ill. Adm. Code 475.310:** *"Purchasers shall be able to purchase all vehicles described by the
advertisement at the advertised price."* An indexed page listing 20 vehicles with prices, where none
can be purchased at any price, is described by that sentence. The design's disclosures help but
475.220 governs footnotes and 475.210 requires material terms disclosed *"at the outset of the offer
so as to leave no reasonable probability that the offering might be misunderstood."*

**FTC Section 5, current posture.** The March 2026 letters explicitly name *"advertising vehicles that
are unavailable or nonexistent"* among the practices the Commission considers deceptive. This is not a
historical rule. It is the theory the agency is actively working, three months old, against 97 dealer
groups.

**14 Ill. Adm. Code 475.360(d), used vehicles specifically:**

> "it is an unfair or deceptive act to use terms such as 'was $____, now $____', which compare the
> dealer's current selling price with a higher price; provided, however, a dealer may compare an
> advertised price with a retail value listed in a current, nationally recognized, and published price
> guide book."

The design bans "was/now" explicitly, which is good. But the UX design proposes placing `/sold` on
`/out-the-door`, adjacent to live estimator output, and the UX designer's own note flags it:
*"a sold price presented near a live price reads as a live price."* He is right, and that is a 475.360(d)
construction created by layout rather than by wording.

Privacy: asking prices are Maxim's own past advertisements, not buyer data. No buyer name, VIN, or
identifying detail is proposed. **Privacy is not a real objection here and I will not invent one.**
Competitive exposure is real but it is Jerry's business call, not a compliance finding.

**Fix, exactly:**

1. Ship `/sold` **`noindex, follow`**. It stays useful to a human who lands on it and to an answer
   engine crawling for entity context, and it is not an advertisement in Google's index. This is
   the same posture the 20 sold VDPs already correctly use, verified live today
   (`noindex: True`, `availability: https://schema.org/SoldOut`).
2. Emit **no `Offer` node and no `price` property** anywhere in `/sold` JSON-LD. Prose only. A machine
   readable price on an unavailable vehicle is the cleanest possible version of the 475.310 problem.
3. Put the disclosure **above the table**, first content after the h1, both languages, same type size
   as the body:
   EN: `Every vehicle on this page is sold and is not available for purchase. The figure shown is the
   price Maxim Autos advertised at the time, not the final transaction price. It does not predict the
   price of any current or future vehicle.`
   ES: matching string, same commit, per guardrail D4.
4. **Never adjacent to live inventory.** Reject the UX design's placement on `/out-the-door`. `/sold`
   is its own route, reached from `/about`, and no live `VehicleCard` renders on it.
5. Fix the live defect the ai visibility design found: `[slug].astro:186` computes `priceValidUntil` as
   build date plus 60 days unconditionally. Verified live on a sold car today:
   `"priceValidUntil": "2026-09-24"` on a unit that sold weeks ago. When status is sold, set it to
   `sold_date`. A forward dated price validity on an unavailable vehicle is a structured data assertion
   that the price is still good.
6. The sold VDP rescue rail (3 similar in stock cars) is good and should ship. Guard it: each rail card
   is a live `VehicleCard`, so guardrail D3 applies and the Reg Z footnote must render on all 20 sold
   VDPs. Confirm it already does before calling this done.

---

### F9 · HIGH · Five surfaces make five different inspection claims about a document that does not exist digitally

**Target:** design content engine, "Force the inspection claim fork"; design ux, "Publish the
inspection checklist as /inspection"; design ai visibility, "Publish the inspection PROCESS".

All three designs converged on this independently, which is the strongest signal in the run. The
content engine's Option A / Option B fork is the correct framing and I am adopting it rather than
restating it. My additions are the parts none of them covered.

**The FTC Used Car Rule collision nobody named.** Guardrail B3 and 16 CFR Part 455 require an FTC
Buyer's Guide in every window stating AS IS or warranty, and require that the site never contradict it.
16 CFR 455.3 also requires that any oral or written representation about the vehicle's condition be
consistent with the Buyer's Guide. Publishing per VIN measurements (tread depth in 32nds, brake pad
thickness in mm, battery voltage, named inspector) converts each measurement into a **written
representation about the condition of an AS IS vehicle**, made in an advertisement, at the moment of
sale. That is a materially different legal object than "we inspect our cars."

It is not fatal. Measurements that are true, dated, and correctly scoped are defensible and are the
most valuable content on the list. But the design must carry the qualifiers, and none of the three
drafts do.

**Fix, exactly:**

1. Take the content engine's **Option A** (capture the record) or **Option B** (soften the claims).
   There is no third option and the exposure exists today either way.
2. If Option A, every inspection page carries this block above the measurements, both languages, and
   it is not optional:
   `These measurements were taken on [date] by [name] and describe the vehicle's condition on that
   date. This vehicle is sold AS IS. Wear items change with use. This page is not a warranty, not a
   guarantee of future condition, and does not modify the FTC Buyer's Guide displayed in the vehicle
   window or the terms of the purchase contract.`
3. Kill the word "report" everywhere. `used-cars-under-10000-skokie.astro:160` currently promises a
   written report a buyer can read before deciding. Until Option A actually captures records, that
   sentence promises a document that does not exist. Replace with
   `Ask Jerry what was checked on any car before you decide.`
4. The five inconsistent surfaces must all resolve to one string from `claims.json`. The content
   engine's claim registry is the mechanism. Include in that sweep, and this one is outside the website
   repo so no linter in this run reaches it: `businesses/maxim-autos/operations/build_ai_knowledge_base.py`
   line 40.
5. Reject the UX design's instruction to carry the paper form's `Every customer protected` footer onto
   the site. It already correctly says do not. Confirm the built page does not inherit the site footer's
   copy of the same phrase, which per F1 is on all 56 pages.
6. `SPEC.md:109`'s approved GBP description contains *"comes with a free CARFAX and the inspection
   report."* If Option B is chosen, that sentence becomes unsupportable and the GBP description needs a
   correction, which is a GBP mutation under A1 requiring Jerry's specific approval and one of the two
   weekly surface touches. Flag it to MaxGoogle. Do not let a website decision silently create a GBP
   edit obligation nobody scheduled.

---

### F10 · HIGH · A customer facing AI channel outside the website repo is serving a banned phrase, wrong hours, and a stale review count

**Target:** design ai visibility, "Point build_ai_knowledge_base.py at dealer.json". Correctly found,
correctly graded trivial to fix, and **undergraded on severity**.

`businesses/maxim-autos/operations/build_ai_knowledge_base.py` generates `ai-knowledge-base.md`, which
is pasted into the GoHighLevel conversation AI that talks to actual customers. Verified by reading the
file this session:

| Line | Live content | Truth | Rule broken |
|---|---|---|---|
| 51 | `1. **Total Protection.** Every car is fully inspected.` | Cars are AS IS | **C8**, and "fully inspected" is unqualified |
| 44 | `Monday through Saturday: 9:00 AM to 7:00 PM Central` | Mon/Tue/Thu/Fri 3 to 7, Sat 10 to 3, Wed by appt, Sun closed | **A7** |
| ~117 | `Sunday by appointment` | Sunday closed | **A7** |
| 37 | `5000 to 15000 dollar range` | $8,995 to $15,995 | **475.390**, see F5 |
| 37 | `34+ reviews` | 46 | **D2**, guardrail "never a hardcoded review count" |
| 41 | `jerryf@maximautos.com` | site schema says `jfranco@` | **D1** NAP consistency |

The hours are the GBP re suspension vector. Guardrail A7 requires GBP hours to match the website.
A customer facing bot telling people Maxim is open Monday 9am, and open Sunday by appointment, when
the lot is closed Monday morning and closed Sunday, produces exactly the pattern that generates "the
hours are wrong" Google user edits and "permanently closed" suggestions against a profile that came
off suspension 24 hours ago. That is not a data hygiene issue, it is a live threat to the asset Jerry
just spent 13 days recovering.

The warranty answer in that file is, to be fair, **correct**: *"Every qualifying used car is backed by
Illinois' 15 day / 500 mile statutory powertrain protection."* That is the model phrasing. Every other
surface should copy it.

**Fix, exactly:**

1. Repoint `build_ai_knowledge_base.py` at `dealer.json` and `reviews_meta.json`. Ship this in wave 1,
   not later. It is the shortest path from a real live falsehood to a fix.
2. Correct the hours in the same commit, verbatim from the guardrails and the GBP:
   `Monday 3 to 7, Tuesday 3 to 7, Wednesday by appointment, Thursday 3 to 7, Friday 3 to 7,
   Saturday 10 to 3, Sunday closed. Central time.`
3. Delete `Total Protection` and `fully inspected`. Replace with `Inspected and documented.`
4. Fix the email to `jfranco@maximautos.com`, or fix the site schema, but pick one and put it in
   `dealer.json`. Do not leave two.
5. Add the generated `ai-knowledge-base.md` to the operator's banned phrase scan target list. It is a
   published customer facing artifact and the operator design currently scans only sitemap URLs plus
   `llms.txt` plus the GMC feed.
6. The regenerated file must be pasted back into GoHighLevel by hand. That is manual work and the brief
   forbids recurring manual work, so this is a **one time** correction plus a build time diff that
   raises an approval card line whenever the file changes. It must not become a weekly chore.

---

### F11 · HIGH · Every new machine readable surface is an advertisement and none of the designs treat it as one

**Target:** design ai visibility `/inventory.json`, the Atom feed, the generated `llms.txt`; design
content engine's ledger derived `llms.txt`.

`/inventory.json` as designed publishes per car: canonical URL, VIN, specs, all in price, mileage,
photos, stock number, availability, plus a `potentialAction` with `tel:`, a prefilled `sms:` body, and
a link to `/financing#apply`. That is a price, an availability representation, and a call to action, in
a format explicitly built for third parties to consume and re present.

14 Ill. Adm. Code 475.110 defines advertisement broadly and 475.310 applies to "the total price of a
motor vehicle" wherever advertised. Nothing in Part 475 limits it to HTML. The GMC feed is already
treated as an advertising surface by everyone in this run, correctly. `/inventory.json` is the same
object with a different content type.

The concrete failure: an answer engine or shopping agent reads `/inventory.json`, sees `price: 15995`,
and renders it to a consumer as Maxim's offer without any of the surrounding page context, without the
tax title and license exclusion disclosure, and without the Reg Z footnote. Maxim has no control over
the rendering and the design proposes an **attribution license line** that invites exactly that reuse.

Same problem, smaller, for the Atom feed and `llms.txt`.

**Fix, exactly:**

1. `/inventory.json` gains a top level `disclosures` object, and every per vehicle record gains a
   `disclosures` reference to it, so a consumer that takes one record still carries the strings:
   ```json
   "disclosures": {
     "priceIncludes": "Advertised price is the full vehicle price. Maxim Autos charges no documentary
       service fee, no preparation fee, and no addendum. Illinois tax, title and license fees are not
       included and are set by the State of Illinois.",
     "condition": "All vehicles are sold AS IS. An FTC Buyer's Guide is displayed in each vehicle
       window and controls.",
     "powertrain": "Illinois 15 day / 500 mile statutory powertrain protection applies on qualifying
       cars. Vehicles over 150,000 miles, rebuilt or flood titles, GVWR 8,000 lb or more, and
       antique or collector units are excluded by statute.",
     "financing": "Financing for all credit levels. Approval is never guaranteed and terms vary by
       credit.",
     "paymentEstimate": "* Est. payment based on 10% down, 9.9% APR, 60-month term. For illustrative
       purposes only. Actual terms vary by credit."
   }
   ```
2. **`/inventory.json` emits no monthly payment field. Ever.** Guardrail D3 requires the footnote on
   any surface rendering a payment, and Maxim cannot make a third party render a footnote. The
   `paymentEstimate` string above exists only so that a consumer computing its own payment has the
   disclosure available. Add a `content-guard.mjs` rule: the tokens `monthly`, `payment`, and `/mo`
   must not appear as a value key in any generated JSON or feed artifact.
3. Change the `potentialAction` target. The design already points it at `/financing#apply` rather than
   `/apply`, which is right. Add: the prefilled `sms:` body must contain no price and no payment. A
   price transmitted by SMS is an advertisement with no room for a disclosure.
4. The attribution license line must carry a condition, not just a permission:
   `Reuse permitted with attribution to Maxim Autos and the canonical vehicle URL. Prices and
   availability change; verify against the canonical URL before presenting to a consumer. Do not
   present this data without the accompanying disclosures object.`
5. **Atom feed: emit `added` and `sold` events only. Never `price-change`.** I checked
   `site/src/data/url-events.jsonl`: it currently holds zero price change events, so this costs
   nothing today and closes a real hole. A feed entry announcing a price drop is a "was $X, now $Y"
   construction, which 475.360(d) bans for used vehicles unless the comparison is to a named,
   current, regional published guide book with a 10 point bold disclaimer. A syndicated feed cannot
   carry that.
6. `llms.txt`: the ai visibility design is right to shrink it and right that 97 percent of them get zero
   requests. Whatever survives must carry the same `disclosures` strings. It is a fact sheet, and the
   facts include the disclosures.

---

### F12 · HIGH · The compare tray and the shareable search URL move payments off the page that carries the footnote

**Target:** design ux, "Compare tray in the inventory grid" and "Write inventory URL state and add a
share control".

The compare tray compares six fields and the design names them: *"price, out the door, monthly,
mileage, drivetrain and deal rating."* State lives in `?compare=slug-a,slug-b`. The share control opens
`sms:` with the search written into the body.

Guardrail D3 is absolute: *"the payment disclosure footnote is mandatory on any page rendering
VehicleCard."* A tray is on the page, so the footnote is reachable, but 475.210 requires material terms
disclosed *"at the outset of the offer"* and a bottom tray overlaying the grid can cover the footnote at
the bottom of the page. On a 390px phone it certainly will.

The SMS path is worse. A text message containing an estimated monthly payment, sent from Maxim's site,
is a credit advertisement with no footnote and no room for one.

**Fix, exactly:**

1. The compare tray renders the full Reg Z footnote **inside the tray**, at the bottom of the tray
   panel, in both languages. Not a link to it. The literal string.
2. The tray's `monthly` row label reads `Est. monthly*` with the asterisk bound to the in tray
   footnote, satisfying 475.220 proximity.
3. The `sms:` share body contains **filters only**. Verified safe example:
   `Hi Jerry, I am looking at the AWD SUVs under $12,000 on your site.` No price, no payment, no
   `?compare=` URL that resolves to a payment display.
4. Same rule for the empty state SMS capture, which the design already writes correctly as filters
   only. Keep it that way and put it in `content-guard.mjs` so it stays that way: no `$` character and
   no `/mo` token inside any `sms:` href body in the codebase.
5. `robots.txt` already disallows `/inventory?`, so `?compare=` is not crawlable. That handles the
   Google side. It does not handle a human sharing the link, which is the whole point of the feature,
   so points 1 through 3 still apply.

---

### F13 · MEDIUM · The Google review text on the site was obtained by scraping, and the scraper is disabled because Google blocked it

**Target:** review integrity generally; design operator, "Check reviews_meta.json for staleness".

Verified: `site/src/data/reviews.json` holds 12 reviews, 6 sourced `Google` and 6 sourced `Cars.com`.
The operator audit found `update-reviews.yml` is disabled because Google blocks the scraper, and its
own header says the scraper went blind, parsed null, and exited 0 while reporting success.

The compliance question nobody asked: how was the Google review text acquired, and is republishing it
permitted. Scraping Google review content is contrary to Google's Terms of Service, and the Places API
restricts caching and re display of review content. This is a terms exposure against the same Google
account that owns the Business Profile suspended on 2026-07-11. It is not a legal risk of the same
magnitude as F1 through F6, but the counterparty is the one party Maxim cannot afford to annoy right
now.

**What is correct today, verified live, and must not be broken:**

- Homepage `AutoDealer` node: `"aggregateRating": {"ratingValue": "5.0", "reviewCount": "46"}`.
  `reviews_meta.json` reads `{"rating": 5.0, "count": 46, "updated": "2026-07-24"}`. Ground truth says
  live Google is 5.0 / 46. **Three way match. Correct.**
- Exactly 3 `Review` JSON-LD nodes emitted on the homepage, all three sourced `Google` (Tabitha,
  Eduard Estopanan, Dima Tsipukh). **Zero Cars.com reviews in JSON-LD. Correct**, and it satisfies
  guardrail A9 and the 2026-07-14 supersession.

**The insider review.** The brief states a review from Jerry's son exists on the profile and is
deliberately excluded. I searched the repo for any exclusion mechanism and found none: no
denylist, no `excluded` flag, no author blocklist, no note recording the decision. **The exclusion is
currently a fact held in one person's head.** The next agent that repopulates `reviews.json` from the
GBP manager panel will pull it in, and it will land in `Review` JSON-LD because its source will be
Google. That is an undisclosed material connection under the FTC Endorsement Guides, 16 CFR Part 255,
and Google's own review policy bars reviews from people with a personal connection to the business.

**Fix, exactly:**

1. Add `site/src/data/reviews-excluded.json`:
   `{"excludedAuthors": ["<exact display name>"], "reason": "Immediate family of the owner. Undisclosed
   material connection under 16 CFR Part 255 and Google review policy. Never emit as Review JSON-LD,
   never display on site.", "decidedBy": "Jerry", "decidedOn": "2026-07-25"}`
   Jerry supplies the exact display name. Do not guess it.
2. `content-guard.mjs` and the ai visibility linter both fail the build if any author in that list
   appears in `reviews.json` or in any emitted `Review` node.
3. Note in the file that the excluded review still counts toward the live Google total of 46, and that
   the `AggregateRating` must continue to equal the live Google number per A9 and D2. **Do not
   subtract it.** Google publishes 46; the site must say 46.
4. Stop scraping. Jerry owns the GBP manager panel and the operator design already proposes staging one
   Chrome line item for a session Jerry is already in Chrome. Make that the sanctioned path for
   review text and record it in `automations-registry.md` so nobody rebuilds the scraper.
5. Accept that self serving `Review` and `AggregateRating` on `LocalBusiness` and `Organization` types
   are ineligible for star rich results. Google's review snippet documentation, quoted:
   *"If the entity that's being reviewed controls the reviews about itself, their pages that use
   LocalBusiness or any other type of Organization structured data are ineligible for star review
   feature."* This is **ineligibility, not a penalty**, and the ai visibility design's plan to keep
   exactly one instance and delete the other 12 copies is the right response. Do not let anyone
   escalate this into a spam finding. It is not one.

---

### F14 · MEDIUM · GBP re suspension surface: mostly clean, three things to hold

**Target:** all four designs.

Honest assessment: **no design in this run proposes a GBP mutation.** I checked all four. The operator
design is explicit and correct: *"the operator never arms posting_owner_guard.py and never opens
Chrome."* That is the right posture and it should be preserved verbatim into the build spec. The
operator's check 13, encoding the SPEC cadence caps as numbers in `cadence-caps.json`, is the correct
durable fix for D10 and I endorse it without qualification.

Three residual risks:

1. **The designs create GBP work without scheduling it.** F5 (the false price band in the GBP
   description), F9.6 (the inspection sentence in the approved GBP description at `SPEC.md:109`), and
   F10.2 (hours parity) each require a GBP edit. Guardrail A1 caps GBP surface touches at 2 per week,
   one per session, 48 to 72 hours apart, each individually approved by Jerry. Three edits is a two
   week program, and if the build ships all three fixes at once and someone tries to "sync GBP," that
   is a burst of edit velocity against a profile 14 days off suspension.
   **Fix:** the operator's approval card gets a dedicated `GBP QUEUE` section, hard capped at one item
   per card, ordered by severity. Correcting a false price band goes first. Nothing else on the card
   may touch a GBP surface.
2. **`automations-registry.md` still promises 3 posts per week via native GBP scheduling.** The
   operator design verified the routine is `enabled: false` and correctly refuted it as a live cron
   hazard, but it is right that the document is the real risk because it is what a future agent reads
   before re enabling. **Fix:** delete the string `3x/week` and `native GBP scheduling` from the
   registry entirely, in the same commit that adds `cadence-caps.json`. Not "mark as disabled." Delete
   the description, because a disabled row with a wrong cadence is still a template.
3. **The GitHub Pages mirror.** `dexmang.github.io/MaximAutosWeb` returns 200 with byte identical
   homepage content and a self referencing canonical. It is a second published copy of every claim in
   this document, at a URL nobody monitors, which the operator's banned phrase scan does not cover
   because that scan reads the production sitemap. The ai citation audit flagged as unverified whether
   the stale 3 month warranty text still lives there. **Fix:** the operator's mirror containment
   proposal (`noindex` on every mirror page plus `Disallow: /` in the mirror `robots.txt`) ships in
   wave 1, and the banned phrase scan runs against the mirror origin too, not only production.

---

### F15 · MEDIUM · Reg Z footnote fork, and a build phase rule that will silently break it

**Target:** design ux, "Canonicalize the Spanish Reg Z string".

The UX design found the real defect: `es/index.astro:168` says `Pago estimado con` with accents,
`es/inventario.astro:164` says `Pago estimado basado en` without. Guardrail D3 fixes one canonical
Spanish string and there are two live. A compliance disclosure with two versions is a compliance
defect and the UX design is the only one that caught it.

Its resolution is wrong on one point. It proposes canonicalizing to the accented `basado en` form
"matching the English word for word." **The guardrail already specifies the canonical Spanish string
verbatim at `compliance-guardrails.md:57`:**

> `* Pago estimado con 10% de enganche, 9.9% APR, plazo de 60 meses. Solo para fines ilustrativos. Los términos reales varían según el crédito.`

That is `con`, not `basado en`. `es/index.astro:168` is already correct and `es/inventario.astro:164`
is the one that must change. The design has it backwards and would have "fixed" the compliant page.

**Fix, exactly:**

1. Canonical Spanish is the guardrail string at `compliance-guardrails.md:57`, character for character,
   accents included. `es/inventario.astro:164` changes to match. `es/index.astro:168` does not change.
2. Extract both the English and Spanish strings to `site/src/data/claims.json` as
   `regZFootnote.en` and `regZFootnote.es`. Every surface imports. Neither can fork again.
3. The UX design's build phase note is correct and load bearing: **do not de hyphenate `60-month` in
   the English string.** Verbatim outranks the house style rule. Add `60-month` to the
   `content-guard.mjs` hyphenated compound allowlist, scoped to the Reg Z string only, and add an
   inverse rule that **fails** the build if any file contains `60 month` inside a string that also
   contains `Est. payment based on`. The style linter must be prevented from silently corrupting a
   mandated disclosure.
4. Same treatment for the Spanish accents. A build step that strips diacritics would break the
   canonical string. Assert byte equality against `claims.json`, not a normalized comparison.

---

### F16 · MEDIUM · Two designs make opposite calls on the sold archive and the recap must not paper over it

**Target:** design ai visibility ("Kill the public sold archive") versus design content engine
("Sold record page ... SHIP with the framing corrected") versus design ux (place it on
`/out-the-door`).

The ai visibility design's reasoning is the stronger of the two on the compliance axis, quoted:
*"Prices for vehicles no longer available are also what advertising rules police, and the review cost
alone exceeds the value."* Correct, and F8 above supplies the specific citations it did not.

The content engine's reasoning is stronger on the content axis and its data work is better: it verified
`ma_sales` has 1 row, killed the fabrication, and derived a truthful alternative for 20 of 20 records.

They are not reconcilable by splitting the difference. **My call: ship the content engine's version
under the F8 constraints (`noindex, follow`, no `Offer`, no `price` property, disclosure above the
table, never adjacent to live inventory).** That keeps the unique content and removes the advertising
surface. If the orchestrator will not accept `noindex`, then the ai visibility design wins and the
page does not ship. Do not ship an indexed sold archive with prices.

Reject the UX placement on `/out-the-door` outright, per F8.4.

---

### F17 · LOW · Residual items worth one line each

| # | Item | Fix |
|---|---|---|
| a | `used-toyota-skokie.astro:186` and siblings: *"Every {MAKE} that comes through goes through an independent mechanical inspection"* is an unqualified inspection claim on all 4 make pages, tied to F9 | Route through `claims.json` inspection string |
| b | Make page FAQ, line 85: *"Financing is available for all credit levels on every vehicle"*, emitted as `FAQPage` JSON-LD | Add the conditional clause B4 requires: `Approval is never guaranteed and terms vary by credit.` |
| c | GMC feed `<title>` contains a real U+2014 em dash (verified live), and 5 em dashes total in the feed | House style, and the ai visibility linter's U+2014 rule catches it. Ship that rule |
| d | `url-events.jsonl` URLs carry trailing slashes while canonical does not, so the Atom feed and IndexNow inherit D5 | Normalize at the generator, one place |
| e | The operator design's 90 day snooze on a `NO` is good governance, but a `NO` on a compliance item must not snooze | Add: any card line tagged `compliance` cannot be snoozed. It re presents every week until resolved or explicitly overridden by Jerry in writing |
| f | Three designs each propose their own linter (`lint-compliance.js`, `content-guard.mjs`, the operator's banned phrase scan) | **Merge into one.** Three linters with three overlapping rule sets is three places for a rule to be wrong. One rule file, run at build and run against the live site |
| g | FTC CARS Rule | **Do not cite it.** Vacated by the Fifth Circuit 2025-01-27, withdrawn from the rulebook effective 2026-02-12. Any design or copy citing it as binding is wrong. FTC Act Section 5 and the Used Car Rule (16 CFR Part 455) are the live federal hooks |
| h | `compliance-guardrails.md` has no entry covering machine readable surfaces | Add a Part E: `E1. Feeds, JSON endpoints, llms.txt and syndicated files are advertisements. Every disclosure required on an HTML surface is required on the machine readable equivalent. No monthly payment may appear in any machine readable artifact.` |

---

## PART 3 — SHIP ORDER

Compliance sequencing only. Not a project plan.

**Block everything until these land:**
1. F1 steps 1 through 8. Poisoned source, live on 7 of 7 cars and in the Google feed.
2. F2 steps 1 through 5. Poisoned source, teaches a false warranty as the approved correction.
3. F5 steps 1 through 4. Live Illinois 475.390 and 475.310 exposure in structured data.

**Wave 1, alongside:**
4. F10 (customer facing AI channel, wrong hours against a 24 hour old reinstatement).
5. F1.9 plus the operator's DealerCenter ingest screen (stops re injection at the source).
6. F14.3 (mirror containment).
7. The merged linter (F17f) with the rules named in F3.5, F5.4, F6.4, F11.2, F12.5, F13.2, F15.3.

**Gated, do not build yet:**
8. `/out-the-door` and the Out The Door module: gated on F3 and F4 in full, plus the primary source
   confirmation of the title fee, plate fee, and doc fee cap.
9. `/sold`: gated on F8, `noindex` non negotiable.
10. Any make page work: gated on F6, and `used-volvo-skokie` does not build.
11. Inspection pages: gated on F9, which requires Jerry's Option A / Option B decision first.

**Killed:**
12. Any comparison page naming a competitor (F7).
13. Any monthly payment in any machine readable artifact (F11.2).
14. Any `price-change` event in the Atom feed (F11.5).
15. Any citation of the CARS Rule as binding (F17g).

---

## PART 4 — WHAT I COULD NOT VERIFY

Flagged rather than guessed, per the run guardrails.

- **`ilsos.gov` was unreachable from this environment.** $165 title and $151 plates are corroborated
  across several independent sources but not confirmed against the primary. The $377.63 doc fee cap is
  not confirmed at all (`illinoisdealers.com` returns 403). F4.6 makes this a hard build gate.
- **Whether the excluded review's author name is recorded anywhere.** I searched the repo and found no
  exclusion mechanism. Jerry must supply the exact display name for F13.1.
- **Maxim's actual approved APR range.** The 3.9 to 24.9 figures in F3.2 come from the existing
  `financing.astro` slider bounds, which are a UI choice, not a record of approvals. Jerry must confirm
  before that string ships.
- **Whether the stale 3 month warranty text is live on the GitHub Pages mirror.** Not checked this
  pass. The ai citation audit flagged the same gap. F14.3 makes it moot by containing the mirror.
- **Whether the GBP business description still states $5,000 to $15,000.** Reading it is free under A1
  but I did not open a browser this session. Confirm before queueing the GBP correction in F14.1.
- **The exact text of 14 Ill. Adm. Code 475.220, 475.230, 475.550, 475.580, 475.620, 475.630, 475.640.**
  I have the section headings from ilga.gov and pulled the full text of 475.210, 475.310, 475.320,
  475.340, 475.350, 475.360, 475.390, 475.590, and 475.610. The Cornell mirror returned only a table of
  contents for the rest. F3 leans on 475.620 and 475.630 by heading and by the general 475.210 material
  terms rule; the finding stands on 475.610 and 475.310, which I did pull verbatim, but the exact
  475.620 and 475.630 language should be read before the `/out-the-door` build.
- **Whether the 20 sold VDPs currently render the Reg Z footnote.** F8.6 requires confirming it before
  the rescue rail adds live `VehicleCard`s to them.

---

## Sources

- [Google Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies) (page last updated 2026-05-15)
- [Google review snippet structured data guidance](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [14 Ill. Adm. Code Part 475, Motor Vehicle Advertising, full part](https://www.ilga.gov/agencies/JCAR/EntirePart?titlepart=01400475)
- [Ill. Admin. Code tit. 14 § 475.310, Advertised Price](https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-14-SS-475.310)
- [Illinois Department of Revenue, Form ST-556 instructions](https://tax.illinois.gov/forms/sales/vehicleusetax/st-556-sales-tax-transaction-return-instructions.html)
- [Illinois Attorney General, 15 Day / 500 Mile Powertrain Warranty FAQ for Dealers](https://illinoisattorneygeneral.gov/Page-Attachments/FAQforDealers.pdf)
- [815 ILCS 505/2L](https://codes.findlaw.com/il/chapter-815-business-transactions/il-st-sect-815-505-2l/)
- [FTC warns 97 auto dealership groups about deceptive pricing, 2026-03-13](https://ftc.gov/news-events/news/press-releases/2026/03/ftc-warns-97-auto-dealership-groups-about-deceptive-pricing)
- [Fifth Circuit strikes down the CARS Rule, Holland & Knight](https://www.hklaw.com/en/insights/publications/2025/02/fifth-circuit-strikes-down-ftcs-auto-retail-scam-rule)
- [Federal court vacates the CARS Rule, ComplyAuto](https://complyauto.com/federal-court-vacates-the-cars-rule-what-dealers-need-to-know/)
- [Crowell & Moring, FTC returns to auto dealer enforcement](https://www.crowell.com/en/insights/client-alerts/auto-dealers-the-ftc-is-back-in-the-drivers-seatwarning-letters-signal-renewed-federal-scrutiny)
- Local: `businesses/maxim-autos/operations/compliance-guardrails.md`, `memory/context/maxim-autos-brand.md`, `memory/context/maxim-autos-copy-playbook.md`, `businesses/maxim-autos/operations/build_ai_knowledge_base.py`, `site/src/data/{vehicles,suburbs,reviews,reviews_meta,url-events}.json`, `site/src/pages/used-*-skokie.astro`, `site/src/pages/financing.astro`
- Live fetches this session: `https://www.maximautos.com/`, `/used-toyota-skokie`, `/vehicle/2019-honda-hr-v-lx-awd-j10213`, `/feeds/vehicles.xml`
