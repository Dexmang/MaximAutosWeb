# Design: AI Visibility Architecture for maximautos.com

**Author:** AI Visibility Architect
**Date:** 2026-07-25
**Status:** Design only. Nothing built, nothing published, no file under `site/` or `web_assets/` touched.
**Scope:** structured data architecture, the entity graph, llms.txt v2, crawler policy, the inventory surface machines read.

---

## 0. The thesis in one paragraph

Maxim Autos already emits more structured data than any dealer inside 50 miles, and it is emitting
that data wrong. There are **19 separate `AutoDealer` nodes, 1 `Organization` node, 3 `Person` nodes,
16 `PostalAddress` copies, 13 `AggregateRating` copies, and exactly zero `@id` references** across the
entire site (verified by grep, Section 2). Every consumer that tries to build a graph from those pages
sees a scattering of unconnected businesses that happen to share a name. The fix is not more schema.
The fix is **one graph, one identifier per real thing, generated from one source**. That change costs
almost nothing, makes every page smaller, kills the drift class that produced defects D6, D8 and D9,
and is the only work in this lane that a vendor platform competitor structurally cannot copy.

Second thesis, which is harder to hear: **most of the rich result types this project has been chasing
no longer exist.** Vehicle Listing died 2025-06-12. FAQ rich results died 2026-05-07. HowTo died in
2023. Sitelinks searchbox died 2024-11-21. Self serving reviews on a `LocalBusiness` were never
eligible for stars. What remains for a used car dealer in 2026 is: Local business, Organization,
Breadcrumb, Review snippet (not for yourself), and **Video**. Everything else in this document is
justified by AI ingestion and entity clarity, not by a picture in a search result. I say which is which
on every single item.

---

## 1. Verified reality check: what a rich result actually is in July 2026

This is the table this project has been missing. Every row was checked this session against Google's
own documentation or its Search Central announcement, not against an agency blog.

