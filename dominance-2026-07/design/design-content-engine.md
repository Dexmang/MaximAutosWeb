# Maxim Autos Content Engine Design

**Role:** Content Engine Architect · **Date:** 2026-07-25 · **Status:** DESIGN ONLY. Nothing here is built, published, or deployed. No file under `site/` or `web_assets/` was modified.

**Governing plan:** `businesses/maxim-autos/operations/google-local-domination-2026-07/design/SPEC.md`. This design does not contradict it. SPEC line 85 explicitly names off GBP site parity as a parallel workstream with zero GBP risk. Everything below is off GBP. One flag against SPEC line 109 is raised in Section 1.6 and handed to MaxGoogle, not resolved here.

---

## THE HEADLINE

The strongest content asset on the table does not exist. The second strongest is being actively corrupted every six hours. Both findings are verified against source files this session, and together they change what should be built first.

| # | Finding | Evidence |
|---|---------|----------|
| 1 | **The inspection reports are a blank paper form.** There is no digital inspection data anywhere. `inspected: true` is a hardcoded literal, not a lookup. | `build_vehicles_json.py:255`; `ma_vehicles` has zero inspection columns; the only artifact is `operations/inspection-report/maxim-inspection-report.pdf`, an empty printable form. |
| 2 | **12 em dashes and 4 instances of "on-the-spot" are live on 4 of the 7 in stock cars right now,** injected by DealerCenter copy on every sync and not caught by the existing sanitizer. | UTF-8 scan of `vehicles.json`: J10215, J10216, J10217, J10218 each carry 3 U+2014 characters plus "on-the-spot". Raw byte count of the file: 12. |
| 3 | **The verification gap is the whole problem.** The existing sanitizer catches two claim types and silently rewrites. Everything else reaches the site unchecked. | `build-inventory.js:199-214` handles powertrain qualifier and the 3 month warranty string. Nothing else. |

The verification loop is therefore not the fourth deliverable in this design. It is the first thing that ships, because everything else compounds the existing defect surface until it exists.

---

## SECTION 0. WHAT I VERIFIED BEFORE DESIGNING

Every claim in this document traces to one of these. Where I could not verify something I say so in Section 10.

| Claim | How verified | Result |
|---|---|---|
| Inspection reports exist digitally | Read `build_vehicles_json.py`, queried `ma_vehicles` schema, `ma_expenses` categories, searched the full filesystem for `*inspect*`, read both form artifacts | **FALSE.** Blank form only, two mutually inconsistent versions |
| Financing hub is thin | Read `financing-bad-credit/index.astro` and `how-it-works-illinois.astro` in full | **NOT THIN.** Real unique prose, real FAQ schema, real internal links. Three fixable defects |
| Suburb pages are a thin template | Read `used-cars-[city]-il.astro` and all 9 records in `suburbs.json` | **NOT THIN.** Each carries 3 unique localCopy paragraphs, a unique whyVisit, a unique directionsBlurb, 5 unique FAQs |
| Sold price data exists for an archive | Queried `ma_sales` | **1 row against 119 sold vehicles.** "What we sold it for" would be fabricated for 118 of them |
| Days on lot is derivable | Computed `sold_date` minus `dateAdded` across all sold records in `vehicles.json` | **TRUE for 20 of 20.** Range 3 to 71 days |
| Person schema for Jerry exists | Grepped `src/pages/` | **Exists at `about.astro:12` but is orphaned.** No `@id`, no `sameAs`, not referenced as founder from AutoDealer |
| Article or BlogPosting schema exists anywhere | Grepped `src/` | **Zero.** No `datePublished`, no `dateModified`, no author on any editorial page |
| hreflang covers the financing hub | Grepped for `hreflangEs` | **No.** 16 files set it, none in `financing-bad-credit/` |
| Price band drift scope | Byte count of `suburbs.json`, plus the technical audit's page count | **10 occurrences in `suburbs.json`, 15 built pages, plus `llms.txt`, plus `compliance-guardrails.md:13` itself** |
| The build has a compliance hook | Read `build-inventory.js` | **Yes,** `sanitizeDescription()` at line 199. It rewrites silently and covers two rules |

---

## SECTION 1. THE INSPECTION REPORT (CANDIDATE 1)

### 1.1 The verdict

**Killed as pitched. Rebuilt as something that needs a small amount of Jerry's time per car.**

The pitch was: "the reports already exist, publishing them costs nothing." That is false, and I would rather say so than design on it.

### 1.2 What actually exists

Two blank printable forms, neither filled in, neither in use in any pipeline:

| Artifact | Location | State | Structure |
|---|---|---|---|
| Form v1 | `operations/inspection-report/maxim-inspection-report.html` + `.pdf` | Blank template | 5 sections, ~26 line items, badge reads "100+ POINT INSPECTION" |
| Form v2 | `C:\Users\frost\Desktop\1posted cars\InspectionMaxim.jpg` | Blank template | 4 sections, different groupings, no point count claim |

They disagree with each other. Neither is referenced by any script, any workflow, or `inventory-pipeline.md`.

### 1.3 What the data says

- `ma_vehicles` has 37 columns. None relate to inspection.
- `ma_expenses` has 112 rows across two categories: `misc` (111) and `repair` (1). No inspection line items, no inspection vendor, no receipt paths.
- `vehicles.json` carries `inspected: true` and `inspection: true` on all 27 records. Both are written as literal booleans at `build_vehicles_json.py:255`. They are not derived from anything. A car that was never inspected would carry the same flag.
- There are zero open or closed tasks referencing inspection for Maxim.

