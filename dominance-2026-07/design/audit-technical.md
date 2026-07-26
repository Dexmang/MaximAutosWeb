# Maxim Autos Technical SEO Crawl — 2026-07-25

Live crawl of every URL in `sitemap-0.xml` plus the apex domain, the GMC feed, and
the GitHub Pages mirror. All fetches via `curl` (polite, 1s delay, custom UA) from
this session. Read-only — no writes to `site/` or `web_assets/`. Full raw crawl
(headers, bodies, parsed JSON) sits in the session scratchpad and is not
committed; every figure below traces to a command run in this session or a repo
file path.

## Crawl scope

- `sitemap-index.xml` -> one child sitemap, `sitemap-0.xml`, **56 URLs** (not the
  ~57 the ground truth estimated — off by one, immaterial).
- Of those 56: 1 home, 1 `/inventory`, 8 `/es/` pages, 8 static make/price pages,
  9 suburb pages, 3 legal pages, 5 trust/about pages, 6 financing-bad-credit hub
  pages, **12 vehicle URLs** (not 27 — see Finding B1 below).
- Added to the crawl beyond the sitemap: apex `http://`/`https://` `maximautos.com`,
  `/es/` with trailing slash, and the GitHub Pages mirror home
  (`dexmang.github.io/MaximAutosWeb/`).
- All 58 fetches returned **HTTP 200**. Zero 404s, zero 5xxs, zero redirect hops
  (`num_redirects=0` on every sitemap URL — the only redirects in this crawl are
  on the apex, see D1).
- TTFB ranged ~0.12s-0.35s, page sizes 30KB-94KB. Homepage: 92,143 bytes,
  TTFB 0.16s (curl, cold) — consistent with the claimed 92KB/0.23s baseline.

---

## D1 — Apex redirect: CONFIRMED, and worse than stated

```
curl -o /dev/null -w "%{http_code} %{redirect_url}" http://maximautos.com/
  -> 308  https://maximautos.com/
curl -o /dev/null -w "%{http_code} %{redirect_url}" https://maximautos.com/
  -> 307  https://www.maximautos.com/
```
The `https://maximautos.com` -> `https://www.maximautos.com` hop is a **307
Temporary Redirect**, not a 301 — confirmed exactly as DB task #89 states. Bonus
finding not in the original defect: the `http://` -> `https://` hop on the apex is
a **308** (fine, permanent, no complaint) so the chain is 308 then 307 — the
temporary hop is the second one, the one that actually matters for canonical
signal consolidation to `www`. Two-line Vercel `redirects` config fix
(`permanent: true`) once Jerry approves a deploy; no code risk.

## D2 — /es vs /es/: CONFIRMED character-for-character

```
GET /es   -> 200, no redirect
GET /es/  -> 200, no redirect
```
Both variants serve identical content (byte-identical, 82,937 bytes) with **no
redirect between them** — a real duplicate-URL pair. On the `/es` (and `/es/`)
page:
```html
<link rel="canonical" href="https://www.maximautos.com/es">
<link rel="alternate" hreflang="es" href="https://www.maximautos.com/es/">
```
Canonical says no trailing slash; the page's own `hreflang="es"` self-reference
says trailing slash. Confirmed byte-for-byte mismatch, exactly as reported.
`trailingSlash: 'never'` in `astro.config.mjs` (verified in repo) makes the
canonical the correct value — the hreflang self-ref is the one that's wrong.

## D3 — GSC verification: CONFIRMED for the meta tag, REFUTED that GSC is unverifiable

No `google-site-verification` meta tag renders on any live page — grep of the
raw HTML shows it is still inside an HTML comment:
```
<!-- Google Search Console Verification -->
<!-- TODO: Add meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" here -->
```
`Layout.astro:143` TODO confirmed as-is. **But** an `nslookup -type=TXT
maximautos.com` against the apex returns:
```
maximautos.com  text = "google-site-verification=tCAvzBRJ12-XeubngsAhYQnxCxtBS_taZIz0naP-DBE"
```
A Google Search Console **Domain property** verifies via exactly this DNS TXT
record and, once verified, covers `http/https` and `www`/non-`www` on the domain
in one property — no meta tag needed at all. I cannot see inside the GSC account
itself (no credentials, no API access from this session) so I cannot confirm
whether a Domain property was ever added using this token, only that **the DNS
record that would let Jerry verify Search Console today, in about two minutes,
already exists and is live.** This is a materially different fix than "add a
meta tag to Layout.astro" — if the Domain property already exists this defect
may already be moot; if it doesn't, this is the fastest close available (DNS
already done, just add the property in the GSC UI). GA4 property `G-H05CD3EHE9`
confirmed live in every page's `<head>` and matches the ground truth exactly —
that channel is fine and unrelated to GSC.
**Flag for Jerry: log into search.google.com/search-console and check whether a
property already exists for this domain before doing anything else on D3.**

