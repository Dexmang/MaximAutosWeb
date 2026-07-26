# UX and Conversion Design: Maxim Autos
### Targeted upgrades, not a redesign. Navy #0a2540, orange #f08010, Manrope headline, Inter body all retained.

Author: UX and conversion design lane
Date: 2026-07-25
Scope: 4 surfaces plus 1 signature surface
Constraint honored: design only. No file under `site/` or `web_assets/` was written or modified in this run.

---

## 0. Ground rules I am designing inside

| Rule | How this design honors it |
|---|---|
| Reg Z footnote verbatim on any surface rendering a vehicle card or a payment | Every new surface below carries the exact string. See §6.7. |
| Never "certified" | No new copy uses it. Existing copy already avoids it. |
| Never "guaranteed" financing | Budget mode says "estimated payment range", never "you qualify". See §5.4. |
| Powertrain always "on qualifying cars" | Untouched. No new powertrain copy introduced. |
| Zero doc fee, all in sticker | Promoted from a small green callout into a priced line item. This is the whole signature surface. |
| Every English disclosure needs its Spanish equivalent | Every new disclosure is specified in both, and §6.7 fixes a live Spanish drift I found. |
| No em dashes, no hyphenated compounds in copy | Honored in all new copy. One deliberate exception is documented in §6.7. |

**Collision I hit and how I resolved it.** The mandated Reg Z string contains "60-month", a hyphenated compound. The verbatim rule outranks the style rule. The string ships exactly as written and the build phase must not "fix" it:

```
* Est. payment based on 10% down, 9.9% APR, 60-month term. For illustrative purposes only. Actual terms vary by credit.
```

---

## 1. What I verified myself before designing

Everything below is read from the repo this session, not inherited.

**Live inventory, `site/src/data/vehicles.json`, 27 records, 7 with `status !== 'sold'`:**

| Stock | Vehicle | Price | Body | Drive | Miles | Deal |
|---|---|---|---|---|---|---|
| J10217 | 2018 Chevrolet Trax | $8,995 | SUV | AWD | 106,773 | Fair |
| J10215 | 2014 Kia Forte | $9,495 | Sedan | *(blank)* | 42,323 | Fair |
| J10210 | 2015 Honda Civic | $9,995 | Sedan | FWD | 130,772 | Good |
| J10216 | 2015 Subaru Legacy | $9,995 | Sedan | AWD | 91,170 | Good |
| J10206 | 2015 Volvo XC60 | $10,450 | SUV | AWD | 115,181 | Fair |
| J10205 | 2016 Honda CR-V | $11,580 | SUV | AWD | 141,079 | Fair |
| J10218 | 2018 Subaru Crosstrek | $15,995 | SUV | AWD | 79,779 | Good |

Live band: **$8,995 to $15,995**. Median $9,995. Six makes. Two body styles. One unit with a blank `drivetrain`.

**Data shape:** 38 keys per record. `makeSlug`, `bodyStyleSlug`, `stockNumber`, `dealRating`, `priceSavings`, `photoUrls`, `highlights`, `inspection`, `warranty` all exist. **`mpg` does not exist**, which matters in §3.
`inspection` is the boolean `true`, not a report. That kills a candidate innovation. See §7.

**External facts, cited:**

| Fact | Value | Source | Confidence |
|---|---|---|---|
| Skokie motor vehicle sales tax rate | 7.25% (vs 10.25% general merchandise) | https://www.skokie.org/Faq.aspx?QID=134 quoted verbatim: "The sales tax in Skokie is 10.25% on general merchandise and 7.25% on the purchase of a motor vehicle." | **Verified**, primary municipal source |
| Home rule sales tax does not apply to titled vehicles | Confirmed | https://tax.illinois.gov/research/taxinformation/sales/homerule.html quoted: local home rule tax is imposed on the state base "excluding tangible personal property that must be titled or registered by an agency of state government" | **Verified**, primary state source. This is why the car rate is 7.25% and not 10.25%. |
| Illinois certificate of title fee | $165 | Illinois Secretary of State, corroborated across several independent sources citing the ilsos.gov FAQ | **Corroborated, not primary.** ilsos.gov timed out on every attempt from this environment (WebFetch 60s timeout x3, `curl` HTTP 000 after 60s). |
| Illinois passenger registration / plates | $151 | Same | **Corroborated, not primary.** Same reachability problem. |
| Illinois maximum documentary service fee, 2026 | $377.63, indexed annually to CPI | Multiple secondary sources; Illinois Administrative Code Part 475 governs the "plus" disclosure format | **Unverified against a primary source.** illinoisdealers.com returned HTTP 403. |

> **Build phase gate.** The title fee, plate fee, and doc fee cap must each be confirmed against `ilsos.gov` before the signature surface ships. They are isolated in one data file (`il-fees.json`, §5.2) with a `source` and `verifiedOn` per line precisely so this is a five minute check, not a code hunt. If the doc fee cap cannot be confirmed, ship the surface without the number: "Illinois allows dealers to charge a documentary fee. We charge zero." loses very little.

---

## 2. Surface 1: The inventory grid

`site/src/pages/inventory.astro`, 469 lines. Mirror at `site/src/pages/es/inventario.astro`.

### 2.1 The problem, with evidence

**A. Two of the five price chips are guaranteed dead ends today, and one of them hides the most expensive car on the lot.**

The buckets are hardcoded at `inventory.astro:143-146`:

| Chip | Filter logic | Cars it returns against the live set |
|---|---|---|
| Under $10K | `price < 10000` | 4 |
| $5K to $8K | `5000-8000` | **0** |
| $8K to $12K | `8000-12000` | 6 |
| $12K to $15K | `12000-15000` | **0** |

The 2018 Crosstrek at $15,995 is reachable by **no price chip at all**. A shopper who wants the nicest car on the lot and filters by price cannot find it. Meanwhile the "$5K to $8K" chip advertises a price tier Maxim has not stocked in months. Static buckets against rotating inventory will keep producing this class of failure at 15 units, not fewer.

**B. A filtered view cannot be linked, texted, or bookmarked.** `applyUrlParams()` at `:414-431` reads `price`, `body`, `drive` from the query string on load. Nothing ever writes them back. I grepped the whole file for `replaceState`, `pushState`, and `history.`: **zero matches**. So the hero chips at `index.astro:139-141` can push a shopper into a filtered view, but the shopper can never send that view to anyone. For a dealer whose primary channel is Jerry texting people, that is the single most expensive missing feature on the page.

