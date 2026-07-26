# Maxim Autos AI Answer Engine Audit
**Date:** 2026-07-25
**Scope:** Maxim Autos only (ma_vehicles, J-series). No Sherman Dodge data touched. No file under `businesses/maxim-autos/website/site/` or `web_assets/` was written, only read via public fetch.
**Method:** WebSearch (Bing backed index, the same index ChatGPT browse and Copilot draw from) plus direct WebFetch of maximautos.com and third party pages. No live Chrome session was used, so direct ChatGPT/Perplexity/Claude/Gemini UI tests were not run this pass either, same limitation as the June baseline. Treat WebSearch results as a proxy for ChatGPT/Copilot browse behavior, not as ground truth for Perplexity's or Gemini's own indexes.

---

## JOB 1: What Actually Drives AI Citation in 2026 (Evidenced vs. Vendor Marketing)

### Well supported (multiple independent, non selling sources agree)

1. **Word count does not predict citation. Density does.** Ahrefs' study of 174,048 pages across 560,346 AI Overviews found a Spearman correlation of 0.04 between word count and citation position, essentially zero. A separate Writesonic analysis of 1M+ AI Overview citations found pages with clean heading hierarchy plus schema markup earn 2.8x higher citation rates. Both are large sample, methodology disclosed, and not selling a GEO retainer. This directly supports Maxim's existing four paragraph VDP format over adding length.

2. **44.2% of LLM citations are pulled from the first 30% of a document.** Leading with the direct fact (price, address, hours, key claim) in the first few sentences matters more than where it sits deeper in the page. Maxim's llms.txt already front loads the NAP and pricing line, that part is right.

3. **llms.txt is not read by AI crawlers in any measurable volume.** An SE Ranking study of 300,000 domains found 10.13% adoption, but 39.6% of those are plugin stubs with no real content, meaning genuine deliberate adoption is lower than the headline number. Separately, a 90 day study of 500M+ AI bot visits found only 408 requests targeted `/llms.txt` directly, and another dataset put it at 0.1% of all AI crawler traffic (84 of 62,100 visits). John Mueller (Google) has stated no AI crawler has confirmed using it. **Verdict: llms.txt is a low cost, zero harm file to keep, but it is not a citation lever. It functions today mainly for coding assistants (Cursor, Continue) pointed at documentation, not for local business discovery.** Maintaining Maxim's llms.txt is fine; expecting it to move AI citation is not evidenced.

4. **AI crawlers respect robots.txt.** GPTBot, ClaudeBot, PerplexityBot, and Google-Extended are all reported as honoring standard robots.txt disallow directives, same as classic web crawlers. This is the actual access control lever, not llms.txt.

5. **NAP consistency across a defined set of directories (Google, Bing, Yelp, plus the site itself) is treated as a baseline requirement across every source reviewed**, independent of vendor. This matches and validates the June 2026 baseline's own framing and its 25/100 score finding.

6. **Perplexity has named, disclosed citation signals distinct from ChatGPT**: freshness, structured Q&A formatting on the page, authority within its own curated source pool, direct query to heading matches, and citation density. A business optimized for ChatGPT browse is not automatically visible to Perplexity, they pull from different pools. This is corroborated across multiple sources including a citation ROI dataset (BrightEdge: 8.79 average citations per Perplexity response vs Superlines: 15.43% Perplexity citation rate vs 2.78% ChatGPT), suggesting Perplexity cites far more liberally per answer than ChatGPT does.

7. **AI Overviews now source from a broad multi-signal stack**, not Google Business Profile alone: websites, reviews, directories, knowledge panels. A Whitespark study cited AI Overviews appearing on 68% of local searches versus 39% for the classic local pack, meaning AI Overview visibility is now a bigger surface than the map pack for local queries. This raises the stakes on Maxim's on-site schema and GBP being in sync, since AI Overviews will blend both.

### Not well supported / vendor marketing, treat with skepticism

1. **"Schema markup improves LLM discoverability by 67%"** appears in a single blog source (Brain Buddy AI) with no disclosed methodology, sample size, or control group. This is a marketing claim, not a study. The safer, evidenced claim is #1 above (2.8x citation rate lift tied to heading structure AND schema together, from an analysis of 1M+ citations with a stated sample size). Cite the second, not the first.