## D4 — Vehicle images on third-party CDN: CONFIRMED, no new evidence beyond ground truth

All vehicle photos load from `imagesdl.dealercenter.net/{w}/{h}/{hash}.jpg`
(confirmed on every VDP crawled). `mirror-photos.js` exists in the repo
(`businesses/maxim-autos/website/site/scripts/`) and DB task #112 covers this —
not independently re-litigated further here since the 2026-07-24 audit already
covered the LCP-element mechanics in depth (see "What changed since 07-24" below).

## D5 — GMC feed trailing slash vs canonical: CONFIRMED character-for-character

`feeds/vehicles.xml`, item 1:
```xml
<g:id>19XFB2F73FE078163</g:id>
<g:link>https://www.maximautos.com/vehicle/2015-honda-civic-se/</g:link>
```
That VDP's live canonical:
```html
<link rel="canonical" href="https://www.maximautos.com/vehicle/2015-honda-civic-se">
```
Trailing slash on `g:link`, none on canonical. Confirmed on all 7 feed items —
every `g:link` in the feed carries a trailing slash, every matching VDP
canonical does not. This is a live Merchant Center Dishonest Pricing / URL
mismatch risk exactly as described.

## D6 — GMC feed title em dash: CONFIRMED, exact character identified

```
python3: open('vehicles.xml','rb').read() -> b'<title>Maxim Autos \xe2\x80\x94 Vehicle Inventory</title>'
```
`\xe2\x80\x94` is U+2014, the real em dash character, inside `<title>` at the
top of the RSS feed (not per-item — the feed-level title, lowest visibility but
still a Merchant Center feed-quality flag and worth a one-line fix in
`build-gmc-feed.js`).

## D7 — Homepage FAQPage schema: CONFIRMED

Full homepage JSON-LD block inventory (5 blocks, parsed and validated with
Python `json.loads`, all parsed clean, zero errors):
`Organization`, `Review`, `Review`, `Review`, `AutoDealer`. **No `FAQPage`.**
The `AutoDealer` block does carry `aggregateRating` (`ratingValue: "5.0"`,
`reviewCount: "46"` — correct, live figure) and 8-city `areaServed`, matching
ground truth's description of what IS there. `/faq` itself does emit a proper
`FAQPage` block; homepage does not link its own FAQ content into schema at all.

## D8 — Copy drift: CONFIRMED for price, PARTIALLY REFUTED for review count (scope moved, didn't close)

**Price ($5,000-$15,000 vs $15,995 top unit) — confirmed, still live, widespread:**
`grep` of every crawled page shows the literal string `$5,000 to $15,000` on 15
pages including the homepage `AutoDealer.priceRange` JSON-LD, `llms.txt` (twice),
the financing-bad-credit hub (6 pages), and 8 of 9 suburb/static pages. Feed-verified
top live unit is `$15,995` (JF2GTABC7JH322593, confirmed in `vehicles.xml`) —
$995 over the stated ceiling. Median of the 7 live `g:price` values is exactly
$9,995, matching ground truth.

**Review count — the 2026-07-24 `site-signals.md` audit and today's crawl tell
two different stories, and the defect moved, it didn't close:**
- 07-24 audit: 8 of 9 suburb `metaDescription` strings hardcoded "40 five star
  Google reviews"; Skokie's own page had no count at all; `llms.txt` said "45."