### 1.4 The bigger problem this exposed

The site does not merely lack an inspection page. It already makes four specific, mutually inconsistent public claims about a document nobody holds in structured form.

| Surface | The live claim | Problem |
|---|---|---|
| `llms.txt` | "a full independent mechanical inspection report prepared by a third-party mechanic. The report covers engine, drivetrain, brakes, suspension, tires, electrical systems, and interior/exterior" | The repo form has **no suspension items at all** and names no third party firm |
| `used-cars-chicago-north-shore.astro:164` | "Jerry inspects every vehicle himself" | Directly contradicts "third-party mechanic" above |
| `used-cars-under-10000-skokie.astro:160` | "a written inspection report you can read before you decide" | The strongest version of the claim. It promises a document to a buyer pre purchase |
| `SPEC.md:109` (canonical GBP description) | "comes with a free CARFAX and the inspection report" | Approved GBP copy resting on the same unverified document |
| `ai-knowledge-base.md:40` | "provided on every vehicle pre-purchase **if requested**" | Conditional, which quietly contradicts the unconditional claims above |

This is the actual risk, and it exists today whether or not anything gets published. The exposure is not a missing page. It is five surfaces making claims of different strength about a document with no record behind it.

### 1.5 What to build instead

A capture step, then a gated page. The page follows the data, never the reverse.

**Step 1: `inspections.json`, VIN keyed, one record per car, written at intake.**

```
{ "1HGFB2F5XFH123456": {
    "inspectedOn": "2026-07-22",
    "inspectedBy": "…",            // real name, printed
    "facility": "…",               // shop name if external, or Maxim Autos
    "independent": true,           // drives which claim string renders
    "odometerAtInspection": 130772,
    "tread32nds": { "fl": 7, "fr": 7, "rl": 6, "rr": 6 },
    "brakePadMm": { "front": 8, "rear": 7 },
    "batteryVolts": 12.6,
    "roadTest": { "starting": "pass", "shifting": "pass", "steering": "pass", "braking": "pass", "warningLights": "none" },
    "fluids": { "oil": "changed", "trans": "ok", "coolant": "topped", "brake": "ok", "power steering": "ok", "airFilter": "replaced" },
    "workPerformed": ["…"],
    "result": "passed"
} }
```

Twelve fields. Roughly four minutes of typing per car from a completed paper form. At 5 to 8 cars a month that is under 35 minutes a month.

**Step 2: `/vehicle/{slug}/inspection`, built only when a record exists for that VIN.**

- No record, no page, no link, no claim on the VDP. The VDP's inspection badge is gated on the same record.
- The page renders measured values with units, the inspector's name and date, the work performed, and the FTC AS IS posture verbatim.
- It carries the caveat that an inspection is a point in time assessment, not a warranty, in both the copy and the schema.

**Why this page is genuinely more useful than what ranks for its query:** nothing that currently ranks for "is this used car mechanically sound" gives you four tire tread depths in 32nds, two brake pad thicknesses in millimeters, a battery voltage, and a named technician for the specific VIN you are looking at. Not Carvana, not CarMax, not any vendor platform dealer inside 50 miles. It is the single highest entity density page the site could ever publish, and no competitor can fabricate it because a fabricated tread depth is a measurable lie.

**Uniqueness argument against scaled content abuse:** 7 pages today, roughly 15 at target inventory. Each contains 15 or more measured numbers unique to one physical object. There is no template to fill. If the numbers are not real the page cannot be written.

### 1.6 The fork Jerry has to pick

This is a genuine decision, not a recommendation I can make for him.

| Option | What happens | Cost |
|---|---|---|
| **A. Adopt the capture step** | 12 fields per car, roughly 35 minutes a month. Every inspection claim on the site becomes provable. The strongest content asset on the site becomes real | Per car discipline, permanently |
| **B. Decline it** | The inspection pages are never built. **And the five claims in Section 1.4 must be softened to match what can actually be shown,** because "a written inspection report you can read before you decide" is a promise of a document | One editing pass, then no ongoing cost |

There is no honest option C where the claims stay at current strength and no record exists.

**Flagged to MaxGoogle, not resolved here:** `SPEC.md:109`'s canonical GBP description contains "comes with a free CARFAX and the inspection report." Under option B that sentence is the weakest claim in an otherwise carefully built string. It is MaxGoogle's file and MaxGoogle's call.

**Hard dependency if option A is chosen:** the inspection page wants a photo of the actual completed form. That photo cannot be hotlinked from the DealerCenter CDN, so `scripts/mirror-photos.js` (which exists and is explicitly not wired in) has to be wired first. That is candidate 6's lane, not mine, but the dependency is real.

---

## SECTION 2. EDITORIAL ARCHITECTURE

### 2.1 Should there be a blog? No.

A blog is a dated post format. It creates three obligations a business run by one person cannot meet: a publishing cadence, an archive that decays, and a homepage that looks abandoned the moment the cadence slips. The site currently has zero of those obligations, which is an asset, not a gap.

What Maxim needs instead is a set of permanent URLs that answer permanent questions and never go stale because they read live data. That is what `/financing-bad-credit` already is. The correct move is not to add a blog next to it. It is to recognize that the financing hub is the pattern and build the second one.

**Decision: no blog. Two hubs, evergreen URLs, no dates in slugs, no post archive, no category pages.**

### 2.2 The existing hub, assessed honestly

