# Red team: technical and ranking skeptic

**Role:** refute the claim that these four designs improve rankings, AI citations, or conversions.
**Date:** 2026-07-25
**Standard applied:** a proposal survives only if I can name the mechanism, name the instrument that
would detect it, and confirm the mechanism is still real in 2026. Absent any one of the three, it is
refuted. "Google likes structured data" is not a mechanism.
**Everything below was verified this session.** Sources are file paths, live curl/DNS output, DB rows,
or URLs. Nothing is asserted from memory.

---

## 0. Bottom line before the detail

Four designers produced roughly 70 proposals. Not one of them addresses the thing Maxim's own Google
Search Console data names as the constraint. Task #170 is not a hunch, it is a report reading:

> "GSC audit 2026-07-03 Links report: 22 total external links from 5 domains (carsforsale 10,
> yellowpages 7, yp.com 3, birdeye 1, dealeressential 1), ALL pointing at the homepage, all generic
> anchors. Zero editorial links. This explains Google rationing crawl/index (28 money pages
> Discovered-not-indexed, task #166)."
> (`python db_tools/db_tasks.py get --id 170`, read this session)

Five referring domains. All five are directory or aggregator listings. Zero editorial links. Every
link points at the homepage, so no internal page has any external equity of its own.

Against that, the four designs collectively propose roughly **32 new indexable HTML URLs** onto a site
where **28 URLs are already sitting in Discovered, currently not indexed with Last crawled = N/A**
(task #166, verbatim). Google found those 28 URLs, looked at the authority behind them, and declined
to spend the crawl. Seven of those 28 are the Spanish tree. Five are the financing hub. Seven are the
make and segment and suburb pages. Six are live vehicle pages.

**The content engine as designed builds pages into a queue Google is already refusing to service.**
That is the single most important sentence in this document.

---

## 1. Verification log (what I actually checked)

| Claim under test | Method | Result |
|---|---|---|
| No google-site-verification meta on live site | `curl -s https://www.maximautos.com/ \| grep google-site-verification` | CONFIRMED. Returns the literal placeholder `content="YOUR_VERIFICATION_CODE" here --`, i.e. the TODO comment |
| DNS TXT verification token exists at apex | `nslookup -type=TXT maximautos.com 8.8.8.8` | CONFIRMED live: `google-site-verification=tCAvzBRJ12-XeubngsAhYQnxCxtBS_taZIz0naP-DBE` |
| Vehicle Listing rich result dead | developers.google.com/search/blog/2025/06/simplifying-search-results | CONFIRMED. Announced 2025-06-12, one of seven types dropped. Documentation removed from Search Central Sept 2025 |
| Car and Vehicle are rich result types | Fetched developers.google.com/search/docs/appearance/structured-data/search-gallery | **REFUTED.** The 32 supported features contain no Vehicle, no Car, no vehicle listing. Full list: Article, Breadcrumb, Carousel, Course List, Dataset, Discussion Forum, Education Q&A, Employer Aggregate Rating, Event, Image Metadata, Job Posting, Local Business, Math Solver, Movie, Organization, Product, Profile Page, Q&A, Recipe, Review Snippet, Software App, Speakable, Subscription/Paywalled Content, Vacation Rental, Video |
| FAQ rich results dead | Search Central FAQ documentation notice, multiple 2026 reports | CONFIRMED. Stopped appearing 2026-05-07. Search Console appearance filter, rich result report and Rich Results Test support removed June 2026. API support removed August 2026. FAQPage stays a valid type and Google says it still uses it for understanding |
| llms.txt is read by AI engines | Ahrefs study, 137,000 domains, published June 2026 | CONFIRMED as near worthless. 97% of llms.txt files received zero requests in May 2026. AI retrieval bots were 1.1% of requests to those files. SEO audit tools were the largest single consumer at 21.7%. Gary Illyes confirmed July 2025 that Google does not support it and does not plan to |
| Google consumes IndexNow | Search across 2026 sources | **REFUTED.** As of 2026 Google does not support IndexNow. It is a Bing, Yandex, Seznam and Naver protocol. Google indexing runs on its own crawl scheduling, sitemaps and URL Inspection |
| Googlebot honours Crawl-delay | developers.google.com/search/blog/2019/07/a-note-on-unsupported-rules-in-robotstxt plus the April 2026 expansion of the unsupported list | **REFUTED.** Google has never supported Crawl-delay and discards it at parse time. Bing does support it |
| Illinois doc fee cap 2026 | 815 ILCS 505/2J plus 2026 CPI adjustment reporting | CONFIRMED at $377.63 |
| Illinois vehicle tax rate is set by dealer location | IDOR Vehicle Tax FAQs and ST-556 instructions | **UNRESOLVED AND CONTESTED.** IDOR material states the rate follows the location of the dealership. Other current sources state that after the 2022 sourcing change the buyer's address sets the local Retailers' Occupation Tax rate for most vehicle sales. ST-556 instructions separately require an additional 1.25% Chicago Home Rule Use Tax when the sales location is in Cook County and the registering address is inside Chicago corporate limits |
| Apple Business (formerly Apple Business Connect) is free | apple.com newsroom plus 2026 reporting | CONFIRMED free for listing management. Rebranded to Apple Business on 2026-04-14. Surfaces in Maps, Siri, Spotlight, Safari, Wallet, Mail |
| Local pack weighting | Whitespark style 2026 factor breakdowns | GBP signals ~32%, on page ~19%, reviews ~16%, links ~15%, behavioural ~8%, citations ~7%. Schema is a supporting signal, not a primary one |
| Production deploy path | Read `vercel.json` and `.github/workflows/deploy.yml` | `vercel.json` buildCommand is `cd site && npm ci && npm run build`. `deploy.yml` is titled **Deploy to GitHub Pages** and uploads `site/dist` to Pages. **deploy.yml does not touch production.** |
| sync-inventory.yml builds the site | Read `.github/workflows/sync-inventory.yml` | It does not. It runs build-inventory.js and build-gmc-feed.js, commits data files, then dispatches deploy.yml. No `astro build` anywhere in it |
| Live inventory | `site/src/data/vehicles.json` parsed this session | 27 records, 7 live. Prices 8995, 8995(Trax), 9495, 9995, 9995, 10450, 11580, 15995. reviews_meta.json reads rating 5.0, count 46, updated 2026-07-24 |

---

## 2. The ordering attack: everything is downstream of five referring domains

### 2.1 The link profile is about to get worse, not better

Task #170 breaks the 22 links down. **CarsForSale supplies 10 of the 22, the single largest source.**
Task #172, read this session:

> "Jerry cancelled the CarsForSale.com account (dealer id d750632) behind maximautosil.com."

When that listing drops, Maxim loses roughly **45% of its external links and goes from 5 referring
domains to 4.** No design in this run mentions this. Every design assumes the authority baseline holds
constant while it adds pages. It does not hold constant. It is scheduled to fall.

### 2.2 Discovered, not indexed is a rationing verdict, not a linking bug

Task #166 is explicit that the 28 URLs were **never crawled, Last crawled = N/A**. That distinction
matters and no design uses it correctly:

- **Crawled, currently not indexed** means Google spent the fetch and judged the page not worth
  indexing. That is a content quality verdict, and content work can move it.
- **Discovered, currently not indexed with no crawl** means Google never spent the fetch at all. That
  is a crawl budget and site authority verdict. Better content on those URLs changes nothing, because
  Google has not read the content and is not planning to.

So the content engine's entire theory of change is aimed at the wrong verdict. The 5 financing hub
pages that content-engine wants to improve are already in the Discovered, never crawled bucket. The
Spanish tree that content-engine wants to extend by 5 pages is already 7 URLs in that same bucket.
Publishing more of the same class of page adds to a queue, it does not drain it.

### 2.3 Internal linking is the one on-site lever with a real mechanism here

The technical audit's orphan finding is the exception that survives this attack, and it is the most
underrated item in the entire run. Eight pages have zero inbound internal links from any of 58 crawled
pages. Cross referencing that list against task #166's 28 Discovered, not indexed URLs, **seven of the
eight orphans are on both lists**: used-audi-skokie, used-cars-chicago-north-shore,
used-cars-under-10000-skokie, used-honda-skokie, used-subaru-skokie, used-suvs-skokie-il, and the
suburb page for Lincolnwood.

That is a mechanism I will defend: a URL that appears only in a sitemap, with zero internal links and
zero external links, gives Googlebot no reason to allocate a crawl. Internal links are the only
crawl priority signal Maxim can create without anyone else's permission. This is the ai-visibility
hero chip fix, the content-engine orphan adoption, and the /answers index, and it is the only on-site
work in this run I would bet moves the indexed page count.

### 2.4 What actually addresses off-site authority: nothing in these four designs

I checked. Zero proposals across ai-visibility, content-engine, ux and operator touch referring
domains, citations, NAP consistency, Bing Places, Apple Business, or reviews. Meanwhile task #176 is
sitting in the database with a **finished runbook**, produced 2026-07-24, with three targets already
confirmed free:

> "3 CONFIRMED FREE and ready to submit: BBB.org (free basic/unaccredited profile), Foursquare (free
> listing + free postal verification), Manta.com (free registration)."

Three free citation submissions take referring domains from 5 to 8, a 60% increase, in an afternoon
of Jerry sitting in Chrome. The June AI baseline scored NAP consistency at **25 out of 100** and found
iSeeCars publishing a **wrong phone number, (847) 250-4971**. A wrong phone on an aggregator is
simultaneously a lost call, a NAP inconsistency that suppresses local prominence, and a fact an answer
engine can and will repeat. Correcting one phone number is worth more to AI citation accuracy than
the entire entity graph, and it costs one email.

---

## 3. The measurement attack

### 3.1 D3 is refuted as a measurement blocker, and that changes the operator design

`baseline-day0.md` line 50 states flatly: **"GSC is NOT yet verified or connected."** Its evidence is
three repo file reads: an unchecked setup checklist, the TODO comment in Layout.astro, and the absence
of a meta tag. It inferred non verification from the absence of one verification method.

That conclusion is wrong, and it has propagated into every design in this run.

1. I confirmed by DNS lookup that the apex carries a live `google-site-verification` TXT token. Google
   only issues that string when someone opens a verification flow in Search Console.
2. Tasks #164, #166 and #170 all contain data that **can only come from inside a verified property**:
   the Links report broken out by referring domain with exact counts, the Pages report drilldown
   listing all 28 Discovered, not indexed URLs by slug, and a Page with redirect fix validation that
   was **started on 2026-04-30 and has since FAILED, 9 pages remaining, down from 12**. Clicking
   Validate Fix requires owner level access to a verified property. You cannot fabricate any of that
   from a file read.

**Conclusion: a Domain property exists, it is verified by the DNS token, and someone read it on
2026-07-03.** The meta tag is a redundant second method that was never needed. The instrument has
data. What is missing is not verification. What is missing is that Google handed Maxim a precise
diagnosis three weeks ago and nobody executed against it.

That demolishes the operator design's framing of the service account as "the single highest leverage
unblock in the design because it turns 'we think indexing is the problem' into Google's own answer."
Google already gave its answer. It is in task #170. A service account automates the retrieval of a
report that was already retrieved manually and then ignored for 22 days. Automating collection of an
un acted upon number does not create action. Build it anyway because it is free and it kills the
UNAVAILABLE placeholders, but do not price it as the unblock.

### 3.2 At this volume, sales cannot detect anything in 90 days

The numbers, from `baseline-day0.md` section 2 read this session: **952 GBP customer interactions
(trailing window), 665 GBP monthly views, 3,273 Maps lifetime profile views.** Sales run 5 to 8 a
month.

Run the arithmetic honestly. Suppose the ux conversion work delivers a genuine 30% lift in lead rate
and half of those extra leads close. On a 5 to 8 unit base that is roughly 1 to 2 extra cars a month.
Month to month variance on a 5 to 8 unit base is already plus or minus 3. **A 30% real improvement is
indistinguishable from noise for well over a year.** Any design document that implies Jerry will see
this in the sales number is misleading him.

The same applies to rank. GSC average position on a query basket where the site currently registers
near zero impressions for price and radius queries will move on a handful of impressions, which is
not a signal.

**What IS detectable at n = 1, within 90 days, and should be the entire scoreboard:**

| Leading indicator | Instrument | Baseline today | Why it is honest |
|---|---|---|---|
| Referring domains | GSC Links report | 5, falling to 4 when CarsForSale drops | Integer count, no noise, directly names the constraint |
| Discovered, not indexed URL count | GSC Pages report | 28 | Integer count. This is the actual bottleneck rendered as a number |
| Indexed page count | GSC Pages report | unknown, pull it | Integer count |
| GA4 generate_lead phone events from the six dead positions | GA4 | literally zero, the elements are not links | A step off zero is unambiguous |
| /financing#apply starts vs /apply starts | GA4 | unknown ratio | A ratio, not a count, so it survives low traffic |
| Google review count | GBP | 46 | Integer count, and reviews are a 16% weight signal |
| NAP consistency score | Whatever produced the 25/100 in June | 25/100 | Integer, and the wrong iSeeCars phone is a named fixable |

Nothing on that list is a sale, and nothing on it is a ranking. That is the correct scoreboard for a
business this size, and it is roughly what `measurement.md` section 0 already argues. The designs in
this run did not adopt it.

---

## 4. Mechanism audit: which proposals actually have one

### 4.1 The "structural moat" is partly imaginary

The competitive audit's headline advantage is that Maxim ships `["Car","Vehicle"] + Offer + FAQPage`
on all 27 vehicle pages while every vendor platform competitor tops out at AutoDealer.

I fetched Google's Search Gallery this session. **Car is not there. Vehicle is not there. Vehicle
listing is not there. FAQ is not there.** Three of the four types in that boast produce zero visible
output in Google Search. Vehicle Listing was killed 2025-06-12 and its documentation removed in
September 2025. FAQ stopped rendering 2026-05-07.

So the honest statement is: Maxim ships schema no competitor ships, which no search engine renders.
The residual value is entity understanding for answer engines, which is real but unmeasurable and
uncitable. **Kill the "competitors structurally cannot ship this" framing.** It is true and it does
not matter, and repeating it makes the whole design run sound like it is winning a race nobody scores.

The 92 KB versus 724 KB page weight advantage is real, verified by curl, and matters for Core Web
Vitals and for how cheaply a crawler can fetch the site. That is the moat. Lead with it instead.

### 4.2 Per proposal mechanism verdicts

**ai-visibility**

- *Entity graph with @id.* Mechanism: real, entity resolution for answer engines building a knowledge
  graph from 19 disconnected AutoDealer nodes. Not a ranking mechanism and not a rich result. Not
  measurable in 90 days by any instrument that exists. Cheap, structurally correct, ship it, grade it
  12 months and unmeasurable.
- *Compliance linter.* Mechanism: real for defect prevention, zero for ranking. See section 5, it is
  wired to the wrong pipelines.
- *llms.txt generator.* Mechanism: refuted by Ahrefs at 137,000 domains, 97% zero requests, and by
  Illyes directly. The design already says this and downgrades honestly. Keeping a 90 line generator
  that costs nothing is fine. Calling it a surface is not.
- *Crawler policy.* Mechanism: **partly false.** The ai-citation audit already verified robots.txt
  Disallows none of these agents. Adding explicit Allow blocks under a wildcard that already allows
  everything is a no op. Removing the ClaudeBot Crawl-delay: Google discards Crawl-delay at parse
  time and always has, so no Google effect exists. Whether ClaudeBot honours it is unverified either
  way. This is a trivial cost change with a stated mechanism that does not hold. Ship it, restate the
  reason as hygiene, drop the coverage claim.
- */inventory.json.* Mechanism: speculative. No agent shopping standard exists today that consumes
  it. Cost is small and the file is generated. Fine as a bet, not as a plan.
- *Service nodes, Person node, OfferCatalog.* Same class as the entity graph. Real, unmeasurable,
  cheap.
- *VideoObject contract emitting nothing until a file exists.* This is the sharpest single item in the
  whole run. Video is one of the 32 surviving Search Gallery features and it is the **only** vehicle
  adjacent rich result left. Correct call to build the contract and gate the content.
- *Homepage FAQPage.* Zero rich result. FAQ is not in the Gallery. Correctly recalibrated.
- *Hero chips pointing at robots disallowed URLs.* Real, mechanical, and it converts the homepage's
  strongest internal links from wasted to pointed at two of the seven orphaned Discovered, not indexed
  pages. Best cost to mechanism ratio in the run.
- *Kill list (Speakable, HowTo, SearchAction, Carousel, Product on vehicle, QAPage, competitor
  Review).* Verified correct. Note that Speakable is still technically in the Gallery, but it remains
  a limited beta for news publishers, so the practical call stands.
- *build_ai_knowledge_base.py repoint.* Not SEO at all. It is a live compliance defect in a customer
  facing channel: banned phrase, wrong hours, wrong email, wrong review count. Highest urgency, zero
  ranking claim. Do it.

**content-engine**

- *facts.json and claims.json.* Real defect elimination. No ranking mechanism. Correct anyway.
- *content-guard.mjs.* See section 5.2. Right idea, dangerous wiring.
- *maxverify.* See section 5.4.
- */illinois-car-buying hub, 5 spokes.* This has the best content mechanism in the run: the demand
  audit verified only AG and law firm pages rank for the 15 day and 500 mile statute, and the
  ai-citation audit measured Maxim already taking 6 of 10 results on the CVR plates query. Doubling
  down where you already win is correct strategy. But it is graded **large** effort and it publishes
  6 URLs into the queue Google is refusing to service. Sequence it after links, not before.
- *Tiered Spanish, 5 new pages, graded large.* **Refuted on ordering.** Seven of the 28 Discovered,
  never crawled URLs are the existing Spanish tree. Adding 5 more Spanish pages to a section Google
  has never once crawled is the clearest example in this run of building into a wall.
- *Publish test, decay model, inspection coverage guard.* Governance, no mechanism claimed, correct.
- *Per car inspection pages.* See section 6.
- */sold index.* Content-engine correctly killed the fabricated "what we sold it for" framing after
  finding ma_sales has 1 row against 119 sold vehicles. The salvaged days on lot version is honest
  but it is a page nobody searches for. ai-visibility separately argues to kill the public archive
  entirely on compliance grounds. Side with ai-visibility.
- */answers index.* Cheap, built from existing content, and its real value is internal link
  distribution to orphans. Keep it, and justify it as link distribution, not as an AI citation shape.
- *One doc fee comparison page.* Real intent, real differentiator, highest legal exposure on the list,
  correctly limited to one page with an expiry. Acceptable.
- *Kill programmatic crossproducts.* Correct and important. The 45 URL city by make grid on a 7 to 15
  car lot is textbook scaled content abuse and it would have made the crawl budget problem
  categorically worse.

**ux**

- *Out The Door.* See section 7. Critical defect.
- *Computed price band.* Real. Kills D8 structurally instead of by hand. Also fixes a factual claim
  answer engines currently repeat. Ship.
- *CTA retarget to /financing#apply.* The single best conversion item in the run. Mechanism is
  direct and physical: it removes a 60 field SSN form from the primary path for a subprime audience.
  Measurable as a ratio in GA4, which survives low traffic. Ship first.
- *Six tappable phone numbers.* Same class. A phone number that is a `div` inside `hidden sm:inline-flex`
  renders nothing below 640px and fires no event above it. Off zero is detectable. Ship first.
- *URL state and share control.* Real utility for a dealer whose channel is Jerry texting people.
  Small. Ship.
- *Data derived price chips.* Two of five chips return zero results today and the most expensive car
  is unreachable by any chip. That is a live defect, fix it. But a ceiling slider over 7 to 15 cars is
  over engineering: at that count the correct interface is showing all the cars.
- *Compare tray, graded large.* See section 6.
- *Homepage hero rebuild, graded medium.* No ranking mechanism. No conversion instrument that can
  resolve it at 665 monthly profile views. It is taste work priced as a project.
- *VDP price onto screen one, single CarGurus instance, one payment estimator, lightbox fix, header
  CTA.* All small, all real, all mechanically defensible. The lightbox one is the best of them:
  13 full size images on a budget buyer's phone connection is a measurable Core Web Vitals and bounce
  problem, and dcResize already exists in the same file.
- *Spanish Reg Z canonicalization and aria-hidden sweep.* Compliance and accessibility. Correct.

**operator**

- *Ship as one GitHub Action.* The lane evidence (12 of 12 green in 48h against 8 of 9 cloud routines
  disabled and 0 of 4 daemons running) is the best empirical reasoning in the whole run. Correct.
- *Banned phrase scan across 56 live URLs.* Real, already proven at 56 of 56 fetched, and it found two
  live guardrail violations on every page. Highest value operator item.
- *IndexNow rebuild.* See section 5.3.
- *Weekly approval card.* See section 6.
- *Deadman watchers, three state checks, autofix whitelist, registry diff.* Sound engineering, no
  ranking claim made, no objection.
- *C8 footer fix and "all credit" truncation fix.* Two live guardrail violations on 56 pages, 62 and
  49 occurrences. Two string edits. Do them today.
- *GitHub Pages mirror containment.* Real duplicate content exposure, verified self canonical. Cheap.
- *DealerCenter description screening.* Correctly identifies the only uncontrolled copy surface in
  the pipeline. Real.
- *GSC service account.* See section 3.1.
- *mirror-photos.js.* Real. And ai-visibility caught that the script filters on `isCarGurusUrl()`
  while all 120 live photos are on DealerCenter, so wiring it in as written mirrors zero files. Fix
  the predicate first.

---

## 5. Technical feasibility: four things are broken against this stack

### 5.1 CRITICAL: the compliance linter is wired to two pipelines that do not touch production

ai-visibility specifies `scripts/lint-compliance.js` "run in CI in both sync-inventory.yml and
deploy.yml." I read both files this session.

- `sync-inventory.yml` never builds the site. It runs `build-inventory.js` and `build-gmc-feed.js`,
  diffs the data files, commits, then dispatches deploy.yml. There is no `astro build` in it.
- `deploy.yml` is literally named **"Deploy to GitHub Pages"**. It runs `npm ci` and `npm run build`
  with `working-directory: ./site` and uploads `./site/dist` via `upload-pages-artifact@v3`. It
  deploys the mirror at dexmang.github.io, the same mirror the technical audit says should be
  noindexed.
- Production is Vercel, and `vercel.json` carries `"buildCommand": "cd site && npm ci && npm run build"`.
  Vercel builds on git push through its own Git integration. Neither GitHub workflow gates it.

**A linter in deploy.yml protects the mirror and nothing else.** As specified, the linter would let
every defect it detects ship to maximautos.com. The proposal's core promise, "the build refuses," is
false against this deployment topology.

### 5.2 CRITICAL: a linter that does gate production freezes inventory and the Merchant Center feed

content-engine wires content-guard.mjs "into npm run build, exit 1 on failure." That one **is** the
Vercel production path. Now trace the failure:

1. content-guard fails on any rule, for example CG rule "numbers against the ledger."
2. `astro build` exits 1. Vercel marks the deployment failed and **keeps the previous successful
   deployment live**.
3. The previous deployment is the previous inventory. A car that sold this morning stays on the site
   at its old price. `web_assets/feeds/vehicles.xml` is served from that frozen build, so the Google
   Merchant Center feed freezes with it.
4. Maxim's Merchant Center account has already been in trouble three separate times: task #114 "Fix MC
   product disapproval", task #132 "Volvo XC60 MC disapproval", task #154 "MC5555218279 request
   Vehicles policy". A frozen feed advertising a sold car at a stale price is precisely the Dishonest
   Pricing and availability class that got it flagged.

**A copy style rule must never be able to make inventory accuracy stale.** The failure mode of the
gate is worse than the defects it prevents.

Fix: the linter runs **blocking in a pre merge check** (a `pull_request` workflow, or a pre push hook)
and **advisory in the Vercel build**, where it prints, opens a DB task, and exits 0. The 6 hourly
inventory path must never be able to halt on prose.

### 5.3 HIGH: the IndexNow rebuild cannot test the backlink hypothesis

The operator design justifies the IndexNow fix as:

> "This is the most likely mechanical cause of task #166 (28 money pages Discovered, currently not
> indexed) and it is a far cheaper test of task #170's backlink hypothesis than acquiring backlinks."