**C. There is no make filter.** Make is the first filter a used car shopper reaches for. `makeSlug` is already in the data and unused on this page. At 15 units across roughly 10 makes, its absence forces a full visual scan.

**D. There is no mileage filter.** The live spread is 42,323 to 141,079 miles. For a $10k buyer, mileage is a larger purchase driver than drivetrain, which does have a filter.

**E. Sorting reads only the mobile select.** `applySorting()` at `:389` reads `sortSelect.value`, the mobile control. The desktop handler calls `syncSort()` first so it works; the mobile handler at `:457` does not, so the two controls can disagree after a rotate or resize.

**F. The empty state is a dead end.** `:247-255` offers "Clear All Filters" and nothing else. Jerry sources cars weekly and personally. The moment a shopper filters into zero results is the single highest intent moment on the site to capture what they actually want, and it currently captures nothing.

**G. Heading order violates document outline.** h1 at `:118`, h3 at `:264`, h2 at `:279`.

**H. Filter chips are under the touch minimum.** `px-3 py-1.5 text-xs` computes to 16px line box + 12px vertical padding + 2px border = **30px**, against the 44px guidance.

**I. No comparison.** Comparing the CR-V, the Crosstrek, and the XC60 requires three tabs.

### 2.2 The design

**Replace price chips with a single price ceiling slider.** One control, labeled "Show cars up to". Range is computed at build time from the live set (`Math.min` to `Math.max`, snapped to $500), so it can never advertise a tier that does not exist and can never exclude the top car. It matches how a budget buyer actually thinks: a ceiling, not a band. It permanently deletes the dead chip failure class.

**Add a mileage ceiling slider** on the same pattern, labeled "Miles up to".

**Add Make chips, derived from data**, `[...new Set(live.map(v => v.make))].sort()`.

**Put a live count on every chip and disable the zeroes.** This is the one design rule that makes dead ends structurally impossible. Each chip label becomes `Honda (2)`, and any chip whose count is 0 under the currently active *other* filters renders `disabled` with `opacity-40 pointer-events-none`. Counts recompute on every filter change. Over 15 records this is free.

**Write URL state on every change.**

```js
function syncUrl() {
  const p = new URLSearchParams();
  if (activeMake  !== 'all') p.set('make',  activeMake);
  if (activeBody  !== 'all') p.set('body',  activeBody);
  if (activeDrive !== 'all') p.set('drive', activeDrive);
  if (maxPrice    <  PRICE_MAX) p.set('maxPrice', maxPrice);
  if (maxMiles    <  MILES_MAX) p.set('maxMiles', maxMiles);
  if (sortVal     !== 'price-asc') p.set('sort', sortVal);
  if (compare.size) p.set('compare', [...compare].join(','));
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}
```

`replaceState`, deliberately not `pushState`: the back button should leave the page, not unwind eight filter taps.

**Crawl safety, checked.** `web_assets/robots.txt` already carries `Allow: /inventory$` and `Disallow: /inventory?`, so parameterized views are never crawled. The canonical tag is emitted server side by `Layout.astro` and points at `https://www.maximautos.com/inventory`; the client script must never touch it. `replaceState` changes the address bar only and cannot create a canonical conflict. **Build phase must not add a client side canonical rewrite.**

**Add a share control** next to the result count: a button reading "Copy this search" that writes `location.href` to the clipboard, with a "Text this search" variant on phones that opens `sms:` with the URL in the body. This is the feature that turns the URL work into revenue for a text first dealer.

**Add a compare tray.** A 44px checkbox on each card at top left with `z-20` so it beats the stretched link at `VehicleCard.astro:97`. Selecting two or three opens a bottom tray comparing the six fields that decide a used car purchase: price, estimated out the door, estimated monthly, mileage, drivetrain, deal rating. State lives in `?compare=slug-a,slug-b`, so a comparison is itself shareable. No backend. This is the second most differentiated thing on the site after §5.

**Turn the empty state into a capture.**

> **Nothing on the lot matches that right now.**
> Jerry sources cars every week and buys to order. Tell him what you want and he will look for it.
> `[ Clear filters ]  [ Text Jerry what I want ]`

The SMS button prefills the body from the active filters, for example: `Hi Jerry, I am looking for an AWD SUV under $12,000 with under 100,000 miles.` Zero new backend, uses the existing channel.

**Fix the mechanics:** `applySorting()` reads a single source of truth instead of the mobile select; the h3 at `:264` becomes an h2; chips go to `px-3.5 py-2.5 text-sm min-h-[44px]`.

**Blank drivetrain handling.** The Kia Forte has `drivetrain: ""`. Today it silently vanishes from every drivetrain filter and can never be found that way. Design: units with a blank drivetrain are treated as "unspecified" and are shown under any drivetrain selection with a small "drivetrain not listed" note on the card, rather than being hidden. At 15 units, hiding a car because a field is blank is a worse outcome than showing it.

### 2.3 Files that change

| File | Change |
|---|---|
| `site/src/pages/inventory.astro` | Replace the filter bar markup and the entire inline script |
| `site/src/pages/es/inventario.astro` | Same, Spanish labels, identical behavior |
| `site/src/components/VehicleCard.astro` | Add optional `compare` checkbox slot; add `data-make`, `data-mileage` to the wrapper |
| **NEW** `site/src/components/InventoryFilters.astro` | Filter bar, `lang` prop, so EN and ES cannot diverge again |
| **NEW** `site/src/components/CompareTray.astro` | Bottom tray, `lang` prop |

### 2.4 Measurable outcome

- Filter combinations returning zero results: from 2 of 5 price chips guaranteed empty, to **structurally zero** (disabled chips cannot be clicked; a ceiling slider cannot return zero above the minimum price).
- Filtered views become shareable. Instrument a GA4 event `copy_search_link` and `text_search_link`.
- Instrument `compare_open` with the number of vehicles compared.
- Instrument `empty_state_capture` on the SMS capture. Target: no session ends on the empty state without a capture offered.
- Touch targets on the mobile filter panel: 30px to 44px.

---

## 3. Surface 2: The VDP

`site/src/pages/vehicle/[slug].astro`, 1,180 lines. Rendered 27 times.

### 3.1 The problem, with evidence

**A. The price is off the first screen on a phone.** Arithmetic at 390 x 664 usable viewport:

| Element | Source | Height |
|---|---|---|
| Sticky header | `Header.astro:124`, `py-3` + 46px tallest child | ~70px |
| Layout trust strip | `Layout.astro:196-213` | ~36px |
| Mobile gallery hero | `[slug].astro:310`, `aspect-video` at 390w | 219px |
| Trust bar, CARFAX plus Inspected | `:335-365`, `py-2.5` / `py-3` | ~44px |
| Breadcrumb | `:377-383` plus `mb-4` | ~36px |
| h1, `text-2xl leading-tight`, wraps to 2 lines on most titles | `:386` | ~58px |
| Spec strip, 5 to 6 items, `flex-wrap`, wraps to 2 lines | `:387-396` | ~40px |
| **Running total before the price renders** | | **~503px** |

The price at `:401` lands around y=503 of a 664px screen. It is technically on screen but sits below the fold on any device with more browser chrome, and everything above it is either navigation or a photo the shopper already saw on Google or CarGurus. **The two facts a $10k buyer needs first are what it is and what it costs.**

**B. CarGurus deal information renders up to four times on one page, from two independent sources.**

| Instance | Line | Source |
|---|---|---|
| Deal pill with savings | `:517-525` | `dealRating` / `priceSavings` from `vehicles.json` |
| Price meter card, roughly 130px tall on mobile | `:530-556` | Same fields |
| `cg-vin-badge`, mobile | `:404` | Live CarGurus SDK, `getBadge.action` |
| `cg-vin-badge`, desktop sidebar | `:729` | Live CarGurus SDK |
| Legacy dealer wide badge script | `:1140` | Third CarGurus script |

Two of those read a build time snapshot and two call CarGurus live. They can disagree on the same page for the same car. Roughly 130px of prime mobile real estate is spent on a third party's opinion of Maxim's price, above Maxim's own explanation of its price.

**C. Every financing CTA on the page skips the low friction path.**

| Control | Line | Label | Target |
|---|---|---|---|
| Mobile calculator button | `:474-478` | "Get Pre-Approved" | `/apply` |
| Desktop sidebar button | `:789-793` | "Get Pre-Approved" | `/apply` |
| Mobile sticky bar, button 3 | `:889-892` | **"Pre-Qualify"** | `/apply` |

`/apply` is the full credit application including SSN. The soft pull pre qualifier lives at `/financing#apply` and is only mentioned at `apply.astro:29`, meaning a nervous shopper discovers it only after already landing on the SSN form. The sticky bar case is the worst: the label promises a pre qualification and delivers a credit application.

**D. The lightbox downloads full size images.** `:975` sets `lightboxImg.src = photos[index]` against raw `photoUrls` at `https://imagesdl.dealercenter.net/1289/856/...`. The file's own measured comment at `:66-69` records that the 1024x768 variant is about 178KB, and `dcResize()` is defined at `:72` and used for the hero and thumbs but **not** for the lightbox. The Civic has 13 photos. That is 13 fetches at above 178KB each, on a phone, on a lot that sells to budget buyers.

**E. Dead code.** `highlights` is computed at `:113` and rendered nowhere (grep returns exactly one match in the file). `mpg` is read at `:117` and gated at `:632`, but `mpg` is not one of the 38 keys in `vehicles.json`, so the Fuel Economy row can never render.

**F. The inspection claim has nothing behind it.** `:657-672` says "Fully Inspected by Independent Mechanic" and lists 8 items. The actual company inspection form at `businesses/maxim-autos/operations/inspection-report/maxim-inspection-report.html` has 5 sections and reads "100+ POINT INSPECTION". The strongest trust asset the business owns is undersold on the page where it matters.

**G. Two calculators, one algorithm.** `m-fin-*` at `:1024-1082` and `sb-fin-*` at `:1084-1130` are roughly 90 lines of identical math with different variable prefixes. Any fix has to be made twice.

**H. No icon is `aria-hidden`.** Every `material-symbols-outlined` span exposes its ligature text to screen readers. A screen reader user hears "phone", "check_circle", "expand_more" as content.

### 3.2 The design, mobile first

**Move the price onto screen one without reordering the page.** Overlay a solid navy price tag on the bottom left of the mobile hero image, mirroring the existing photo count chip on the bottom right at `:313-317`. One absolutely positioned div. The price is now visible at roughly y=250 instead of y=503, and nothing else moves. Low build risk, high effect.

**Collapse CarGurus to one instance.** Keep the deal pill at `:517-525` because it is compact, cited, and reads as a third party endorsement. Delete the price meter card at `:530-556`. Render `cg-vin-badge` once, in whichever column is visible, not in both. The 130px reclaimed goes to the Out The Door module in §5, which is Maxim's own explanation of its price and therefore beats CarGurus's.

**Make every CTA label true.**

| Control | New target | New label |
|---|---|---|
| Sticky bar button 3 | `/financing#apply?vehicle={slug}` | "Pre-Qualify", the existing label, now accurate |
| Payment estimator button | `/financing#apply?vehicle={slug}&budget={bucket}` | "Check my financing options" |
| Secondary link inside the estimator | `/apply` | "Ready now? Full application" |

Copy note: "Pre-Qualify" stays on the sticky bar because it is the established name of the form at `financing.astro:232` and carries compliance weight. New copy avoids coining more hyphenated labels.

The `?budget=` parameter maps the shopper's own slider result onto the existing `monthly_budget` select at `financing.astro:275-289`, whose options are already `under-150`, `150-250`, `250-350`, `350-500`, `500-plus`. A hidden `vehicle` field carries the slug into the existing Formspree submission. **No new backend, no new endpoint, no new spend.**

**One calculator component.** Extract to `site/src/components/PaymentEstimator.astro` taking a `prefix` prop and a `lang` prop, rendered twice, with a single hoisted script that self wires every `[data-payment-estimator]`. This is exactly the pattern `ReviewRotator.astro` already uses per the site's own `CLAUDE.md`, so it is a known good shape in this codebase. Removes roughly 90 duplicated lines.

**Fix the lightbox.**
- Route every source through `dcResize(u, 1024, 768)`.
- Preload index+1 and index-1 only.
- Add horizontal swipe with pointer events, roughly 15 lines, because 13 photos currently means 12 taps on a 52px arrow that overlaps the image at 390px.
- Keep the native `<dialog>`. It is the right primitive and it already handles Escape and focus trapping for free.

**Give the inspection claim a destination.** New page `/inspection` renders the real 5 section checklist from the company form as indexable HTML. The VDP inspection card links to it: "See all 100 plus points we check". Zero recurring work, because the checklist is fixed. See §7.1.

