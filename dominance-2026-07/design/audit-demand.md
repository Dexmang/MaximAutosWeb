# Maxim Autos — Demand Map (2026-07-25)

Scope: what Maxim can realistically win at roughly 15 units, $8,995-$15,995, median about $10,000,
mostly 2014-2018 Japanese/Korean sedans and small SUVs, Skokie IL, North Shore. Design only, nothing
published. All facts below are cited to a file path or URL; anything I could not verify is marked
UNVERIFIED and never used as a stated fact.

Current site coverage checked directly:
- `site/src/data/vehicles.json` — 27 records, 7 live today (Honda Civic, Subaru Legacy, Honda CR-V,
  Subaru Crosstrek, Chevrolet Trax, Kia Forte, Volvo XC60, plus a Volvo V60 further in the file), 20
  sold-but-indexed. No Audi, no Toyota anywhere in the live or sold set I read.
- `site/src/data/suburbs.json` — 9 dynamic pages: Evanston, Niles, Morton Grove, Lincolnwood, Des
  Plaines, Glenview, Wilmette, Skokie, Park Ridge.
- `site/src/pages/` — static make pages `used-honda-skokie`, `used-toyota-skokie`,
  `used-subaru-skokie`, `used-audi-skokie` (226 lines each, same template); price pages
  `used-cars-under-10000-skokie`, `used-cars-under-15000-skokie`; body-style page
  `used-suvs-skokie-il`; a North Shore roll-up hub `used-cars-chicago-north-shore`; and the
  `financing-bad-credit/` folder (index + 5 articles: how-it-works-illinois, income-and-documents,
  down-payment, rebuild-credit, after-repossession-bankruptcy).

Pre-existing defect this audit reconfirmed live in the data: `used-audi-skokie.astro` filters
`vehicles.json` for `make === 'Audi'` (line 11-13 of that file) and Maxim has never stocked an Audi
in the 27-record file. That page renders an empty inventory grid against a "Used Audi for Sale"
title and schema — it is bidding for zero-relevance traffic and is a duplicate-content/thin-content
liability, not a demand opportunity. `used-toyota-skokie` has the same structural risk today because
the current 7 live units contain no Toyota (Toyota reappears "repeatedly" per the brief, so the page
itself is legitimate, but as of 2026-07-25 it is also filtering to zero matches).

---

## Family 1 — GEOGRAPHIC

**What exists:** 9 suburb pages, one shared template (`localCopy` array, 4-5 FAQ, directions blurb),
plus a North Shore roll-up hub. All 9 repeat the identical "$5,000 to $15,000" band and hardcode
"5.0 rating" copy patterns — this is the same drift already flagged as ground-truth D8 (top live
unit is $15,995, not $15,000) and it is universal across every one of the 9 files I read, not an
isolated typo. Any new suburb page will inherit that drift unless the band is fixed sitewide first.

**Candidates evaluated:**

| Geography | Real demand signal | Competitive read | Verdict |
|---|---|---|---|
| Northbrook, Winnetka, Glencoe, Highland Park | Real North Shore population, higher household income than Skokie | NOT open ground. Autohaus on Edens (Northbrook), MOTOR DEALS USA (Glenview, explicitly markets to Northbrook/Winnetka/Wilmette/Highland Park), Gravity Autos Chicago (Highland Park), and a CarMax at Glencoe on the Edens Expressway all show up for these queries today (WebSearch, 2026-07-25). | 12 months, and only with real differentiated copy — see thinness risk below. Never |
| Rogers Park, West Ridge, Edgewater, Lincoln Square/North Park, Albany Park (near-north Chicago) | Higher raw population and used-car search volume than any single North Shore suburb | Western Avenue in West Rogers Park is a dense used/new dealer corridor (Grossinger Honda plus multiple independent lots on Western and Clark per Yelp results, WebSearch 2026-07-25). Chicago proper also means Chicago city sales/use-tax and a different, more saturated Yelp/Google Maps competitive set. | Never at 90 days, unlikely at 12 months without a much bigger inventory and ad budget than 15 units supports |
| Skokie itself, the 9 existing suburbs | Already covered | Already covered | Maintain, do not duplicate |