`/financing-bad-credit` plus 5 spokes. I read the index and one spoke in full.

**What is right and should be copied:**
- Genuinely useful prose. `how-it-works-illinois.astro` walks five real steps with no filler.
- A `QuickAnswer` block at the top of every page, which is the correct shape for AI extraction (and per the ai-citation audit, better evidenced than restructuring prose into question headers).
- FAQPage schema with answers that are actually answers, including "Is approval guaranteed at Maxim Autos?" answered with "No dealer can honestly guarantee approval, and Maxim Autos does not." That is the tone the whole site should have.
- BreadcrumbList on every spoke. Sibling links. A hub link. Real internal structure.

**Three defects to fix before extending it:**

| # | Defect | Evidence | Fix |
|---|---|---|---|
| E1 | Stale price band | `index.astro:11,53,116` and `how-it-works-illinois.astro:72` all state "$5,000 to $15,000". Top live unit is $15,995 | Read from the facts ledger (Section 4.1). Never hardcode |
| E2 | **Zero connection to inventory.** Six pages, not one vehicle card, not one VDP link | Read both files end to end | Live inventory rail on every spoke (Section 2.5) |
| E3 | No Article schema, no author, no dateModified | Grep of `src/` returns zero `BlogPosting`, `Article`, `datePublished`, `dateModified` | Add `Article` with `author` pointing at Jerry's `Person` node |

E2 is the one the orchestrator called "sitting decorative," and it is accurate. The hub converts to `/apply`, which per the conversion audit is a 60 field SSN form and the single largest friction point in the funnel. So the hub sends its most nervous readers to the worst possible next step and never shows them a car.

### 2.3 The second hub

`/illinois-car-buying`, five spokes. This is the demand audit's Family 4, which it found to be high intent with essentially zero dealer competition (only Attorney General and law firm pages rank).

| Slug | Question it answers | Why it wins on merit |
|---|---|---|
| `/illinois-car-buying` (hub) | What actually happens when you buy a used car from a dealer in Illinois | Nobody publishes the whole path in one place |
| `…/powertrain-warranty-15-day-500-mile` | What 815 ILCS 505/2L covers, and the four exclusions | Every dealer states it vaguely. Stating the exclusions is the differentiator, and it is legally required accuracy anyway per guardrail C2 |
| `…/metal-plates-same-visit` | What CVR electronic registration is and why it means no Secretary of State trip | Per the ai-citation audit, Maxim already wins 6 of 10 results on this query family. Deepen the thing that already works |
| `…/dealer-vs-private-party` | Tax treatment, statutory protection, title risk, recourse | The one comparison a buyer genuinely needs and nobody writes |
| `…/why-there-is-no-doc-fee-here` | What a doc fee is, what Illinois allows, what Maxim charges | Maxim's most provable differentiator, currently stated as a bullet and never explained |

**Why these and not price or radius pages:** the ai-citation audit found price and radius queries are aggregator locked and returned zero Maxim mentions across five tested variants, while distinctive attribute queries (CVR plates, financing for all credit levels) returned Maxim at or near the top. Investing in generic queries is investing against verified evidence.

### 2.4 The linking spine

Three tiers. Every page knows which tier it is in, and the linter enforces the rules.

```
TIER 1  HUBS
        /financing-bad-credit          /illinois-car-buying
              |                              |
              |  links: all own spokes, /inventory, the other hub
              v                              v
TIER 2  SPOKES  (5 + 5 existing/new, plus the 8 adopted orphans)
              |
              |  links UP to own hub, SIDEWAYS to 2 siblings,
              |  DOWN to a live inventory rail (max 3 cars)
              v
TIER 3  INVENTORY
        /inventory  →  links every hub + every make page (adopts the orphans)
        /vehicle/*  →  links UP into exactly 1 editorial page, chosen by rule
```

**The VDP uplink rule** (mechanical, no hand curation):
- price under $10,000 → `/used-cars-under-10000-skokie`
- otherwise, make page if one exists for that make
- always, in the delivery section → `/illinois-car-buying/metal-plates-same-visit`

**The orphan fix is a content fix, not a link fix.** The technical audit found 8 pages with zero inbound internal links from any of 58 crawled pages. Dumping them in the footer would work mechanically and teach Google nothing. Adopting them as Tier 2 spokes gives each one three real inbound sources (its hub, `/inventory`, and two siblings) and puts them in a structure a reader can navigate.

### 2.5 How content produces leads instead of decoration

Four mechanisms, all cheap:

1. **Live inventory rail on every Tier 2 page.** The page declares a filter in frontmatter (`{ maxPrice: 10000 }`, `{ make: "Subaru" }`, `{ bodyStyle: "SUV" }`). The build renders up to 3 matching live cars. Not a hand written list, a filter, so it never goes stale.
2. **Empty state is a capture, not a dead end.** If the filter returns zero cars, the rail renders a short "tell Jerry what you are looking for" form instead. The conversion audit found `/inventory` has no capture on its empty state today, so this pattern is needed regardless.
3. **Editorial CTA is not the credit application.** The conversion audit found the VDP already sends credit challenged shoppers straight to a 60 field SSN form. Editorial pages route to the soft pre qualifier at `/financing#apply` or to a text message, and let the car do the closing.
4. **Attribution.** GA4 already fires `generate_lead`. Add a source parameter so an editorial lead is distinguishable. Caveat: the conversion audit found the event fires on click in the capture phase rather than on fetch success, so attribution is noise until that is fixed. Note the dependency, do not build on top of it.