**Housekeeping:** delete `highlights` and `mpg`; add `aria-hidden="true"` to every decorative icon span site wide.

### 3.3 Files that change

| File | Change |
|---|---|
| `site/src/pages/vehicle/[slug].astro` | Price overlay, remove price meter, single `cg-vin-badge`, CTA retarget, mount `OutTheDoor`, lightbox fix, delete dead code |
| **NEW** `site/src/components/PaymentEstimator.astro` | Replaces the two duplicated calculators |
| **NEW** `site/src/components/OutTheDoor.astro` | §5 |
| **NEW** `site/src/pages/inspection.astro` | §7.1 |
| **NEW** `site/src/pages/es/inspeccion.astro` | Spanish mirror |
| `site/src/pages/financing.astro` | Read `?vehicle` and `?budget`, prefill the select, add a hidden `vehicle` field |
| `site/src/layouts/Layout.astro` | `aria-hidden` sweep, hreflang pair for `/inspection` |

### 3.4 Measurable outcome

- Price visible on screen one at 390 x 664: from roughly y=503 to roughly y=250.
- CarGurus surfaces on one page: from up to 4 down to 1.
- Financing CTAs whose label matches their destination: from 0 of 3 to 3 of 3.
- Lightbox transfer per photo: from the native 1289x856 asset down to the 1024x768 variant the file itself measures at about 178KB. Exact saving unmeasured because the 1289x856 byte size is not recorded in the repo; the build phase should measure it.
- Instrument GA4 `carfax_click` on both CARFAX links (`:339` and `:682`). The strongest buying intent signal on the page is currently invisible to analytics.
- Duplicated calculator lines: about 90 to 0.

---

## 4. Surface 3: The homepage hero

`site/src/pages/index.astro`, 388 lines. Mirror at `site/src/pages/es/index.astro`.

### 4.1 The problem, with evidence

**A. The hero advertises a price band the lot does not have.** Four places state "$5,000 to $15,000" or "$5K to $15K":

| Location | Line | Text |
|---|---|---|
| Meta description | `:14` | "used cars from $5,000 to $15,000" |
| Hero subhead | `:135` | "$5K to $15K, hand-picked by the owner." |
| `AutoDealer` JSON-LD `priceRange` | `:77` | `"$5,000 to $15,000"` |
| North Shore body copy | `:326` | "from $5,000 to $15,000" |

Live band is $8,995 to $15,995. The headline promises cars four thousand dollars cheaper than anything in stock and simultaneously understates the top car. A shopper who taps the hero's own "Under $10K" chip at `:139` lands on four cars, none near $5,000. This is the homepage's largest credibility leak and it is defect D8. It also feeds Google as a structured `priceRange` claim.

**B. The h1 is a keyword, not a reason.** `:130` reads "Used Cars in Skokie, IL". The three things that actually differentiate Maxim (zero dealer fees, metal plates the same day, financing for all credit levels) live 90 lines further down in the Three Pillars section at `:224-256`, well below the fold.

**C. A quarter of the phone's first screen is a cropped stock photo.** `:101` sets `max-h-44` (176px) on mobile with a gradient overlay at `:114` that already fades most of it to navy. That is 176px of a roughly 664px screen carrying no information.

**D. The phone number is invisible on phones.** `:269` and `:376` both wrap it in `<div class="hidden sm:inline-flex ...">`. Below 640px it renders nothing. Above 640px it renders as a non clickable div. The highest intent action a used car shopper takes is calling, and on a phone it is not on the homepage at all.

**E. Social proof is pushed off screen one.** The mobile `ReviewRotator` sits at `:165`, after both CTAs, precisely because the 176px photo strip consumed the space above it.

**F. The featured grid does not scale to 15 units.** `:15` is `vehicles.filter(status !== 'sold')` with no `slice`. At 7 units the homepage shows 7 cards. At 15 it shows 15, becomes a second inventory page, loads 15 hero images, and makes "View All" meaningless.

### 4.2 The design: one phone screen, budgeted

Target 390 x 664 usable. Header 70px and the Layout trust strip 36px are fixed, leaving 558px.

| # | Element | Copy | Height |
|---|---|---|---|
| 0 | Photo band, reduced from `max-h-44` to `h-24` | (image) | 96px |
| 1 | Rating chip, already live from `reviews_meta.json` | "5.0 Stars on Google · 46 Reviews" | 40px + 16 |
| 2 | h1, `text-4xl leading-tight`, 2 lines | "Used Cars in Skokie, IL" | 86px |
| 3 | **Promise line, computed from live data** | "Cars from $8,995 to $15,995. Every one picked and inspected by the owner." | 56px |
| 4 | **Three proof chips**, pulled up from the Three Pillars section | "Zero dealer fees" · "Metal plates same day" · "Financing for all credit levels" | 76px |
| 5 | Primary CTA, orange, **live count** | "Browse 7 Cars" | 56px |
| 6 | Secondary CTA, **tappable `tel:`** | "Call or text (847) 510-8947" | 56px + 12 gap |
| | **Total** | | **~570px** |

That fits inside 558px once the 12px gap is absorbed by tightening `mb-7` to `mb-5` on the promise line. The review rotator moves to just below the fold at the top of the next section, where it now sits above the featured grid rather than being buried under two CTAs.

The screen now answers all three questions the brief asks for: **what Maxim is** (used cars in Skokie, 5.0 on Google), **why it is different** (three proof chips no local competitor can copy), **what to do next** (browse 7 cars, or call, one tap).

**The price band fix is architectural, not editorial.** Do not hand correct "$5,000 to $15,000" to "$8,995 to $15,995". It will drift again within weeks because inventory rotates and Jerry is a one person operation. Compute it once in frontmatter and use it everywhere:

```astro
const live = vehicles.filter(v => (v as any).status !== 'sold');
const priceMin = Math.min(...live.map(v => v.price));
const priceMax = Math.max(...live.map(v => v.price));
const bandStr  = `$${priceMin.toLocaleString()} to $${priceMax.toLocaleString()}`;
```

Then `bandStr` feeds the meta description at `:14`, the hero promise at `:135`, the `priceRange` at `:77`, and the North Shore copy at `:326`. Four drift sources become zero. The same helper should feed `llms.txt` and the suburb pages, which carry the identical stale string, but those are outside this lane.

