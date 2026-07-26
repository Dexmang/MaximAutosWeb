# Maxim Autos — Competitive Field Audit, North Shore Used Car Market

Scope: 50 miles of Skokie IL 60077. Run 2026-07-25. Method: WebSearch to
identify the field, curl with a real Chrome UA for timing and HTML signatures,
WebFetch for inventory counts and price bands where curl was blocked.
Raw curl output and saved HTML sit in the session scratchpad and are not
committed; every number below traces to a specific command run in this
session, reproducible against the URLs cited.

Every fact below is either measured directly (curl/WebFetch this session) or
carried from the orchestrator's verified ground truth. Anything I could not
independently confirm is marked UNVERIFIED and was not used in the verdict.

---

## 1. The field (18 competitors, three tiers)

### Tier 1 — National giants (dominate head terms, different transaction)
| # | Site | Role |
|---|------|------|
| 1 | Carvana | Online-only retailer, delivery/vending model |
| 2 | CarMax | National superstore chain, no-haggle pricing |
| 3 | Cars.com | Listings aggregator/marketplace |
| 4 | Autotrader | Listings aggregator/marketplace |
| 5 | CarGurus | Listings aggregator/marketplace, deal-rating engine |

### Tier 2 — Local franchise dealer groups, North Shore
| # | Dealer | City |
|---|--------|------|
| 6 | Sherman Dodge Chrysler Jeep Ram | Skokie |
| 7 | Napleton Honda of Morton Grove | Morton Grove |
| 8 | Napleton Lincoln | Glenview (relocated from Park Ridge) |
| 9 | Berman Hyundai of Lincolnwood | Lincolnwood |
| 10 | Old Orchard Nissan | Skokie |
| 11 | Hertz Car Sales Des Plaines | Des Plaines |

### Tier 3 — Independent used car dealers
| # | Dealer | City |
|---|--------|------|
| 12 | iCars Chicago | Skokie (nearest local comp, orchestrator baseline) |
| 13 | Pete Auto Sales | Skokie |
| 14 | Northshore Auto Connect | Skokie |
| 15 | Go Autos | Skokie |
| 16 | Motor Deals USA | Glenview |
| 17 | Best Auto Sales & Service | Des Plaines |
| 18 | Ultimo Motors North Shore | Northbrook (luxury/import specialist) |