**Google does not consume IndexNow.** Verified this session across 2026 sources. IndexNow is Bing,
Yandex, Seznam and Naver. Task #166 is a **Google Search Console** report about **Google** indexing.
An IndexNow submission cannot cause, prevent, or test anything in that report.

The fix itself is still worth shipping, for a different reason the ai-citation audit already
identified: six live URLs are still serving the purged "3 Month Warranty" claim through a stale Bing
index, and Bing is the retrieval layer behind ChatGPT browsing. That is an active compliance exposure
in an answer engine. Fix IndexNow to close that. Do not represent it as a Google indexing test, and
do not let it delay the link work it claims to substitute for.

Also note the two designs disagree with each other. ai-visibility says IndexNow "already pings all 9
suburb pages and /used-honda-skokie on every deploy" and needs no new tooling. Operator says IndexNow
submits 37 URLs against a 56 URL sitemap with 22 never submitted. Task #139's note from 2026-07-24
records a manual run accepting **33** URLs. Three numbers, three sources. Somebody is wrong. Resolve
it by running the script before designing around either claim.

### 5.4 HIGH: maxverify with "no override flag" is unshippable in a one person business

content-engine specifies an adversarial agent that "blocks staging" with "no override flag."

An LLM judge applied to a diff has a nonzero false positive rate. There is exactly one human in this
business, and that human currently has **20 plus overdue urgent tasks, several open since early
June**, including #89 which has been open since 2026-06-02. The first false positive on a Saturday
becomes a permanently blocked pipeline, because the only person who can resolve it is the person whose
demonstrated response latency on urgent items is measured in weeks.