**Featured grid:** `featured.slice(0, 6)`, and the "View All" link gets the live remainder: "View all 15 cars".

### 4.3 Files that change

| File | Change |
|---|---|
| `site/src/pages/index.astro` | Hero rebuild, computed price band, `slice(0, 6)`, `tel:` fix at `:269` and `:376` |
| `site/src/pages/es/index.astro` | Identical structure, Spanish copy, same computed band |

### 4.4 Measurable outcome

- Stale price claims on the homepage: 4 to 0, and made structurally undriftable.
- Differentiators on screen one: 0 to 3.
- Tappable phone number on a phone homepage: 0 to 1.
- Vertical space on screen one spent on a decorative photo: 176px to 96px.
- Homepage vehicle cards at 15 units: 15 to 6.
- Instrument the existing GA4 `generate_lead` with `lead_channel: phone` on the new hero `tel:` link. It currently cannot fire from the homepage because the link does not exist.

---

## 5. THE SIGNATURE SURFACE: **Out The Door**

> One number, fully itemized, on every car. Then the same math run backwards so a buyer can shop by what they can actually pay.

### 5.1 Why this one and not the others

The brief offered four candidates. Here is why this wins and what it absorbs.

| Candidate | Verdict |
|---|---|
| Transparent all in price breakdown | **Chosen.** Uses the one weapon competitors cannot copy without giving up revenue. |
| Payment first shopping mode for budget buyers | **Absorbed into it.** It is the same math run backwards over the same data. Two surfaces, one model. |
| Inspection report viewer | **Killed on feasibility.** See §7.1. |
| Side by side comparison | **Demoted to a feature**, shipped inside the inventory grid at §2.2 where it belongs. |

**Why the doc fee is a weapon and not a talking point.** Illinois permits a documentary service fee of roughly $377.63 in 2026, indexed to CPI. Every franchise store and every vendor platform independent in the field charges it, because it is nearly pure margin on a one person transaction. Maxim charges zero. Today that fact appears as a small green box on the VDP at `:414-417` reading "No dealer fees. Ever." It is a claim. **The design turns it into a priced line item sitting inside a total**, which is the only place a shopper can feel it. A competitor can copy the sentence in an afternoon. Copying the line item costs them $377.63 per car.

**Why it is honest in a way no dealer calculator is.** Every payment calculator in this market, including Maxim's two, finances the sticker price. Real buyers finance the sticker plus tax, title, and plates. So every calculator in the market quotes low, and every buyer gets a surprise at signing. This surface shows both numbers, side by side, labeled. It will display a **higher** payment than competitors' calculators. That is the point, and it is the entire brand position expressed as arithmetic.

**Why it needs no recurring human work.** Every input is either already in `vehicles.json` or is a fixed statutory number in one small data file. No photography, no transcription, no weekly update, no API.

### 5.2 The data model

**NEW** `site/src/data/il-fees.json`. Every number carries its own source and verification date, so the annual January CPI change to the doc fee cap is a one line edit with an audit trail.

```json
{
  "verifiedOn": "PENDING",
  "docFee": {
    "maxim": 0,
    "illinoisMax": 377.63,
    "source": "Illinois Administrative Code Part 475; IADA annual CPI adjustment",
    "note": "UNVERIFIED against a primary source. Confirm before ship. If unconfirmable, omit the number and keep the zero."
  },
  "titleFee": {
    "amount": 165,
    "label": "Illinois certificate of title",
    "source": "https://www.ilsos.gov/departments/vehicles/basicfees.html",
    "note": "Corroborated across sources; ilsos.gov unreachable from the design environment. Confirm before ship."
  },
  "plateFee": {
    "amount": 151,
    "label": "Illinois registration and plates",
    "source": "https://www.ilsos.gov/departments/vehicles/basicfees.html",
    "note": "Same as above."
  },
  "taxRate": {
    "rate": 0.0725,
    "label": "Skokie motor vehicle rate",
    "source": "https://www.skokie.org/Faq.aspx?QID=134",
    "note": "VERIFIED. Home rule tax does not apply to titled vehicles per tax.illinois.gov/research/taxinformation/sales/homerule.html, which is why this is 7.25 percent and not the 10.25 percent general merchandise rate."
  }
}
```

### 5.3 Surface A: the VDP module

Replaces the CarGurus price meter card at `[slug].astro:530-556`. Renders on all 7 live VDPs today, all 15 later.

**Worked example, live data, 2018 Subaru Crosstrek, stock J10218, $15,995:**

| Line | Amount |
|---|---|
| Vehicle price | $15,995 |
| Dealer documentary fee | **$0** |
| Illinois sales tax at 7.25% | $1,160 |
| Illinois certificate of title | $165 |
| Illinois registration and plates | $151 |
| **Estimated out the door** | **$17,471** |

Payment comparison, both at 10% down of the vehicle price, 9.9% APR, 60 months:

| | Financed | Estimated monthly |
|---|---|---|
| On the vehicle price alone | $14,395 | **$305** |
| With tax, title and plates financed | $15,871 | **$336** |

That $31 gap is the surprise this surface removes. `$305` matches exactly what the VDP already computes at `[slug].astro:104-111`, so the two numbers on the page agree by construction.

### 5.4 Surface B: the standalone page, budget first

**NEW** `site/src/pages/out-the-door.astro`, Spanish mirror `site/src/pages/es/precio-final.astro`.

Two inputs, both things a subprime buyer already knows about themselves:

- **"I can pay about ___ a month"** slider, $150 to $600, $25 steps
- **"I have ___ to put down"** slider, $0 to $5,000, $250 steps

The math, over 15 records, instantly:

```js
const i = 0.099 / 12, n = 60;                       // matches the Reg Z disclosure exactly
const maxFinanced = monthly * (1 - Math.pow(1 + i, -n)) / i;
const maxOutTheDoor = maxFinanced + down;
// solve backwards for the highest sticker whose out the door total fits
const maxSticker = (maxOutTheDoor - fees.titleFee.amount - fees.plateFee.amount)
                 / (1 + fees.taxRate.rate);
const fits = live.filter(v => v.price <= maxSticker);
```

Results render as normal `VehicleCard`s so the Reg Z footnote and every existing compliance behavior come along unchanged, plus a per card "out the door $X" line.

**Compliance framing, non negotiable in this mode.** Heading is "Cars whose estimated payment lands in your range". Never "you qualify", never "approved", never "guaranteed". The results block carries, in addition to the Reg Z footnote:

> This is an estimate, not an approval. Maxim Autos offers financing for all credit levels. Actual terms vary by credit.

Spanish equivalent:

> Esto es un estimado, no una aprobacion. Maxim Autos ofrece financiamiento para todos los niveles de credito. Los terminos reales varian segun el credito.

Empty result state reuses the §2.2 capture: "Nothing on the lot lands in that range right now. Tell Jerry your budget and he will look for it."

### 5.5 The markup, ready for build and for the recap mockup

This is the VDP module, Surface A. Real Tailwind against the existing config (`navy`, `orange`, `surface`, `font-headline`). Real numbers for stock J10218. **This block is the intended basis for the hero mockup in the recap.**

```html
<!-- ===== OUT THE DOOR ===== -->
<section class="mb-6 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm"
         data-out-the-door data-price="15995">

  <!-- Header -->
  <div class="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
    <div>
      <h2 class="font-headline text-lg font-extrabold text-navy leading-tight">
        What you actually pay
      </h2>
      <p class="text-xs text-gray-500 mt-0.5">
        Every line, nothing held back. Registered in Skokie, IL.
      </p>
    </div>
    <span class="shrink-0 inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200
                 px-2.5 py-1 rounded-full text-[11px] font-bold">
      <span class="material-symbols-outlined text-xs" aria-hidden="true"
            style="font-variation-settings:'FILL' 1;">price_check</span>
      Zero dealer fees
    </span>
  </div>

  <!-- Line items -->
  <dl class="px-5 py-1 divide-y divide-gray-100">

    <div class="flex items-baseline justify-between py-3">
      <dt class="text-sm font-semibold text-gray-800">Vehicle price</dt>
      <dd class="font-headline text-base font-bold text-navy tabular-nums">$15,995</dd>
    </div>

    <!-- The differentiator, styled as the hero line of the table -->
    <div class="flex items-baseline justify-between py-3 bg-green-50/60 -mx-5 px-5">
      <dt class="text-sm font-semibold text-gray-800">
        Dealer documentary fee
        <span class="block text-[11px] font-normal text-gray-500 mt-0.5">
          Illinois allows dealers to charge up to $377.63. We charge nothing.
        </span>
      </dt>
      <dd class="font-headline text-base font-extrabold text-green-700 tabular-nums">$0</dd>
    </div>

    <div class="flex items-baseline justify-between py-3">
      <dt class="text-sm font-semibold text-gray-800">
        Illinois sales tax
        <span class="block text-[11px] font-normal text-gray-500 mt-0.5">
          7.25% Skokie motor vehicle rate
        </span>
      </dt>
      <dd class="font-headline text-base font-bold text-navy tabular-nums">$1,160</dd>
    </div>

    <div class="flex items-baseline justify-between py-3">
      <dt class="text-sm font-semibold text-gray-800">Illinois certificate of title</dt>
      <dd class="font-headline text-base font-bold text-navy tabular-nums">$165</dd>
    </div>

    <div class="flex items-baseline justify-between py-3">
      <dt class="text-sm font-semibold text-gray-800">
        Illinois registration and plates
        <span class="block text-[11px] font-normal text-gray-500 mt-0.5">
          Real metal plates issued here, not at the DMV
        </span>
      </dt>
      <dd class="font-headline text-base font-bold text-navy tabular-nums">$151</dd>
    </div>

  </dl>

  <!-- Total -->
  <div class="bg-navy px-5 py-4 flex items-end justify-between">
    <div>
      <p class="text-white/60 text-[11px] font-semibold uppercase tracking-widest">
        Estimated out the door
      </p>
      <p class="text-white/45 text-[11px] mt-0.5">Nothing else gets added at signing</p>
    </div>
    <p class="font-headline text-3xl font-extrabold text-white tabular-nums leading-none">$17,471</p>
  </div>

  <!-- Payment comparison: the honest number vs the number everyone else quotes -->
  <div class="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
    <div class="px-5 py-4">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">On the car alone</p>
      <p class="font-headline text-2xl font-extrabold text-gray-400 tabular-nums mt-1">$305<span class="text-sm font-bold">/mo</span></p>
      <p class="text-[11px] text-gray-400 mt-1">What most sites show you</p>
    </div>
    <div class="px-5 py-4 bg-orange/5">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-orange">With tax, title and plates</p>
      <p class="font-headline text-2xl font-extrabold text-navy tabular-nums mt-1">$336<span class="text-sm font-bold">/mo</span></p>
      <p class="text-[11px] text-gray-500 mt-1">What you will actually sign</p>
    </div>
  </div>

  <!-- CTAs -->
  <div class="px-5 pt-4 pb-5 space-y-2">
    <a href="/financing#apply?vehicle=2018-subaru-crosstrek-premium&amp;budget=250-350"
       class="w-full flex items-center justify-center gap-2 bg-orange text-white py-3.5 rounded-xl
              font-bold text-base hover:bg-orange-dark transition-colors min-h-[44px]">
      <span class="material-symbols-outlined text-lg" aria-hidden="true"
            style="font-variation-settings:'FILL' 1;">payments</span>
      Check my financing options
    </a>
    <p class="text-center text-xs text-gray-500">
      Soft pull. No impact to your credit score.
      <a href="/apply" class="text-navy font-semibold hover:underline ml-1">Ready now? Full application</a>
    </p>
  </div>

  <!-- Disclosure. Reg Z string is VERBATIM and must not be edited. -->
  <div class="bg-surface border-t border-gray-100 px-5 py-4 space-y-1.5">
    <p class="text-[11px] leading-relaxed text-gray-500">
      * Est. payment based on 10% down, 9.9% APR, 60-month term. For illustrative purposes only. Actual terms vary by credit.
    </p>
    <p class="text-[11px] leading-relaxed text-gray-500">
      Out the door figure is an estimate. Maxim Autos charges zero dealer fees, so the vehicle price is final.
      Title and registration are Illinois Secretary of State fees, current as of the date shown on this page.
      Sales tax is shown at the Skokie motor vehicle rate of 7.25 percent. Your rate depends on where you
      register the car. Final figures are confirmed on your bill of sale.
    </p>
  </div>

</section>
```

**Spanish disclosure, required on `/es/precio-final` and any `/es` surface rendering this module:**