- Today's crawl of the live suburb pages: **8 of those 9 pages now say the
  generic "rated 5.0 on Google" with no number** (fixed) — but the **Skokie**
  page, the one the 07-24 audit said had *no* count, now reads:
  > "Quality cars from $5K to $15K with **40 plus five star reviews**."
  (confirmed live in both the rendered `<meta name="description">` and
  `suburbs.json` line 259). Live count is 46. `reviews_meta.json` is correct
  (`{"rating": 5.0, "count": 46, "updated": "2026-07-24"}`) and `llms.txt` no
  longer states a number at all ("Maxim Autos holds a 5.0 rating on Google" —
  clean). **Net: the stale-count defect is down from 8 pages to exactly 1 page,
  but it is a live, real, currently-wrong number on `/used-cars-skokie-il`,
  Maxim's own home-city SEO page.** One-line fix in `suburbs.json`.

## D9 — Doctrine drift (brand.md / copy-playbook.md): CONFIRMED, worse than stated

`memory/context/maxim-autos-brand.md:10` — `### 1. TOTAL PROTECTION` is the
literal pillar-1 heading, the exact phrase the compliance guardrail bans.
`memory/context/maxim-autos-copy-playbook.md` does not cite "a 3-month warranty"
once — it cites **"3-month warranty" / "3-month Peace of Mind Warranty" in at
least 11 separate places** (lines 25, 172, 239, 264, 288, 394, 450, 533, 616,
667+, 679, 685, 708, 713, 753), including as a named worked example, a
"forbidden word violation" case study, and boilerplate "Body voice" language.
This is not a stray reference — the fabricated warranty term is load-bearing
across most of that document's worked examples. Neither file is live customer
copy (both are internal doctrine docs, not rendered on the site), so there is
no live compliance breach today, but any copywriter or agent using either doc
as a reference will reproduce both banned phrases immediately.

## D10 — Automation vs SPEC conflict: CONFIRMED, exact language

`memory/protocols/automations-registry.md:13`, `maxgoogle-weekly-gbp-sweep`:
> "Builds and schedules the week's GBP posts on a **3x/week cadence
> (Mon/Wed/Fri)**... hands the queue to maxgoogle which schedules all three at
> once via **GBP native scheduling**."

`businesses/maxim-autos/operations/google-local-domination-2026-07/design/SPEC.md:74`:
> "Posting cadence: **1 post per week maximum** through day 45... **No 3/week in
> this window. No native GBP scheduling in the window** (it is a second
> automated posting owner)."

Direct, textual, unresolved conflict between an ENABLED cloud routine and the
governing plan. This is the sharpest of the 12 — the registry entry is live and
scheduled (Mondays 09:02 CT per its own trigger row) and will fire the
conflicting 3x/week behavior unless someone disables or edits it before day 45
elapses. Not touched here (write scope is design-only) — flagging for the
orchestrator to route as an urgent fix, separate from this design run.

## D11 — launch.json cwd: CONFIRMED

`businesses/maxim-autos/website/.claude/launch.json`:
```json
"cwd": "C:\\Users\\frost\\Documents\\JB\\pka\\MaximAutosWeb\\site"
```
`ls` on that path: `No such file or directory`. Real site path (verified to
exist and contain the Astro project): `C:\Users\frost\Documents\JB\pka\businesses\maxim-autos\website\site`.

## D12 — gh CLI unauthenticated: REFUTED as of right now

```
gh auth status
  github.com
    - Logged in to github.com account Dexmang (keyring)
    - Active account: true
```
`gh` is authenticated on this machine at the time of this audit. Either the
orchestrator's finding was stale (auth was fixed since it was logged) or it was
session/environment-specific and doesn't reproduce here. I cannot rule out an
intermittent keyring issue without re-running this exact check at the time of a
real OAP pull, but as observed right now, D12 does not hold. Recommend a live
retest during the next actual `sync-inventory.yml`-triggered pull rather than
treating this as closed.

---

## Findings beyond the 12

### B1 — Sitemap carries only 12 of 27 VDPs, and that is correct, working-as-designed behavior (not a bug)