An unoverridable gate in a system with a single human and a documented queue backlog is not a safety
mechanism. It is a scheduled outage. Add an override that requires a written reason recorded to the
DB, which gives you the audit trail without the deadlock.

### 5.5 Smaller feasibility notes

- ux says /out-the-door results "render as normal VehicleCards so the Reg Z footnote and existing
  compliance behavior come along unchanged." `VehicleCard.astro` is an Astro component. It renders at
  build time. Client side JavaScript cannot instantiate it. The page must pre render all live cards
  and show or hide them in the DOM. That is achievable and it is not what the doc describes. Correct
  the spec so the builder does not discover it at implementation time.
- Everything else in ux (sliders, compare tray, URL state, empty state SMS capture) is client side
  JavaScript over a small JSON payload. Static Astro handles all of it. No server side assumption
  found in any of the four designs. Good.
- The shared compare and filter URLs land under `/inventory?`, which robots.txt Disallows. They work
  for humans and are invisible to crawlers. That is the intended behaviour, no conflict.

---

## 6. Effort versus return: what to cut

### Compare tray, graded large, at 7 to 15 units

A comparison interface exists to reduce the cost of holding several options in your head. At 7 cars
the entire inventory fits on one screen. At 15 it fits on two. The design's own argument, "comparing
the CR-V, Crosstrek and XC60 currently requires three tabs," describes a task that takes 20 seconds.
This is the largest single engineering item in the ux design solving the smallest real problem in it.
Defer until inventory is genuinely above 25 units. Spend the same effort on the lightbox fix, the
tappable phones, and the CTA retarget, which together are graded small and have direct mechanisms.