```html
<p class="text-[11px] leading-relaxed text-gray-500">
  * Pago estimado basado en 10% de enganche, 9.9% APR, plazo de 60 meses. Solo para fines ilustrativos. Los terminos reales varian segun el credito.
</p>
<p class="text-[11px] leading-relaxed text-gray-500">
  El precio final es un estimado. Maxim Autos no cobra cargos de dealer, asi que el precio del vehiculo es final.
  El titulo y la registracion son cargos del Secretario de Estado de Illinois, vigentes a la fecha mostrada en
  esta pagina. El impuesto se muestra a la tasa de 7.25 por ciento para vehiculos en Skokie. Su tasa depende de
  donde registre el auto. Las cifras finales se confirman en su factura de venta.
</p>
```

### 5.6 Files that change

| File | Change |
|---|---|
| **NEW** `site/src/data/il-fees.json` | Fee constants with per line source and verification date |
| **NEW** `site/src/components/OutTheDoor.astro` | The module. Props: `price`, `slug`, `lang` |
| **NEW** `site/src/pages/out-the-door.astro` | Budget first standalone page |
| **NEW** `site/src/pages/es/precio-final.astro` | Spanish mirror |
| `site/src/pages/vehicle/[slug].astro` | Mount `OutTheDoor` where the price meter was at `:530-556` |
| `site/src/pages/inventory.astro` | Link "See the real number on any car" to `/out-the-door` |
| `site/src/pages/index.astro` | Hero proof chip "Zero dealer fees" links to `/out-the-door` |
| `site/src/components/Header.astro` | Add `/out-the-door` to `secondaryLinks`, both languages |
| `site/src/layouts/Layout.astro` | hreflang pair for the new page |
| `site/src/pages/financing.astro` | Accept `?vehicle` and `?budget`, prefill, hidden field |

Sitemap needs no change: `astro.config.mjs` uses `@astrojs/sitemap` with a serializer that only special cases `/vehicle/`, so new pages are included automatically.

### 5.7 Schema opportunity, no extra work

The out the door page and module answer six questions in a shape AI answer engines cite well: "how much is tax title and license in Illinois", "does Maxim Autos charge a doc fee", "what is the doc fee in Illinois". Emit `FAQPage` JSON-LD on `/out-the-door` using the exact pattern already proven on every VDP at `[slug].astro:224-228`. This also closes homepage defect D7's pattern gap without touching the homepage.

Note the ai-citation audit's finding that Q and A **prose** formatting can reduce LLM absorption. That finding is about prose headers, not structured data. This recommendation is structured data only, which is the mechanism that audit endorsed.

### 5.8 Measurable outcome

- Number of local dealer sites publishing an itemized out the door total: currently 0 of the 6 reachable competitors inspected in the competitive audit. Maxim becomes 1.
- The zero doc fee claim moves from a sentence to a line item inside a total, on 15 VDPs plus 1 standalone page plus 1 Spanish mirror.
- New lead path with zero new backend: budget slider to `/financing#apply` with `monthly_budget` prefilled. Instrument `generate_lead` with `lead_channel: financing_form` and a `source: out_the_door` parameter.
- Instrument `otd_expand`, `otd_budget_change`, `otd_prequalify_click`.
- Payment honesty: the site stops quoting a payment $31 below what a $15,995 buyer will sign.

---

## 6. Surface 4: Mobile throughout

### 6.1 The header carries zero actions on any phone

Three controls, all hidden below 640px:

| Control | Line | Classes | Result at 390px |
|---|---|---|---|
| "Text Jerry" button | `Header.astro:177` | `sm:inline-flex lg:hidden ... hidden` | not rendered |
| Directions icon | `:194` | `hidden sm:flex lg:hidden` | not rendered |
| Phone number display | `:183` | `hidden lg:flex` | not rendered |

So at 390px the header is: logo, rating chip, CARFAX shield, hamburger. **No action.**

Width arithmetic at 390px (`px-4` leaves 358px, every child is `shrink-0`):

| Element | Computation | Width |
|---|---|---|
| Logo | `h-8` = 32px, intrinsic 248x60 | 132px |
| gap-2 | | 8px |
| Rating chip | `px-2` + 1px borders + content (5 stars at 11px tracking-tight ~54px, gap 4px, "5.0" at 12px ~20px) | ~96px |
| gap-2 | | 8px |
| CARFAX shield | `h-8` = 32px, intrinsic 714x525 | 44px |
| Hamburger | `p-2` + 30px glyph | 46px |
| **Total** | | **~334px of 358px** |

**80% of the header row is spent on three non actionable brand elements.** It fits at 390px and 375px with under 25px of slack and overflows below roughly 365px, since nothing can shrink.

**Fix.** Drop the CARFAX shield below 640px (it already repeats on every VDP trust bar at `[slug].astro:342-351`) and add a 44px icon only SMS button. New arithmetic: 132 + 8 + 96 + 44 (SMS) + 8 + 46 (hamburger) = **334px**, identical footprint, and the header now has a one tap contact action on every page.

### 6.2 Six invisible phone numbers

`hidden sm:inline-flex` wrapped around a non link `<div>`:

| File | Line |
|---|---|
| `index.astro` | `:269`, `:376` |
| `inventory.astro` | `:284` |
| `contact.astro` | `:92` |
| `financing.astro` | `:323` |
| `sell-trade.astro` | `:29` |

On a phone: nothing renders. On a tablet: renders but is not tappable. Fix is six one line changes to `<a href="tel:8475108947" class="inline-flex ...">`, visible at every width. This also unlocks the existing GA4 `generate_lead` phone event, which today cannot fire from any of these six positions.

### 6.3 Touch targets

`inventory.astro:142-169` filter chips at `px-3 py-1.5 text-xs` compute to 30px. Move to `px-3.5 py-2.5 text-sm min-h-[44px]`. Same fix in `es/inventario.astro:64-89`.

### 6.4 The lightbox on a phone

Covered in §3.2. Full size images, 52px arrows overlapping a 90vw image, and no swipe across 13 photos.

### 6.5 The review carousel

`index.astro:296` maps **all** reviews into an `85vw` snap carousel. The hero rotator sensibly slices to 6 at `:22`. The mobile carousel should do the same and let `/testimonials` carry the full set.

### 6.6 Two sticky bottom bars

`Footer.astro:236` `#footer-sticky-cta` renders site wide; the VDP ships its own at `[slug].astro:879` and suppresses the global one with `display:none !important` at `:903`. It works today. Flagging it as a consolidation target, not a live bug: one component with a `variant` prop removes a whole class of future divergence.