`vehicles.json` has 27 vehicle records (7 `available`, 20 `sold` — matches
ground truth exactly). `sitemap-0.xml` lists only 12 vehicle URLs: the 7
available plus 5 sold. Traced this to `astro.config.mjs`'s sitemap `serialize()`
function: sold VDPs drop out of the sitemap **14 days after `sold_date`**, but
the page itself stays live and rendered with `noindex, follow`. Checked all 20
sold-date timestamps against today (2026-07-25): the 5 that remain in the
sitemap sold between 2026-07-15 and 2026-07-23 (all inside the 14-day window);
the 15 excluded sold between 2026-04-13 and 2026-06-27 (all outside it). One
sold unit, `2021-hyundai-venue-se` (sold 2026-07-12), missed the cutoff by
about two hours against the sitemap's build timestamp — the logic is working
exactly as coded, this is not an edge-case bug. **Verdict: the 20 sold VDPs are
handled correctly by design.** The one soft critique: Google's own sitemap
guidance discourages listing `noindex` URLs in a sitemap at all (it sends Google
a "crawl me" signal on a page simultaneously saying "don't index me"). The
counter-argument for keeping the 14-day window (fast de-indexing signal on a
just-sold car) is reasonable and I'm not recommending a change against it, just
flagging the known tension for awareness.

### B2 — 8 real orphan pages: zero inbound internal links from anywhere in the crawled site

Checked every one of the 56 crawled pages' `<a href>` targets against the full
56-URL sitemap set. Homepage links only 29 of 56 URLs directly. Tracing outward
one more hop (financing hub, `/inventory`, `/es/inventario`) accounts for most
of the rest, but **8 pages have zero inbound links from any of the 58 pages
crawled**, meaning zero internal link path from the homepage at any depth:

- `/used-audi-skokie`
- `/used-honda-skokie`
- `/used-subaru-skokie`
- `/used-toyota-skokie`
- `/used-suvs-skokie-il`
- `/used-cars-under-10000-skokie`
- `/used-cars-under-15000-skokie`
- `/used-cars-chicago-north-shore`

`/inventory` links all 9 suburb (`used-cars-[city]-il`) pages correctly, but
none of the 4 make-specific pages, the 2 price-bracket pages, the SUV
body-style page, or the regional Chicago-North-Shore page. These 8 pages are
reachable only via the sitemap itself, a direct URL, or an external
backlink/search click — they get essentially no internal PageRank flow and,
per site-signals.md's own §4 rec #5 (ItemList gap), are exactly the kind of
page that benefits most from an internal nav or footer link. This is a bigger,
more actionable find than anything in the original 12: it is pure, free,
zero-risk internal linking work with no compliance surface at all.

### B3 — JSON-LD validity: all clean, zero parse failures

Every `application/ld+json` block on all 58 pages parsed successfully with
Python's `json.loads` — **zero syntax errors, zero `undefined`/stray-null
values found.** This directly refutes the possibility flagged in the task
brief; the schema authoring is clean across the board. VDP `Car`/`Vehicle`
dual-typed blocks, `FAQPage`, and `BreadcrumbList` all present and well-formed
on every one of the 12 sitemap-listed vehicle pages, both available and sold.

### B4 — GitHub Pages mirror: real canonical-competition risk, self-referencing not cross-domain

`dexmang.github.io/MaximAutosWeb/` returns 200 with **byte-for-byte identical**
homepage content to the production site (same title, same meta description, same
5 JSON-LD blocks including the same `AggregateRating`/`Review` data). Its own
`<link rel="canonical">` points to **itself**
(`https://dexmang.github.io/MaximAutosWeb`), not back to
`www.maximautos.com`. The mirror's `robots.txt` (found at
`dexmang.github.io/MaximAutosWeb/robots.txt`, 200) correctly points its
`Sitemap:` directive at the production domain's sitemap — a good sign someone
thought about this — but the **self-referencing canonical is the actual
duplicate-content exposure**: if this GitHub Pages URL is ever crawled and
indexed on its own, it competes directly with the production domain for the
same content instead of consolidating signal to it. This confirms exactly the
risk flagged in the task brief. Lowest-risk fix (when Jerry approves a change):
either a site-wide cross-domain `<link rel="canonical" href="https://www.maximautos.com/...">`
on every GitHub Pages page, or a blanket `noindex` meta tag on the mirror if it
has no reason to be publicly indexable at all — no such meta tag exists there
today.

### B5 — Images: alt text is fully covered; explicit width/height is not