### 2.6 The publish test (the anti thinness gate)

Google's scaled content abuse policy targets pages produced at scale primarily to rank rather than to help. The defense is not a word count. It is a test a page either passes or does not. All five are required.

| # | Test | How it is measured |
|---|---|---|
| **T1** | It answers a question no existing URL on the site answers | Search the sitemap. If a page already answers it, expand that page instead |
| **T2** | At least 40% of body text cannot be produced by swapping one template variable | Generate the page for every value in its set, diff pairwise. Under 40% unique means the set is a template and none of them ship |
| **T3** | At least 3 facts drawn from Maxim's own records that exist nowhere else online | Named, countable |
| **T4** | A stated reader and a stated decision that reader is making | One sentence in frontmatter, and `maxverify` checks the body actually serves it |
| **T5** | It connects to inventory by a live filter, or it states why it does not | Frontmatter declares the filter or declares the exemption |

Applied to what exists: the 9 suburb pages pass T2 comfortably (3 unique localCopy paragraphs, a unique whyVisit, a unique directionsBlurb, and 5 unique FAQs each; the technical audit independently confirmed unique titles, unique meta descriptions, and 705 to 1442 words with zero duplicates). The financing spokes pass all five except T5. `used-audi-skokie` fails T3 and T5 outright, because it filters `vehicles.json` for `make === 'Audi'` and there is not a single Audi in the 27 record file.

---

## SECTION 3. THE PROGRAMMATIC LAYER

### 3.1 What ships

| Page type | Data source | Volume | Uniqueness argument | Why a human values it |
|---|---|---|---|---|
| **P1. Per vehicle inspection** `/vehicle/{slug}/inspection` | NEW `inspections.json` (Section 1.5). **Does not exist yet** | 7 now, ~15 at target | 15+ measured values tied to one physical VIN. Cannot be templated, cannot be fabricated without lying about a measurement | Answers "will this break" with tread depth and pad thickness instead of adjectives. Nothing that ranks for this query gives numbers |
| **P2. Sold record** `/sold` index + the 20 existing sold VDPs | `vehicles.json` sold records. **Verified: 20 of 20 have both `dateAdded` and `sold_date`,** so days on lot is derivable for every one | 1 index + 20 existing pages upgraded | No aggregator publishes one dealer's honest turn record. It is Maxim's own operating history | Answers "does this dealer price fairly and does anything actually sell." A buyer sees the last four Subarus moved in 7 to 37 days at similar asks |
| **P3. Make and model, inventory gated** | `vehicles.json` filtered by make | 4 existing + Volvo. Cap at 6 | Real Maxim units with real mileages and real days on lot, not a generic model overview | Answers "do they actually stock these" with the dealer's own history for that make |
| **P4. Question index** `/answers` | Every `FAQPage` entity already emitted across the site | 1 page | It is an index, not new prose. Value is navigational and internal linking | One place to find any question the site answers. Also the single best internal link distributor on the site |

**P3's gate, written as a rule so nobody has to judge:** build the page only if live units of that make is 1 or more, **or** sold units of that make is 3 or more. Fail both and the page does not build and its URL 301s to `/inventory` via the existing retired slug ledger. `used-audi-skokie` fails both today (zero Audi across all 27 records) and retires on the first run. Volvo passes on sold history (XC60 and V60 both recur) and the demand audit independently recommended it.

**P2's advertising law check, since the orchestrator asked for one:**
- `ma_sales` contains **1 row against 119 vehicles marked sold**. Publishing "what we actually sold it for" would be fabricated for 118 of them. That framing is killed.
- The truthful framing is **advertised asking price at the time of sale, plus days on lot**, which is derivable for 20 of 20 sold records in `vehicles.json` and is a factual statement about the dealer's own past advertising.
- Required disclosures on the page, both languages if it were ever Spanish (it is Tier C, so English only): these vehicles are sold and not available; the figure shown is the advertised asking price at the time of sale, not the final transaction price; past pricing does not predict current pricing.
- No "was / now" comparison, no savings claim, no implication that a similar car is available at that price. Those are the patterns 14 Ill. Adm. Code 475 and the FTC care about.

### 3.2 What gets killed, and why

| Killed | Why |
|---|---|
| A 10th suburb page and beyond | The demand audit found 9 already covers the realistic drive radius and named a 10th as template thin risk. The constraint is demand, not thinness |
| More price bracket pages | The whole inventory is one band. A "$12,000 to $13,000" page is a slice of the same 7 to 15 cars. Fails T2 by construction |
| More body style pages | Same. Fails T2 |
| `used-audi-skokie` in its current form | Zero inventory match, live today. Fails T3 and T5 |
| **City × make crossproduct (9 × 5 = 45 pages)** | This is the textbook scaled content abuse pattern: 45 URLs generated from 7 to 15 cars by permuting two variables. It would fail T2 at roughly 5% unique. **Do not build this, and do not let anyone talk you into it later because the pages "already have the data."** |
| Per city per price crossproduct | Same, worse |

---

## SECTION 4. THE VERIFICATION LOOP

This is the part that matters most, and it is the reason to do this now rather than a year ago. Nothing described elsewhere in this document ships before this does.

### 4.0 Why it must exist, argued from evidence rather than principle

Three things I verified this session:

1. **The prose documents are contaminated.** `copy-playbook.md` cites a "3-month warranty" in 15 separate places including as its canonical approved worked example. `brand.md:10` names pillar 1 "TOTAL PROTECTION", the exact phrase guardrail C8 bans. Both claims were purged from the live site. An agent that drafts from those documents reintroduces both.
2. **The guardrail document itself carries the stale number.** `compliance-guardrails.md:13` states "Price band: $5,000–$15,000". A verifier that checks pages against the guardrails would confirm the wrong answer with confidence. **This is why the ledger in 4.1 exists and why prose documents are inadmissible as evidence.**
3. **The current gate is too narrow and fails silently.** `sanitizeDescription()` covers two claim types and rewrites without telling anyone. Meanwhile 12 em dashes and four "on-the-spot" instances are live on 4 of 7 cars right now, arriving fresh from DealerCenter every six hours.

The failure mode is not that someone will write something false. It is that something false is already circulating through three prose documents, one guardrail document, and the live feed, and every new page inherits it.

### 4.1 Stage 0. The facts ledger

`site/src/data/facts.json`. Generated at build. Never hand edited. This is the only admissible source for any number on the site.

| Key | Derived from |
|---|---|
| `priceLow`, `priceHigh`, `priceMedian`, `unitCount` | `vehicles.json` where status is not sold |
| `reviewRating`, `reviewCount` | `reviews_meta.json` |
| `makesInStock`, `bodyStylesInStock` | `vehicles.json` |
| `soldCount`, `medianDaysOnLot`, `fastestDaysOnLot` | `vehicles.json` sold records |
| `nap`, `license`, `hours` | One constants module, single definition |
| `inspectionCoverage` | Count of VINs in `inspections.json` over live unit count |
| `builtAt` | Build timestamp |

Every page that states a number imports it. Hardcoding a value that also exists in the ledger is a lint failure, not a style note.

**What this structurally eliminates:** the entire D8 class of defect. Ten occurrences in `suburbs.json`, 15 built pages, `llms.txt`, and the GBP description all trace to a number written by hand in more than one place. Once the number has exactly one source, drift becomes impossible rather than merely discouraged. `llms.txt` should be generated from the ledger too, for the same reason.

**Companion artifact, the claim registry:** `site/src/data/claims.json`, one canonical sentence per public claim (inspection, CVR plates, zero doc fee, powertrain, financing, reviews), with an English and a Spanish string for each. Verified need: Section 1.4 documents the inspection claim written five mutually inconsistent ways across five surfaces. Pages import the string. They do not paraphrase it.

### 4.2 Stage 1. The deterministic gate

`scripts/content-guard.mjs`. Runs inside `npm run build` before Astro compiles. Exit code 1 fails the build. Every rule has an id so a failure names itself.

| Rule | Checks | Would have caught |
|---|---|---|
| CG-01 | U+2014 and U+2013 anywhere in rendered copy, JSON data files, or feed titles | D6, and the 12 live occurrences in `vehicles.json` |
| CG-02 | Hyphenated compound blocklist: `on-the-spot`, `same-day`, `hassle-free`, `first-time`, `one-of-a-kind`, `worry-free`, `stress-free`, `no-hassle`. Allowlist in one file for genuine model names and specs (`CR-V`, `HR-V`, `CX-5`, `EX-L`, `R-Design`, `all-wheel`, `blind-spot`, `lb-ft`, `4-cyl`, `8-spd`, `19-inch`, `i-VTEC`, `1-owner`) | The 4 live "on-the-spot" instances |
| CG-03 | Banned vocabulary: `certified`, `guaranteed`, `Total Protection`, `total/complete/full protection`, `warranty on every car`, any `N-month warranty`, `Peace of Mind Warranty` | The stale 3 Month Warranty text the ai-citation audit found AI engines still serving |
| CG-04 | Any `powertrain protection` not followed by `on qualifying` | Guardrail C8, already partly covered |
| CG-05 | Any built page containing `/mo` must contain the exact Reg Z footnote. Spanish pages must contain the exact Spanish footnote | Guardrail D3, F1 regression |
| CG-06 | NAP verbatim as one exact string set, including license DL7667 | Any NAP drift |
| CG-07 | **Any price band, review count, unit count, or rating that does not match `facts.json`** | D8 entirely |
| CG-08 | Tier A and Tier B pages must have a live sibling at the declared `/es` path, both directions of hreflang resolving | The financing hub's total absence of Spanish |
| CG-09 | Canonical must equal the page's own hreflang self reference byte for byte | D2 |
| CG-10 | Any `Review` JSON-LD node whose `source` is not Google fails | Guardrail A9 |
| CG-11 | Any sitemap URL with zero inbound internal links fails | The 8 orphan pages |
| CG-12 | `reviewBy` frontmatter more than 30 days past fails; 1 to 30 days past warns. Expired competitor claims fail hard | Content decay, Section 6 |

**Design choice worth naming: this gate fails, it does not rewrite.** The existing `sanitizeDescription()` silently rewrites, which is right for machine generated feed copy and wrong for editorial prose, because a silent rewrite of an argument can change what it means. Editorial content fails loudly and a human fixes the sentence.

### 4.3 Stage 2. The adversarial verifier

`maxverify`, a separate Claude Code agent run. Runs on the diff, never on the whole site. Blocking. Zero cost, since it uses the existing tooling and no paid service.

**Its job is claims. Style is Stage 1's job,** because a deterministic check is cheaper, faster, and more reliable than an agent for anything a regular expression can decide. Do not make the agent count em dashes.

