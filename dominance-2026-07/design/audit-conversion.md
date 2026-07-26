# Maxim Autos — Conversion & UX Audit

Scope: maximautos.com lead paths end to end (4 forms, phone/SMS, GA4), mobile experience,
inventory grid, VDP, trust/friction, accessibility. Design run only, nothing published or
changed. All line numbers below are verified against the repo at
`businesses/maxim-autos/website/site/` on 2026-07-25. Live behavior was cross-checked against
`https://www.maximautos.com/inventory` and a live VDP (`/vehicle/2018-chevrolet-trax-1lt-j10217`)
in a 390x844 mobile viewport; screenshot capture was unavailable in this session (headless pane),
so live verification used the rendered accessibility tree and page text, not pixel screenshots —
flagged inline wherever that matters.

Plan against 15 units (Jerry's stated near-term inventory), not the 7 live today.

---

## 0. The single biggest leak: the VDP's primary CTA skips the soft pre-qualifier entirely

Every in-stock VDP has one dominant "Get Pre-Approved" button — mobile
(`site/src/pages/vehicle/[slug].astro:474-478`) and the desktop sticky sidebar
(`:789-793`). Both link straight to `${base}/apply`, which is the **full 60-field DealerCenter
credit application that requires a Social Security Number** (`site/src/pages/apply.astro:85-88`).

The low-friction, "soft pull, no impact to your credit score" pre-qualifier
(`financing.astro#apply`, 5 fields, no SSN) is never offered on the VDP at all. It only
surfaces as an escape hatch *after* a shopper has already landed on the SSN form:
`apply.astro:29` — "Not ready for a full application? Pre-qualify first — soft pull, no impact
to your credit score." — small gray text below the hero, easy to miss, and only reachable by
someone who already clicked through to the hard form.

For Jerry's actual buyer (subprime, first-time, credit-nervous, per the site's own copy) this
inverts the funnel that should exist: the highest-intent tap on the highest-traffic page (the
VDP) demands a name, DOB, SSN, full address, and housing payment before the shopper has had
any lower-commitment way to test the water. This is the most consequential fix available and it
touches copy/links only (swap the VDP CTA target to `/financing#apply`, or add the soft
pre-qualifier as a second, more prominent option next to "Get Pre-Approved") — no schema,
no backend change.

---

## 1. The four lead forms

| # | Form | Endpoint | Required fields | Success behavior | Failure behavior |
|---|------|----------|------------------|-------------------|-------------------|
| 1 | Contact (`contact.astro:171`) | Formspree `xvzdgvan` | name, email (4 fields total, phone/message optional-ish) | JS replaces form markup in place with a static "Message Sent!" block (`:270`) — no redirect, stays on page, good | `alert()` browser popup + button re-enabled (`:274`, `:279`) |
| 2 | Financing pre-qualify (`financing.astro:236`) | Formspree `xpqkwodb` | name, email, phone, monthly budget (select), credit situation (select) — 5 required | Replaces form with confirmation **plus a "Text Jerry to Follow Up" SMS link** (`:431`) — best of the four | `alert()` (`:435`, `:440`) |
| 3 | Sell/Trade (`sell-trade.astro:69`) | Formspree `xwvapwod` | name, phone, year/make/model, mileage, condition (select) — 5 required, VIN optional | Replaces form, confirmation + SMS follow-up link (`:185`) | `alert()` (`:189`, `:194`) |
| 4 | Credit Application (`apply.astro:49`) | Own Vercel Python function `/api/credit-app` (`api/credit-app.py`) | See §1a below — 13+ required fields including SSN | Replaces the entire section with a static confirmation (`:732`) | `alert()` (`:736`, `:741`) |

**Every one of the four forms fails identically: a bare browser `alert()`.** On mobile Safari/
Chrome, `alert()` is easy to dismiss without reading, leaves the filled-out form data intact but
gives no visual indication of *what* went wrong, and looks unpolished next to the otherwise
well-designed success states. A shopper who just typed their SSN and 20 other fields and hits a
native OS alert on failure is far more likely to abandon than retry. Recommend an inline error
banner matching the success-state styling, not `window.alert`.

None of the four forms does inline field-level validation beyond native HTML5 `required` —
no real-time "this looks like an invalid email" feedback, no phone-format check. Low risk given
short forms 1-3, higher risk on form 4 given its length.