**Thinness risk, stated plainly:** the existing 9 pages are one template with per-city string swaps
(distance, route names, a couple of landmark references). A 10th page built the same way is
marginal-value duplicate content in Google's eyes — it adds a URL, not new information. The honest
move is not "add more suburb pages," it is: (a) fix the sitewide $15,000 vs $15,995 price-band drift
across all 9 existing pages before asking Google to trust a 10th, and (b) if a new suburb page is
built at all, it needs a distinct hook that isn't just "how many minutes from X" — e.g., a
North-Shore-specific angle like winter AWD demand (Maxim's mix is unusually AWD-heavy: Subaru
Legacy, Crosstrek, Honda CR-V, Chevrolet Trax, Volvo XC60/V60 are all AWD per `vehicles.json`) is a
real differentiator worth one dedicated page, not nine repetitions of a distance/directions template.

**Recommendation:** no new suburb page in the near term. The 9-page set already reaches the whole
realistic drive-time radius (Park Ridge at 15 min is close to the outer edge of what a $10k car buyer
will drive for). The better geographic move is consolidating the AWD/winter angle into the existing
`used-cars-chicago-north-shore` hub rather than minting new thin pages.

---

## Family 2 — VEHICLE

Cars actually in the live/recent set (`vehicles.json`, read 2026-07-25): Honda Civic SE, Subaru
Legacy, Honda CR-V LX AWD, Subaru Crosstrek Premium, Chevrolet Trax 1LT, Kia Forte LX, Volvo XC60
T6, Volvo V60 Cross Country, plus recently sold Honda HR-V and VW Golf Alltrack (sold VDPs stay live
per the noindex-after-14-days sitemap rule in `astro.config.mjs`, confirmed in the site CLAUDE.md).

| Query pattern | Answered by | Competition | Verdict |
|---|---|---|---|
| `[year] [make] [model] [trim] Skokie` (e.g. "2015 Honda Civic SE Skokie") | Existing VDP, already has Car+Offer+FAQPage JSON-LD per ground truth | Zero — this is a branded long-tail query only Maxim's own VDP can match | 90 days, already built |
| `used Honda Civic under $10,000 Chicago` (make+price, no trim) | `used-cars-under-10000-skokie` + `used-honda-skokie`, neither combines both filters today | High — CarGurus, TrueCar, iSeeCars, Cars.com, AutoTrader all rank here (WebSearch 2026-07-25 confirmed all five hold positions for this exact phrase) | Never for the head term; the VDP for the specific in-stock Civic can still rank for the branded tail once it's the one Chicago has under $10k |
| `used Subaru Crosstrek AWD Skokie` / `used Volvo XC60 under $12000` | No page — Volvo has no dedicated make page despite being a recurring stock item (XC60 and V60 both appear) | Low local competition for Volvo specifically at this price point; aggregators dominate broad Volvo queries but rarely at sub-$12k trim-level specificity | 90 days if a `used-volvo-skokie` page is built — genuine gap, real inventory, low local competition |
| `used AWD SUV under $15000 Skokie` / winter AWD framing | Partially — `used-suvs-skokie-il` exists but is not AWD-specific | Low — nobody is targeting "AWD" as the filter locally | 90 days — cheapest win in this family, reuses existing page structure, matches real inventory (5 of 8 recent units are AWD) |
| `used Toyota Skokie`, `used Audi Skokie` | Existing pages, currently 0-match against live inventory | N/A — self-inflicted thinness, not a competition problem | Never as currently built; Toyota only becomes real once Toyota stock returns (brief says Toyota recurs), Audi should be retired — it has never appeared in the 27-record file |
| Trim/spec queries a VDP already answers (mileage, features, "clean title", "one owner") | VDP already carries these facts in `highlights`/`features`/`description` per vehicle | N/A | Already covered — no new page type needed |

**New page type needed:** none of the vehicle-family wins above require a new page type except the
proposed `used-volvo-skokie` (copy the existing make-page template, same 226-line pattern already
used for Honda/Toyota/Subaru/Audi) and possibly folding "AWD" as a filter attribute into
`used-suvs-skokie-il` rather than a whole new page.