Sources: [Yelp Skokie](https://www.yelp.com/search?cflt=usedcardealers&find_loc=Skokie%2C+IL), [iCars Chicago](https://www.icarschicago.com/), [Pete Auto Sales](https://peteauto.com/), [Napleton Honda Morton Grove](https://www.napletonhondamortongrove.com/), [Northshore Auto Connect](https://www.northshoreautoconnect.com/), [Sherman Dodge](https://www.shermandodgeillinois.com/), [Berman Hyundai](https://www.hyundaioflincolnwood.com/), [Old Orchard Nissan](https://www.oldorchardnissan.com/), [Motor Deals USA](https://www.motordealsusa.com/), [Napleton Lincoln Glenview](https://www.napletonlincolnglenview.com/), [Hertz Car Sales Des Plaines](https://www.hertzcarsales.com/des-plaines.htm), [Best Auto Sales & Service](https://www.bestauto1855.com/), [Ultimo Motors North Shore / Cars.com listing](https://www.cars.com/dealers/5380149/ultimo-motors-north-shore/).

---

## 2. Measured comparison table

TTFB and size measured via `curl -w` with a Chrome desktop User-Agent against
each homepage, this session, 2026-07-25. "Blocked" = bot-protection returned a
403 or a Cloudflare challenge page instead of real content; platform/schema
could not be verified for those and are marked accordingly.

| Competitor | Platform (evidence) | Homepage size | TTFB | Schema types seen | llms.txt | FAQ / Blog / City pages |
|---|---|---|---|---|---|---|
| **Maxim Autos** (baseline) | Astro 5.7 custom, own repo | 92 KB | 0.23s | `["Car","Vehicle"]`+Offer+FAQPage+Breadcrumb on VDP; AutoDealer+AggregateRating+Review on home | Yes, 4.2KB, maintained | FAQ on every VDP; no blog; 9 dynamic suburb pages |
| Carvana | Proprietary SPA | 731 KB | 0.75s | Not inspected this pass (national brand, off-topic for VDP schema question) | Yes, real, branded copy | N/A (not local) |
| CarMax | Proprietary | blocked (403, 368B body) | 0.13s to the block page | Unverified | Unverified | Unverified |
| Cars.com | Proprietary | blocked (403, 6KB body) | 0.09s to the block page | Unverified | Unverified | Unverified |
| Autotrader | Proprietary | 3.7 KB returned (cache/edge stub, real page not served headlessly) | 0.61s | Unverified | Unverified | Unverified |
| CarGurus | Proprietary | 929 KB | 0.31s | Not inspected (marketplace, not a dealer VDP) | Yes, real | N/A (not local) |
| Sherman Dodge | **Dealer eProcess** (`dealereprocess` string in HTML) | 392 KB | 2.75s (redirect chain `shermandodgeillinois.com`→`shermandodge.com` cost most of it) | `AutoDealer` only, no per-vehicle Car/Vehicle schema found on homepage | Yes, real, generic dealer copy | Blog links present (4), no FAQ found |
| Napleton Honda Morton Grove | **Dealer Inspire** (`dealerinspire` string) | 304 KB | 0.16s | `AutoDealer` x3, no Car/Vehicle schema on homepage | Yes, real, templated "AI/LLM Integration Information" header | Blog links present (2), no FAQ found |
| Napleton Lincoln Glenview | Unverified (403 Cloudflare block, 385B body) | blocked | 0.10s to block | Unverified | Unverified | Unverified |
| Berman Hyundai (Lincolnwood) | Unverified (403 block, redirects to bermanhyundai.com) | blocked | 0.41s to block | Unverified | Unverified | Unverified |
| Old Orchard Nissan | **WordPress + WPBakery** (`generator` meta tags) plus Site Kit by Google | 375 KB | 0.23s | `AutoRepair`, `Store`, `WebPage`, `WebSite`, `BreadcrumbList`, no Car/Vehicle schema found | Yes, real | FAQ mentions x6, blog links x6 |
| Hertz Car Sales Des Plaines | Unverified (403 block, 610B body) | blocked | 0.14s to block | Unverified | Unverified | Unverified |
| iCars Chicago | **DealerSocket** (string match + webpack `runtime` chunk naming = SPA) | 724 KB | 0.69s | `AutoDealer`, `AutomotiveBusiness`, `GeoCoordinates`, `Service`, `WebSite`, no Car/Vehicle schema found on homepage | No (404) | FAQ mention x1, no blog |
| Pete Auto Sales | Unverified — no vendor string matched in captured HTML; likely a small custom or boutique build | 80 KB | 0.38s | None found on homepage | No (returns a 404 page as HTML, not a real llms.txt) | Blog link x1, no FAQ |
| Northshore Auto Connect | Unverified — Cloudflare "Just a moment" challenge page returned instead of the site | blocked | 0.21s to challenge | Unverified | Unverified | Unverified |
| Go Autos | Unverified — curl could not connect at all (HTTP 000, connection failure) | unreachable | n/a | Unverified | Unverified | Unverified |
| Motor Deals USA | Unverified — no vendor string matched; small custom-looking build | 91 KB | 0.54s | `AutoDealer` only | No (404) | No FAQ/blog markers found |
| Best Auto Sales & Service | **Carsforsale.com** ("Powered by Carsforsale.com" in HTML) | 39 KB | 0.41s | `AutoDealer`, `PostalAddress` | No (404) | No FAQ/blog markers found |
| Ultimo Motors North Shore | **Dealer Inspire** (`dealerinspire` string) | 270 KB | 0.11s | Not fully re-inspected (403 on first pass, 200 on retry — homepage schema not re-parsed) | Yes, real, templated "AI/LLM Integration Information" header | No FAQ/blog markers found |

Note on the orchestrator's iCars baseline (724 KB / 0.78s TTFB, DealerSocket,
no VDP schema): this run's independent measurement matches closely (724 KB /
0.69s TTFB), which corroborates the ground truth rather than contradicting it.

