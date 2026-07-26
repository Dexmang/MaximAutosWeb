# Maxim Autos - Website Dominance SPEC

**Owner of record:** MaxSEO (site, schema, content) with ledger for the build gates, under Larry. Every GBP surface stays with MaxGoogle under the governing Google SPEC.
**Date:** 2026-07-25 (Day 0). **Status: DESIGN ONLY.** Nothing here has been published, posted, deployed, or sent. No file under `businesses/maxim-autos/website/site/` or `web_assets/` has been written by this run.
**Ground truth:** `audit-technical.md`, `audit-demand.md`, `audit-competitive.md`, `audit-ai-citation.md`, `audit-conversion.md`, `design-ai-visibility.md`, `design-content-engine.md`, `design-ux.md`, `design-operator.md`, `redteam-adoption.md`, `redteam-compliance.md`, `redteam-technical.md`, all in this folder.
**Inputs synthesized:** 5 audits, 4 designs, 3 red team files. 12 documents, roughly 90 proposals, 38 high and critical attacks. All 38 are resolved in Section 9.
**Precedence.** This file supersedes every per doc design in this folder. Where any design doc and this SPEC disagree on scope, order, copy, or verdict, **THIS FILE WINS.** The design docs are inputs and evidence, never independent instructions. This SPEC does not contradict the governing Google plan at `businesses/maxim-autos/operations/google-local-domination-2026-07/design/SPEC.md`; where it touches a GBP surface it defers to that file and only queues an approval line item.

---

## 1. Mission and honest verdict

Jerry asked for the most successful dealership site inside a 50 mile radius. Here is the honest verdict before the plan.

**Not achievable, and not worth spending on.** Maxim will not outrank Carvana, CarMax, the Napleton or Berman franchise groups, or the aggregators (CarGurus, Cars.com, TrueCar) on head terms. Three structural reasons, all measured, none fixable by on site work:

1. **Authority.** Maxim's own Google Search Console data (DB task #170, read 2026-07-03) shows 22 external links from 5 domains, all pointing at the homepage, zero editorial. Jerry cancelled CarsForSale (task #172), which removes 10 of those 22 links and drops referring domains from 5 to 4. Aggregators carry six figures of referring domains.
2. **Crawl budget.** 28 URLs sit in GSC as Discovered, currently not indexed, with Last crawled = N/A (task #166). Google found them and declined to spend the fetch. Better content on an unfetched URL changes nothing.
3. **Scale.** 7 units today, about 15 soon, 5 to 8 sales a month, one person. Generic price and radius queries are aggregator locked and stay that way regardless of technical SEO investment (verified: 2026-07-25 WebSearch on five price and radius variants returned zero Maxim mentions).

**What IS winnable, and how it will be known.** Maxim already wins the queries that name what only Maxim does. Measured 2026-07-25: "used car dealer Skokie CVR metal plates same day" returns Maxim in 6 of 10 results; "used car dealer with financing for all credit levels Skokie Illinois" returns Maxim at position 1 ahead of UR Approved and Napleton Honda; "maxim autos skokie" returns 4 of 9. The target is therefore:

> **Own every query that names a distinctive Maxim attribute, be the cleanest and fastest independent dealer site in the Skokie set, and be the dealer an answer engine can read without guessing.** Known by: referring domains up from 5 to 8 or more, the Discovered not indexed count down from 28, zero banned phrase hits on the live site, and the CVR plus all credit levels query wins held.

The realistic 12 month rival is **iCars Chicago** (Skokie, DealerSocket, roughly 50 units, $8,888 to $112,588 with only the low end overlapping Maxim's $8,995 to $15,995 band). Not Carvana. Say so out loud in every future doc.

**The structural moat, restated honestly.** Every dealer reachable inside 50 miles runs a vendor platform: Sherman Dodge on Dealer eProcess, Napleton Honda and Ultimo Motors on Dealer Inspire, iCars on DealerSocket, Best Auto Sales on Carsforsale.com, Old Orchard Nissan on WordPress with WPBakery. Maxim owns its source. Two consequences, one real and one that the red team correctly deflated:

- **Real:** 92 KB and 0.23s TTFB against iCars at 724 KB and 0.69s. That is a Core Web Vitals and crawl cost advantage no vendor tenant can match, and it compounds every time a page gets smaller.
- **Deflated:** the boast that Maxim ships `["Car","Vehicle"]` plus Offer plus FAQPage on all 27 VDPs while competitors cannot. Verified against Google's current 32 feature Search Gallery: Car, Vehicle, Vehicle Listing (died 2025-06-12) and FAQ (stopped rendering 2026-05-07) are all absent. Maxim ships schema no competitor ships and no search engine renders. **Keep the schema, delete the claim.** Its remaining value is machine readability for answer engines, which is real but unmeasurable and must never be sold as a ranking win.

Owning the source is the moat because it lets Maxim ship a build gate that refuses false copy, one fact ledger, and one entity graph. Not because of a schema type.

---

## 2. Verified baseline

### 2A. The 12 defects, confirmed or refuted

| ID | Defect | Status | Evidence |
|---|---|---|---|
| D1 | apex to www is 307 Temporary, not 301 | **CONFIRMED** | `curl -w '%{http_code}'` returns 307. DB task #89, open since 2026-06-02 |
| D2 | `/es` and `/es/` both 200, canonical and hreflang disagree | **CONFIRMED** | both 200, 0 redirects, identical 82,937 byte body; canonical `/es` vs hreflang `/es/` |
| D3 | No google-site-verification meta; Layout.astro:143 still a TODO | **CONFIRMED as code, REFUTED as a measurement blocker** | meta absent, but `nslookup -type=TXT maximautos.com` returns a live token, and tasks #164/#166/#170 contain Links report, Pages report drilldown and a 2026-04-30 Validate Fix. GSC is verified and was read 22 days ago |
| D4 | All vehicle images on a third party CDN | **CONFIRMED** | 120 live photos on `imagesdl.dealercenter.net`. `scripts/mirror-photos.js` exists but filters through `isCarGurusUrl()` at line 41, so wiring it in as written mirrors zero files. DB task #112, urgent, stalled since 2026-06-09 |
| D5 | GMC feed `g:link` has a trailing slash, canonical does not | **CONFIRMED** | all 7 feed items |
| D6 | GMC feed title carries a real em dash | **CONFIRMED** | raw bytes `b'Maxim Autos \xe2\x80\x94 Vehicle Inventory'` |
| D7 | Homepage has no FAQPage schema | **CONFIRMED** | 5 homepage JSON-LD blocks parse to Organization, Review x3, AutoDealer |
| D8 | Price band and review count drift | **CONFIRMED and reclassified** | `$5,000 to $15,000` on 15 pages including AutoDealer `priceRange` and FAQPage answer text, against a verified live band of $8,995 to $15,995 (7 units: 8995, 9495, 9995, 9995, 10450, 11580, 15995). Review drift narrowed to `suburbs.json` line 259 only. **This is not copy drift, it is a 14 Ill. Adm. Code 475.390 range of prices violation.** Root cause verified: `compliance-guardrails.md:13` itself hardcodes the false band under "use verbatim everywhere" |
| D9 | Source docs carry banned and false copy | **CONFIRMED and far understated** | `brand.md:10` = "### 1. TOTAL PROTECTION" (C8 banned verbatim); `brand.md:27` makes "Every customer protected" a MANDATORY closing line for all car descriptions; `copy-playbook.md` cites the false 3 month warranty in 15 places including line 533 where it is taught as the approved substitute for the banned word "certified" |
| D10 | Registry schedules 3 GBP posts per week against a SPEC capping 1 | **CONFIRMED** | `automations-registry.md:13` still reads "3x/week cadence (Mon/Wed/Fri)" and "GBP native scheduling", marked ENABLED, against Google SPEC lines 74 and 100 |
| D11 | `launch.json` cwd points at a path that does not exist | **CONFIRMED** | cwd `...\MaximAutosWeb\site`; real path `businesses/maxim-autos/website/site` |
| D12 | gh CLI unauthenticated | **REFUTED** | `gh auth status`: logged in as Dexmang via keyring, active. Point in time only; unverified during a live cron run |

### 2B. Defects no audit was asked for and every one is live

| Finding | Evidence |
|---|---|
| **C8 blanket protection claim live sitewide** | `Footer.astro:79` tagline "every customer protected"; 62 occurrences across 56 pages; also the closing line of all 7 live `vehicles.json` descriptions and 7 times inside the Google ingested feed `web_assets/feeds/vehicles.xml` |
| **"All credit welcome" truncation in the top marquee** | 49 occurrences across 56 pages. MEMORY.md hard rule and guardrail B4 both require "Financing for all credit levels" |
| **8 orphan SEO pages with zero inbound internal links** | 4 make, 2 price bracket, 1 body style, 1 regional. `/inventory` links all 9 suburb pages and none of these 8 |
| **GitHub Pages mirror competing for the homepage** | `dexmang.github.io/MaximAutosWeb` returns 200, byte identical homepage, canonical pointing at itself, no noindex |
| **Four make pages are 95.6% identical** | `diff` of `used-toyota` against each sibling returns exactly 10 differing lines of 226, CRLF normalized. Live doorway pattern. `used-audi-skokie` matches zero inventory, live or sold |
| **VDP financing CTAs skip the soft prequalifier, and the SSN privacy claim is false** | `[slug].astro:474`, `:789` and the sticky bar at `:889` all point at `/apply`, the 60 field SSN application; the sticky bar is labeled "Pre-Qualify". `apply.astro:87` says the SSN is "never stored on our servers" while `api/credit-app.py:22-43` encrypts and stores it to a private Vercel Blob |
| **GA4 counts clicks, not leads** | `Layout.astro:157-181` capture phase submit listener fires `generate_lead` before the `fetch()` runs |
| **Reg Z disclosure defects, two of them** | `es/index.astro:168` "Pago estimado con" vs `es/inventario.astro:164` "Pago estimado basado en" (the guardrail canonical is "con", so `es/index.astro` is already correct). Separately, guardrails finding F1: 9 pages render VehicleCard with no footnote at all. Federal, high |
| **build_ai_knowledge_base.py is a live customer facing exposure** | pasted into the GoHighLevel conversation AI. Says "Total Protection", "Monday through Saturday 9:00 AM to 7:00 PM" against real hours, "Sunday by appointment" against Sunday closed, `jerryf@` against schema's `jfranco@`, "34+ reviews" against 46, "$5,000 to $15,000" |
| **No exclusion mechanism for the insider review** | repo wide search finds no denylist, flag, or note. The exclusion exists only in one person's head |

### 2C. Competitive, AI, and inventory numbers

| Measure | Maxim | Field |
|---|---|---|
| Homepage weight and TTFB | 92 KB, 0.23s | iCars 724 KB / 0.69s; Old Orchard Nissan 375 KB / 0.23s |
| VDP vehicle schema | Car + Vehicle + Offer + FAQPage on all 27 | zero of 6 reachable competitors carry any; all top out at AutoDealer |
| llms.txt | present, 4.2 KB | Carvana, CarGurus, Sherman Dodge, Napleton Honda, Old Orchard Nissan, Ultimo Motors all serve one. Presence is not a differentiator |
| AI position, brand and distinctive | wins (CVR plates 6 of 10, all credit levels position 1) | n/a |
| AI position, category | **regressed to absent** on "used car dealer Skokie IL", which Maxim held at about position 6 in the June baseline | Yelp, iCars, Pete Auto, Napleton, Go Autos, Northshore Auto Connect surfaced instead |
| AI position, price and radius | zero mentions across five variants | aggregator locked |
| Stale false claim in the Bing index | **6 live URLs still served to answer engines as carrying a "3 Month Warranty"** | live pages are clean; this is index freshness only |
| Inventory | 7 live, $8,995 to $15,995, median $9,995, rising to about 15 | plan against 15 |
| Reviews | 46 at 5.0, profile verified 2026-07-24 | iCars roughly 100, unverified |

### 2D. What instrument measures what, and the honest gap

| Signal | Instrument | State |
|---|---|---|
| Index state, coverage, average position | Google Search Console | **Verified property exists** (apex DNS TXT live, reports already read on 2026-07-03). Not automated. `baseline-day0.md:50` claims "GSC is NOT yet verified or connected" and is **wrong**; that error propagated into all four designs and must be corrected in the file |
| Referring domains | GSC Links report | 5, scheduled to fall to 4 |
| Lead volume by channel | GA4 `generate_lead` | **Broken.** Fires on click, not on submission success. Six phone positions cannot fire at all because the number is a non link div |
| Lead records | `ma_leads` | 83 rows, all source `cargurus`, zero attributed to the website. 78 at stage new |
| Credit applications | `ma_credit_applications` | 2 rows total, one of which is Jerry's own test from 2026-05-02 |
| Banned phrase state on the live site | nothing | to be built. 56 of 56 sitemap URLs fetched cleanly in the operator's proof run |
| Review count | `reviews_meta.json` | 46, updated 2026-07-24. `update-reviews.yml` is disabled because Google blocks the scraper and its named replacement owner is also disabled. **Nothing will ever update this file again** |

---

## 3. The defects to fix first

Ordered. Source documents before generated output, because a linter that scans only output cannot catch a poisoned source.

| # | Defect | File and exact change |
|---|---|---|
| 1 | C8 banned phrase at the source | `memory/context/maxim-autos-brand.md`: line 10 `### 1. TOTAL PROTECTION` becomes `### 1. INSPECTED AND DOCUMENTED`. Line 27 tagline becomes `Every car inspected. Every price transparent. Every car documented.` Line 15 `Metal Plates Issued On-The-Spot` becomes `Metal plates issued the same visit`. Line 35 `34 reviews` and the closing `Price range: $5,000–$15,000` both replaced with a pointer to the live ledger. Add a banned vocabulary line and a status line reading "Subordinate to compliance-guardrails.md; guardrails win on conflict" |
| 2 | False warranty taught as approved copy | Move `memory/context/maxim-autos-copy-playbook.md` to `memory/context/_retired/maxim-autos-copy-playbook-2026-04.md` with a line 1 header declaring it retired, containing a false warranty claim in 15 or more places plus non conditional credit language, preserved for provenance and **not admissible as evidence for any claim**. Write a replacement holding only structural craft (four paragraph shape, slot model, single phone CTA, specific numbers) with every factual claim sourced from the ledger. Update the `MEMORY.md` pointer in the same commit |
| 3 | C8 live on 56 pages and in the Google feed | `site/src/components/Footer.astro:79` tagline to the corrected string. Extend `scripts/build-inventory.js:199` `sanitizeDescription()` with the C8 vocabulary, the U+2014 character, and the hyphenated compound blocklist. The function already correctly strips the 3 month warranty (verified: `dc-inventory.json:131` carries it, `vehicles.json:128` shows it rewritten) so this is the proven zero discipline path |
| 4 | "All credit welcome" truncation | marquee string to `Financing for all credit levels`, one file, 49 occurrences downstream |
| 5 | Price band, the 475.390 violation | Delete the hardcoded band from `compliance-guardrails.md:13` and replace with: "Price band: NEVER hardcoded. Read live from vehicles.json via the facts ledger. A stated range no live unit sits inside violates 14 Ill. Adm. Code 475.390 and 475.310." Build `site/src/data/facts.json`, generated every build from `vehicles.json` and `reviews_meta.json` (price min and max, unit count, review count, rating, city list). All 15 call sites read it: 9 `suburbs.json` entries, `used-cars-chicago-north-shore.astro:20`, `financing-bad-credit/index.astro:11`, `index.astro:14`/`:77`/`:135`/`:326`, the `/es` mirror, `llms.txt`, and the AutoDealer `priceRange` JSON-LD. Until it ships, state no range at all: "Inventory currently priced from $8,995" computed live |
| 6 | `suburbs.json:259` hardcoded review count | read `reviews_meta.json` instead of "40 plus five star reviews" |
| 7 | VDP financing CTA sends nervous buyers to an SSN form | `[slug].astro:474`, `:789`, `:889` retarget to `/financing#apply` with `?vehicle`. Keep `/apply` as a secondary "Ready now, full application" link. Rename the calculator button to "Check my financing options". Fix `apply.astro:87`: the SSN is encrypted and stored, so the copy becomes an accurate encryption and retention statement |
| 8 | GA4 measures nothing | `Layout.astro:157-181` moves `generate_lead` out of the capture phase; each form fires it on `fetch()` success only. Prerequisite for every conversion claim in this document |
| 9 | Six invisible phone numbers | `index.astro:269`/`:376`, `inventory.astro:284`, `contact.astro:92`, `financing.astro:323`, `sell-trade.astro:29`: non link `div` inside `hidden sm:inline-flex` becomes a visible `tel:` anchor |
| 10 | 9 pages render VehicleCard with no Reg Z footnote | one shared caption per grid on the F1 file list. Federal, and it blocks any card bearing surface |
| 11 | Mirror competing for the homepage | noindex on every mirror page plus `Disallow: /` in the mirror `robots.txt`. Production untouched. Rename `deploy.yml` so no future design mistakes it for the production gate |
| 12 | 8 orphan pages and two hero chips pointing at URLs that robots.txt blocks | link the 8 from `/inventory`; repoint `index.astro:139-141` off `/inventory?price=under10k` and `/inventory?body=SUV` (both blocked by `Disallow: /inventory?`) at `/used-cars-under-10000-skokie` and `/used-suvs-skokie-il`, which are two of the orphans. Two defects, one edit |
| 13 | `used-audi-skokie` is a live zero inventory keyword holder | retire, 301 to `/inventory`. It matches no unit live or sold and sits inside the FTC's "unavailable or nonexistent" language from the 2026-03-13 letters |
| 14 | IndexNow list is a stale hand array | derive from the built sitemap; fix the homepage trailing slash off by one at `ping-indexnow.js:77`; widen `RECENT_EVENT_DAYS` to 14 to match sold VDP sitemap retention. Then submit the 6 stale warranty URLs. **This clears the Bing index, which is ChatGPT's retrieval layer. It does nothing for Google** |
| 15 | Live customer facing bot facts | `operations/build_ai_knowledge_base.py`: repoint at the ledger; correct hours verbatim to "Monday 3 to 7, Tuesday 3 to 7, Wednesday by appointment, Thursday 3 to 7, Friday 3 to 7, Saturday 10 to 3, Sunday closed. Central time."; delete "Total Protection" and "fully inspected"; pick one email. One time paste back into GoHighLevel plus a build time diff, never a weekly chore |
| 16 | Mechanical stragglers | D1 apex to 301 in `vercel.json`; D2 `/es/` to `/es` 301 and align hreflang self reference; D5 feed `g:link` trailing slash; D6 feed em dash; D11 `launch.json` cwd; `feed-parity-audit.yml` `workflow_run` name still says "Sync Inventory from CarGurus" after the rename, so the trigger has been dead since; `[slug].astro:186` `priceValidUntil` must equal `sold_date` when status is sold (verified live: a sold VDP currently advertises `priceValidUntil` 2026-09-24) |
| 17 | D10 registry conflict | see Section 6, rule 9 |

---

## 4. Phased roadmap

### 4A. Phase 1, ship now

The adoption skeptic's cut. Zero net new recurring discipline. Roughly two days of engineering plus one Chrome sitting with Jerry. Every item is verifiable by a command.

| # | What | Files | Who | How long | Binary evidence |
|---|---|---|---|---|---|
| P1-1 | Purge C8 at the source and in the sanitizer | `brand.md`, `Footer.astro:79`, `build-inventory.js:199` | MaxSEO | 2h | `grep -i "customer protected\|total protection" ` over all 56 built pages plus `vehicles.xml` returns 0 |
| P1-2 | Marquee truncation | marquee string, 1 file | MaxSEO | 10m | grep over built pages returns 0 for "all credit welcome" |
| P1-3 | Retire the copy playbook | `memory/context/_retired/`, `MEMORY.md` | ledger | 1h | retired file has the header, `MEMORY.md` points at the replacement, grep for "3-month warranty" in loaded context returns 0 |
| P1-4 | Facts ledger and the 475.390 fix | `facts.json`, 15 call sites, `compliance-guardrails.md:13` | MaxSEO | 4h | grep `$5,000` over `site/dist` returns 0; `priceRange` reads the live band; band moves on its own when a car sells |
| P1-5 | ONE merged linter, blocking pre merge, advisory in production | new `scripts/lint-copy.mjs` plus a `pull_request` workflow | MaxSEO | 5h | a PR with a seeded violation fails; the same violation in a Vercel build prints, opens a DB task, and **deploys** |
| P1-6 | CTA retarget and the SSN copy fix | `[slug].astro:474`/`:789`/`:889`, `apply.astro:87` | MaxSEO | 1h | curl a VDP, all three hrefs read `/financing#apply`; `apply.astro` no longer claims the SSN is not stored |
| P1-7 | GA4 fires on submission success | `Layout.astro:157-181` plus 4 form handlers | MaxSEO | 2h | DebugView shows 1 event per successful submit and **0** on a forced 500 |
| P1-8 | Six tappable phone numbers | 6 files | MaxSEO | 1h | curl all 6, each carries a visible `tel:` anchor; a real GA4 phone event lands |
| P1-9 | Reg Z footnote on the 9 uncovered pages | F1 file list | MaxSEO | 1h | verbatim string present on all 9, plus the Spanish sibling |
| P1-10 | Mirror containment | mirror pages, mirror `robots.txt`, rename `deploy.yml` | MaxSEO | 1h | curl mirror shows noindex; mirror `robots.txt` reads `Disallow: /` |
| P1-11 | Orphans linked, hero chips repointed | `/inventory`, `index.astro:139-141` | MaxSEO | 1h | crawl shows 1 or more inbound links for each of the 8; both chips resolve 200 and are crawlable |
| P1-12 | Retire `used-audi-skokie` | `vercel.json` 301 | MaxSEO | 15m | curl returns 301 to `/inventory` |
| P1-13 | IndexNow derived from the sitemap plus 6 stale URLs submitted | `ping-indexnow.js` | MaxSEO | 1h | run log submits the full sitemap count with 0 skipped; resolves the 33 vs 37 vs all-9 contradiction across three docs |
| P1-14 | The bot's facts | `build_ai_knowledge_base.py` | MaxSEO | 1h | regenerate, diff shows corrected hours, no C8, one email, live counts |
| P1-15 | Mechanical stragglers, item 16 | as listed | MaxSEO | 3h | each verified by curl or grep individually |
| P1-16 | Registry and cadence cap | `automations-registry.md`, new `cadence-caps.json` | ledger | 1h | the strings "3x/week" and "native GBP scheduling" are **deleted**, not marked disabled; the cap file holds the Google SPEC numbers |
| P1-17 | Insider reviewer denylist | new `site/src/data/reviews-excluded.json` | MaxSEO | 30m | linter fails if a listed author appears in `reviews.json` or any Review node. The excluded review still counts toward the live Google total of 46, so **do not subtract it** from AggregateRating |
| P1-18 | **The one Chrome sitting with Jerry** | GSC UI, 3 directory sites | Jerry plus MaxSEO live | 1 session | GSC Domain property open, task #170 executed, task #167 closed, and BBB.org plus Foursquare plus Manta submitted (all confirmed free by task #176's finished runbook). Referring domains 5 to 8 |

**Phase 1 exit gate:** all 18 evidence cells green, and a banned phrase scan of all 56 live URLs plus `llms.txt` plus `vehicles.xml` plus the mirror origin returns zero criticals.

### 4B. Phase 2, after Phase 1 proves out

**Gate:** referring domains at 8 or more, the Discovered not indexed count moving down from 28, and Phase 1 fully green. Nothing in 4B starts before that.

| Item | Why it waits |
|---|---|
| One entity graph, `dealer.json` plus `schema.js`, stable `@id` URIs, 12 of 13 AggregateRating copies deleted, `sameAs` lists merged, Park Ridge added to `areaServed` | Correct, cheap, shrinks every page and protects the 92 KB advantage. Zero rich result, no ranking mechanism, unmeasurable in 90 days or arguably ever. Ship it; never headline it |
| Service nodes `/#cvr-registration` and `/#inspection`; Person node `/#jerry` | Doubles down on ground Maxim already holds. **Ship the Person node with no `alternateName` and never ask** for the paperwork name; nothing a search engine uses is in it, and asking queues it behind six awaiting_owner rows aged up to 52 days |
| `/inventory.json` with a top level `disclosures` object; generated `llms.txt`; Atom feed of **added and sold only**; homepage FAQPage; OfferCatalog | Machine readable surfaces are advertisements. See Section 6 rule 6. Graded near zero expected result, positive only because ongoing cost is zero |
| `robots.txt` generated from `crawlers.json`, explicit Allow blocks, ClaudeBot crawl delay removed | No op on coverage (nothing is blocked today) and Googlebot discards `Crawl-delay` at parse time. Ship for hygiene, delete the coverage claim |
| Rebuild the 3 surviving make pages to clear a 0.60 Jaccard sibling similarity gate, using Maxim's own sold history for that make | They are 95.6% identical today. The gate, not a new page, is the deliverable |
| `/illinois-doc-fee`, exactly one page, **no competitor named anywhere** | Highest legal exposure item that survives. See Section 6 rule 7 |
| `/answers` index; sold VDP rescue rail (3 live similar cars on each of 20 dead ends); orphan adoption into hub structure | 28 pages fixed, zero new URLs |
| Inventory chips derived from live data (price ceiling and mileage slider, counted chips, no dead ends), empty state SMS capture with filters only and no price | Two of five current price chips return zero and the $15,995 Crosstrek is reachable by no chip at all |
| Lightbox `dcResize()` routing, one `PaymentEstimator.astro` replacing two forks, `aria-hidden` sweep on every decorative icon, filter chips to 44px, inventory URL state plus share control | All small, all mechanical, all real |
| Spanish Reg Z canonicalization to the guardrail string (`con`, not `basado en`), both strings extracted to the ledger | `es/index.astro:168` is already correct. Do NOT "fix" it |
| `mirror-photos.js` predicate fixed to DealerCenter, flagged, **one VDP canary before the sitewide rewrite** | DB task #112, urgent, stalled 43 days. It touches the LCP element on all 27 VDPs; a wrong rewrite breaks every vehicle photo at once |

### 4C. Gated on a decision or on spend

Each is a separate yes or no for Jerry. None is on the critical path.

| Item | Cost | Decision |
|---|---|---|
| **On site grounded assistant** | Requires a paid API key. **I refuse to invent a monthly figure**; it is a recurring per token cost proportional to traffic and needs current published pricing checked at the time of the ask. Requires Jerry's separate approval under the NO NEW SPENDING guardrail | **Recommended NO this cycle regardless of price.** It generates unverified customer facing text at runtime, which is exactly what the build gate exists to prevent. If it ever ships, it must be a thin client over `/inventory.json` and never own its own copy of the facts |
| **GSC API service account** | $0. Requires Jerry to create a Google Cloud project, enable an API, create a service account, add it as a restricted property user, and store a repo secret. Account creation, which I do not perform | **YES but last.** Five steps across two consoles is strictly harder than task #167 (one click where the DNS token already exists), which has been stalled 22 days. Ship the operator's other checks first and let index state print UNAVAILABLE with `blocked_by: #167` |
| **Walkaround video** | An `ma_vehicles` column migration plus 15 to 20 min per car of Jerry's time, roughly 2 to 2.5 hours a month at 8 intake cars. **Not zero, as the design claimed** | **Probe gate, 7 days, exactly one car.** Video is the only vehicle adjacent rich result left in Google Search, so it is the last lever that produces a picture in a result. Build the `VideoObject` contract only after a real file lands, because `vehicles.json` is generated and a hand added key is destroyed by the next OAP pull, which runs twice a day |
| **Inspection record capture** | 6 to 10 min per car of transcription plus a mechanic handoff that has never been demonstrated to happen. Verified: `ma_vehicles` has zero inspection columns, `inspected` is a hardcoded boolean at `build_vehicles_json.py:255` on all 27 records, and the only artifact is a blank 14,735 byte printable form | **Probe gate, 7 days, one photographed filled form.** If it appears, revisit. If not, the question is settled at zero cost and the claim fork (Section 6 rule 8) ships instead |
| **Out The Door fee line only** | Zero, plus a January review when the CPI indexed doc fee cap moves | **YES to the fee line, NO to the total.** See 4D |
| **maxverify LLM claim verifier** | Unpriced token cost on every editorial diff. Requires approval | **YES only as advisory.** The deterministic linter blocks; maxverify writes a verdict and opens a DB task. Never on the inventory sync path. Override requires a written reason recorded via `db_notes.py` |

### 4D. Killed, and why

| Killed | The attack that killed it |
|---|---|
| **Out The Door summed total on the VDP** | Illinois vehicle tax is destination sourced. IDOR ST-556 instructions: the rate follows the purchaser's address, and a Chicago registering buyer owes an additional 1.25% Chicago Home Rule Use Tax, which understates the design's own worked "Total" of $17,471 by about $200. Maxim declares 9 service cities plus a Chicago corridor page. There is no single correct number, so verification cannot save it. A published total that is $200 low at signing attacks the one claim the business is built on. **Survivor: the fee line only.** Dealer documentary fee $0 with "Illinois allows up to $377.63" as a sub label, and tax, title and license shown as a labelled estimate stating the rate depends on where the buyer registers, never summed |
| **`/out-the-door` budget page** | Inherits the whole tax defect, hardcodes 9.9% APR with no rate control for an audience the design itself calls subprime (a regression from the compliant APR slider already live at `financing.astro:104`, and advertised terms unavailable under 14 Ill. Adm. Code 475.620 and 475.630), and solves a filtering problem 7 to 15 cars do not have. The spec also assumed client JS can instantiate `VehicleCard.astro`, which builds at build time. The financing form already carries the exact `monthly_budget` buckets |
| **Compare tray** | Largest build in the UX design, smallest defensible payoff. At 7 to 15 units the inventory fits on one or two screens, the owner personally texts every buyer, and there is one real credit application in three months. Also would put an "Est. monthly" row in a bottom tray that covers the page bottom Reg Z footnote on a 390px phone |
| **Per vehicle inspection pages** | No completed inspection record exists anywhere: 37 `ma_vehicles` columns with zero inspection related, hardcoded booleans on all 27 units, one blank paper form. The design's coverage guard would silently downgrade the sitewide inspection claim across 15 English pages plus the Spanish mirror after a three week lapse. That is the worst failure mode on the list. Also converts per VIN tread depth and a named technician into written representations about the condition of an AS IS car under 16 CFR Part 455 |
| **Publishing the inspection checklist as `/inspection`** | The real form's header reads "100+ POINT INSPECTION" over about 28 line items and its footer carries the exact C8 banned phrase. Publishing it publishes two new defects and a stronger claim with no record behind it |
| **`used-volvo-skokie` and every crossproduct** | The four existing make pages measure 4.4% unique body, failing the content engine's own 40% test by a factor of nine. Google's scaled content abuse pattern, live. An inventory gate controls whether a thin page exists, not whether it is thin. Also killed: a 10th suburb page, new price bracket pages, new body style pages, and the 9 x 5 city by make grid |
| **Tiered Spanish, 5 new pages** | 7 of the 28 never crawled Discovered URLs ARE the existing Spanish tree. Adding 5 more to a section Googlebot has never fetched is the clearest instance of building into a wall, graded large effort, on demand the designer admits could not be sized. **Kept:** Tier A parity (already 8 pages) and the Tier C no hreflang rule |
| **The `/sold` archive, in every variant** | Three designs made three different calls. Killed outright this cycle: it publishes prices for 20 vehicles nobody can buy (475.310, plus the FTC's 2026-03-13 "unavailable or nonexistent" theory), it adds URLs into a queue Google is already refusing to service, and even the noindex version buys nothing measurable. The 20 sold VDPs stay exactly as they are: 200, noindex, SoldOut, dropped from the sitemap after 14 days, with `priceValidUntil` corrected to `sold_date` |
| **Any named competitor comparison** | 475.360(b) bans comparing your price with another dealer's, explicitly or implicitly, and a doc fee is a price component. 475.340 bans lowest price claims absent systematic ongoing monitoring, which this run's brief forbids. Four named competitors return 403 or Cloudflare to fetches, so substantiation already fails for a third of the field. Lanham Act gives a named competitor direct standing. Also delete the "0 of 6 competitors publish this, Maxim becomes 1" success metric; it is a 475.340 claim in disguise |
| **`content-guard.mjs` hard failing `npm run build`** | That path IS Vercel production. On exit 1 Vercel keeps the previous deployment, so a prose style rule freezes the site and `vehicles.xml` at yesterday's inventory, advertising a sold car at a stale price. Merchant Center has already been disapproved three times (#114, #132, #154). The gate's failure mode is worse than the defects it prevents |
| **Any linter wired into `deploy.yml` or `sync-inventory.yml`** | Verified: `deploy.yml` is "Deploy to GitHub Pages" and publishes the mirror; `sync-inventory.yml` has no `astro build`; production is Vercel via `vercel.json` `buildCommand`. Neither gates production, so "the build refuses" was false against the real topology |
| **CG-12 decay failing the build at 30 days** | A scheduled time bomb in the production build. A lapsed `reviewBy` on a page about Illinois law would halt the deploy carrying live inventory, with nobody having done anything wrong. Decay renders the stale block as nothing and opens a DB task. Never fails a build |
| **`maxverify` as a blocking gate with no override** | A non deterministic judge with veto power over a pipeline pushing inventory every 6 hours, in a shop with 24 overdue urgent tasks. The first false positive is a permanently blocked pipeline resolvable only by the person whose demonstrated latency on urgent items is measured in weeks |
| **Three separate linters** | Three copies of one rule set is three places to write a rule wrong. Same defect class as the 13 AggregateRating copies and the two Spanish Reg Z strings these designs exist to fix |
| **`APPROVAL-CARD.md` as a committed file surfaced by one DB task** | Correct diagnosis that a task list is not an execution mechanism, then a task list with a nicer format, delivered into a queue already 52, 45, 45, 22 and 22 days deep. **Replacement:** push via the existing `maxim-autos-feed` ntfy topic, hard cap **3** items, keep the committed file as the audit trail only. Fourth deadman condition: 3 consecutive weeks with no recorded response fires a CRITICAL push |
| **The DealerCenter paste back nag** | 4 to 6 min per car with a login and a decision, roughly 40 min a month, when a zero discipline path already exists in the build (`sanitizeDescription()`). Feed product copy is not an argument that needs a human to preserve its meaning |
| **Google review scraping** | `update-reviews.yml` went blind, parsed null, and exited 0 while reporting success; Google now blocks it and its named replacement owner is disabled. Scraping is contrary to Google's terms against the one counterparty Maxim cannot afford to annoy 14 days off a suspension. Sanctioned path: one Chrome line item in a session Jerry is already in, recorded in the registry so nobody rebuilds the scraper |
| **A blog, ever** | A dated post format creates a cadence obligation one person cannot meet. This is the best judgment call in the run and it becomes a standing rule (Section 6 rule 10) |
| **Q&A format prose restructuring for GEO** | Independent data shows Q&A format headers reduced content absorption 5.74% while definitions, statistics and comparisons boosted it 55 to 77%. The FAQPage schema already implemented is the evidenced correct mechanism |
| **Speakable, HowTo, SearchAction, Carousel, Product on vehicle, QAPage, competitor Review markup** | Each verified dead or wrong type against Google's own docs. Product on a vehicle contradicts `build-gmc-feed.js` `excluded_destination` and risks the Merchant account; competitor Review markup is a defamation surface |
| **Homepage hero rebuild as a project** | No ranking mechanism and no instrument can resolve a hero redesign at 665 monthly GBP views. Its two real components (computed price band, tappable CTA) are already in Phase 1 as trivial items. The remainder is taste priced as a project |
| **Citing the FTC CARS Rule** | Vacated by the Fifth Circuit 2025-01-27, not appealed, withdrawn from the rulebook effective 2026-02-12. None of its requirements are in force. Live federal hooks are FTC Act Section 5, 16 CFR Part 455, and TILA/Reg Z 12 CFR 1026.24, plus the FTC's 2026-03-13 letters to 97 dealer groups as current enforcement posture. Record the vacatur in the guardrails sources section so nobody re adds it |
| **The Polish language angle. The after sale review ask SMS flow.** | Settled and killed previously. Not re pitched here |

---

## 5. Canonical copy

Everything else references this section. No other file states these strings independently; they live in `claims.json` and are asserted byte equal by the linter.

**Reg Z footnote, English, verbatim.** The hyphen in "60-month" is protected: verbatim outranks the style rule.
> \* Est. payment based on 10% down, 9.9% APR, 60-month term. For illustrative purposes only. Actual terms vary by credit.

**Reg Z footnote, Spanish, verbatim** (the guardrail canonical at `compliance-guardrails.md` D3; `es/index.astro:168` already matches and must not be changed):
> \* Pago estimado con 10% de enganche, 9.9% APR, plazo de 60 meses. Solo para fines ilustrativos. Los términos reales varían según el crédito.

**NAP, verbatim, character for character, everywhere including the footer street address:**
> Maxim Autos
> 9101 Terminal Ave, Skokie, IL 60077
> (847) 510-8947
> Illinois Secretary of State Class D Used Vehicle Dealer, license DL7667

**Powertrain wording, the only permitted phrasing:**
> Illinois 15 day / 500 mile statutory powertrain protection on qualifying cars.

Never "warranty on every car", never "total protection", never "complete protection", never "full protection", never "certified", never a 3 month warranty. Statutory exclusions (over 150,000 miles, rebuilt or flood title, GVWR at or above 8,000 lb, antique or collector) stay on the Terms and Return pages.

**Zero doc fee wording:**
> No dealer fees at Maxim Autos, ever. The price you see is the price you pay, plus tax, title, and license.

**Brand tagline, replacing the C8 violating line at `brand.md:27` and `Footer.astro:79`:**
> Every car inspected. Every price transparent. Every car documented.

**Pillar 1 heading, replacing "TOTAL PROTECTION":**
> INSPECTED AND DOCUMENTED

**Plates wording, replacing "On-The-Spot":**
> Metal plates issued the same visit, so you can drive home that day.

**Financing wording, never truncated:**
> Financing for all credit levels, including buyers building or rebuilding their credit. Approval is never guaranteed.

**Price statement while the ledger is being built (no range, computed live):**
> Inventory currently priced from $8,995. 7 cars in stock today.

**Doc fee line on the VDP (the surviving half of Out The Door):**
> Dealer documentary fee: $0. Illinois allows dealers to charge up to $377.63. We charge nothing.

If the $377.63 figure cannot be confirmed against a primary Illinois source at build time, ship it with no number: "Illinois allows dealers to charge a documentary service fee. We charge zero."

**Tax, title and license estimate disclosure, required adjacent to any fee or estimate block, both languages, at body type size:**
> Illinois taxes a vehicle at the rate for the address where you register it, not where you buy it, so your tax depends on your city. Title and plate fees are set by the State of Illinois, and the plate figure assumes new plates rather than a transfer. These are estimates, not a quote.

**Inspection claim, the only permitted sitewide strength until a real record exists:**
> Every car is inspected before it goes on the lot, and a free CARFAX comes with it. Ask Jerry what was checked on any car before you decide.

This replaces `used-cars-under-10000-skokie.astro:160`, which currently promises a written report a buyer can read before deciding, and it is the string every one of the five inconsistent surfaces resolves to (`llms.txt:13`, `used-cars-chicago-north-shore.astro:164`, the VDP inspection card, `build_ai_knowledge_base.py:40`).

**Empty state and share SMS body, filters only, no price and no payment:**
> Hi Jerry, I am looking at the AWD SUVs under $12,000 on your site.

---

## 6. Permanent operating rules

These bind every future routine, agent, and build touching maximautos.com.

1. **No number lives in a page.** Price band, unit count, review count, rating and city list come from the generated ledger. A hardcoded ledger value is a linter failure. Root cause of D8 was a guardrail doc hardcoding the false band, so the guardrail doc is a linter target too.
2. **One linter, one rule file, two invocation modes.** Blocking on `pull_request`. Advisory inside the production Vercel build: print, open a DB task, exit 0. **Never gate the 6 hourly inventory path on a copy rule.** Scan targets include the source docs (`brand.md`, the replacement playbook, `build_ai_knowledge_base.py`), the generated artifacts, `llms.txt`, `vehicles.xml`, the live sitemap URLs, **and the GitHub Pages mirror origin**. Every finding in this document that is live today came from a source file or a surface a generated output scan would never have read.
3. **Deterministic gates block. Agents advise.** A regex beats an agent at counting dashes. An LLM judge never holds a veto; it writes a verdict, opens a task, and can be overridden with a reason recorded via `db_notes.py`.
4. **Content decay never fails a build.** A stale block renders as nothing and opens a task.
5. **Sibling generated pages must clear 0.60 pairwise Jaccard on body text or the build fails.** The 9 suburb pages measure 0.263 max, so the rule ships green and bites only genuinely thin sets. The 4 make pages (0.956) and the 2 price bracket pages fail today and must be rebuilt or retired before any sibling is added.
6. **Machine readable surfaces are advertisements.** `/inventory.json`, `llms.txt`, the Atom feed and the GMC feed all carry a `disclosures` object referenced by every record: what the price includes, AS IS with the FTC Buyer's Guide controlling, powertrain on qualifying cars with the four exclusions, approval never guaranteed, and the verbatim Reg Z string. **No monthly payment field in any generated JSON or feed, ever.** No `$` and no `/mo` inside any `sms:` href body. Atom emits added and sold events only, never price change (475.360(d) bans was/now for used vehicles). Add this as Part E of `compliance-guardrails.md`.
7. **Never name a competitor** on any page, feed, or schema node. No Carvana, no CarMax, no iCars Chicago, no franchise store, no "the dealer down Dempster". Comparison content is written in second person about the reader's own transaction and sourced entirely to Illinois law and Maxim's own pricing.
8. **The inspection claim renders at the strength of the weakest car.** No completed record exists, so the sitewide claim is the Section 5 string and nothing stronger. If the probe passes and per VIN measurements ever publish, each page carries above the measurements, both languages and not optional, that they describe the vehicle on that date, that the car is sold AS IS, that wear items change with use, and that the page is not a warranty and does not modify the FTC Buyer's Guide or the purchase contract. The word "report" does not appear.
9. **D10 resolution, final.** The Google SPEC governs GBP cadence: 1 post per week through day 45 (2026-09-07), 2 per week after, native GBP scheduling banned in that window, exactly one armed posting owner. `automations-registry.md:13` currently reads "3x/week cadence (Mon/Wed/Fri)" plus "GBP native scheduling" and is marked ENABLED. **Delete those strings entirely**, do not mark the row disabled: a disabled row with a wrong cadence is still a template a future agent reads before re enabling. Encode the numbers in `cadence-caps.json` and add a weekly check that fails critical on any registered automation whose declared cadence exceeds the cap. The hazard was never the cron, it was the document.
10. **D9 resolution, final.** `brand.md` was not a stale doc, it was an **active production rule** mandating a banned phrase as the closing line of every car description, verified live on 7 of 7 units and 7 times inside the Google ingested feed. `copy-playbook.md` was worse: it taught the false 3 month warranty as the approved substitute for "certified", so an agent that correctly avoided one banned word landed on a false claim by instruction. Resolution: **edit `brand.md`** (it is still needed), **retire `copy-playbook.md`** rather than editing it, because line by line editing of a 770 line doc misses instances and leaves the teaching intact. Both files become permanent linter targets. Neither is ever admissible as evidence for a factual claim; only the live ledger, statute, and Maxim's own records are.
11. **No blog and no dated post format on this site, ever.** A cadence obligation one person cannot meet becomes a stale content liability. Evergreen hubs and spokes only.
12. **Zero net new indexable URLs** until the Discovered not indexed count moves down from 28 and referring domains reach 8. New content lands as a rebuild of an existing URL or it waits.
13. **Off site authority is the binding constraint and it is checked first.** Referring domain count is the run's primary leading indicator. No new page ships in a month where that count fell.
14. **No GBP mutation without Jerry approving that specific change.** This SPEC's fixes generate three separate GBP edits (the false price band in the description, the inspection sentence at Google SPEC line 109, hours parity). Guardrail A1 caps GBP surface touches at 2 per week, one per session, 48 to 72 hours apart. The weekly card carries **at most ONE** GBP item, price band correction first. Nothing else on the card may touch a GBP surface. Never "sync GBP" in one burst.
15. **A check returns PASS, FAIL, or UNAVAILABLE with a machine readable reason.** Every check declares an expected minimum yield; a check returning less is UNAVAILABLE, never PASS. Silence never reads as success. `update-reviews.yml` exiting 0 while blind is the pattern this rule exists to prevent.
16. **Autofix whitelist is closed.** A fix auto applies only if it is a pure function of data already in the repo or feed, changes no claim about price, warranty, financing, condition or identity, is produced by an existing deterministic generator, and is undone by a single `git revert`. Every autofix re runs the check that triggered it and abandons the commit if it does not then pass.
17. **Never mix Sherman Dodge into any Maxim asset.** Maxim is `ma_vehicles` and J series only.

---

## 7. Measurement

**Sales is not the instrument, and any doc implying otherwise is misleading Jerry.** At 5 to 8 sales a month with month to month variance already plus or minus 3, and 665 monthly GBP views, a genuine 30 percent lift in lead rate yields roughly 1 to 2 extra cars. Nothing in this SPEC is detectable in the sales number within 90 days, and arguably not within 12 months. That is the technical skeptic's judgment and this SPEC adopts it without softening.

**What is detectable at this volume:** integer counts and off zero steps. Not ratios of small numbers, not rank positions, not percentages.

| Indicator | Baseline | Instrument | Why it survives low traffic |
|---|---|---|---|
| Referring domains | 5, scheduled to fall to 4 | GSC Links report | integer count, and it is the binding constraint |
| Discovered not indexed URLs | 28 | GSC Pages report | integer count of Google's own verdict |
| Indexed page count | unknown until #170 is executed | GSC | integer count |
| Banned phrase hits on the live site | 62 C8 plus 49 marquee plus 15 price band | the linter, weekly, over 56 URLs plus feeds plus mirror | must reach and stay at 0 |
| URLs serving the false warranty to answer engines | 6 | targeted Bing recrawl after the IndexNow fix, then re query | must reach 0 |
| GA4 `generate_lead` phone events | structurally 0 (six positions cannot fire) | GA4 after P1-7 and P1-8 | any nonzero value is signal |
| `/financing#apply` starts vs `/apply` starts | unmeasured; 1 real credit application in 3 months | GA4 after P1-7 | a ratio of two events on one page, which survives where volume does not |
| Review count and rating | 46 at 5.0 | `reviews_meta.json`, staleness asserted under 14 days | integer count |
| Category query position | absent from "used car dealer Skokie IL" (was about 6 in June) | re query in 1 to 2 weeks to separate index noise from a real regression | binary present or absent |

### Binary 30 / 60 / 90 criteria

**Day 30.** All 18 Phase 1 evidence cells green. Zero banned phrase criticals across 56 live URLs plus `llms.txt` plus `vehicles.xml` plus the mirror. `copy-playbook.md` retired and the MEMORY pointer moved. Price band computed live everywhere including `priceRange` JSON-LD. Mirror noindexed. All 8 orphans carry inbound links. `used-audi-skokie` returns 301. GA4 fires on submission success and at least one real phone event has landed. GSC Domain property opened and task #170 executed. Referring domains at 8 or more. **Not counted:** any traffic, ranking, or sales number.

**Day 60.** Discovered not indexed count strictly below 28. The 6 false warranty URLs no longer return the claim in a Bing or answer engine query. `/financing#apply` starts exceed `/apply` starts. The entity graph shipped and page weight did not increase. The 4 make pages either clear the 0.60 similarity gate or are retired. Both probe gates fired and were answered yes or no, with nothing built past a no. **Not counted:** an impression count, an entity resolution improvement (unmeasurable by design), or a schema rich result (there is none to win).

**Day 90.** Referring domains at 10 or more. Indexed page count strictly up. CVR plates and all credit levels query wins still held on re query. At least one website attributed row in `ma_leads`, which today holds 83 rows all sourced `cargurus`. Zero regressions on the banned phrase scan across 12 consecutive weekly runs. **Explicitly not success:** a sales number, a head term ranking, beating iCars on review count, or any claim about a 50 mile radius.

**Cannot be measured at this volume, and the leading indicator named instead:** conversion rate (use the `/financing#apply` to `/apply` ratio), AI citation share (use binary presence on the named distinctive queries), entity graph quality (use page weight and zero orphan schema nodes), and the value of `/inventory.json` (nothing; it is graded near zero expected result and kept only because its ongoing cost is zero).

---

## 8. What we are NOT doing, and why

| Not doing | Why |
|---|---|
| Chasing Carvana, CarMax, or franchise groups on head terms | 4 referring domains against six figures. Not a content problem |
| Publishing any summed out the door total | Illinois tax is destination sourced; a Chicago buyer is understated by about $200. No single correct number exists |
| Publishing `/out-the-door`, the compare tray, or a hero rebuild | No instrument can resolve them at 665 monthly views, and two of the three carry live compliance defects |
| Publishing per VIN inspection measurements or a `/inspection` checklist | No completed record exists; the paper form contradicts five live claims and carries the C8 phrase in its own footer |
| Adding any new indexable URL before the crawl queue clears | 28 URLs already sit Discovered with Last crawled N/A. Better content on an unfetched URL changes nothing |
| Adding a 5th make page, a 10th suburb page, or any city by make grid | The 4 existing make pages measure 4.4% unique body. That is Google's scaled content abuse pattern, live |
| Adding 5 Spanish pages | 7 of the 28 never crawled URLs are the existing Spanish tree |
| Publishing a `/sold` archive in any form | Advertises prices for 20 cars nobody can buy, into a refused crawl queue, for nothing measurable |
| Naming a competitor anywhere | 475.360(b), 475.340, Lanham Act standing, and a third of the field blocks the fetch that would substantiate it |
| Hard failing the production build on a copy rule | It freezes inventory and the Merchant feed on an account already disapproved three times |
| Rebuilding the Google review scraper | Blocked by Google, exits 0 while blind, and against the one counterparty Maxim cannot afford to annoy |
| Restructuring prose into Q&A headers for GEO | Measured to reduce content absorption 5.74%. The FAQPage schema already covers it |
| Emitting Speakable, HowTo, SearchAction, Carousel, Product on vehicle, or QAPage | All verified dead or wrong type. Product on a vehicle risks the Merchant account |
| Treating llms.txt as a strategy | 97% of llms.txt files received zero requests in May 2026; Google states no support and no plans; six local competitors already ship one. It is a generated file, not a channel |
| Citing the FTC CARS Rule | Vacated 2025-01-27, withdrawn 2026-02-12 |
| Building an on site AI assistant this cycle | Needs a paid API key, and it generates unverified customer facing text at runtime, which is what the whole gate exists to prevent |
| Nagging Jerry to paste corrections into DealerCenter | A zero discipline path already exists in the build |
| The Polish language angle | Settled and killed |
| The after sale review ask SMS flow | Settled and shelved; review growth comes from in person asks and replies |

---

## 9. Red team resolution register

All 38 high and critical attacks. **Resolution codes:** FOLD = fix folded in, KILL = proposal killed, ARGUE = disagreement stated. Every row points at the section that carries it.

| # | Sev | Target | Resolution | Where |
|---|---|---|---|---|
| AD-1 | crit | UX Out The Door tax rate | KILL the summed total, keep the fee line only, plus the destination sourcing disclosure. The CPI indexed doc fee cap is named as a recurring January obligation | 4D, 5 |
| AD-2 | crit | Per car inspection pages costed at 4 min | KILL. Probe gate, one photographed form in 7 days. Coverage guard killed with it because a silent sitewide downgrade is worse than the gap | 4C, 4D |
| AD-3 | crit | Publish the inspection checklist | KILL. Claim fork first; the salvage publishes an unsupportable 100+ point claim and the C8 footer | 4D, 6.8 |
| AD-4 | crit | GSC service account on the critical path | FOLD. Off the critical path, YES but last. First action is opening the property that already exists and closing #167 in a live Chrome sitting, not a seventh awaiting_owner row | 4C, P1-18 |
| AD-5 | crit | Approval card is a task list with a nicer format | FOLD with partial ARGUE. Channel changes to the existing ntfy topic, cap drops to 3, fourth deadman condition on 3 silent weeks. **I disagree with dropping the committed file:** keep it as the audit trail, just stop treating it as the delivery mechanism | 4D |
| AD-6 | high | UX program has no measurement instrument | FOLD. GA4 fires on `fetch()` success before any conversion feature ships. It is P1-7 and it is a hard prerequisite | 3.8, P1-7 |
| AD-7 | high | VideoObject contract, hidden per car cost, key destroyed by the pipeline | FOLD. True cost stated (column migration plus 15 to 20 min per car, 2 to 2.5 h a month). Contract built only after a real file lands | 4C |
| AD-8 | high | DealerCenter screen requires 40 min a month of nagging | FOLD. Extend `sanitizeDescription()` instead. Verified it already works for the warranty rule, so this is the proven zero discipline path | 3.3, 4D |
| AD-9 | high | maxverify claims zero human work, blocks a 6 hourly pipeline, unpriced tokens | FOLD. Advisory only, editorial diff only, never the inventory path, token cost priced before it ships | 4C, 6.3 |
| AD-10 | high | 49 named uncontacted leads, untouched by 90 proposals | FOLD as a surfaced finding. `ma_leads` holds 83 rows, 78 at stage new, 49 older than 7 days with a name and a phone number, against a channel with zero recorded website conversions. **Out of scope for a website SPEC and I am not scope creeping**, but Phase 1 is two days of engineering and whoever allocates the remaining 28 days should point them at those 49 names, not at a schema node | 9 (this row), flagged to the orchestrator |
| CO-1 | crit | `brand.md` is an active rule mandating a banned phrase | FOLD. Full edit list, plus both source docs become linter targets | 3.1, 6.10 |
| CO-2 | crit | `copy-playbook.md` teaches the false warranty as approved copy | FOLD. Retired, not edited. MEMORY pointer moved in the same commit | 3.2, 6.10 |
| CO-3 | crit | `/out-the-door` hardcodes 9.9% APR for subprime buyers | KILL the page. Any surviving payment surface uses the existing `financing.astro:104` APR slider and renders Reg Z above the fold. Linter rule: any route emitting `/mo` must also emit a down payment, a term in months, and the literal token APR | 4D, 6.6 |
| CO-4 | crit | `il-fees.json` taxRate 0.0725 is a property of the buyer, not Skokie | KILL the total. Disclosure names the destination sourcing rule and the transfer plate difference. No address and no geolocation collected | 4D, 5 |
| CO-5 | crit | D8 is a 475.390 and 475.310 violation live in structured data | FOLD. Reclassified from copy drift to a compliance defect. Ledger is priority 1; no range at all until it ships; guardrail doc hardcode deleted; linter asserts equality across prose, `priceRange`, FAQPage answers, `llms.txt` and the feed. GBP description correction queues as its own unbundled approval line | 2A, 3.5, 6.1, 6.14 |
| CO-6 | crit | Make pages are 95.6% identical, a live doorway pattern, and two docs propose a fifth | KILL Volvo and every crossproduct. Retire Audi with a 301. Rebuild the 3 survivors against a 0.60 Jaccard gate before any sibling is discussed. Price bracket pages tested too | 4D, 6.5 |
| CO-7 | high | Doc fee comparison page does not clear 475.360(b) or 475.340 | FOLD. Ships as `/illinois-doc-fee`, second person, no competitor named, sourced to Illinois law and Maxim's own pricing. The "0 of 6 competitors" success metric is deleted as a disguised lowest price claim | 4B, 4D, 6.7 |
| CO-8 | high | `/sold` advertises prices for cars nobody can buy | KILL entirely this cycle, which also resolves the three way design contradiction. `priceValidUntil` on sold VDPs corrected | 4D, 3.16 |
| CO-9 | high | Inspection measurements collide with 16 CFR Part 455 | FOLD. Claim fork, single canonical string, mandatory AS IS disclosure text if measurements ever publish, the word "report" removed. If the fork softens the claim, the Google SPEC line 109 GBP description needs its own approval line rather than a silent edit | 5, 6.8, 6.14 |
| CO-10 | high | `build_ai_knowledge_base.py` is a live customer facing exposure | FOLD to Phase 1, not later. Hours, C8, email, price and review count all corrected; the generated file becomes a scan target; paste back is one time plus a build time diff | 3.15, P1-14 |
| CO-11 | high | Machine readable artifacts are advertisements, not data | FOLD. `disclosures` object referenced per record, no payment field anywhere, no `$` or `/mo` in `sms:` bodies, Atom drops price change events, conditional attribution line, new guardrails Part E | 6.6 |
| CO-12 | high | Compare tray and SMS share carry payments with no Reg Z room | KILL the tray. SMS body rule enforced by the linter and the canonical safe string is in Section 5 | 4D, 5, 6.6 |
| TE-1 | crit | Nothing in 90 proposals touches off site authority, the named constraint | FOLD. Citation work is P1-18 and sequenced before any new page. Referring domains is the primary leading indicator and a falling month blocks new pages | 6.13, 7, P1-18 |
| TE-2 | crit | Designs add about 32 URLs into a queue Google refuses to service | FOLD with ARGUE. Zero net new indexable URLs adopted as a standing rule. **I disagree with the specific "below 10" trigger as arbitrary**; the gate is two part and both parts must hold: Discovered not indexed strictly below 28 and moving down, AND referring domains at 8 or more. A count that merely dipped under an arbitrary threshold is not evidence the crawl budget changed | 4B gate, 6.12 |
| TE-3 | crit | Out The Door total is built on an unverified rate and is wrong for trade ins and transfers | KILL, same resolution as AD-1 and CO-4 | 4D |
| TE-4 | crit | Linter wired to workflows that do not gate production | FOLD. `pull_request` blocking plus advisory in the Vercel build. Verified: `deploy.yml` is "Deploy to GitHub Pages", `sync-inventory.yml` has no `astro build`, production is `vercel.json` `buildCommand`. `deploy.yml` gets renamed | 4D, 6.2, P1-5 |
| TE-5 | crit | `content-guard.mjs` hard fail freezes inventory and the Merchant feed | FOLD. Advisory in production, exempt the 6 hourly path from every hard fail rule | 4D, 6.2 |
| TE-6 | crit | CG-12 is a calendar triggered time bomb in the production build | FOLD. Decay renders nothing and opens a task. Never fails a build | 4D, 6.4 |
| TE-7 | high | IndexNow does not affect Google, so it cannot test the backlink hypothesis | FOLD. Ship the fix, restated as clearing the Bing index which is ChatGPT's retrieval layer. Every claim about Google indexing deleted. Run the script once to resolve the 33 vs 37 vs all-9 contradiction | 3.14 |
| TE-8 | high | GSC is already verified; D3 is not a measurement blocker | FOLD. D3 reclassified in the baseline. `baseline-day0.md:50` is named as wrong and gets corrected. The service account is repriced as automating a report already retrieved and ignored for 22 days | 2A, 2D, 4C |
| TE-9 | high | The schema moat renders nothing in Google Search | FOLD with partial ARGUE. The claim is deleted from every doc and the moat restated as owning the source plus 92 KB against 724 KB. **I disagree only with any implication the schema should be removed:** it stays, because machine readability for answer engines is real. It just may never be sold as a ranking or rich result win | 1 |
| TE-10 | high | 5 Spanish pages into a tree Googlebot has never fetched | KILL. Tier A parity and the Tier C no hreflang rule kept | 4B, 4D |
| TE-11 | high | maxverify with no override is a scheduled outage | FOLD. Override with a reason recorded via `db_notes.py`, and the agent never touches style rules | 4C, 6.3 |
| TE-12 | high | Per car inspection pages will not exist, given the completion record | KILL past the probe gate. Same resolution as AD-2 | 4C, 4D |
| TE-13 | high | Compare tray is the largest build for the smallest problem | KILL. The identical effort goes to the lightbox `dcResize()` fix, six tappable numbers, and the CTA retarget | 4B, 4D |
| TE-14 | high | Nothing here is detectable in sales in 90 days or 12 months | FOLD. Section 7 states it outright and replaces sales with integer count leading indicators and off zero steps | 7 |
| TE-15 | high | `/out-the-door` also hits an Astro constraint the builder would find at implementation | KILL the page. The constraint is recorded so nobody re proposes client instantiated `VehicleCard.astro` | 4D |
| TE-16 | high | Publishing a stronger inspection claim with no record increases exposure | FOLD. Claim fork first, publish at the strength of the weakest car, never "100+ points" or measurement thresholds, never the form's C8 footer | 5, 6.8 |

---

**Execution order for a stranger.** Fix the source documents first (P1-1 through P1-3), because every generated artifact inherits from them. Then the ledger (P1-4), because it closes an Illinois advertising violation and removes a whole defect class. Then the one merged linter (P1-5) so nothing regresses. Then the conversion instrument (P1-7) so anything later is falsifiable. Then the remaining Phase 1 mechanical items in any order. Then the one Chrome sitting with Jerry (P1-18) for GSC and citations, which is the only work touching the binding constraint. Verify all 18 evidence cells. Only then open Phase 2, and only if referring domains reached 8 and the Discovered not indexed count moved down. Fire the two probe gates and build nothing past a no. Never add an indexable URL in a month where referring domains fell. Never let a copy rule stop an inventory update.