2. **"Q&A format" as a universal content structure recommendation is actively contradicted by data.** One dataset found Q&A format headers hurt content absorption by 5.74% versus other structures, while code snippets, statistics, definitions, and comparisons boosted absorption 55 to 77%. Multiple GEO agency blogs still push "write in FAQ Q&A format" as gospel; the counter evidence says direct statements and comparisons beat question headers. Maxim's VDP already carries FAQPage schema (structured data, machine readable) which is a different and still valid mechanism from question-formatted prose (which the data says can backfire). Do not conflate the two.

3. **The claim that "60%+ of all search interactions now involve an AI component" and similar sweeping adoption stats** recur across nearly every GEO agency blog with no consistent primary source cited twice. Treat any single-sentence "X% of search is now AI" stat as unverified marketing framing unless it traces to a named, dated study (as the Ahrefs and Whitespark figures above do).

4. **The entire GEO agency content genre (ClickForest, Enrich Labs, eSEOspace, Beverly Hills Growth, Mersel, etc.) is selling GEO retainers or tools.** Their overlapping claims (schema is "the secret weapon," GEO is "the single most important discipline") should be read as sales copy formatted as guidance. The pattern across all of them: broad confident claims, no disclosed sample, always leading to a services pitch. Where a claim from this genre matched an independently sourced dataset (Ahrefs, Writesonic, SE Ranking, Whitespark) it is marked evidenced above; where it did not, it is excluded from this audit's recommendations.

### Crawler access mechanism (this is the enforceable lever, unlike llms.txt)

Two bot fleets exist per major AI company: training bots (GPTBot, ClaudeBot, Google-Extended, CCBot) that feed model weights, and search/browse bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot) that fetch pages live to cite in an answer. The reported 2026 default among publishers who care about IP is to block training bots and allow search bots. Maxim has no IP-protection motive (a dealership wants to be found, not licensed), so the correct posture is allow everything, which is what Maxim's current robots.txt does (see Job 2 crawler check below).

---

## JOB 2: Current Position, Delta Since 2026-06-10 Baseline

Baseline file read: `businesses/maxim-autos/operations/ai-engine-baseline-2026-06-10.md`. Baseline finding: Maxim appeared only for the exact query "used car dealer Skokie IL" (~position 6), absent from every radius, price filter, language, and north suburbs query. NAP consistency scored 25/100.

### 12 test queries run this pass (WebSearch, 2026-07-25)

| # | Query | Category | Maxim appears | Notes |
|---|---|---|---|---|
| 1 | maxim autos skokie | Brand | YES, dominant | 4 of 9 results are maximautos.com pages (home, about, financing, two suburb pages), plus CarGurus, Cars.com, AutosToday, CarZing dealer profiles all correct on NAP |
| 2 | used car dealer skokie il | Category | NO | Yelp, iCars Chicago, Pete Auto Sales, Napleton Honda, Go Autos, Northshore Auto Connect, Sherman Dodge surfaced. Maxim absent even though it ranked ~6 in June for this exact query |
| 3 | used cars north shore chicago | Category/geo | YES, position ~3 of 5 named | Named alongside North Shore Autosport, Ultimo Motors, North Shore Towing. Summary paragraph correctly states price range and CARFAX detail |
| 4 | used cars under 10000 near skokie | Price | NO | 100% aggregator dominated (TrueCar, Cars.com, CarGurus, Carsforsale). Zero dealers named, consistent with June's aggregator-lock finding on this exact query type |
| 5 | cheap reliable used cars chicago suburbs | Price | NO | CarGurus, TrueCar, Hertz Car Sales Des Plaines, Your Choice Autos named. Maxim absent |
| 6 | used car dealer no doc fees illinois | Attribute | NO | Query resolved to generic Illinois doc-fee-law informational content (WardsAuto, IL SOS, CarEdge), no dealer named at all. This is a legal/informational query type, not a dealer discovery query, in the current index |
| 7 | dealer that gives you plates same day illinois | Attribute | NO | Resolved to IL Secretary of State TRP (temporary permit) informational pages. No dealer named. Confirms this exact phrasing routes to generic government content, not to Maxim despite Maxim being the one dealer whose whole pitch is same day metal plates |
| 8 | used honda cr-v under 12000 chicago | Vehicle specific | NO | 100% aggregator/franchise dealer results (CarGurus, TrueCar, Carfax, Honda of Downtown Chicago, Honda City Chicago). Maxim does not carry a CR-V today (7 units), so absence may be inventory driven, not purely visibility driven |
| 9 | best used car dealer near Evanston | Category/geo | NO | Unchanged from June: City VW Evanston, Muller Honda, Jennings Chevrolet named, no Maxim, no Yelp Evanston listing for Maxim |
| 10 | used car dealer Skokie CVR metal plates same day | Attribute (long tail) | YES, dominant, 6 of 10 results | Maxim swept this query: used-honda-skokie, used-cars-chicago-north-shore, used-cars-skokie-il, a live VDP, used-cars-niles-il, and the inventory page all ranked. This is the single strongest result of the 12 |
| 11 | Maxim Autos reviews Skokie | Brand/reputation | YES, dominant | CarGurus, AutosToday, Cars.com, CarZine all correctly surfaced with consistent NAP; summary correctly quoted real review language about Jerry |
| 12 | used car dealer with financing for all credit levels Skokie Illinois | Attribute | YES, position 1 | Maxim listed first, ahead of UR Approved and Napleton Honda |