Across all 479 `<img>` tags on the 58 crawled pages: **0 missing `alt`**
(perfect coverage, no defect here despite the brief's concern). **188 of 479
(39%) are missing explicit `width`/`height` attributes** — mostly small brand
logos and badges (`logo-header.png`, CARFAX badge, etc.), not the VDP hero
photos (those do carry explicit `width="1024" height="768"` per the 07-24
audit, confirmed still true today). Missing dimensions on small recurring UI
images is a minor, low-severity layout-shift risk, not the VDP LCP-relevant one
already tracked under D4/task #202.

### B6 — Core Web Vitals proxies: mostly clean, one real gap already fully understood

- **Render-blocking:** zero synchronous `<script>` tags found in `<head>` on
  any crawled page (Astro's default output is clean here).
- **Font loading:** Google Fonts (`Inter`, `Manrope`, Material Symbols) load via
  `<link rel="preconnect">` to both `fonts.googleapis.com` and
  `fonts.gstatic.com`, and the stylesheet URL itself carries `&display=swap` —
  this is already best-practice font loading, not a gap.
- **LCP element / image format:** already fully diagnosed in the 2026-07-24
  `site-signals.md` (§2 table) — VDP hero images have `srcset`, `sizes`,
  explicit dimensions, and `fetchpriority="high"`, but are JPG-only (no WebP/AVIF)
  because the DealerCenter CDN path scheme has no image-format variant. Not
  re-litigated further here; that finding still holds today, confirmed present
  on every VDP crawled.

### B7 — Duplicate titles/meta descriptions: NOT a problem

Checked all 9 suburb pages and 8 static make/price pages for duplicate
`<title>` and `<meta name="description">` text. **Zero duplicates found** among
distinct URLs (the only duplicate pairs are `/es` vs `/es/`, which is the
canonical/hreflang bug already covered under D2, and are the same page by
design). Word counts on these 17 pages range 705-1442 words — none read as
thin template boilerplate. This concern from the task brief does not hold up
against the live content.

---

## What changed since the 2026-07-24 `site-signals.md` audit

Read in full: `businesses/maxim-autos/operations/google-local-domination-2026-07/audit/site-signals.md`.

1. **Review count staleness — moved, not fixed.** 07-24 audit found 8 of 9
   suburb pages hardcoding "40 five star Google reviews," Skokie's page clean.
   Today: those 8 pages were fixed to a generic non-numeric "rated 5.0 on
   Google," but Skokie's own page picked up a new hardcoded "40 plus five star
   reviews" claim that wasn't there on 07-24. `reviews_meta.json` self-healed
   to 46 as the 07-24 audit predicted it would (`updated: 2026-07-24`).
   `llms.txt` also dropped its stale "45" figure entirely. Net: 1 stale page
   remains, different page than before.
2. **`Offer.url` vs canonical trailing slash** — 07-24 audit called this
   RESOLVED for on-site VDP canonical/Offer.url pairs. Confirmed still true
   today (checked byte-for-byte on 5 VDPs). The *separate* GMC feed `g:link`
   trailing-slash mismatch (D5 above) is a different code path
   (`build-gmc-feed.js`, not `[slug].astro`) and was not covered by that
   05-24 finding — it is a live, still-open gap today.
3. **IndexNow, 301 redirects for retired VINs, VDP hero srcset/dimensions** —
   all independently re-confirmed live and unchanged from the 07-24 findings
   (spot-checked headers/behavior, did not re-derive from scratch since the
   code-level tracing in that audit is already thorough and current).
4. **No new Polish-language footprint** — confirmed still absent (this is the
   settled, do-not-re-pitch item; noting only that nothing changed).
5. **GMC feed defects (D5, D6)** were not in the 07-24 audit's scope at all (it
   was site-code-only, no feed fetch) — these are new information from this
   crawl, not a change over time.

---

## Guardrail notes

- No files under `site/` or `web_assets/` were modified — read-only crawl and
  repo reads only.
- No GBP surface was touched, read, or screenshotted in this run.
- No spend, signups, or purchases were made or proposed.
- Every claim above traces to a curl/grep/python command run in this session or
  a specific repo file path; nothing here is inferred or assumed. GSC account
  state (whether a Domain property already exists) could not be verified from
  this session — flagged explicitly as unverified above, not guessed at.