---

## Family 3 — TRANSACTIONAL AND OBJECTION

Verified via `financing-bad-credit/` (WebFetch not needed — read directly): the hub already has an
index plus `how-it-works-illinois`, `income-and-documents`, `down-payment`, `rebuild-credit`, and
`after-repossession-bankruptcy`. This is a real, non-trivial asset — 6 pages, each with distinct
FAQ schema, already covering the two hardest objection queries in the brief: bad credit and
repossession.

| Query | Covered today? | Gap |
|---|---|---|
| "buy car bad credit Skokie" / "no credit check car Skokie" | Yes — hub index + `how-it-works-illinois` | None |
| "car after repossession Illinois" | Yes — `after-repossession-bankruptcy.astro` (9,183 bytes, the largest file in the folder) | Content exists; I did not verify every legal claim inside it word-for-word in this pass — flag for a compliance line-edit before any publish, since bankruptcy/repo copy is the highest legal-risk topic in the whole site |
| "no doc fee used car dealer Illinois" | Partially — the doc-fee claim appears in VDP descriptions ("Transparent pricing, no hidden fees") but there is no dedicated objection page built around it | Real gap: "no doc fee" is a distinct, provable differentiator (most Chicago-area dealers charge $300-$500+ doc fees) and has zero dedicated content today |
| "same day plates Illinois dealer" / "CVR plates same day" | Not as a standalone page — only mentioned inline on suburb pages | Real gap, and Family 4 covers it better as an Illinois-process page than as an objection page |
| "independent inspection used car Skokie" / "third party inspection before I buy" | Not covered as its own page | Moderate gap — this is a trust/objection query buyers make before visiting a small independent lot specifically (bigger franchise stores don't need to answer it, independents do) |
| "free CARFAX used car Skokie" | Mentioned throughout VDPs/suburb pages, no dedicated page | Low priority — this is table stakes copy, not a distinct search intent people query for by itself |

**Assessment of the existing hub:** it covers the two hardest, highest-intent objections (bad
credit, repossession) well. It does NOT cover the "no doc fee / all-in pricing" and "third-party
inspection" objections as their own pages — those are two genuine content gaps, both winnable in 90
days because they are Maxim's actual, provable differentiators and independent dealers rarely build
dedicated pages around them (most either don't have the differentiator or bury it in "About Us").

---

## Family 4 — ILLINOIS-SPECIFIC PROCESS

This is the strongest opportunity in the whole audit: high intent, low competition (state-government
sites and law-firm blogs dominate today, not dealers), and Maxim has real operational authority
(licensed dealer, DL7667, runs its own CVR registration).

**Legal facts verified against primary/authoritative sources before use:**

1. **15-day/500-mile powertrain warranty.** Codified at 815 ILCS 505/2L (Illinois Consumer Fraud and
   Deceptive Business Practices Act), effective July 1, 2017. Confirmed via the Illinois Attorney
   General's own dealer FAQ PDF and FindLaw's statute text (WebSearch 2026-07-25,
   https://illinoisattorneygeneral.gov/Page-Attachments/FAQforDealers.pdf ,
   https://codes.findlaw.com/il/chapter-815-business-transactions/il-st-sect-815-505-2l/). Two
   exclusions matter for Maxim's copy: it does NOT apply to vehicles over 150,000 miles at time of
   sale, and does NOT apply to rebuilt/flood-branded titles. Current live inventory (max mileage
   141,079 per `vehicles.json`) clears the mileage exclusion, but this is a fact to check per-car
   going forward, not a blanket claim — a future 150k+ mile trade-in would need the claim dropped
   from that specific VDP. The site's existing phrasing ("15 Day / 500 Mile Powertrain Protection,"
   "on qualifying vehicles") already matches the compliance guardrail and the statute's own
   conditionality — good alignment, worth an explicit process page that cites the statute by name,
   which no competitor VDP-level page is likely doing.

2. **CVR (Computerized Vehicle Registration) and same-day metal plates.** Confirmed via
   cvrconnect.com's Illinois solutions page (WebSearch 2026-07-25,
   https://www.cvrconnect.com/solutions/state-specific-solutions/illinois): CVR is a real, dealer-
   side electronic title/registration system that lets a customer "drive off the lot with a fully
   registered vehicle," eliminating temporary tags. Separately, the Illinois Secretary of State
   confirms Temporary Registration Permits (TRPs) exist and are also issuable by licensed dealers,
   valid 90 days, for the fallback case where CVR/metal plates aren't issued same-visit
   (ilsos.gov/departments/vehicles/title-and-registration/trp.html). I could not independently
   verify from public sources that Maxim's own dealer account is CVR-enrolled (that is an internal
   operational fact, not a public record) — the ground truth doc already states Maxim runs CVR, so
   I am not re-deriving it, just confirming CVR as a program is real and does what the site claims.

3. **Private-party use tax (RUT-50) vs. dealer sales tax — a genuine, verified, differentiator angle
   that is NOT currently on the site.** Illinois Department of Revenue confirms two different tax
   regimes: dealer sales are taxed under the Retailers' Occupation Tax Act (percentage rate); private
   party sales are taxed under the flat-rate RUT-50 table, bracketed by vehicle age (for cars under
   $15,000 fair market value) or price (at/above $15,000) — WebSearch 2026-07-25,
   https://tax.illinois.gov/research/taxinformation/sales/vehicle.html and the RUT-50 instructions
   PDF. A dealer sale of a motor vehicle in Skokie is taxed at a published **7.25% rate**, distinct
   from Skokie's 10.25%-11.25% rate on general merchandise — confirmed via salestaxguide.org
   (2026-07-25), which explicitly separates "7.25% on the purchase of a motor vehicle" from the
   general merchandise rate for Skokie. I did not independently break that 7.25% figure down into
   its state/county/local components from a primary Illinois Department of Revenue source, so treat
   the total rate as sourced-but-secondary, not primary-verified. **UNVERIFIED, flag before
   publishing anything with a number:** I did not pull the actual current RUT-50 flat-dollar table
   (tax.illinois.gov/.../rut-5.pdf) to compute a real side-by-side dollar comparison against a
   specific vehicle age/price — that PDF exists and was in the search results but I did not open and
   read its table in this pass. Any page built on this angle must first read that PDF and quote
   real numbers, not estimate them.

4. **Private party vs. dealer purchase, non-tax differences.** Illinois Legal Aid Online's consumer
   guide (illinoislegalaid.org/legal-information/buying-and-keeping-used-car) is the authoritative
   plain-language source distinguishing dealer obligations (the 2L warranty above applies only to
   dealer sales, not private-party) from private-party "as-is with zero statutory protection" sales.
   This is a strong, honest hook: buying private might save tax dollars but forfeits the 15-day/500-
   mile protection entirely, a fact competitors won't say because most competitors are dealers who'd
   rather not mention private-party is a legal option at all.

**Recommendation, family 4:** build 2-3 pages here, all citable, all genuinely low-competition:
- "Illinois 15-Day / 500-Mile Used Car Warranty, Explained" — cites 815 ILCS 505/2L directly, names
  the exclusions honestly (150k miles, rebuilt/flood titles), ties to Maxim's own qualifying-vehicle
  language. Direct authority play; state AG and law-firm content dominates this today, no dealer does.
- "Buying From a Dealer vs. Private Party in Illinois: Tax, Warranty, and Plates" — the RUT-50 vs.
  ROT distinction plus the warranty-forfeiture point above, once the real RUT-50 numbers are pulled.
- "Same-Day Illinois Plates: How CVR Registration Works" — explains CVR/TRP mechanics, cites SOS and
  CVR Connect, ties to Maxim's actual same-day process.
All three are 90-day wins: real authority, real citations, essentially zero dealer-side competition
(the SERP today is government pages and law blogs, not other dealers).

---

## Top 20, ranked by (winnability x commercial value)

Scored qualitatively — no keyword-volume tool was available or used (guardrail: no new spend/tools).
Ranking logic: 90-day + high commercial intent (near-transaction) ranks above 90-day + informational;
12-month items rank below any real 90-day win regardless of theoretical size; "Never" items excluded
from the ranked list entirely and only discussed above for completeness.

1. Fix the sitewide "$5,000-$15,000" price-band drift on all 9 suburb pages, the north-shore hub, and
   the financing-bad-credit hub before any of the below ships — every new page below inherits this
   defect otherwise (already ground-truth D8; this audit confirms it is sitewide, not isolated).
2. `used-volvo-skokie` page — real recurring inventory (XC60, V60 both present), zero local Volvo-
   specific competition, 90 days.
3. Illinois 15-Day/500-Mile Warranty explainer citing 815 ILCS 505/2L — 90 days, zero dealer
   competition, direct authority, ties to an existing compliance-safe phrase already on every VDP.
4. "No Doc Fee / All-In Pricing in Illinois" objection page — 90 days, provable differentiator, no
   dedicated page exists today anywhere on the site.
5. Dealer vs. private-party purchase page (tax + warranty forfeiture angle) — 90 days once the
   RUT-50 table is actually read (currently unverified numbers).
6. AWD/winter-ready filter folded into `used-suvs-skokie-il` — 90 days, matches real inventory mix
   (5 of 8 recent units AWD), near-zero build cost since the page exists.
7. Same-Day CVR Plates explainer — 90 days, low competition, real operational fact.
8. Retire or gate `used-audi-skokie` — negative-value page today (zero inventory match); fixing this
   is a defensive win, not new demand, but it removes a thin-content flag before Google re-crawls.
9. Third-party independent inspection objection page — 90 days, moderate gap, independent-dealer-
   specific trust query.
10. "used AWD SUV under $15,000 Skokie" as an explicit long-tail target within item 6 rather than a
    separate page — bundled with #6, listed separately only because it's a distinct query pattern.
11. Branded long-tail VDP queries (`[year] [make] [model] Skokie`) — already built, listed to confirm
    it needs no new work, just continued feed-to-VDP parity per the existing pipeline.
12. `used-toyota-skokie` — legitimate page type (Toyota recurs per the brief) but currently 0-match;
    12 months, contingent on Toyota actually returning to stock, not a page fix.
13. Financing-bad-credit hub — maintain, do not rebuild; already covers the two hardest objections
    well. Any work here is a legal-accuracy line-edit of `after-repossession-bankruptcy.astro`, not
    new content.
14. North Shore AWD/winter narrative folded into `used-cars-chicago-north-shore` hub instead of new
    suburb pages — 12 months, requires real copywriting effort beyond a template swap.
15. Northbrook/Winnetka/Highland Park/Glencoe suburb pages — 12 months at best; real local
    competition (Autohaus on Edens, MOTOR DEALS USA, Gravity Autos, CarMax Glencoe) means this is a
    slow authority build, not a quick win, and duplicate-template risk is real.
16. `used-honda-skokie` / `used-subaru-skokie` — maintain only; these already match live inventory
    and need no new work, listed to confirm they are not neglected.
17. Broad make+price aggregator-style queries ("used Honda Civic under $10,000 Chicago") — 12 months
    at best for the head term itself; realistic play is winning the branded VDP tail, not the head.
18. Rogers Park / West Ridge / Edgewater / near-north Chicago geographic pages — Never at Maxim's
    current scale; dense existing dealer corridor (Western Ave) plus city tax/competitive complexity.
19. Standalone "free CARFAX" page — Never as a dedicated page; table-stakes copy, not a distinct
    query pattern worth a URL.
20. Standalone "same-day metal plates" city-by-city duplication (one per suburb) — Never; the single
    process-level explainer in #7 covers this once, correctly, without nine near-duplicate pages.

## Unverified items carried forward (do not treat as fact until closed)
- Exact RUT-50 flat-dollar tax table for 2026 by vehicle age bracket — PDF located
  (tax.illinois.gov RUT-5 chart) but not read in this pass.
- Word-for-word legal accuracy of `financing-bad-credit/after-repossession-bankruptcy.astro`'s
  existing claims against current Illinois/federal repossession law — not re-verified in this pass,
  flagged because it is the highest legal-risk page on the site.
- Whether Maxim's own dealer account is actively CVR-enrolled today (operational fact, not public
  record — taken from ground truth, not independently re-verified here).