### 1a. Form 4 (credit application) is the real friction point

`apply.astro` renders, across Buyer + Co-Buyer + Vehicle + Trade-In + References sections,
more than 60 named `<input>`/`<select>` fields. The **required buyer-only path alone** is 13
fields: first name, last name, email, cell phone, DOB, **SSN**, street address, city, state,
zip, housing type, monthly rent/mortgage, years at address — and conditionally a full previous-
address block if under 2 years at the current one (`:167-198`).

Concrete findings:
- **SSN is a plain `<input type="text">`** (`:86`), not masked, not `type="password"`. It is
  visible in cleartext on-screen while typing — a shoulder-surf risk anywhere a subprime, often
  budget-conscious buyer might be filling this out (shared devices, on a bus, at work).
- The reassurance text next to the SSN field reads: *"Submitted over an encrypted connection and
  never stored on our servers"* (`:87`). This is **not accurate**. `api/credit-app.py:22-43`
  Fernet-encrypts the payload and writes it to a private Vercel Blob (`_store_blob`) — the SSN
  **is stored**, encrypted, off-server but not "never stored." If a careful buyer or a lender
  ever checks this claim against what actually happens, it reads as a broken promise. This is
  independent of the compliance-guardrails vehicle-pricing rules, but it is a factual claim
  about data handling made to a nervous buyer and it does not hold up — worth Jerry's attention
  even though it sits outside the guardrail doc's specific list.
- No progress indicator across a 60-field, 5-section form on a single scrolling page. No
  autosave. A backgrounded mobile tab or an accidental back-swipe loses everything typed.
- Only the Buyer tab is functionally required; Co-Buyer, Vehicle, Trade-In, and References
  (9 more fields across 3 reference blocks) are all optional and correctly labeled as such —
  the badge system (`app-badge--req` / `app-badge--opt`) is a genuinely good pattern for
  orienting a shopper inside a long form. That part works.

### GA4 coverage of forms
`Layout.astro:171-181` maps form `id` → lead channel by a fixed dictionary
(`contact-form`, `financing-form`, `apply-form`, `sell-trade-form`). Checked against the DOM ids
in all four pages — they match exactly, so all four forms fire `generate_lead`.

**But the event fires on the native `submit` event in the capture phase, before each form's own
JS handler runs `preventDefault()` and does the `fetch()`.** That means GA4 records a lead the
instant the button is clicked — **regardless of whether the Formspree/Vercel POST actually
succeeds.** If an endpoint is ever misconfigured, rate-limited, or the Vercel function throws,
GA4 keeps reporting `generate_lead` events at the same rate while zero leads actually reach
Jerry. GA4 cannot be used as a form-health signal today; it only proves the button was clicked.

---

## 2. Phone and SMS

`tel:8475108947` and `sms:8475108947` are hardcoded (no `+1`, no formatting) in at least: 
`Header.astro:176,183-189`, `Footer.astro:125,238,242`, `[slug].astro:495,881,885`, 
`contact.astro:121`, and the homepage/financing/sell-trade "hidden sm:inline-flex" phone chips.

- **Global site-wide safety net exists and works**: `Footer.astro:236-256` renders a fixed
  bottom 4-button bar (Text / Call / Directions / Financing) on every page at `<768px`, with a
  correctly-sized spacer div (`:256`) so it never overlaps page content. The VDP overrides this
  with its own 3-button bar (Text / Call / Pre-Qualify, `[slug].astro:877-896`) and explicitly
  hides the global one (`:903`, `#footer-sticky-cta { display: none !important; }`) — verified
  live on the mobile Trax VDP, the 3-button bar renders correctly with its own spacer.
- **Repeated dead phone chips below 640px.** A recurring pattern — `hidden sm:inline-flex`
  around a `<div>` (not an `<a>`) showing "(847) 510-8947" — appears in: homepage "We Buy Cars"
  (`index.astro:269`), homepage CTA banner (`:376`), contact page Quick CTA
  (`contact.astro:92`), financing page final CTA (`financing.astro:323`), sell-trade hero
  (`sell-trade.astro:29`). On a true phone viewport (<640px) these blocks render nothing at all
  — no phone number, no link, just empty space where the CTA visually anchors on desktop. This
  isn't a hard lead leak (the global sticky bar covers phone/text access everywhere except the
  VDP, which has its own), but it means five separate "trust moment" sections that are supposed
  to reinforce "call or text Jerry" show literally nothing to a phone-width visitor.