| Type | Rich result in Google today | Verified how | Verdict for Maxim |
|---|---|---|---|
| `Vehicle`/`Car` (Vehicle Listing) | **NO.** Retired 2025-06-12; docs removed 2025-09-09 | [developers.google.com vehicle-listing](https://developers.google.com/search/docs/appearance/structured-data/vehicle-listing) deprecation banner | Keep. Zero rich result, real AI value. Never promise a rich result again. |
| `FAQPage` | **NO.** Stopped firing 2026-05-07; report drops June 2026, API support August 2026 | [Google: Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes) plus 2026 removal coverage | Keep existing markup (harmless, still parsed). Add on the homepage for AI reasons only, not for stars. |
| `HowTo` | **NO.** Absent from the current Search Gallery entirely | [Search Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) fetched this session, 25 types listed, HowTo not among them | **Do not build.** Use `Article` with author attribution instead. |
| `WebSite` + `SearchAction` | **NO.** Sitelinks searchbox removed 2024-11-21 | [Farewell, Sitelinks Search Box](https://developers.google.com/search/blog/2024/10/sitelinks-search-box) | Add `WebSite` (still used for site name). **Never add `SearchAction`.** |
| `AggregateRating` on your own business | **NO.** Self serving reviews are ineligible | [Review snippet docs](https://developers.google.com/search/docs/appearance/structured-data/review-snippet): "If the entity that's being reviewed controls the reviews about itself, their pages that use LocalBusiness or any other type of Organization structured data are ineligible for star review feature" | Keep exactly one copy in the graph. Delete the other 12. |
| `Speakable` | Technically listed, but beta, United States only, English only, Google Home devices, news publishers | [Speakable docs](https://developers.google.com/search/docs/appearance/structured-data/speakable) fetched this session: "This feature is in beta and subject to change" | **Kill.** A used car lot is not a news publisher. Pure noise. |
| `Carousel` (ItemList) | Yes, but only for Course list, Movie, Recipe, Restaurant | [Carousel docs](https://developers.google.com/search/docs/appearance/structured-data/carousel) fetched this session | **Kill.** Cars are not a supported carousel type. |
| `VideoObject` | **YES.** Video is live in the Search Gallery | Search Gallery fetch, this session | **The single highest value rich result still available to this business.** |
| `BreadcrumbList` | **YES** | Search Gallery | Already shipped. Move into the graph. |
| `LocalBusiness` / `Organization` | **YES** | Search Gallery | Already shipped, badly. Fix the structure. |
| `Product` on a vehicle | Yes for products, but Google bans vehicles from Shopping and Free listings | Already handled in `build-gmc-feed.js` lines 190 to 199 with `excluded_destination` | **Kill.** Marking a car as `Product` would contradict the feed and risk the Merchant account. |
| `QAPage` | Yes, for pages where users submit answers | Search Gallery | **Kill.** Wrong type. Misuse reads as manipulation. |
| `Image metadata` (licensable) | Yes, requires `license` and `acquireLicensePage` | Search Gallery | **Kill the licensable variant.** Maxim does not license photos. Use plain `ImageObject` inside `Vehicle.image` for AI value only. |

**What this means practically.** Since 2025-06-12 there has been no way for a dealer to get a picture of
a car into an organic Google result from on page markup. The Merchant Center feed at
`web_assets/feeds/vehicles.xml` is the only remaining paid path, and it is already built and already
correctly scoped. On page vehicle schema is now **an AI ingestion asset and nothing else**, and it
should be designed for that consumer, which changes what belongs in it.

**Honest caveat on the AI side.** I could not find a rigorous public study proving that JSON LD alone
lifts AI citations. The Princeton GEO paper measured content tactics, not markup. What I can say
mechanically and without hand waving: an answer engine that has already fetched the HTML gets the
entire dealership fact set from one compact block that has no layout noise, no ambiguity, and explicit
relationships. That is a real advantage over parsing prose, and it costs nothing. I am not going to
dress it up as a measured percentage, because I cannot verify one.

---

## 2. The core defect: there is no graph, there are 40 orphans

Measured this session with grep across `site/src/pages`, `site/src/layouts`, `site/src/components`:

```
"@id" occurrences ..................... 0
AutoDealer nodes ..................... 19   (across 16 files, index.astro x2, inventory.astro x3)
Organization nodes .................... 1   (Layout.astro, site wide)
Person nodes .......................... 3   (about.astro is the only real one)
PostalAddress copies ................. 16
AggregateRating copies ............... 13
GeoCoordinates copies ................ 12
City nodes ........................... 11
OpeningHoursSpecification copies ...... 6
"9101 Terminal Ave" in source ........ 25 files
```

Three consequences, each independently costly:

**A. Two different businesses on the same page.** Every page emits an `Organization` node from
`Layout.astro` line 123 with `sameAs` pointing at Facebook, CarGurus and Cars.com. The homepage then
emits an `AutoDealer` node from `index.astro` line 47 with a completely different `sameAs` pointing at
Google Maps and MapQuest. Neither carries the other's identifiers. Neither references the other. To a
consumer building a graph these are two entities with the same name and non overlapping profile links.
Both are Maxim. The correct answer is one node with all five links.

**B. Drift has thirteen places to happen.** Defect D8 (review count stale on suburb pages, price band
stale everywhere) is not a copy mistake. It is the arithmetic consequence of storing the same fact in
thirteen places by hand. `priceRange` is a hardcoded string `"$5,000 to $15,000"` in `index.astro:77`
and `"$5,000 a $15,000"` in `es/index.astro:57` while the live band is $8,995 to $15,995 (verified
against `vehicles.json` this session: 7 live units, min 8995, max 15995).

**C. Payload waste on every page.** The VDP repeats the full `AutoDealer` plus `PostalAddress` inside
`Offer.seller` on all 27 pages. `inventory.astro` does it three times in one page. Under `@id`
references the address is stated once and every other mention is a pointer. Pages get smaller. Given
that a 92 KB homepage against a 724 KB competitor is one of this business's few real moats, making the
markup smaller rather than larger is not a rounding detail.

**D. There is a fifth copy nobody audited.** `businesses/maxim-autos/operations/build_ai_knowledge_base.py`
hardcodes a `DEALER_FACTS` block and writes `ai-knowledge-base.md`, which gets pasted into the
GoHighLevel conversation AI that talks to customers. Read this session, that file currently says:

- `1. **Total Protection.**` (the exact phrase banned by guardrail C8, same defect as D9)
- `Monday through Saturday: 9:00 AM to 7:00 PM Central` (wrong; real hours are Mon/Tue/Thu/Fri 3 to 7, Sat 10 to 3)
- `jerryf@maximautos.com` (the site's own schema says `jfranco@maximautos.com`)
- `5 star rating on Google with 34+ reviews` (live is 46)

That is a live compliance exposure in a customer facing channel, driven by the same root cause as D8,
in a file outside the website repo that no audit in this run covered. It belongs in the fix.

---

## 3. Proposal 1: the entity graph (`@id` URIs, one `@graph` per page)

**The highest value item in this document.** Everything else depends on it.

### 3.1 Node inventory and stable identifiers

Fragment identifiers on canonical URLs. Stable forever, dereferenceable, and the standard convention.

| `@id` | `@type` | Emitted from | Notes |
|---|---|---|---|
| `https://www.maximautos.com/#dealer` | `AutoDealer` | `Layout.astro`, every page | The one business node. Replaces the 19 AutoDealer plus 1 Organization. `AutoDealer` is a subtype of `Organization`, so one node satisfies both. |
| `https://www.maximautos.com/#website` | `WebSite` | `Layout.astro`, every page | `publisher` and `about` point at `#dealer`. No `SearchAction`. |
| `https://www.maximautos.com/#jerry` | `Person` | `Layout.astro` stub site wide, full node on `/about` | Same identifier wherever it appears. `mainEntityOfPage` is `/about`. |
| `https://www.maximautos.com/#cvr-registration` | `Service` | `/about`, referenced site wide | Illinois CVR metal plate issuance. |
| `https://www.maximautos.com/#inspection` | `Service` | `/about`, referenced site wide | Independent mechanical inspection. |
| `https://www.maximautos.com/#city-skokie` ... `#city-park-ridge` | `City` x9 | full node on each suburb page, referenced from `#dealer.areaServed` | Generated from `suburbs.json`. |
| `https://www.maximautos.com/inventory#catalog` | `OfferCatalog` | `/inventory`, referenced from `#dealer.hasOfferCatalog` on every page | Generated from `vehicles.json`. |
| `https://www.maximautos.com/vehicle/{slug}#vehicle` | `["Car","Vehicle"]` | VDP | |
| `https://www.maximautos.com/vehicle/{slug}#offer` | `Offer` | VDP and the catalog | One offer node, two references. |
| `https://www.maximautos.com/vehicle/{slug}#video` | `VideoObject` | VDP, **only when a video file exists** | Emits nothing today. See 6.7. |
| `https://www.maximautos.com/{path}#breadcrumb` | `BreadcrumbList` | per page | |
| `https://www.maximautos.com/{path}#faq` | `FAQPage` | per page | |

### 3.2 Relations that turn the orphans into a graph

```
#website        publisher, about        -> #dealer
#dealer         founder, employee       -> #jerry
#dealer         hasOfferCatalog         -> /inventory#catalog
#dealer         makesOffer              -> [ /vehicle/*#offer ]
#dealer         areaServed              -> [ #city-* ]
#dealer         availableService        -> [ #cvr-registration, #inspection ]
#dealer         aggregateRating, review -> inline, ONE copy, Google sourced only
#dealer         identifier              -> PropertyValue "Illinois Dealer License" = "DL7667"
#jerry          worksFor                -> #dealer
#cvr-*          provider                -> #dealer ; areaServed -> [ #city-* ]
/vehicle/#offer offeredBy, seller       -> #dealer          (reference, not a duplicated address)
/vehicle/#vehicle offers                -> /vehicle/#offer
/vehicle/#vehicle subjectOf             -> /vehicle/#video  (when present)
#city-skokie    containedInPlace        -> { "@type": "State", "name": "Illinois" }
```

Note on `containedInPlace`: I use `State: Illinois` rather than a county, because Illinois is
unambiguous and I will not put a fact in the graph that I have not verified. All nine cities are north
and northwest Cook County suburbs; if someone verifies that against a primary source, upgrading to
`AdministrativeArea: Cook County` is a one line change.

### 3.3 Emission mechanism

One `<script type="application/ld+json">` per page containing
`{"@context":"https://schema.org","@graph":[ ...core, ...page ]}`.
Today the homepage emits five separate script blocks with no cross references (confirmed by the
technical audit's own parse). One block with `@graph` is smaller, unambiguous, and is what every graph
consuming parser expects.

**Where the code goes:**

| File | New or changed | Generated or hand |
|---|---|---|
| `site/src/data/dealer.json` | **NEW**, about 45 lines | **Hand, and it is the only hand maintained fact file allowed to exist.** NAP, geo, hours, sameAs, email, license, languages. Nothing else may restate these. |
| `site/src/lib/schema.js` | **NEW** | Generated logic. Exports `dealerNode()`, `websiteNode()`, `jerryNode()`, `cityNodes()`, `serviceNodes()`, `offerCatalogNode()`, `vehicleNodes(v)`, `breadcrumb()`, `faqNode()`. Reads `dealer.json`, `vehicles.json`, `reviews_meta.json`, `suburbs.json`. |
| `site/src/layouts/Layout.astro` | Changed | Accepts a `graph` prop (array). Always emits core nodes plus the page's nodes as one `@graph`. Delete the standalone `Organization` block at line 123. |
| `site/src/pages/*.astro` (16 files) | Changed | Delete every inline `AutoDealer`, `PostalAddress`, `GeoCoordinates`, `AggregateRating`, `OpeningHoursSpecification` literal. Pass page specific nodes through `graph`. |
| `site/src/pages/vehicle/[slug].astro` | Changed | `Offer.seller` becomes `{"@id":"https://www.maximautos.com/#dealer"}`. |

**Drift risk after this change: zero.** Every number in the graph is read from a generated file
(`vehicles.json`, `reviews_meta.json`) or from the single hand file (`dealer.json`). `priceRange`
becomes `` `$${min.toLocaleString()} to $${max.toLocaleString()}` `` computed from live inventory, so
D8 cannot recur in the schema layer.

### 3.4 Fixes that fall out of the graph for free

- `areaServed` currently lists **8 cities** while `suburbs.json` has **9**. Park Ridge has a live
  landing page and is missing from the service area declaration. Generating the list fixes it forever.
- `sameAs` merges the two split lists into one node with all five profiles. This is literally the
  "AutoDealer.sameAs expansion" item the governing SPEC already approved in section 5A.
- Sold VDPs currently compute `priceValidUntil` as build date plus 60 days unconditionally
  (`[slug].astro:186`) while setting `availability: SoldOut` (line 216). A sold car advertising a
  price valid two months into the future is a small but real inconsistency. Generated fix: when
  `status === 'sold'`, `priceValidUntil` becomes `sold_date`.
- Hours gain an explicit Sunday closed entry (`opens` and `closes` both `00:00`), because "are they
  open Sunday" is a question an assistant gets asked and silence is not an answer. Wednesday stays out
  of `openingHoursSpecification` because "by appointment" is not open hours; it belongs in the
  description prose.

---

## 4. Proposal 2: the schema tier, each item graded honestly

Legend. **RR** = produces a Google rich result in 2026. **AI** = value to an answer engine.

| # | Addition | RR | AI | Effort | Generated? | Verdict and the real reason |
|---|---|---|---|---|---|---|
| 4.1 | `@graph` with `@id` (Section 3) | No | **High** | Medium | Yes | Ship first. Turns 40 orphan nodes into one entity. Nothing else in this lane matters as much. |
| 4.2 | `WebSite` node | No | Medium | Trivial | Yes | Still used by Google for the site name in results. Free. **No `SearchAction`.** |
| 4.3 | `Person` for Jerry, promoted to a site wide entity | No | **High** | Small | Yes | See Section 7.3. This is the one authority signal a vendor platform dealer cannot manufacture. |
| 4.4 | `Service` x2 (CVR registration, independent inspection) | No | **High** | Small | Yes | The AI citation audit proved Maxim already wins `used car dealer Skokie CVR metal plates same day` with 6 of 10 results. This puts the winning attribute in the graph as an addressable thing rather than a sentence. Doubling down on proven ground. |
| 4.5 | `hasOfferCatalog` / `OfferCatalog` on `/inventory` | No | Medium | Small | Yes | One addressable node for "everything Maxim sells", referenced from the dealer node on **every** page, not just the SRP. Already blessed by SPEC section 5A. |
| 4.6 | `ImageObject` inside `Vehicle.image` (contentUrl, width, height, caption) | No | Low | Trivial | Yes | Free upgrade from a bare URL string. Gives a caption sentence and real dimensions. Do **not** add `license`/`acquireLicensePage`; Maxim does not license photos and the licensable badge would be a false claim. |
| 4.7 | `VideoObject`, emitted only when a file exists | **YES** | High | Small | Yes | The only vehicle adjacent rich result left after Vehicle Listing died. Build the contract now, emit nothing until Jerry films. See 7.7. |
| 4.8 | Homepage `FAQPage` (defect D7) | **No** | Medium | Trivial | Yes, from `faq.json` | Do it, but the competitive audit's framing is out of date: this buys **zero** rich result as of 2026-05-07. The honest reason is that it puts six answer shaped pairs about Maxim's distinctive attributes into the machine layer of the page AI engines fetch first. |
| 4.9 | `Article` with `author -> #jerry` on the Illinois process pages | Limited (news oriented) | **High** | Small | Yes | The replacement for `HowTo`. The prize is not the rich result, it is author attribution binding real content to a named human entity. |
| 4.10 | `identifier: PropertyValue` = Illinois Dealer License DL7667 | No | Medium | Trivial | Yes | A verifiable state issued credential in the graph. No competitor in this market emits one. Cheap trust token. |
| 4.11 | `knowsLanguage: ["en","es"]` | No | Low | Trivial | Yes | True (the site ships English and Spanish). Answers "do they speak Spanish". |
| 4.12 | **Delete** 12 of 13 `AggregateRating` copies | n/a | n/a | Small | n/a | Self serving ratings are ineligible for stars (verified). Twelve extra copies buy nothing and are exactly how D8 happened. |
| 4.13 | **Kill** `SpeakableSpecification` | No | None | n/a | n/a | Beta, United States only, English only, Google Home, news publishers. Not this business. |
| 4.14 | **Kill** `HowTo` | No | None | n/a | n/a | Gone from the Search Gallery. Use 4.9. |
| 4.15 | **Kill** `Product` on vehicles | n/a | Negative | n/a | n/a | Contradicts the feed's `excluded_destination` and risks the Merchant account. |
| 4.16 | **Kill** `Review` or `AggregateRating` about a named competitor | n/a | Negative | n/a | n/a | If the comparison pages ship, mark them `Article`, never `Review`. Reviewing a named competitor in markup is schema misuse and a defamation surface. Hard rule. |

**Compliance constraints binding every generated node**, enforced by the linter in 5.3:
`warranty` text is always "Illinois powertrain protection on qualifying cars"; never the word
"certified"; never "guaranteed"; never "total protection"; never a 3 month warranty; `Review` nodes are
emitted only when `source === "Google"`; NAP verbatim; rating and count read from `reviews_meta.json`,
never hardcoded.

---

## 5. Proposal 3: llms.txt version 2, and an honest downgrade

### 5.1 The verdict the evidence forces

I went looking for the case that llms.txt matters and the case is not there.

- Ahrefs analyzed server logs for **137,000 domains** in May 2026: **97 percent of llms.txt files
  received zero requests.** Nothing fetched them at all. ([Ahrefs study](https://ahrefs.com/blog/llmstxt-study/), [Search Engine Journal coverage](https://www.searchenginejournal.com/97-of-llms-txt-files-got-no-requests-ahrefs-data-shows/579478/))
- Of over 500 million AI bot visits in one 90 day monitoring window, **408 targeted llms.txt**.
- Zero requests arrive for llms.txt files that do not exist. Bots never go looking.
- Gary Illyes stated at Google Search Central Live that Google does not support llms.txt and has no
  plans to. John Mueller: none of the AI services have said they use it, "and you can tell when you
  look at your server logs that they don't even check for it."
- The competitive audit already found six local competitors serving a real llms.txt. Its existence is
  no longer a differentiator.

**So: do not invest in llms.txt as a content project. Do not expand it. Do not write a version 2 that
is longer.** Two thirds of the current file is marketing prose aimed at a reader who does not arrive.

### 5.2 What to do instead: generate it, cap it, and move the real asset to HTML

**Generate it** so it costs zero ongoing attention and can never drift again (this permanently closes
the llms.txt half of D8). **Cap it** at a compact fact sheet. Then put the same generated fact block on
an **HTML page at `/facts`**, because that surface is in the sitemap, is linked, and is on a path
crawlers demonstrably do fetch. That is the honest reframe: keep llms.txt because it is free, put the
real machine readable fact sheet where the bots actually go.

**New script: `scripts/build-llms-txt.js`**

- Reads: `site/src/data/vehicles.json`, `reviews_meta.json`, `dealer.json`, `suburbs.json`,
  `inventory-meta.json`.
- Writes: `web_assets/llms.txt`.
- Runs in `.github/workflows/sync-inventory.yml` immediately after the `Rebuild GMC feed` step, and
  `web_assets/llms.txt` gets added to that workflow's `git diff` check list and its `git add` list.
- Every number becomes a template variable. Zero hardcoded facts survive.

**Content spec for the generated file, about 90 lines:**

1. Identity block: name, NAP verbatim, license DL7667, hours including Wednesday by appointment and
   Sunday closed, languages, owner name.
2. Distinctive attributes only, the ones the AI citation audit proved Maxim already wins on: Illinois
   CVR metal plates issued at the dealership, financing for all credit levels, true zero doc fee all in
   pricing, independent mechanical inspection on every car, free CARFAX, owner personally buys every
   car at auction. Cut everything generic.
3. Live inventory table generated from `vehicles.json`: year, make, model, trim, price, mileage, VIN,
   canonical VDP URL. This is the part a machine can actually use.
4. Computed price band, computed unit count, computed rating and review count, computed city list.
5. Canonical links section, trimmed. Delete the "Optional" section entirely.
6. A generated timestamp and an explicit pointer: machine consumers should prefer
   `https://www.maximautos.com/inventory.json` (Section 7).

**Drift risk after this change: zero.** Hand maintenance: none.

### 5.3 The thing nobody proposed: a compliance linter over every generated artifact

**New script: `scripts/lint-compliance.js`**, run in CI in both `sync-inventory.yml` and `deploy.yml`,
exiting non zero on any hit. Inputs: `web_assets/llms.txt`, `web_assets/feeds/vehicles.xml`,
`web_assets/inventory.json`, and the built `site/dist/**/*.html`.

Fail conditions, each traceable to a real defect already in the ledger:

| Rule | Prevents |
|---|---|
| literal `certified`, `guaranteed`, `total protection`, `complete protection`, `3 month warranty`, `3-month` | D9 class, guardrail C8 |
| the U+2014 em dash character anywhere in a generated artifact | **D6, live right now** in `vehicles.xml` line 257 |
| any `$X to $Y` price band string that disagrees with live min and max in `vehicles.json` | **D8, live right now** on 15 pages |
| any hardcoded review count that disagrees with `reviews_meta.json` | **D8**, `suburbs.json` line 259 |
| a page rendering a `VehicleCard` payment without the Reg Z footnote string | guardrail D3 |
| a `Review` JSON LD node whose source is not Google | guardrail on review emission |
| a `g:link` in the feed whose trailing slash does not match the VDP canonical | **D5, live right now** |

This is roughly 120 lines of Node and it converts an entire recurring defect class from "someone has to
notice" into "the build refuses". Of everything in this document, this is the item with the highest
ratio of durability to effort, and it is the one nobody on this run proposed.

---

## 6. Proposal 4: crawler policy

### 6.1 What each agent actually does, verified from primary sources

| Agent | Operator | Purpose | Blocking it costs you | Source |
|---|---|---|---|---|
| `OAI-SearchBot` | OpenAI | Surfaces sites in ChatGPT search | **Your ChatGPT search citations, directly** | [OpenAI bots docs](https://developers.openai.com/api/docs/bots) |
| `GPTBot` | OpenAI | Training corpus for foundation models | Parametric memory of your brand. "No direct impact on search" | same |
| `ChatGPT-User` | OpenAI | User initiated fetches inside ChatGPT | Live answers when a user pastes your URL. "Not used to determine whether content may appear in Search" | same |
| `OAI-AdsBot` | OpenAI | Ad landing page safety checks | Nothing organic | same |
| `Claude-SearchBot` | Anthropic | "navigates the web to improve search result quality" | Claude's citations of you | [Anthropic crawler docs](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| `ClaudeBot` | Anthropic | Training | Parametric memory | same |
| `Claude-User` | Anthropic | User initiated fetches | Live answers | same |
| `PerplexityBot` | Perplexity | Retrieval for cited answers | **Your Perplexity citations, directly** | Perplexity docs and 2026 practitioner consensus |
| `Perplexity-User` | Perplexity | User initiated. Perplexity states it is an agent and not required to honor robots.txt | Nothing you control | same |
| `Google-Extended` | Google | Gemini training only. "does not impact a site's inclusion in Google Search nor is it used as a ranking signal in Google Search" | Gemini's parametric memory. **Not** Search, **not** AI Overviews | [Google crawler docs](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers) |
| `Applebot-Extended` | Apple | Apple Intelligence training opt out. Content "will remain discoverable through Spotlight, Siri, and Safari" | Apple Intelligence parametric memory only | [Apple: About Applebot](https://support.apple.com/en-us/119829) |
| `CCBot` | Common Crawl | Open corpus reused by many trainers and researchers | Inclusion in a corpus many downstream models read | Common Crawl |
| `Bytespider` | ByteDance | Training, historically aggressive | Nothing Maxim sells | ByteDance |

### 6.2 The recommendation, and the honest tradeoff

**Allow every one of them, explicitly. Drop the ClaudeBot crawl delay. Keep the barkrowler delay.**

The argument against blocking AI crawlers on a site like this one is not ideological, it is arithmetic:

1. **There is nothing to protect.** Maxim's entire corpus is 7 to 15 car listings, a NAP block, and copy
   Jerry wants repeated verbatim. There is no proprietary dataset, no paywall, no ad impression revenue
   that an AI answer cannibalizes. Every publisher argument for blocking rests on a revenue model Maxim
   does not have.
2. **The retrieval bots and the training bots are different bets, and Maxim wants both.** Blocking
   `OAI-SearchBot`, `Claude-SearchBot` or `PerplexityBot` removes Maxim from cited answers outright,
   which is the entire strategic objective. Blocking `GPTBot`, `ClaudeBot`, `Google-Extended`,
   `Applebot-Extended` or `CCBot` gives up the only mechanism by which "Maxim Autos in Skokie" becomes
   something a model knows without retrieving anything. For a business that is invisible in generic
   category queries today (verified in the AI citation audit), being in the training set is upside with
   no matching downside.
3. **Bandwidth is not a constraint.** 92 KB homepage, static output on Vercel, about 57 URLs. A full
   crawl of the whole site is single digit megabytes.
4. **The `Crawl-delay: 1` on ClaudeBot is pure self harm.** It cannot increase coverage, only reduce it,
   and Google ignores the directive anyway. Remove it. Keep barkrowler's, because barkrowler is an SEO
   backlink crawler, not an answer engine, so throttling it costs nothing.

**The one honest cost:** a car listing scraped into training data can outlive the car. A model trained
in 2026 may tell someone in 2027 that Maxim has a 2015 Civic at $9,995. That is a real risk and it is
already unavoidable through Bing, Google, CarGurus and Cars.com. The mitigation is not blocking, it is
what the graph already does: `Offer.availability: SoldOut`, a correct `priceValidUntil`, and a live
inventory endpoint a retrieval bot can check. Correctness beats exclusion.

### 6.3 Generated `robots.txt`

`robots.txt` is currently hand maintained, which is why the agent list is two years out of date. Move
it to `scripts/build-robots-txt.js` reading the agent roster from `site/src/data/crawlers.json` and
writing `web_assets/robots.txt` in the same workflow step as llms.txt. Proposed content:

```
# Every named answer engine is welcome. This site exists to be quoted.
# Full inventory in machine form: https://www.maximautos.com/inventory.json

User-agent: *
Allow: /inventory$
Disallow: /inventory?

User-agent: OAI-SearchBot
Allow: /
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: Bytespider
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: Amazonbot
Allow: /

User-agent: barkrowler
Crawl-delay: 1

Sitemap: https://www.maximautos.com/sitemap-index.xml
```

### 6.4 The defect this uncovered: the homepage links to its own disallowed URLs

`Disallow: /inventory?` is correct and intentional, it kills filter permutation crawl waste. But
`index.astro` lines 139 to 141 point the hero chips at exactly those disallowed URLs:

```
{ label: 'Under $10K', href: `${base}/inventory?price=under10k` },
{ label: 'SUVs',       href: `${base}/inventory?body=SUV` },
{ label: 'Sedans',     href: `${base}/inventory?body=Sedan` },
```

The homepage is spending its strongest internal links on URLs robots.txt forbids. Point the first two
at the static pages that already exist, `/used-cars-under-10000-skokie` and `/used-suvs-skokie-il`.
That **also de orphans 2 of the 8 zero inbound link pages the technical audit found**, at the cost of
changing two string literals. Two defects, one edit, and nobody in this run connected them.

---

## 7. Proposal 5: the inventory surface an agent would actually use

The question worth answering is not "what feeds exist" but "what does software shopping on a buyer's
behalf need". It needs four things: **state**, **actions**, **change**, and **discoverability**.

### 7.1 `/inventory.json`: build this. High value, trivial cost, cannot drift

**New script: `scripts/build-inventory-json.js`.** Reads `vehicles.json`, `reviews_meta.json`,
`dealer.json`. Writes `web_assets/inventory.json`. Runs in `sync-inventory.yml` next to the GMC feed.

Critical design decision: **it emits the same schema.org vocabulary the pages emit**, as
`{"@context":"https://schema.org","@graph":[...]}` with the same `@id` URIs. Not a second private
dialect. A consumer that read the homepage and then reads this file recognizes `#dealer` as the same
node it already has. One vocabulary everywhere is the whole point of Section 3.

Per vehicle it carries: canonical VDP URL, VIN, year, make, model, trim, price (all in, no fees),
mileage, body style, drivetrain, fuel, transmission, exterior and interior color, stock number,
availability, `dateAdded`, every photo URL, and the disclosure block verbatim.

Then the part everyone forgets, **actions**, because an agent needs a next step and not just data:

```json
"potentialAction": [
  { "@type": "CommunicateAction", "name": "Call Jerry",  "target": "tel:+18475108947" },
  { "@type": "CommunicateAction", "name": "Text Jerry",  "target": "sms:+18475108947?body=..." },
  { "@type": "ApplyAction",       "name": "Apply for financing",
    "target": "https://www.maximautos.com/financing#apply" }
]
```

Note the financing target: the conversion audit found the VDP's "Get Pre-Approved" CTA sends nervous
buyers straight to a 60 field SSN application. The machine surface should point at the soft
prequalifier, not the full application. Getting that right in the agent facing artifact costs nothing.

Plus a header block: `generatedAt`, `schemaVersion`, `unitCount`, `priceRange`, a `documentation`
string describing its own fields, and a `license` line stating the data is free to quote with
attribution to `https://www.maximautos.com`. That last line is the cheapest citation nudge available
and it is a legitimate statement, not a trick.

**Discoverability**, which is the step almost everyone skips. Add to `Layout.astro` head:

```html
<link rel="alternate" type="application/ld+json" href="/inventory.json" title="Maxim Autos live inventory">
```

That is the standards conformant way to advertise a machine representation of a page. No dealer in this
market does it. Also reference it from `llms.txt` and as a comment in `robots.txt`.

### 7.2 `/feeds/new-arrivals.xml` (Atom): build this, low priority, near free

`site/src/data/url-events.jsonl` already logs added, sold, price change and back on market events with
timestamps (written by `build-inventory.js` `appendEvent`, verified). An Atom feed is a 40 line
transform of a file that already exists. It is the only surface that expresses **change** rather than
state, which is what a subscriber wants. Honest grade: nobody is subscribing to a 7 car lot's Atom feed
in 2026. But at 40 lines of generated code with no maintenance, the expected value is still positive
and it will matter more at 15 units with faster turns.

### 7.3 `/hours.ics`: kill it

No agent subscribes to a dealer's opening hours as a calendar. Hours belong in
`openingHoursSpecification` in the graph, where every consumer already looks. An ICS is a novelty that
creates a sixth place for the hours to drift. The one legitimate future use is an appointment
confirmation attachment, which is a booking feature Maxim does not have. Revisit only then.

### 7.4 `/.well-known/*` and an `agents.json` manifest: kill both for now

No standard has won and no production agent reads one. Betting on a draft convention repeats the exact
llms.txt mistake this document just diagnosed with data. The no risk version of the same idea is a
self describing `/inventory.json` (7.1) that carries its own field documentation. Ship that instead.

### 7.5 Image sitemap: gated on hosting photos on our own domain

Real value once unlocked, but blocked today. All 120 live vehicle photos are on
`imagesdl.dealercenter.net` (verified: 120 of 120 live photo URLs, 0 CarGurus). Google allows images on
another domain in a sitemap only if that domain is verified in Search Console, which Maxim cannot do
for DealerCenter's CDN. So the image sitemap is downstream of 7.6.

### 7.6 The image mirroring script is aimed at the wrong CDN

Candidate innovation 6 says `scripts/mirror-photos.js` "exists and is not wired in". It is worse than
that. The script filters source URLs through `isCarGurusUrl()` (line 41) and **every live vehicle photo
today is DealerCenter** (verified: live set is 120 DealerCenter, 0 CarGurus; the 301 CarGurus URLs that
remain all belong to sold units). Wiring it in as written would mirror **zero** live photos. The fix is
a predicate change plus a `photoUrls` rewrite behind a flag, and it is DB task #112, open since early
June. What it unlocks in this lane: an image sitemap, real `ImageObject` dimensions, stable URLs that
survive a vendor CDN change, and filename SEO. Recommend it, and flag that it has already stalled once.

### 7.7 IndexNow: already running, and its page list is hand maintained

`deploy.yml` runs `scripts/ping-indexnow.js` on every deploy and it already submits all static pages,
all 9 suburb pages, all available VDPs, retired slugs and recent events (verified). So the ai-citation
audit's top recommendation, forcing a recrawl of the 6 URLs still serving the purged warranty text, is
**already happening on every deploy**. The gap is Bing's recrawl latency, not the ping. No new tooling
and no Bing account is needed for that specific fix.

But `STATIC_PATHS` at line 50 is a hand maintained array, and it is already stale: it is missing
`/used-suvs-skokie-il`, the entire `/es/` tree, `/return-policy`, `/privacy-policy` and `/terms`. So
`/used-suvs-skokie-il` is simultaneously orphaned from internal links **and** absent from every
IndexNow submission. Fix: derive the list from the built `site/dist/sitemap-*.xml` instead of a hand
array. The sitemap is generated, so the submission list stops drifting. Trivial change, and it is the
same "generated beats hand maintained" principle as everything else here.

---

## 8. Candidate innovations: developed or killed

### 8.1 Publish the inspection reports: **KILL as specified, replace with a smaller true version**

The premise does not survive contact with the pipeline. Checked this session:

- `vehicles.json` carries `inspection: true` and `inspected: true` as **booleans**. No report content,
  no file path, no line items. All 27 records identical.
- `ma_vehicles` in `pka_hub.db` has 38 columns and **not one** is inspection related.
- DealerCenter has no public API (ground truth).

So there is no digital report anywhere in the pipeline. The reports are paper or a PDF sitting in a
vendor portal. Publishing them requires a new manual per car step: obtain, scan, transcribe,
structure, upload. That is precisely the "surfaces over workflows that never run" failure the governing
SPEC calls out, applied to a one person operation with 20 plus overdue tasks already in the ledger.

There is also a legal problem nobody raised. Publishing a third party mechanic's report verbatim
converts every line item into an advertised representation about a specific car. A car sold as is with
a published clean inspection is an argument a buyer can make later. That needs a lawyer's read, not an
architect's.

**The replacement, which is free and true today.** Publish the inspection **process**, not the reports.
The scope is already written verbatim in `llms.txt` line 13 and covers engine, drivetrain, brakes,
suspension, tires, electrical, interior and exterior. Emit it as the `#inspection` `Service` node
(4.4) with `serviceOutput`, provider `#dealer`, and `areaServed` the 9 cities. Per car, add
`additionalProperty` PropertyValues for the facts already known and verified: independent mechanical
inspection completed, CARFAX included, Illinois powertrain protection on qualifying cars. Entity
density with zero new work and zero new legal surface.

If Jerry wants the real reports published, gate it exactly like the SPEC gates video: ask for **one**
report as a digital file within 7 days. If the file appears, design the pipeline. If it does not, the
answer was already no.

### 8.2 Grounded on site assistant: **defer the assistant, build its data substrate now**

Needs a paid API key, which the guardrails forbid without separate approval, so it is Jerry's call and
not mine. Two things I will say from this lane.

First, on cost: I will not invent a number. The shape is a small model answering a few hundred
questions a month over a payload of 7 to 15 cars, which is a few thousand input tokens and a few
hundred output tokens per turn. That is small. **The exact monthly figure needs current published
pricing checked at the time of the ask, and I am flagging it as unverified rather than guessing.**

Second, the architectural requirement, which holds whether or not it ships: the assistant must be a
thin client over `/inventory.json` (7.1). If it gets its own copy of the dealership facts it becomes a
**sixth** divergent source, and Section 2D already shows what that produces. Build `/inventory.json`
first. It is justified on its own merits and it makes the assistant a small project instead of a risky
one.

### 8.3 Jerry as a search entity: **develop. Strongest item in my lane after the graph**

The AI citation audit's central finding is that Maxim wins distinctive attribute queries and loses
generic ones. A real named owner who personally buys every car at auction is a distinctive attribute
that a DealerSocket or Dealer Inspire site structurally cannot express.

Design: `#jerry` as a real graph node, stub site wide from `Layout.astro`, full node on `/about`,
`author` on every editorial page, `founder` and `employee` on the dealer node. Properties limited to
what is verified in ground truth: `name` Jerry Franco, `jobTitle` Owner, `worksFor` `#dealer`,
`mainEntityOfPage` `/about`, `telephone`, `email`, and `knowsAbout` restricted to claims the record
supports (wholesale auto auction buying, used vehicle appraisal, Illinois vehicle titling and
registration). No invented credentials, no invented years, no invented bio.

Two flags for Jerry, not decisions I get to make:

- `alternateName: "Przemyslaw Piechowiak"` would strengthen entity resolution across the dealer
  license, Manheim and CVR records. It is also his real legal name published in machine readable form.
  **Needs Jerry's explicit yes.**
- `image` and `sameAs` both want assets that I could not verify exist: a real photo of Jerry on the
  site, and any verified profile URL. Omit both until verified rather than pointing at a placeholder.

### 8.4 The sold archive as price transparency: **kill**

Three reasons, in order of weight.

1. **Index composition.** Making 20 sold VDPs indexable would mean a lot with 7 live cars publishes 27
   indexable vehicle pages, 74 percent of which are unavailable. Right after a Google Business Profile
   suspension that was only cleared 2026-07-24, deliberately adding twenty unavailable vehicle pages to
   the index is a bad trade for unique content.
2. **Advertising exposure.** Prices for vehicles no longer available are exactly what advertising rules
   police. I am not qualified to rule on Illinois specifics, which is the point: this needs a legal read
   before any build, and the review cost alone exceeds the value.
3. **The same prize is available at no risk.** The unique, uncopyable, entity dense content this
   innovation is reaching for is already sitting in the CVR process and the inspection process (8.1),
   with no compliance surface at all.

Keep sold VDPs exactly as they are: 200 OK, noindex, `SoldOut`, dropped from the sitemap after 14 days.
Add the one generated correction from 3.4: `priceValidUntil` should equal `sold_date`, not build date
plus 60 days.

### 8.5 Honest comparison pages: **not my lane to commission, one hard rule if they ship**

Mark them as `Article` with `author` pointing at `#jerry` and `publisher` at `#dealer`. **Never** emit
`Review` or `AggregateRating` about Carvana, CarMax or a named franchise dealer. That is both schema
misuse and a defamation surface, and it would be the single most reckless thing on this whole board.
Comparative claims stay in prose, sourced, and about verifiable published policies such as documentary
fees, not about quality.

### 8.6 Self hosted images: **develop, but fix the script's target first.** See 7.6.

### 8.7 Walkaround video: **design now, emit conditionally, build no plumbing**

`web_assets/videos/` is empty (verified). The SPEC already gates the video pipeline on a probe: Jerry
films exactly one car within 7 days. I am not overriding that gate, I am removing the engineering from
the critical path so the gate is the only thing left.

Define the contract now in `vehicles.json`:

```json
"video": { "url": "...", "thumbnailUrl": "...", "uploadDate": "...",
           "name": "...", "description": "...", "duration": "PT2M14S" }
```

`site/src/lib/schema.js` emits `#video` **only when the key is present**. Zero bytes today, instant the
day a file lands. Worth saying plainly: `VideoObject` is now the **only** vehicle adjacent rich result
that still exists in Google Search. Since Vehicle Listing died, a walkaround video is not one lever
among many, it is the last one on the board that produces a picture in a search result.

### 8.8 Core Web Vitals as a weapon: **true, and not a schema item**

92 KB against 724 KB is a real moat. There is no schema type for it and inventing a claim would be
worse than useless. What this lane owes it is protection: every proposal here is build time JSON with
zero runtime JavaScript, and the graph consolidation makes pages **smaller**, collapsing 16
`PostalAddress` copies and 5 script blocks per page down to 1 each. The speed story belongs in copy,
not in markup.

---

## 9. Five things nobody in this run flagged

1. **`ai-knowledge-base.md` is a fifth divergent copy of the dealership facts** and it currently
   contains the banned phrase "Total Protection", wrong hours, a wrong email address and "34+ reviews"
   against a live 46. It is pasted into the GoHighLevel AI that talks to customers. Section 2D. Fix:
   point `build_ai_knowledge_base.py` at the same `dealer.json` and `reviews_meta.json` the graph reads.
2. **The homepage's own hero chips link to robots disallowed URLs**, and redirecting two of them at
   existing static pages simultaneously de orphans 2 of the 8 zero inbound link pages. Section 6.4.
3. **`/used-suvs-skokie-il` is missing from the IndexNow submission list**, so it is orphaned from
   internal links and never submitted for indexing. The whole `/es/` tree is missing too. Section 7.7.
4. **Sold VDPs advertise a price valid 60 days into the future** while declaring themselves sold out.
   Section 3.4.
5. **The 2016 Honda CR-V LX AWD at $11,580 is live right now** (verified in `vehicles.json`). That
   resolves the AI citation audit's open question: the failure on "Honda CR-V under $12,000" is an AI
   visibility gap, not an inventory gap. Maxim has the car and is not being surfaced for it.

---

## 10. Build order

Each phase is independently shippable and each leaves the site correct.

| Phase | Items | Effort | Why this order |
|---|---|---|---|
| **1** | `dealer.json` + `lib/schema.js` + `Layout.astro` `@graph` + `#dealer` `#website` `#jerry` | Medium | Nothing else can reference `@id`s that do not exist yet. |
| **2** | Migrate all 16 pages off inline literals. Delete 12 `AggregateRating`, 15 `PostalAddress`, 11 `GeoCoordinates` copies. Generated `priceRange`, generated `areaServed` (9 cities), merged `sameAs`. | Medium | Kills the D8 drift class at the source. |
| **3** | `lint-compliance.js` in CI | Small | Ship right after phase 2 so the fixes cannot silently regress. Catches D5, D6, D8 today. |
| **4** | `build-llms-txt.js` + `build-robots-txt.js` + `crawlers.json` + fix the two hero chip links | Small | llms.txt stops drifting forever, crawler policy modernizes, two orphans get links. |
| **5** | `build-inventory-json.js` + `<link rel="alternate">` + `#catalog` + `Service` x2 + homepage `FAQPage` | Small | The surface an agent uses, plus the distinctive attribute nodes. |
| **6** | `VideoObject` contract (emits nothing) + `ImageObject` + `Article` author attribution on new content pages | Small | Ready before the SPEC's video probe resolves. |
| **7** | Atom new arrivals feed + IndexNow list derived from the sitemap | Trivial | Cleanup. |
| **8** | Photo mirroring retargeted at DealerCenter, then the image sitemap | Medium | Gated on task #112, which has already stalled once. |

**Generated versus hand maintained, final accounting.** After this design there is exactly **one** hand
maintained fact file in the whole system, `site/src/data/dealer.json`, about 45 lines, changed only when
the business itself changes. `llms.txt`, `robots.txt`, `inventory.json`, `vehicles.xml`, every JSON LD
node, `priceRange`, `areaServed`, the review count and the price band all become generated. `suburbs.json`
stays hand maintained for its prose but every number is stripped out of it and derived instead.

---

## 11. Unverified, flagged rather than guessed

- Cost of the grounded assistant. Needs current published model pricing checked at the time of the ask.
  I refused to invent a figure.
- Whether Jerry consents to publishing `Przemyslaw Piechowiak` as `alternateName` in machine readable
  form. His call, not mine.
- Whether a photo of Jerry and any verified profile URL exist for `Person.image` and `Person.sameAs`.
  Omit both until confirmed rather than shipping a placeholder.
- Whether all nine service cities are in Cook County. Very likely true, not checked against a primary
  source, so the design uses `State: Illinois` in `containedInPlace` instead.
- Whether `Crawl-delay` is honored by ClaudeBot at all. Irrelevant to the recommendation, since the
  directive can only reduce coverage either way.
- Whether Google's `Article` markup on a dealer's process pages yields any search appearance at all. I
  claim only the author attribution value, which is mechanical and does not depend on a rich result.
- Whether any answer engine actually dereferences an `@id` fragment across pages. The graph value is
  primarily within page disambiguation, which is certain, plus cross page linking, which is plausible
  and unproven. I am not claiming the second as measured.