### Delta vs. June 2026 baseline

**Net picture: brand and long tail attribute queries are strong and improved. Category, price, and radius queries are still a blank, unchanged from June.**

- Improved: brand queries (1, 11) and one attribute long tail query (10, 12) now return Maxim as the dominant or top result, not just present. Query 12 ("financing for all credit levels Skokie") is new territory Maxim did not hold in June.
- Unchanged failure: category query "used car dealer skokie il" (query 2) was Maxim's ONE win in June (~position 6) and it fell OUT entirely this pass. That is a regression on the baseline's single strongest data point, not an improvement. Cannot say why from WebSearch alone (could be index churn, could be competitor content added, could be normal result rotation); flag as unverified cause, worth a same query re-test in a week.
- Unchanged failure: every price query (4, 5) and every pure radius/suburb-name query without "Maxim" or a Maxim-specific attribute in it (2, 6, 7, 9) still returns zero dealers or zero Maxim. This matches June's finding almost exactly: aggregators own price queries, franchise/named competitors own plain category queries.
- New data point: vehicle-specific query (8) failed, but plausibly because of inventory (no CR-V in the 7 current units) rather than an AI visibility gap. Cannot separate the two causes from search results alone. Flag as unverified attribution.

**Reading the pattern:** Maxim now visibly wins when the query contains the brand name OR a distinctive true attribute unique to Maxim (CVR same day plates, financing for all credit levels). Maxim still loses every query that is generic category, generic price, or generic geo with no distinguishing term. This is consistent with the entity density research above (named, distinctive, specific > generic): the pages that are winning are exactly the ones carrying dense, unique named claims (CVR, same day plates), and the pages losing are the generic ones competing against aggregator volume nobody can out rank with a 7 unit lot.

### CRITICAL FINDING: A purged false compliance claim is live in the AI answer layer via stale index, not live content

Query 10 and query 12's underlying WebSearch synthesis both surfaced this sentence, attributed to maximautos.com suburb pages (`used-cars-skokie-il`, `used-honda-skokie`, `used-cars-morton-grove-il`, `used-cars-park-ridge-il`, `used-cars-evanston-il`, and a VDP):

> "Every car comes with a free CARFAX, an independent inspection report, a 3 Month Warranty, and metal Illinois plates issued the same day at no extra fee."

This is the exact false "3 month warranty" claim named in the ground truth as already purged, and it directly violates the compliance guardrail ("NEVER a 3-month warranty, that claim is false and was purged").

I fetched the live pages directly to check: `https://www.maximautos.com/used-cars-skokie-il` and `https://www.maximautos.com/used-honda-skokie/` **do not contain "warranty" or "3 Month Warranty" today**, they correctly say "Illinois' 15 day / 500 mile statutory powertrain protection." So the live site is clean on this specific claim on the pages checked.