- **Desktop nav never offers click-to-call.** `Header.astro:183-189` renders the desktop phone
  number as a static `<div>`, not an `<a href="tel:">`. Modern desktop OSes (macOS Continuity,
  Google Voice, Skype-registered protocol handlers) do support `tel:` clicks; this is a small,
  free win being left on the table for `lg:` breakpoint visitors.
- **SMS prefill quality is inconsistent.** The VDP's own sticky bar and its sold-VDP upsell
  block pass a vehicle-specific prefill: `Hi Jerry, I'm interested in the {year make model trim}
  listed on MaximAutos.com.` (`[slug].astro:101`, used at `:495` and `:881`). Every other SMS
  link site-wide (header, global footer sticky bar) uses the generic
  `Hi Jerry, I'm interested in a vehicle at Maxim Autos.` (`Header.astro:176`,
  `Footer.astro:238`). A shopper who texts from the `/financing` or `/inventory` page gives
  Jerry zero context about what they were looking at when they hit "Text."

---

## 3. GA4 instrumentation gaps beyond phone/SMS/forms

`Layout.astro:157-187` captures tel/sms clicks (attribute-selector based, so it automatically
covers new tel/sms links added anywhere, including the VDP's own bar — confirmed by inspection,
this part is solid) and form submits by id. It does **not** capture:

- **The CARFAX "SHOW ME THE CARFAX" click** (`[slug].astro:339-352`, `:682-687`) — arguably the
  single strongest buying-intent signal on a VDP (a shopper who opens a vehicle history report
  is close to a decision) and it is invisible to analytics.
- **The CarGurus `cg-vin-badge` click-through** (`:404`, `:729`) — this sends a shopper off-site
  to CarGurus with zero tracking of the exit.
- **Payment-calculator interaction** (mobile and sidebar sliders) — not tracked as engagement at
  all; there is no way to know how many shoppers used the calculator before calling.
- **The orange "Financing" chip on every `VehicleCard`** (`VehicleCard.astro:163-166`) is a real
  `<a>` navigating to `/financing`, layered `z-20` above the card's stretched link — a genuine
  secondary CTA that gets no distinct GA4 event from a plain inventory browse.

None of these are lead events by themselves, but they are the engagement signals that would let
Jerry (or anyone) diagnose *where* in the funnel shoppers stall before calling. Today that's a
blind spot.

---

## 4. Mobile-first UX (390px viewport, live-verified)

- **Header row is tight at 390px.** `Header.astro:126-206` packs, in one flex row: logo
  (`:128`), a Google-rating chip (`:130-145`), the CARFAX Advantage badge image (`:146-147`,
  `h-8` = 32px tall, unconstrained width), an SMS "Text Jerry" button (`:175-181`, visible
  `sm:inline-flex lg:hidden` — so it only shows ≥640px, meaning under 640px the row is just
  logo + rating chip + CARFAX badge + hamburger), and the hamburger. Live-verified via the
  accessibility tree at 390px (this session could not capture a pixel screenshot — the browser
  pane did not composite frames in this headless session): the rendered link list confirms logo,
  Google-rating link, and hamburger are present with no wrapping detected in the DOM order, but
  every element in this row carries `shrink-0` (`:126`, and implicitly on the CARFAX img and
  rating chip), which means if the combined intrinsic width ever exceeds the viewport, the
  layout has no fallback — it will not compress, it will overflow. Recommend a manual visual QA
  pass at 375px (iPhone SE) specifically, since `shrink-0` on every child is a brittle pattern
  the moment any one asset (e.g., a wider CARFAX badge re-export) changes size.
- **Payment calculators do not crowd.** Verified in source: the mobile calculator
  (`m-fin-*`, `[slug].astro:430-481`) and the desktop sidebar calculator (`sb-fin-*`, `:719-822`)
  are mutually exclusive via Tailwind breakpoint classes (`lg:hidden` is implicit — the mobile
  block sits inside the `lg:hidden` price block at `:400`, the sidebar sits inside `hidden
  lg:block` at `:721`) — no duplicate rendering, no overlap. Each mobile slider is full-width
  with its own label/value row; term buttons are 4-across `flex-1`, which at 390px gives each
  button roughly 75-80px — workable for a thumb tap. This part of the VDP is fine on mobile.