**Inputs:** the diff, `facts.json`, `claims.json`, and a read only allowlist of admissible sources. **`brand.md`, `copy-playbook.md`, and `prompt-library.md` are explicitly inadmissible** for the reasons in 4.0.

**Procedure:**

1. **Extract** every assertion a reasonable reader would take as a statement of fact. Numbers, legal statements, capability claims, competitor claims, superlatives, and implied promises.
2. **Classify** each into one bucket and apply that bucket's evidence rule:

| Bucket | Evidence rule |
|---|---|
| LIVE DATA | Must match `facts.json` exactly. No other source counts |
| ILLINOIS LAW | Must cite the statute or an Illinois government page by URL and quote the operative words. 815 ILCS 505/2L may be cited on coverage only with its exclusions stated (over 150,000 miles, rebuilt or flood title, GVWR at or above 8,000 lb, antique or collector) |
| FEDERAL LAW | Same, with the CFR or USC citation |
| MAXIM CAPABILITY | Must trace to an operational record, never to a marketing document |
| COMPETITOR | Must carry a URL, the date fetched, and a verbatim quote. Auto expires 90 days out |
| OPINION | Allowed only in the first person, never as a comparative claim |

3. **Fail** anything that cannot be placed in a bucket with its evidence. No exceptions, no confidence scores.
4. **Adversarial pass.** For each surviving claim, argue the strongest available case that a buyer reading it literally would be misled. If that argument survives, the claim fails even when technically true. This is the pass that catches "every car comes with an inspection report" when the report is a blank form.
5. **Compliance pass** against Parts A through D of `compliance-guardrails.md`, with the single documented exception that the price band at line 13 is superseded by `facts.json`.
6. **Spanish parity pass.** For Tier A and Tier B pages, confirm the Spanish sibling makes the same claims with the same strength. A disclosure that is softer in Spanish is a fail.

**On failure:** write `design/verify/{date}-{slug}.json` with a per claim table, open a DB task tagged `maxim_autos` naming the failing claims, do not stage the content. **There is no override flag.** If Jerry disagrees, he edits the claim, not the gate.

**On pass:** stage the content, commit the verdict file alongside it, stamp `verifiedOn` in frontmatter.

### 4.4 How this runs without Jerry reading every page

Jerry reads a verdict file only when it fails, and a failing verdict is a short list of specific sentences with a reason each. He never reads a page to approve it. He reads three lines to unblock one.

**Why two agents rather than one careful one:** a drafting agent is rewarded for producing output, and asking the same context to write and to approve is exactly how a false 3 month warranty claim survived in 15 places across three prose documents for months. The verifier starts from the diff and the ledger with no memory of why the sentence was written and no stake in it shipping.

---

## SECTION 5. BILINGUAL

### 5.1 The honest answer

Full parity is expensive and most of it would be wasted. No parity wastes working hreflang infrastructure and real demand. So: tiered parity, enforced by the linter, not by intention.

### 5.2 The tiers

| Tier | Scope | Spanish | Enforced by |
|---|---|---|---|
| **A. Transactional and legal** | Anything rendering a VehicleCard (Reg Z applies), anything stating the powertrain statute, anything about credit or financing terms, plus the transactional path: inventory, VDP, financing, credit application, contact, sell or trade, ship | **Required, blocking** | CG-05 and CG-08 |
| **B. The Illinois process cluster** | All 5 spokes of `/illinois-car-buying` | **Required, blocking** | CG-08 |
| **C. Everything else** | Make and model pages, `/sold`, per vehicle inspection pages, `/answers`, the financing hub's 5 spokes | English only, and **must carry no hreflang at all** | CG-08 inverse check |

### 5.3 Why Tier B and not Tier C for the Illinois cluster

This is the one place where new Spanish investment is defensible on evidence rather than instinct. A Spanish speaking buyer worried about Illinois title, tax, plates, and what the statutory protection actually covers has close to nothing to read in Spanish from any dealer. It is the same zero competition family the demand audit identified in English, and it is the content where a language barrier does the most damage to a buyer. Five pages. That is the entire new Spanish investment I am recommending.

### 5.4 The rules that make it hold

1. A Tier A or Tier B page **cannot merge without its sibling in the same commit.** Not a follow up task. The same commit.
2. hreflang must resolve in both directions and the canonical must match the self reference byte for byte. This also fixes D2, where `/es` and `/es/` both return 200 with the canonical and the hreflang self reference disagreeing.
3. Tier C pages carry no hreflang, so the infrastructure never points at a page that does not exist.
4. Every disclosure has its Spanish string in `claims.json`, not translated at write time. The Reg Z Spanish footnote already exists verbatim at `compliance-guardrails.md:57`.
5. `maxverify` checks claim strength parity in both directions. A softer Spanish disclosure is a fail.

**Sizing caveat:** I cannot size Spanish demand from available data. GA4 exists (`G-H05CD3EHE9`) but I have no access to its reports in this session, and there is no traffic data in the repo. The Tier B recommendation rests on the demand audit's competition finding plus the known demographics of Skokie and the near north suburbs, not on measured Spanish sessions. If Jerry wants that decision made on data, pulling Spanish page sessions from GA4 is the prerequisite and it is free.

---

## SECTION 6. FRESHNESS AND DECAY

Inventory turns 5 to 8 units a month. Decay has three distinct shapes and each gets its own mechanism.

### 6.1 A page states a number that changes