### 6.7 Compliance drift I found in the Spanish mirrors

The two Spanish Reg Z footnotes are not the same string:

| File | Line | Text |
|---|---|---|
| `es/index.astro` | `:168` | "Pago estimado **con** 10% de enganche ... Los **términos** reales **varían según** el **crédito**." |
| `es/inventario.astro` | `:164` | "Pago estimado **basado en** 10% de enganche ... Los **terminos** reales **varian segun** el **credito**." |

Different opening clause, and one is accented while the other is not. A verbatim compliance string cannot have two versions. **Canonical Spanish, matching the English word for word, accents included:**

```
* Pago estimado basado en 10% de enganche, 9.9% APR, plazo de 60 meses. Solo para fines ilustrativos. Los términos reales varían según el crédito.
```

Both files, plus every new Spanish surface, use exactly this. Long term, extract it to a shared constant so it cannot fork again.

### 6.8 Measurable outcome

- Header actions on a phone: 0 to 1, at identical pixel footprint.
- Tappable phone numbers across the site on a phone: 0 to 6.
- Filter chip touch targets: 30px to 44px.
- Reg Z Spanish string variants: 2 to 1.

---

## 7. Candidate innovations: developed or killed

### 7.1 Publish the inspection reports: **KILLED as scoped, salvaged as one page**

**Evidence.** The company inspection form exists at `businesses/maxim-autos/operations/inspection-report/maxim-inspection-report.html` and `.pdf`. I read it. It is a **blank printable template**: it has empty fields for stock number, VIN, mileage, date, per corner tread depth in 32nds, brake pad thickness in mm, battery volts, plus "Technician signature", "Inspected by (print name)", and a repairs written in section. It is filled out on paper by the shop.

In `vehicles.json`, `inspection` is the boolean `true`. There is no per vehicle inspection data anywhere in the repo.

Therefore publishing per car inspection reports means somebody transcribes a paper form into structured data for every car, forever. That is exactly the "new recurring human work" the brief forbids, in a one person operation with 3pm to 7pm hours.

**Salvage, and it is worth doing.** Publish the checklist itself once, as `/inspection`, with all 5 sections and every named point from the real form: road test, interior and electronics, under hood and fluids, tires and brakes, repairs and parts replaced. Plus the real thresholds the form states, tread minimum 3/32 and brake pad minimum 3mm. Zero recurring work because the checklist is fixed. It gives the VDP's "Fully Inspected" claim a destination it currently lacks, and it is verifiable entity dense content no vendor platform competitor can fabricate. Link it from `[slug].astro:657-672` and from the Layout trust strip.

**Compliance note for the build phase:** the report's own footer reads "Every customer protected." That is protection language adjacent to the banned "total protection" family. Do not carry that line onto the site.

### 7.2 Grounded on site assistant: **defer, with a UX reason**

Not my lane to price the API key, but the UX verdict stands on its own. It adds a fifth contact channel to a business that already runs four lead forms whose failure state is a bare browser `alert()` (per the conversion audit: `contact.astro:274`, `financing.astro:435`, `sell-trade.astro:189`, `apply.astro:736`), fires `generate_lead` on click rather than on success, and is staffed by one person four hours a day. Fix the four channels that already exist before adding a fifth. It also competes for the same thumb position as the sticky CTA bar.

### 7.3 Comparison tool: **absorbed**

Shipped as the compare tray in §2.2. A standalone comparison page for 15 units would be a page nobody navigates to. Inline in the grid, at the moment of choosing, it gets used.

### 7.4 Sold archive as price transparency: **out of my lane, one UX observation**

The 20 sold VDPs already exist under `noIndex`. My only UX input: if it ships, it must not sit adjacent to live inventory, because a sold price presented near a live price reads as a live price. The natural home is `/out-the-door` as a "here is what we actually sold" section, deliberately below the estimator. Whether it ships at all is an advertising law call, not a design call.

---

## 8. Build order

Ranked by effect per hour, so the build phase can stop at any point and still have shipped the valuable half.

| # | Item | Why first |
|---|---|---|
| 1 | Computed price band on the homepage, four sites, §4.2 | Kills D8 permanently in about 20 minutes and stops feeding Google a wrong `priceRange` |
| 2 | Retarget the three financing CTAs, §3.2 | Link and label change only. Largest funnel friction in the file. |
| 3 | Six `tel:` fixes, §6.2 | Six one line changes. Restores the highest intent action on six pages. |
| 4 | Inventory URL state plus share, §2.2 | Makes every filtered view textable, which is Jerry's actual channel |
| 5 | Price ceiling slider plus chip counts, §2.2 | Permanently removes the dead end filter class |
| 6 | **Out The Door module on the VDP**, §5.3 | The signature surface. Needs the §1 fee verification first. |
| 7 | Homepage hero rebuild, §4.2 | Highest traffic page, but a bigger diff than 1 to 5 |
| 8 | Mobile price overlay plus remove the CarGurus meter, §3.2 | Frees the space item 6 occupies |
| 9 | `/out-the-door` budget first page, §5.4 | The differentiated entry point |
| 10 | `PaymentEstimator.astro` extraction, §3.2 | Pure refactor, do it once the calculators are stable |
| 11 | `/inspection` page, §7.1 | Cheap unique content, no recurring cost |
| 12 | Compare tray, §2.2 | Highest build cost in this document |
| 13 | Header phone CTA, `aria-hidden` sweep, touch targets, lightbox, §6 | Mechanical sweeps |

---

## 9. Open items the build phase must close

1. **Confirm the title fee, plate fee, and doc fee cap against ilsos.gov.** ilsos.gov was unreachable from this environment on every attempt. Everything is isolated in `il-fees.json` with per line `source` and `note`. Nothing customer facing ships with an unverified number.
2. **Confirm nothing on `/out-the-door` contradicts** `businesses/maxim-autos/operations/google-local-domination-2026-07/design/SPEC.md`. I read the SPEC's scope in the audit findings; it governs GBP posting cadence and native scheduling, not website surfaces. I do not believe this design touches it. Verify before shipping and say so.
3. **Do not de-hyphenate the Reg Z string.** "60-month" is verbatim.
4. **Extract both Reg Z strings to shared constants** so the English and Spanish versions cannot fork again the way §6.7 documents that the Spanish already has.
5. **Do not add a client side canonical rewrite** on `/inventory`. The server side canonical plus the existing `Disallow: /inventory?` is already correct and `replaceState` is safe alongside it.