- **Gallery degrades correctly.** Desktop 60/40 five-photo grid (`:267-301`) collapses to a
  single hero image with a "View all N photos" overlay button on mobile (`:303-320`), opening
  the same lightbox with 52px-square prev/next controls (`#lightbox-prev`, `#lightbox-next`,
  CSS at `:948-959`, `width:3.25rem`) — acceptable touch target size, no crowding found.
- **Sticky CTA does not get obscured**, confirmed by the presence of matching spacer divs in
  both the global footer (`Footer.astro:256`) and the VDP override (`[slug].astro:895`).
- **Triple fixed-chrome stacking on `/inventory` mobile.** The sticky top nav
  (`Header.astro:123`, `sticky top-0`) plus the sticky filter/sort bar
  (`inventory.astro:112`, `sticky top-[73px]`) plus the fixed bottom CTA bar together consume a
  large fraction of a 390x844 viewport before any vehicle card is visible. Live-verified: after
  the "Showing 7 vehicles" count line, the first vehicle card content begins well down the page.
  Not a bug, but worth knowing as inventory grows to 15 units — the above-the-fold "how many
  cars can I see without scrolling" number gets worse, not better, unless this chrome is
  trimmed.
- **Filter tap targets are undersized.** `.filter-btn` (`inventory.astro:296-300`) is
  `px-3 py-1.5` with `text-xs` (12px) — roughly 26-28px tall once rendered, well under the
  44px minimum recommended touch target (Apple HIG / WCAG 2.5.5). This is inside a panel that's
  collapsed by default on mobile (behind the "Filters" toggle, `:129-133`), which reduces
  exposure but doesn't eliminate it — once a shopper opens the panel to actually filter, the
  targets are small for a touch-first flow.

---

## 5. Inventory grid: filtering, sorting, comparison

At 7 units today, filtering is a nice-to-have; **at the confirmed near-term 15 units it becomes
load-bearing**, and the current implementation is client-side, in-memory JS
(`inventory.astro:316-469`) filtering/sorting `<div class="vehicle-item">` DOM nodes already
rendered server-side — this scales fine to 15-30 items with no architecture change needed.

- Filters available: price (5 fixed buckets: All / Under $10K / $5K-$8K / $8K-$12K / $12K-$15K),
  body style (dynamic from live inventory), drivetrain (dynamic). Sort: price asc/desc, year
  desc, mileage asc. URL params are read on load (`applyUrlParams`, `:413-431`) so the homepage
  hero chips ("Under $10K", "SUVs", "Sedans") deep-link correctly into pre-filtered state —
  confirmed by cross-referencing `index.astro:139-142` chip hrefs against the param names
  `inventory.astro` reads.
- **A shopper wanting "an SUV under $12,000" needs two taps**: click "SUV" then click
  "$8K-$12K" (the closest bucket at-or-under $12k) — filters combine (AND logic,
  `applyFilters:363-374`), so this actually works, just not from a single homepage chip. No
  homepage chip currently pairs body + price together.
- **No comparison tool.** A shopper cannot select two cars to view side by side; comparing
  requires opening two VDP tabs manually. At 15 units across a handful of body styles this will
  start to matter more than it does today at 7.
- **No saved-search / "notify me" for future inventory.** A shopper who filters and finds
  nothing in their price/body combination (`#no-results`, `:247-255`) gets a "Clear Filters"
  button and nothing else — no way to leave contact info to be told when a matching car arrives.
  This is a real conversion opportunity given Jerry personally sources cars weekly (per the
  "Don't See What You're Looking For?" copy right below the grid).

---

## 6. The VDP: two calculators, CARFAX, CarGurus badge, shopper count — clarifying or noisy?

The in-stock VDP stacks, in this order, in the price block alone (mobile:
`[slug].astro:400-481`; sidebar: `:723-793`): price + est. monthly payment → CarGurus
`cg-vin-badge` widget → "N shoppers checked this on CarGurus" line (only shown when
`vdp_views >= 3`, `:39` — a real gate, not always-on, good) → "no dealer fees" green callout →
the payment-calculator toggle/panel. That is five distinct trust/financial elements before a
shopper reaches the description. For Jerry's stated nervous, credit-challenged audience this
volume of reassurance is directionally correct — but there is genuine, avoidable **redundancy**:

- **CarGurus "deal rating" is presented three separate times on one page**, sourced from the
  same or overlapping data: (1) a custom pill badge in the history-badges row
  (`:517-525`, e.g. "Good Deal · $779 below · via CarGurus"), (2) a custom gradient
  "Price Meter" bar chart directly below it (`:530-556`, same rating + same savings figure,
  different visual form), and (3) the live externally-hosted `cg-vin-badge` SDK widget
  (`:403-405` mobile, `:727-731` sidebar, populated at runtime by
  `getBadge.action?style=STYLE2`). Items (1) and (2) are both driven by the site's own
  `dealRating`/`priceSavings` data and are simply two renderings of the identical number
  (confirmed: both reference `dealBadge`/`marketValue` computed from the same
  `dealRatingRaw`/`priceSavingsRaw` at `:136-152`). Item (3) is a separate, live CarGurus-hosted
  widget that could show a different rating if CarGurus's own data has refreshed since the
  site's last sync — meaning a sharp shopper could see two different "deal rating" labels for
  the same car on the same page. Collapsing (1) and (2) into one presentation, and dropping
  either the custom pill or the external SDK badge, would cut real estate and remove a
  consistency risk without losing any actual information.
- The CARFAX button, inspection checklist, and CarGurus material are all legitimate, complementary
  trust builders and are not redundant with each other — the redundancy is specifically within
  the CarGurus deal-rating presentation.

---

## 7. Trust and friction for a nervous subprime buyer

**What's already there and working:** free CARFAX link gated correctly to in-stock, non-sold
VINs (`:131`); an explicit 8-item inspection checklist (`:665`); the Reg-Z-compliant payment
disclaimer present everywhere a `VehicleCard` payment renders (verified on `index.astro:206`,
`inventory.astro:244`, `[slug].astro:853`); "no dealer fees ever" repeated on every surface;
Google rating shown in nav, hero, and a dedicated reviews section; visible after-hours texting
policy; and vehicle description copy that already follows the compliance guardrails correctly
in the wild — e.g. the live Trax VDP description reads *"Illinois statutory powertrain
protection on qualifying vehicles"* (correct "qualifying" qualifier) and never uses "certified"
or "guaranteed" anywhere in the sampled copy.

**What's missing or working against that buyer**, beyond the VDP-CTA/SSN issue in §0 and the
false "never stored" claim in §1a:

- No FAQ or trust copy addresses "will applying hurt my credit" **on the VDP itself** — that
  answer only exists in the FAQ accordion generically ("Can I get pre-approved...") and on the
  separate `/financing` page FAQ schema (`financing.astro:14-18`). A shopper who never scrolls to
  `/financing` and clicks "Get Pre-Approved" from the VDP sidebar has no visible reassurance
  about credit-score impact at the point of decision — reinforcing §0.
- The credit application's consent block (`apply.astro:524-530`) is dense, small, and legalistic
  (OFAC verification language, FCRA authorization) with no plain-language summary above it — a
  first-time buyer is asked to parse compliance boilerplate right before submitting SSN + income.

---

## 8. Accessibility (and the SEO overlap)

- **Heading order violation on `/inventory`.** Document order is: `h1` (`inventory.astro:118`,
  "Pre-Owned Cars in Skokie, IL") → `h3` (`:264`, "Financing for All Credit Levels") → `h2`
  (`:279`, "Don't See What You're Looking For?"). An `h3` appears before the page's only `h2` —
  a level-skip in the wrong direction that breaks screen-reader heading-navigation expectations
  and is also a mild on-page SEO signal weakness (search engines weight heading hierarchy as a
  structure signal).