Solved structurally by the ledger. The page never contains the number, it contains the reference. Unit count, price band, review count, rating, median days on lot all recompute every build. This is the whole of D8 fixed at the root rather than patched at 15 call sites.

### 6.2 A page shows cars and one sells

Solved by making the rail a filter rather than a list. The page declares `{ maxPrice: 10000 }` in frontmatter and the build renders whatever matches. The sync runs every 6 hours and a VIN absent from the DealerCenter feed leaves the grid immediately, so a sold car leaves every rail on the site within 6 hours with no page edit.

Zero matches renders the capture form instead of an empty grid.

### 6.3 A page is about a specific car and that car sells

Current behavior, verified correct in the technical audit: the VDP stays live at 200, gets `noindex`, and drops out of the sitemap 14 days after `sold_date`. That is right and should not change.

**What should change: 20 sold VDPs are currently dead ends.** Someone arriving from an old link, a CarGurus cache, or an AI citation lands on a car that no longer exists and has nowhere to go. Add a live rail of three similar in stock cars plus the honest sold framing from Section 3.1. Zero new pages, 20 pages rescued.

Per vehicle inspection pages follow the same rule as their VDP: they stay live, go `noindex` with the parent, and leave the sitemap on the same 14 day clock.

### 6.4 A page states something that was true when written

The decay ledger. Every editorial page declares `reviewBy` in frontmatter. CG-12 enforces it.

| Content type | `reviewBy` interval | Behavior when expired |
|---|---|---|
| Illinois or federal law | 365 days | Build fails at 30 days past |
| Process and how it works | 180 days | Build fails at 30 days past |
| **Competitor claims** | **90 days** | **The claim block does not render at all.** It does not go stale, it disappears |
| Inspection page | Never expires. It is a dated record of a past event and is labeled as one | None |

### 6.5 The inspection coverage problem

If Jerry adopts the capture step and then drifts, some cars get an inspection page and some do not, and the pattern of which cars have one visibly contradicts "every car is inspected."

The gate handles the page correctly (no record, no page, no link, no claim). It does not handle the sitewide claim. So `facts.json` carries `inspectionCoverage`, and the rule is: **if coverage drops below 100%, the sitewide inspection claim must render at the strength of the weakest car, not the strongest.** The linter can enforce that because the ledger knows the ratio. This is the mechanism that makes option A in Section 1.6 safe to attempt, because a lapse degrades a claim automatically instead of turning it into a lie.

---

## SECTION 7. CANDIDATE VERDICTS

| # | Candidate | Verdict | Reasoning |
|---|---|---|---|
| 1 | Publish the inspection reports | **KILLED as pitched. REBUILT as capture then gated page** | The reports do not exist digitally. Verified: `build_vehicles_json.py:255` hardcodes the flag, `ma_vehicles` has no inspection columns, the only artifacts are two inconsistent blank forms. "Costs nothing because they already exist" is false. Section 1 |
| 2 | Grounded on site assistant | **KILL this cycle** | Two reasons, and the second is the stronger one. First, it needs a paid API key, which is a hard guardrail and requires Jerry's separate approval; I will not invent a price, but it is a recurring per token cost proportional to traffic. Second and decisive: **it generates unverified customer facing text at runtime, which is the exact thing Section 4 exists to prevent.** An assistant that can answer freely can answer wrongly about a warranty, and no gate can sit in front of it. Revisit only after the verification loop is proven and only with a hard constrained answer set |
| 3 | Jerry as a search entity | **SHIP** | `Person` schema already exists at `about.astro:12` but is orphaned: no `@id`, no `sameAs`, never referenced as founder from the AutoDealer node. Completing the graph also gives every editorial page an author, which is the E-E-A-T signal currently missing sitewide (zero `Article` schema anywhere). Small effort, zero compliance surface |
| 4 | Sold archive as price transparency | **SHIP with the framing corrected** | "What we actually sold it for" is fabrication for 118 of 119 sold vehicles, because `ma_sales` has exactly 1 row. The truthful and still valuable version is advertised asking price plus days on lot, derivable for 20 of 20. Disclosures in Section 3.1 |
| 5 | Honest comparison pages | **SHIP ONE, gate the rest** | Doc fees only, because it is the most verifiable and most stable competitor fact and Maxim's most provable differentiator. Every competitor fact needs a URL, a fetch date, a verbatim quote, and a 90 day auto expiry under CG-12. Frame as "here is what to ask any dealer and here is what we charge," never as a superiority claim. This carries the highest legal risk of anything on the list (Lanham Act, ICFA) and the highest maintenance risk, since a competitor changing a fee makes the page false with no notice |
| 6 | Self hosted images | **Out of my lane, but a hard dependency** | The inspection page wants a photo of the completed form, which cannot be hotlinked from the DealerCenter CDN. `mirror-photos.js` exists and is not wired. P1 depends on it |
| 7 | Walkaround video | **Out of my lane, one note** | `web_assets/videos/` is empty, verified. If it happens, VideoObject transcripts are content and must pass the same gate |
| 8 | Core Web Vitals as a weapon | **Not content, low priority** | The 92 KB against 724 KB gap is measurable and citable and could support one claim on one page. It will not win a query on its own |

### Additions the orchestrator did not list