### Per car inspection capture at "roughly 4 minutes per car"

The content is genuinely the best thing proposed in this run. A measured tread depth in 32nds for a
specific VIN is the one thing a franchise dealer with 500 referring domains cannot copy, because
copying it would be a fabrication. I want it to exist.

I do not believe it will. The evidence is in the same database as the plan: 20 plus overdue urgent
tasks, several open since early June. Task #112, the photo CDN migration, has been open and urgent
since 2026-06-09 and is still stalled. Task #177, one walkaround video per car at ~20 minutes, has
been open since 2026-07-05. The design's stated 35 minutes a month is not the binding cost. The
binding cost is that it is a **new recurring obligation** in a business whose completion rate on
existing recurring obligations is close to zero.

Both content-engine and operator independently landed on the right answer, which is a probe gate: one
report, seven days, and if it does not appear the question is settled at zero cost. Adopt the gate.
Design nothing past it until the file exists.

### The weekly approval card, graded medium

The design's own justification is "the 20 overdue urgent tasks are the proof that a task list is not
an execution mechanism." Correct diagnosis, wrong conclusion. Those 20 tasks are not stalled because
they are formatted as a list. Several are stalled because they require Jerry logged into Chrome on
accounts that only he can access (task #139 Bing WMT, task #176 citations, the GSC service account
itself). Reformatting a queue does not create Chrome sessions. The 90 day snooze is a genuinely good
mechanism and worth keeping, but grade this trivial and stop expecting a card to fix a bandwidth
problem.