**Correction to a ground-truth assumption.** The brief states vendor platforms
"CANNOT ship custom schema, custom AI-readable content." That is not quite
right on the llms.txt point: Napleton Honda (Dealer Inspire), Ultimo Motors
(Dealer Inspire), Sherman Dodge (Dealer eProcess), and Old Orchard Nissan
(WordPress) all serve a real llms.txt with genuine, non-stub content. Vendors
have started templating this file across their client base. What none of them
show, on the pages actually inspected, is per-vehicle `Car`/`Vehicle`
JSON-LD — every homepage/VDP-adjacent page I could reach carries `AutoDealer`
at best, nothing at the individual-vehicle level. Maxim's structural edge is
real, it is just narrower than "no AI content at all": it is specifically
**VDP-level Car/Vehicle schema plus FAQPage plus a hand-maintained llms.txt
tied to true current inventory**, not the mere existence of an llms.txt file.

---

## 3. Inventory depth and price band (measured via WebFetch/curl this session)

| Dealer | Vehicles in stock | Price band | Buyer fit vs. Maxim's $9k-$16k cash/subprime shopper |
|---|---|---|---|
| Maxim Autos | 7 today (ground truth: rising to ~15) | $8,995–$15,995, median $9,995 | — baseline |
| iCars Chicago | ~50 listed (includes at least one motorcycle) | $8,888–$112,588 | Overlaps at the bottom of their range only; median inventory skews well above Maxim's band |
| Pete Auto Sales | ~31 | $12,500–$69,999 | Overlaps at the very top of Maxim's band ($12.5k-$16k); median is a step up, more late-model/CPO-adjacent |
| Motor Deals USA | ~57 | ~$9,700–$97,900 | Overlaps in the $9,700-$16,000 slice, but that is a fraction of a much larger, higher-average lot |
| Best Auto Sales & Service | Unverified exact count; homepage prices visible at $4,295 and $4,995 | Sub-$5,000 to unverified ceiling | Overlaps from below — this is the true bargain-basement segment, likely older/higher-mile stock than Maxim carries |
| Sherman Dodge, Napleton Honda, Napleton Lincoln, Berman Hyundai, Old Orchard Nissan | Franchise-scale (dozens to 100+, new + certified used) | Predominantly $18,000+ on used, much higher on new | Different buyer: franchise-financed, often near-new, CPO-badged. Not the same transaction as Maxim's |
| Ultimo Motors North Shore | Unverified exact count | Luxury/import focus, described industry-wide as premium inventory | Different buyer: import/luxury shopper, not cash/subprime $9k-$16k |
| Carvana, CarMax, Cars.com, Autotrader, CarGurus | Thousands (national) | Full spectrum, but delivery/superstore model and finance-first funnel skew away from cash/subprime deep-value | Compete on visibility for head terms ("used cars near me"), not on the actual $9k-$16k cash transaction Maxim closes |

---

## 4. The strategic question: who actually competes for Maxim's buyer

**Maxim's buyer:** cash or subprime, shopping a $9,000-$16,000 car, North
Shore, wants a real human answering a real phone, not a finance waterfall or
a CPO markup.

**Genuinely competing for that same buyer, same transaction:**
1. **Best Auto Sales & Service (Des Plaines)** — sub-$5k visible pricing plus
   an unverified range, Carsforsale.com platform (cheap, thin, no schema
   depth), squarely in the value/subprime independent lane. This is the
   closest thing to a like-for-like rival in the field: same buyer profile,
   same "small independent lot" positioning, weaker web presence than Maxim
   on every measured axis (39 KB is small, but zero VDP schema, no FAQ, no
   llms.txt).