**Conclusion: Bing's search index (the index WebSearch and, per the June baseline's own methodology, ChatGPT browse draw from) is serving a stale, pre-purge cached copy of these suburb pages back into synthesized AI answers.** This means:
1. The false claim purge did happen on the live site (confirmed by direct fetch).
2. It has NOT propagated to the index that AI answer engines actually read from, months after the purge (exact purge date not established from files reviewed here, flagged as unverified).
3. Any user asking an AI answer engine about Maxim's warranty today has a real chance of being told about a "3 Month Warranty" that does not exist and that Maxim is contractually/compliance barred from offering. This is a live compliance exposure sitting in a channel Maxim does not control and cannot edit directly.

This is not covered by the June baseline (which did not test this specific claim) and is the single most important new finding of this audit. It is also direct evidence against relying on IndexNow/sitemap freshness alone: CLAUDE.md states IndexNow is "fully automated in deploy.yml," yet stale content is still surfacing for these exact URLs, months on. Either the IndexNow pings are not covering these specific suburb page URLs when their content changes, or Bing is not acting on them promptly, or Bing cached a version before IndexNow was wired in. Cannot determine which from outside the pipeline; this needs a look at deploy.yml's IndexNow payload against the actual suburb page URL list. That is an implementation question outside this audit's read-only scope, flagging for a Job Bing re-submission (submit these 5-6 suburb URLs individually to Bing Webmaster Tools "URL Inspection/Submit" if that account exists, or via IndexNow ping keyed to those specific URLs) rather than waiting on the 6 hour build cron.

**Unverified:** I could not determine from search alone whether this stale text is Bing-index-only or also present on a cached mirror (e.g. the GitHub Pages mirror at dexmang.github.io, or a third party aggregator's copy of the page). Recommend a direct fetch check of the GitHub Pages mirror URL for the same suburb slugs before assuming this is purely an index freshness issue.

### llms.txt assessment

Fetched `https://www.maximautos.com/llms.txt` in full (4.2 KB matches the stated size). Content is a well structured Markdown summary: NAP, hours, CVR/plates claim, inspection/CARFAX claim, powertrain protection claim (correctly says "every qualifying used car," matching the compliance guardrail), pricing claim, and a link list to inventory, financing, apply, FAQ, ship, sell-trade, about, testimonials, contact, and the Spanish site.

**Defect confirmed (matches ground truth D8):** the file states "Every car ... priced roughly $5,000 to $15,000," but the ground truth states the top live unit today is $15,995 and inventory is verified 7 units at $8,995 to $15,995. The llms.txt price ceiling is stale by at least $1,000 against the current top unit.

**Against current best practice:** the file itself is fine as a summary document, but per Job 1's research, llms.txt has essentially no measured AI crawler uptake (0.1% to 0.1-something percent of AI bot traffic across two independent studies) so its ceiling on ROI is real. Maintaining it costs nothing and is not wrong to do, but it should not be prioritized over the things proven to matter (schema, NAP consistency, index freshness on the live site's actual HTML, which is what crawlers overwhelmingly fetch instead).

### robots.txt assessment

Fetched `https://www.maximautos.com/robots.txt` in full:

```
User-agent: *
Allow: /inventory$
Disallow: /inventory?

User-agent: ClaudeBot
Crawl-delay: 1

User-agent: barkrowler
Crawl-delay: 1

Sitemap: https://www.maximautos.com/sitemap-index.xml
```