### Opportunity cost, stated plainly

For each large item, what the same effort buys instead:

| Large or medium proposal | Same effort spent on | Why it beats it |
|---|---|---|
| /illinois-car-buying hub, 6 URLs, large | Submitting BBB, Foursquare and Manta from the finished task #176 runbook | Referring domains 5 to 8 (+60%) versus 6 URLs added to a 28 URL queue Google is not crawling. The hub only starts paying after the links exist |
| Tiered Spanish, 5 URLs, large | Claiming Apple Business (free) and Bing Places (task #139) | The existing 7 Spanish URLs have never been crawled once. Apple Business feeds Siri, Spotlight, Safari and Maps, all currently absent, and it is free |
| Compare tray, large | Lightbox fix + tappable phones + CTA retarget, all small | Three direct mechanisms with GA4 instruments versus one convenience feature for a 7 car lot |
| Homepage hero rebuild, medium | Fixing the iSeeCars wrong phone and the NAP 25/100 | A wrong phone on an aggregator is a lost call and a fact answer engines repeat. The hero is taste |
| Out The Door module, medium | One walkaround video per car (task #177) | Video is the only surviving vehicle adjacent rich result in Google Search. Out The Door as specified publishes a legally exposed number |
| Per car inspection pipeline, medium plus per car forever | Asking every past buyer for a review | Reviews are ~16% of local weight and review recency is a named 2026 factor. 46 to 70 reviews is achievable in 90 days and moves a weighted signal. Inspection pages move an unweighted one |

---

## 7. CRITICAL: Out The Door publishes a number Maxim cannot stand behind

This is the ux design's self declared signature and the recap hero. It is the most dangerous proposal
in the run, and the danger is specifically that it is good.

The design specifies a fixed itemised total on every vehicle page: price, $0 doc fee against the
$377.63 cap, "Illinois sales tax at the verified 7.25% Skokie motor vehicle rate," $165 title, $151
plates, worked to "$15,995 becomes $17,471 out the door."

Four separate problems, any one of which is disqualifying.

**1. The rate is not verified.** The demand audit sourced 7.25% from salestaxguide.org, a secondary
aggregator, and explicitly listed under its own UNVERIFIED section: "The state/county/local component
breakdown of Skokie's published 7.25% motor-vehicle sales tax rate (only a secondary aggregator source
was checked)." The ux design then restates it as "the verified 7.25% Skokie motor vehicle rate." A
number was promoted from unverified to verified with no new evidence. That is the exact failure the
run's own INVENT NOTHING guardrail names.

**2. The sourcing rule is contested and I could not resolve it.** IDOR's ST-556 material states the
rate follows the location of the dealership. Other current sources state that after the 2022 sourcing
change the buyer's address sets the local Retailers' Occupation Tax rate for most vehicle sales. If
the second is right, the published total is wrong for every buyer who does not live in Skokie, which
is most of the audience the nine suburb pages were built to attract.

**3. Chicago buyers are definitively understated.** ST-556 instructions require an additional **1.25%
Chicago Home Rule Use Tax** when the sales location is in Cook County and the registering address is
inside Chicago corporate limits. Maxim is in Cook County. Maxim runs a /used-cars-chicago-north-shore
page. On the $15,995 Crosstrek that is **$199.94 the published total does not include.**

**4. The total is wrong for anyone with a trade or a plate transfer.** A trade in changes the taxable
base. A plate transfer is a $25 fee, not $151. The design's total is correct only for a cash buyer,
with no trade, taking new plates, registering in Skokie.

Now the compounding factor. Maxim's entire brand position, on every page, is that **the advertised
price plus tax, title and license is the total and fees are never re added.** Publishing a specific
navy bar total that a buyer then finds is $200 low at signing does not merely fail to help. It
attacks the one claim the business is built on, on the page where the buyer is deciding, and it does
so under 815 ILCS 505/2J, which governs advertisement of price.

**Verdict: KILL the total. Keep the fee line.**

The good half survives intact and needs no tax at all. Publish the itemised fee comparison: dealer
documentary fee $0, with "Illinois allows dealers to charge up to $377.63" as the sub label. That is
a verified statutory number, it is Maxim's real differentiator, it turns a sentence into a priced line
item exactly as the design intended, and it carries zero exposure because Maxim controls both figures.
Show tax, title and license as a labelled estimate with an explicit statement that the rate depends on
where the buyer registers the vehicle, and do not sum it into a single advertised total.

The /out-the-door page inherits the same defect and additionally solves a filtering problem that 7 to
15 cars do not have. Kill it as specified. If the budget entry point is wanted, the existing
`monthly_budget` select on the financing form already captures it at zero cost.

---

## 8. Would a competitor with 50x the domain authority beat this anyway?

For most of it, yes, and the designs should say so.

- **The Illinois process content.** A franchise group's SEO vendor can publish the same 15 day and 500
  mile explainer next month on a domain with hundreds of referring domains and take the position.
  Nothing in the content protects it. It wins today only because no dealer has bothered, and "no
  competitor has bothered yet" is not a moat, it is a head start with an unknown expiry.
- **The entity graph, service nodes, OfferCatalog.** A vendor platform cannot ship them, but an
  aggregator with real authority does not need them. Cars.com does not out rank Maxim on schema.
- **The doc fee comparison page.** Genuinely defensible, because a competitor copying it would have to
  give up $377.63 per car to make the same claim. This is the correct shape for content that survives
  a stronger competitor: the differentiator is a business decision, not a paragraph.
- **Per VIN inspection data and days on lot.** Same shape, and the strongest. Fabricating a tread depth
  is a lie a competitor with any legal review will not publish. This is why the inspection idea is
  worth the probe gate even though it will probably fail on execution.
- **Walkaround video.** A franchise store with 300 units cannot economically film every car with the
  owner narrating it. Maxim at 15 units can. And Video is the last vehicle adjacent rich result
  standing.

The pattern: content that describes public facts loses to authority. Content that encodes a decision
only Maxim has made, or an artefact only Maxim possesses, survives. Reweight the content engine
towards the second category and away from the first.

---

## 9. The bets

### Would move the needle in 90 days, measurable, ship first

Every one of these has a named mechanism and a named instrument that can resolve it at this traffic
volume.

1. **CTA retarget /apply to /financing#apply** on all three vehicle page positions. Removes an SSN
   form from the primary path. Instrument: GA4 ratio of financing form starts to credit app starts.
2. **Six tappable phone numbers.** Instrument: GA4 generate_lead phone events, currently structurally
   zero from those positions.
3. **C8 footer fix and "all credit" truncation fix.** 62 and 49 occurrences on 56 live pages. Two
   string edits. Compliance, not ranking, and both are live guardrail violations right now.
4. **build_ai_knowledge_base.py repoint.** Banned phrase, wrong hours, wrong email and wrong review
   count are being served to customers through GoHighLevel today.
5. **Computed price band replacing "$5,000 to $15,000" on 15 pages.** Kills D8 structurally. Also
   corrects a claim answer engines repeat verbatim.
6. **Internal links to the seven orphans, plus the hero chip repoint, plus /answers.** The only
   on-site work with a defensible indexing mechanism. Instrument: GSC Discovered, not indexed count,
   currently 28.
7. **GitHub Pages mirror noindex.** Removes a self canonicalising byte identical homepage competing
   for brand terms.
8. **Operator banned phrase scan as one GitHub Action.** Already proven at 56 of 56 URLs this session.
9. **IndexNow rebuild**, justified correctly: it clears the stale "3 Month Warranty" from Bing, which
   is ChatGPT's retrieval layer. Not as a Google test.
10. **Three free citation submissions from the finished task #176 runbook.** Not in any design. The
    highest ratio item available to this business. Referring domains 5 to 8.
11. **Fix the iSeeCars wrong phone.** One email. NAP is 25/100 and answer engines repeat phone numbers.
12. **Lightbox dcResize routing.** 13 full size images per car on a budget buyer's connection.

### Would move the needle in 12 months, build now, do not expect early signal

13. **Entity graph with stable @id.** Correct, cheap, unmeasurable. Do not promise a rank change.
14. **VideoObject contract plus task #177 walkaround video.** The only surviving vehicle adjacent rich
    result. This is the highest ceiling item in the entire run and it is a three week old DB task no
    designer prioritised.
15. **Jerry as a Person entity with author attribution.** Real experience signal, no vendor platform
    can express it.
16. **/illinois-car-buying hub**, sequenced after the citation work, not before.
17. **One doc fee comparison page** with the 90 day expiry.
18. **mirror-photos.js**, after fixing the `isCarGurusUrl()` predicate that currently makes it mirror
    zero files. Unlocks LCP control, AVIF and an image sitemap.
19. **Compliance linter and content-guard**, rewired: blocking pre merge, advisory in the Vercel build.
20. **Apple Business claim and Bing Places.** Free, absent, and Apple feeds Siri and Spotlight.

### Theater, kill outright

21. **The Out The Door total as specified.** Keep the $0 versus $377.63 fee line. Kill the summed
    total until the tax sourcing question is answered by a primary source, and even then do not
    advertise one number to buyers in different jurisdictions.
22. **/out-the-door as a standalone page.** Wrong tax, and a filter for 7 cars.
23. **Compare tray.** Largest ux item, smallest ux problem. Revisit above 25 units.
24. **Homepage hero rebuild as a project.** Fold the two real fixes (computed price band, tappable
    CTA) into the trivial bucket and drop the rest.
25. **Tiered Spanish, 5 new pages.** The existing 7 Spanish URLs have never been crawled.
26. **The public sold archive.** Both designs converged on killing it. Agreed.
27. **Per car inspection pages beyond the probe gate.** One report in seven days settles it. Design
    nothing past that.
28. **maxverify's "no override flag."** Keep the agent, delete the deadlock.
29. **The "we ship Car and Vehicle schema and they cannot" framing.** Verified: not a rich result type.
    True, and worth nothing in Search. Replace the moat claim with the 92 KB versus 724 KB one, which
    is verified and does matter.
30. **llms.txt as a strategic surface.** Keep the free generator. Stop calling it a channel. 97% of
    them get zero requests and Google says it never will.

---

## 10. The one sentence I would put in front of Jerry

Google has already told you what is wrong, in writing, on 2026-07-03: twenty two links from five
directory domains, and twenty eight of your pages that Google found and decided were not worth
crawling. One of those five domains is CarsForSale, which you just cancelled. Until that number goes
up, everything in these four documents is furniture.