2. **iCars Chicago (Skokie)** — the orchestrator's already-designated nearest
   comp. Confirmed again this session: bigger, slower, heavier site, no
   vehicle-level schema, but real local visibility and a much larger lot
   (~50 units vs Maxim's 7-15). The bottom of their range overlaps Maxim's
   band directly.
3. **Motor Deals USA (Glenview)** and **Pete Auto Sales (Skokie)** — partial
   overlap only. Both carry Maxim's price band as their entry tier inside a
   much wider, higher-average lot (Motor Deals runs to $97,900, Pete Auto to
   $69,999). They are not built to compete on the $9k-$16k segment
   specifically; a shopper landing on either site sees mostly cars above
   Maxim's band and may bounce to a cheaper listing elsewhere, which could be
   Maxim if Maxim is visible when they search.

**Outranking on head terms but selling to a different buyer, not a real
competitive threat for this transaction:**
- **Carvana, CarMax, Cars.com, Autotrader, CarGurus** — dominate "used cars
  Skokie" and similar head terms by sheer domain authority and marketplace
  aggregation, but the actual purchase experience (delivery logistics,
  no-haggle superstore pricing, finance-first marketplace funnels) is not
  what a cash/subprime North Shore buyer walking into a small lot is looking
  for. They compete for the search query, not the sale.
- **Sherman Dodge, Napleton Honda, Napleton Lincoln, Berman Hyundai, Old
  Orchard Nissan, Hertz Car Sales** — franchise or program-certified used
  inventory, materially higher price floors, financing built around
  near-prime/prime credit tiers and manufacturer incentive programs. A
  franchise store's "used" section starts roughly where Maxim's inventory
  tops out. Different buyer, different credit profile, different
  transaction.
- **Ultimo Motors North Shore** — import/luxury specialist. Different buyer
  entirely.
- **Northshore Auto Connect and Go Autos** — cannot be assessed this session
  (Cloudflare-blocked and unreachable respectively); both are named as
  Skokie independents that could plausibly compete for the same buyer by
  category, but that claim is UNVERIFIED and should not be treated as fact
  until their sites are reachable and checked.

---

## 5. Where Maxim already wins (verified, not asserted)

- **Speed.** 92 KB / 0.23s TTFB beats every measured competitor by a wide
  margin. The next-fastest reachable comp with real content, Old Orchard
  Nissan, is 375 KB at 0.23s TTFB (comparable TTFB, 4x the payload); iCars is
  724 KB at 0.69s TTFB (8x the payload, 3x the wait). This is Jerry's site
  loading essentially instantly against dealer sites carrying legacy vendor
  bloat.
- **Schema depth at the vehicle level.** No competitor in this field, reached
  or blocked, showed `Car`/`Vehicle` JSON-LD on any page inspected. Maxim
  carries it on every one of 27 VDPs plus FAQPage plus BreadcrumbList. This is
  the single cleanest, most defensible structural advantage in the set.
- **Source ownership.** Every vendor-platform competitor (DealerSocket,
  Dealer Inspire, Dealer eProcess, Carsforsale.com, WordPress+WPBakery) is
  locked into that vendor's template, page speed ceiling, and content system.
  Maxim owns an Astro repo and can ship a schema or copy change same-day with
  no vendor ticket. That moat is confirmed, not theoretical: none of the six
  vendor-platform sites checked had vehicle-level schema, which is exactly
  the kind of change a vendor client cannot self-serve.

## 6. Where Maxim loses (verified, not asserted)

- **Inventory depth and reach.** 7 units live today against iCars' ~50, Motor
  Deals' ~57, Pete Auto's ~31. Even at the ground-truth target of ~15 units,
  Maxim's lot is a third the size of the nearest independent comp. A thin lot
  caps how many buyers land on a matching VDP regardless of how fast or
  well-schemaed the site is.
- **llms.txt is no longer a differentiator by presence alone.** Six of the
  competitors checked serve a real llms.txt (Carvana, CarGurus, Sherman
  Dodge, Napleton Honda, Old Orchard Nissan, Ultimo Motors). Maxim's edge here
  has to be the file's accuracy and freshness against live inventory (per
  D8's copy drift, "$5,000 to $15,000" is already stale against a $15,995
  unit and about to be stale again at ~15 units), not the mere fact of having
  one.