| # | Addition | Why it matters |
|---|---|---|
| **A1** | **The facts ledger** | Structurally eliminates the entire D8 defect class rather than patching 15 call sites. Also the only thing that makes `maxverify` trustworthy, since I verified the guardrail document itself carries the stale number |
| **A2** | **The claim registry** | The inspection claim is currently written five mutually inconsistent ways across five surfaces (Section 1.4). One canonical sentence per claim, imported not paraphrased, in both languages |
| **A3** | **The live copy defect nobody flagged** | 12 em dashes and 4 instances of "on-the-spot" are live on 4 of 7 in stock cars right now, arriving from DealerCenter every 6 hours. The existing sanitizer covers two other rules and not these. CG-01 and CG-02 close it |
| **A4** | **`/answers` question index** | Cheapest internal link distributor available, built entirely from FAQ entities that already exist. Also the shape AI engines cite |
| **A5** | **Rescue the 20 dead end sold VDPs** | Add a live rail of similar in stock cars. Zero new pages, 20 pages converted from dead ends into entry points |
| **A6** | **Adopt the 8 orphans into the hub structure** | The technical audit found them with zero inbound links. A footer dump would fix the crawl graph and teach Google nothing. Making them Tier 2 spokes gives each three real inbound sources and a place in a structure |
| **A7** | **Generate `llms.txt` from the ledger** | It is currently maintained by hand and is currently wrong on price. Machine generated from live data, it can never be wrong again |

---

## SECTION 8. BUILD ORDER

Nothing ships out of order. The gate exists before the content it gates.

| Phase | What | Gate to advance |
|---|---|---|
| **0. Ledger** | `facts.json` generator, `claims.json`, regenerate `llms.txt` from the ledger | Every number on the site traces to one source |
| **1. Gate** | `content-guard.mjs` with CG-01 through CG-12, wired into `npm run build`. Run it against the site as it stands and fix what it finds, starting with the 12 live em dashes | Build passes clean |
| **2. Verifier** | `maxverify` agent definition, verdict file format, the DB task on failure | It fails a deliberately planted false claim in a test diff |
| **3. Fix what exists** | Financing hub E1 through E3, orphan adoption, sold VDP rescue rail, `used-audi-skokie` retirement, Person graph completion | CG-11 reports zero orphans |
| **4. Second hub** | `/illinois-car-buying` plus 5 English spokes plus 5 Spanish siblings, each passing T1 through T5 and both verification stages | Every page carries a verdict file |
| **5. Programmatic** | `/sold`, `/answers`, make pages under the inventory gate | Same |
| **6. Inspection** | Only if Jerry picks option A. `inspections.json`, the capture habit, the gated page | Coverage tracked in the ledger |

Phase 6 is last on purpose. It is the highest value content on the site and it is the only phase that depends on a human habit rather than a script. Building it before the gate exists would mean publishing measured claims into a system with nothing checking them.

---

## SECTION 9. WHAT NEEDS JERRY, WHAT NEEDS MONEY

**Needs money (all flagged, none assumed available):**
- Candidate 2, the on site assistant. Requires a paid API key. I am not pricing it, because I would be guessing at current rates and a guessed number is a failure. It needs Jerry's separate approval and I recommend against it this cycle on architectural grounds anyway.
- Everything else in this design uses existing tooling and costs nothing.

**Needs Jerry's decision:**
1. **The Section 1.6 fork.** Adopt the per car inspection capture, or soften five live claims. There is no third option.
2. **Candidate 5 scope.** Whether to publish any competitor comparison at all, given the legal and maintenance exposure.

**Needs Jerry's time, ongoing:**
- Option A only: roughly 4 minutes per car, roughly 35 minutes a month at 5 to 8 units.
- Everything else: zero ongoing time. The verification loop is specifically designed so he reads a short failure list, never a page.

---

## SECTION 10. UNVERIFIED

Stated plainly rather than filled with a guess.

- **Whether Maxim's dealer account is actively CVR enrolled today.** Taken from ground truth and repeated across the site. Not independently confirmed against a public record this session. The entire `/illinois-car-buying/metal-plates-same-visit` spoke rests on it, so it should be confirmed before that page is drafted.
- **Whether the person signing the inspection form is genuinely independent of Maxim.** `llms.txt` says "third-party mechanic," `used-cars-chicago-north-shore.astro:164` says "Jerry inspects every vehicle himself," and the form has an unattributed "Technician signature" line. These cannot all be true. Jerry has to answer this before any inspection content is written.
- **Whether the paper inspection form is actually filled in per car today.** No filled copy exists anywhere on disk. It may be filled and kept in the glove box (which `copy-playbook.md:749` describes) or it may not be filled at all. The form artifacts are dated 2026-07-09 and 2026-07-21, so the practice may be very new.
- **Spanish traffic share.** GA4 exists but I have no report access. The Tier B recommendation rests on the demand audit's competition finding and known local demographics, not on measured sessions.
- **Whether "100+ POINT INSPECTION" on the repo form is defensible.** That form has roughly 26 line items plus 4 tire rows and 2 brake rows. If that badge ever reaches a customer facing surface it is a claim `maxverify` would fail on the adversarial pass.
- **The exact Illinois motor vehicle tax breakdown for Skokie.** The demand audit found a secondary source stating 7.25% and flagged it as not cross checked against a primary Department of Revenue source. The `dealer-vs-private-party` spoke needs the primary source before it states a rate.

## Note outside my lane

`operations/google-local-domination-2026-07/design/content-citations.md` still schedules Polish language GBP updates at rows `[GBP-17]` and `[GBP-PL]`. The Polish marketing angle is settled and killed project wide per `MEMORY.md`. Not my file and not my call, but it is a live contradiction in a scheduled calendar and somebody should reconcile it.