- **Icon-font text is exposed to assistive tech everywhere, unmarked.** Every
  `material-symbols-outlined` icon across all files read (`phone`, `sms`, `check_circle`,
  `arrow_forward`, `location_on`, `star`, etc. — hundreds of instances) is a `<span>` containing
  the icon's literal ligature text, and **none of them carry `aria-hidden="true"`** in any file
  reviewed (`Layout.astro`, `Header.astro`, `Footer.astro`, `VehicleCard.astro`, `index.astro`,
  `inventory.astro`, `[slug].astro`, `contact.astro`, `financing.astro`, `apply.astro`,
  `sell-trade.astro`). A screen reader will announce "phone" immediately before reading
  "(847) 510-8947," "check_circle" before every inspection-checklist line, "arrow_forward"
  before "View All," and so on — systemic, easily fixed (add `aria-hidden="true"` to the icon
  span wherever the surrounding text or an `aria-label` already conveys the meaning), and
  currently unaddressed site-wide.
- **Alt coverage is genuinely good.** Vehicle photos use descriptive, per-car alt text
  (`VehicleCard.astro:105`, `[slug].astro:271,287,307`); logo and CARFAX badge images have
  correct alt text; the only bare-decorative image found (the inline Google "G" SVG icon,
  `Header.astro:132-137`) sits directly beside visible text ("5.0 · 46 reviews") so its missing
  label is not an information loss.
- **Focus states are mostly browser-default.** Only `inventory.astro`'s `.filter-btn` class
  defines an explicit `:focus-visible` ring (`:301-304`, orange 2px outline). No global focus
  style override (removal or replacement) was found anywhere in the files reviewed, so default
  browser focus rings should still render on links/buttons elsewhere — functional, if visually
  inconsistent with the brand.
- **Tap targets:** the `.filter-btn` sizing issue is covered in §4. No other undersized
  interactive elements were found in the files reviewed (nav links, form inputs, and CTA buttons
  all use adequate padding).
- **Contrast (flagged, not measured):** small (12px) bold white text sits on lighter brand
  accent colors in a few places — the `GOOD_PRICE`/`FAIR_PRICE` deal-badge pills use `#2ecc71`
  and `#3498db` backgrounds with white text at `text-xs` (`VehicleCard.astro:34-36`,
  `[slug].astro:141-142`). I did not run a contrast checker against these exact hex values
  against the OKLCH/actual rendered color, so I'm not asserting a failing ratio — but small bold
  white-on-mid-saturation-green/blue text is a common WCAG AA failure pattern and is worth an
  actual contrast-checker pass before scaling this pill treatment across 15 units' worth of
  cards.

---

## Prioritized fix list (design-only, no guardrail conflicts)

1. **Point the VDP "Get Pre-Approved" CTA at the soft pre-qualifier, not the SSN form** (§0)
   — copy/link change only, highest expected impact given Jerry's stated buyer profile.
2. **Fix or remove the "never stored on our servers" claim on the credit application** (§1a) —
   it's inaccurate against `api/credit-app.py`'s own logic; replace with an accurate description
   of Fernet encryption + private blob storage, which is still a genuinely good story.
3. **Replace `alert()` failure handling on all four forms** with an inline error state matching
   each form's existing success-state styling (§1).
4. **Add `aria-hidden="true"` to every decorative `material-symbols-outlined` icon** site-wide
   (§8) — mechanical, low-risk, fixes a systemic accessibility gap in one pass.
5. **Fix the `/inventory` heading order** (h3 before h2) and consider promoting the Safety/
   Comfort/Technology category labels on the VDP from `<p>` to `<h3>` for screen-reader
   navigation (§8).
6. **Collapse the duplicate CarGurus deal-rating presentation** on the VDP to one visual, and
   decide whether the live `cg-vin-badge` SDK widget or the homegrown pill/meter is the source
   of truth to avoid two different numbers appearing on the same page (§6).
7. **Vehicle-specific SMS prefill everywhere**, not just the VDP (§2) — small copy change,
   gives Jerry context on every inbound text.
8. Track CARFAX-link clicks and CarGurus-badge click-throughs as GA4 engagement events, and
   consider a success-conditional (not click-conditional) lead event so GA4 can actually detect
   a broken form endpoint (§1, §3).

## Unverified / needs a follow-up pass
- Precise contrast ratios for the deal-badge pill colors (§8) — flagged, not measured.
- Live pixel-level confirmation of header crowding at 375-390px (§4) — DOM/class analysis only,
  screenshot capture was unavailable in this session.
- `ReviewRotator.astro` and `about.astro`/`ship.astro`/Spanish `/es/` pages were not in this
  audit's required reading list and were not reviewed.