**Assessment against 2026 best practice:**
- No explicit `Disallow` for GPTBot, PerplexityBot, Google-Extended, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, or Applebot-Extended. All of these fall under the wildcard `User-agent: *` block, which only disallows a query-string variant of `/inventory`, everything else is allowed. **Confirmed: every major AI crawler and AI search bot is currently permitted to crawl the full Maxim Autos site.** This matches best practice (allow search-time and training bots both, since Maxim has no IP-protection motive and wants maximum discovery).
- ClaudeBot gets an explicit crawl delay (1 second) but no block, consistent with "allow, just don't hammer the server."
- The `barkrowler` crawl-delay entry is a general purpose crawler (Babbar SEO tool), unrelated to AI answer engines, not a concern.
- Sitemap directive present and points to `sitemap-index.xml`, correct format for a sitemap index (Job 1's research treats a clean sitemap as one input to Perplexity's "freshness" signal, so this is a positive baseline, though it doesn't explain the stale index finding above, sitemap presence affects discovery/crawl scheduling, not guaranteed recrawl speed on unchanged-URL content edits).
- **Gap: no explicit Applebot-Extended handling one way or the other.** Not a defect (wildcard covers it, meaning it's allowed), just worth naming since Apple Intelligence/Siri is a named AI surface in Job 1's crawler list and the June baseline flagged Apple Maps Connect as unclaimed. Both are Apple-side gaps (unclaimed listing, no CarPlay/Siri knowledge panel), not robots.txt gaps: the file itself already permits Apple's crawler.

**Bottom line on crawler access: nothing is blocking any major AI engine from reading Maxim's site.** The visibility gap identified in Job 2 is not a crawler-access problem, it is an index-freshness problem (see the stale "3 Month Warranty" finding) plus a genuine competitive-density problem on generic category and price queries where aggregators and larger franchise sites outrank a 7-unit lot regardless of technical SEO.

---

## Summary Table: Findings

| Finding | Status | Evidence |
|---|---|---|
| Brand queries dominant | Confirmed improvement since June | Queries 1, 11 this pass |
| One long tail attribute query (CVR/plates) dominant | Confirmed improvement, new since June | Query 10 |
| Financing attribute query, position 1 | Confirmed new win since June | Query 12 |
| Plain category query "used car dealer skokie il" | REGRESSED from June's one win | Query 2, absent this pass vs ~position 6 in June |
| Price queries | Unchanged failure, aggregator locked | Queries 4, 5 |
| Plain geo/radius queries | Unchanged failure | Queries 6, 7, 9 |
| Vehicle specific query | Failure, cause ambiguous (inventory vs visibility) | Query 8, unverified attribution |
| Purged "3 Month Warranty" claim still served by AI-facing index | CRITICAL, confirmed live site is clean, index is stale | Direct fetch of 2 live URLs vs WebSearch synthesis citing 6 URLs |
| llms.txt price ceiling stale ($15,000 vs $15,995 actual) | Confirmed, matches ground truth D8 | Direct fetch of llms.txt |
| llms.txt powertrain claim wording | Compliant, says "qualifying" | Direct fetch of llms.txt |
| robots.txt blocks any major AI crawler | NOT BLOCKED, all permitted | Direct fetch of robots.txt |
| NAP consistency across third party dealer profiles (CarGurus, Cars.com, AutosToday, CarZing) | Correct/consistent in this pass | Query 1, 11 result content |

## Recommendations (ranked, no spend required, all within guardrails)

1. **Force a re-crawl of the stale suburb pages carrying the false warranty claim.** Submit `used-cars-skokie-il`, `used-honda-skokie`, `used-cars-morton-grove-il`, `used-cars-park-ridge-il`, `used-cars-evanston-il`, and the flagged VDP individually through Bing Webmaster Tools URL submission (if the account exists, unverified from this audit) or confirm IndexNow is actually firing for these specific URLs on every build. This is the single highest priority item, it is an active compliance exposure in a channel outside direct control.
2. **Do not invest further engineering time in llms.txt beyond the one line price fix (D8).** The research does not support it as a citation lever in 2026; it costs nothing to keep but nothing to expand either.
3. **Do not adopt "Q&A format" prose restructuring as a GEO tactic.** The evidence here says it can hurt absorption; the FAQPage schema Maxim already has on VDPs is the correct, evidenced mechanism (structured data), keep that, do not also rewrite prose into question headers chasing a debunked pattern.
4. **Re-test query 2 ("used car dealer skokie il") in one to two weeks** to determine whether its disappearance from this pass is index noise or a real regression, since it was the June baseline's only category-level win.
5. **Accept that price and generic radius queries are structurally an aggregator-owned category** given Maxim's 7 to 15 unit inventory size; the leverage is in doubling down on the distinctive, evidenced-to-work attribute queries (CVR same day plates, financing for all credit levels, brand name) where Maxim already demonstrably wins, rather than chasing aggregator-dominated generic queries that even large franchise dealers do not win.

---

*No file under `businesses/maxim-autos/website/site/` or `web_assets/` was modified. No GBP surface was touched. This document lives at `businesses/maxim-autos/website/dominance-2026-07/design/audit-ai-citation.md` per the write scope constraint.*