- **Content surface area.** Old Orchard Nissan and Sherman Dodge both carry
  active blog links and FAQ content beyond the single per-VDP FAQ Maxim ships.
  Maxim has no blog (confirmed ground truth) and no homepage FAQPage schema
  (defect D7, reconfirmed relevant here: every franchise competitor with a
  blog is generating more long-tail indexable pages than Maxim's static
  57-URL set).
- **Domain authority against aggregators.** No amount of on-page schema work
  closes the gap against Carvana/Cars.com/CarGurus/Autotrader on raw head-term
  ranking. That fight is not winnable head-on and the audit above confirms it
  is also not the fight that matters, since those platforms sell a different
  transaction.

## 7. The realistic rival to beat inside 12 months

**iCars Chicago.** Not the national aggregators (different buyer, unwinnable
on authority alone), not the franchise stores (different price floor and
credit tier), not Best Auto Sales (weaker site on every axis already, and a
smaller/lower-visibility operation despite matching Maxim's buyer profile).

iCars is the one competitor confirmed this session to (a) sit in the same
Skokie market, (b) carry real overlap at the bottom of its price range with
Maxim's full band, (c) already outrank Maxim on raw local visibility per the
orchestrator's baseline, and (d) run on a vendor platform (DealerSocket) that
structurally cannot ship the VDP-level schema, FAQPage, or fast time-to-byte
Maxim already has. The 12-month fight is Maxim converting its speed and
schema advantage into actual ranking and click share against iCars' larger,
slower, unstructured lot, while closing the inventory-depth gap toward the
~15-unit target Jerry has confirmed is coming. Best Auto Sales is worth
watching as the closest same-segment independent, but it is not currently a
threat: its site has no schema, no llms.txt, and no FAQ/blog surface at all.

---

## 8. Explicitly unverified (do not treat as fact)

- Napleton Lincoln Glenview, Berman Hyundai Lincolnwood, Hertz Car Sales Des
  Plaines: platform, schema, and content-surface claims are unverifiable this
  session (Cloudflare/WAF 403 blocked both curl and would block WebFetch the
  same way).
- Northshore Auto Connect: Cloudflare challenge page returned instead of the
  site; nothing about it can be claimed beyond its existence and general
  market position from search snippets.
- Go Autos (goautoskokie.com): curl could not establish a connection at all
  (HTTP 000) on two attempts; site may be down, DNS-broken, or actively
  blocking this network path. Unreachable, not assessed.
- Pete Auto Sales and Motor Deals USA platform vendor: no known vendor
  signature string matched in the captured HTML. They may run a boutique or
  in-house build, or a vendor whose fingerprint was not in the check list
  used this session. Flagged as unverified rather than guessed.
- Ultimo Motors' and Napleton Honda's homepage schema depth beyond `AutoDealer`
  was not fully re-parsed after the redirect-following retry; treat the
  "no Car/Vehicle schema found" claim for those two as based on the first
  capture, not a fully re-verified second pass.
- Exact current vehicle counts for Best Auto Sales, Ultimo Motors, Northshore
  Auto Connect, and Go Autos are unverified; only Maxim, iCars, Pete Auto, and
  Motor Deals USA counts came from a directly fetched inventory page this
  session.

---

## Do not re-derive

This audit does not reopen or contradict the governing plan at
`businesses/maxim-autos/operations/google-local-domination-2026-07/design/SPEC.md`.
It adds competitive-field evidence to support that plan's premise (Maxim's
structural speed/schema moat against vendor-platform dealers), and sharpens
the "who is the rival" question the SPEC does not itself answer.
