# maximautos.com GBP-Compliance Re-Audit — SPEC

Date: 2026-07-12 · Scope: Maxim Autos website only (Sherman Dodge excluded) · Mode: READ-ONLY (nothing edited, nothing published, GBP untouched)
Status: GBP SUSPENDED, appeal pending, verdict expected ~Jul 17-18.

Confirmed findings: 11 (9 slice + 2 critic additions). Rejected / false-positive: 3. OK notes verified clean: 16.

---

## FINDINGS TABLE (grouped by adjusted severity, most severe first)

### CRITICAL

| ID | Severity | Bucket | Location | Evidence | Fix | Citation | Live vs Source | Reality label |
|----|----------|--------|----------|----------|-----|----------|----------------|---------------|
| A4-01 | CRITICAL | Schema & Reviews | reviews_meta.json:2-3 rendered as AggregateRating across ~11 EN pages + es/index (index.astro:69-74, testimonials.astro:28-34, contact.astro:37-42, used-{toyota,honda,subaru,audi}-skokie, used-suvs-skokie-il, used-cars-under-{10000,15000}-skokie, used-cars-chicago-north-shore, used-cars-[city]-il, es/index) | `"rating":5.0, "count":43` emitted as ratingValue/reviewCount and printed on-page as "5.0 Stars on Google / 43 Reviews". Actual content = data/reviews.json, only 6 entries, all `"source":"Cars.com"`, live Cars.com dealer page ~4.83 incl a 4-star. Site contradicts itself elsewhere (about.astro:155 "36", suburbs.json "40"). | Set reviews_meta to the true Google figures pulled directly from the live GBP once reinstated, or until a genuine quotable Google source exists remove the AggregateRating JSON-LD from all pages and drop the on-page numeric count. Never publish an aggregate no reviewable source can back. | Google structured-data review-snippet policy; Google review content policy; FTC 16 CFR 465 (fake/misleading reviews); internal guardrail "AggregateRating/Review must reflect ONLY genuine Google reviews". | Live == source (homepage renders "5.0 Stars on Google · 43 Reviews" verbatim); defect is in committed data, not a stale deploy. | hygiene |

### HIGH

| ID | Severity | Bucket | Location | Evidence | Fix | Citation | Live vs Source | Reality label |
|----|----------|--------|----------|----------|-----|----------|----------------|---------------|
| A4-03 | HIGH | Schema & Reviews | index.astro:113-123 (Google 'G' SVG + card cycle) and testimonials.astro:35-48 | Every reviews.json entry is `"source":"Cars.com"`, yet the hero card renders the Google four-color 'G' with "Verified Review" (index.astro:119) over the rotating Cars.com quotes, and line 145 labels the block "5.0 Stars on Google". Review JSON-LD marks Cars.com text as reviews of AutoDealer "Maxim Autos". | Do not present Cars.com content under a Google logo or "on Google" label. Attribute each review to its real platform (Cars.com) in both the visible card and the schema, or serve genuine Google reviews. Remove the Google 'G' glyph from cards displaying Cars.com content. | Google review content policy (no misrepresenting review origin); FTC 16 CFR 255 (deceptive to misstate endorsement source); schema.org Review honesty. | Live == source (hero card shows the 'G', "Verified Review", and the Cars.com quotes as coded). | hygiene |
| CC-01 | HIGH | Live parity | Header.astro:130-144 (sticky nav on ALL ~40 EN and /es/ routes) | Nav badge opens a Google reviews search link, renders the Google multicolor 'G' (fills #EA4335 ...), prints "5.0" and "43 reviews" from reviews_meta, above the fold on the entire site. Broadest instance of the misattribution, not in the A4-01/A4-03 location lists. | Treat the Header badge like the homepage block: it must reflect only genuine Google data. Until reconciled, drop the Google 'G' and the Google-search link from the nav badge, or relabel to the true source and true count. Do not touch the GBP itself while the appeal is pending. | Internal reviews guardrail; FTC Act Section 5 and 16 CFR 465. | MATCH: live header returns "5.0 43 reviews" next to the Google logo linking to a Google reviews search. | hygiene |
| CC-02 | HIGH | Live parity | es/index.astro:82-118 and 310-316 (live: /es/) | Spanish homepage renders Google 'G' + "5.0 Estrellas en Google · 43 Resenas" (lines 117-118), repeats "5.0 Estrellas en Google" + "43+ resenas de vecinos del North Shore" (312-313), iterates the same 6 Cars.com reviews. Meta description (line 13) also asserts "Resenas de 5 estrellas en Google." Spanish surface uncovered by the EN location lists. | Apply the same correction planned for the English homepage: the Spanish Google claims and counts must rest on genuine Google data or be relabeled to the actual source/count. Keep EN and ES review surfaces in sync. | Internal reviews guardrail; FTC Act Section 5 and 16 CFR 465. | MATCH: same reviews_meta (5.0/43) drives the Spanish page; mirrors the confirmed-live English block. | hygiene |

### MEDIUM

| ID | Severity | Bucket | Location | Evidence | Fix | Citation | Live vs Source | Reality label |
|----|----------|--------|----------|----------|-----|----------|----------------|---------------|
| A2-01 | MEDIUM | Federal | vehicle/[slug].astro:817-826 (More Vehicles grid); VehicleCard.astro:143-144 (live VDP /vehicle/2016-volvo-v60-cross-country-j10208) | The VDP's More Vehicles cards print "$267/mo est. *", "$199/mo est. *", "$221/mo est. *" with a bare standalone asterisk, but the VDP has NO Reg Z footnote resolving it. Only the two calculator lines (447/760) say "Estimates for illustration only." Every other VehicleCard host page carries the footnote, so the VDP was missed in the prior F1 sweep. (Page does independently disclose down/APR/term via its calculators, so residual defect is the unresolved asterisk + internal-consistency miss, not a naked trigger term.) | Add the canonical footnote after line 826: `<p class="text-xs text-gray-400 mt-4">* Est. payment based on 10% down, 9.9% APR, 60-month term. For illustrative purposes only. Actual terms vary by credit.</p>` | 12 CFR 1026.24(d)(2); FTC clear-and-conspicuous standard; internal HARD RULE "Never render a VehicleCard payment without the Reg Z footnote on that page". | Live matches source (bare asterisks, no footnote after grid). | hygiene |
| A5-F1 | MEDIUM | Illinois | Live VDP; vehicles.json:71 (2016 Volvo V60 record) | VDP description reads "15 day / 500 mile Illinois powertrain protection, extended coverage available" with NO "qualifying". vehicle/[slug].astro reads v.description (line 95) into #vdp-desc (621-625); line-clamp only visually truncates, full string is in the DOM and expands on Read more. | Add "on qualifying vehicles"; fix upstream in the DealerCenter description template or the sync sanitizer so it does not recur across units. | 815 ILCS 505/2L (statute exempts >150k mi, rebuilt/flood, GVWR >= 8,000 lb, antique/collector); guardrail C8 (powertrain claims must ALWAYS say "qualifying"). | Live matches source. | hygiene |
| A3-01 | MEDIUM | Illinois | financing-bad-credit/after-repossession-bankruptcy.astro:19 (FAQPage JSON-LD acceptedAnswer) | "every vehicle is independently inspected with a CARFAX report and is backed by Illinois' 15 day / 500 mile statutory powertrain protection". Unqualified coverage claim asserting protection on EVERY vehicle; lives in application/ld+json so it reaches Google FAQ rich results though not visible prose. | Rewrite to "qualifying units carry Illinois' 15 day / 500 mile statutory powertrain protection, and the inventory runs $5,000 to $15,000 so the loan stays small." (no em dashes, no hyphenated compounds) | 815 ILCS 505/2L exemptions; guardrails C2/C8; deceptive-omission risk under ICFA. | Schema-level claim present identically on source and live; reaches search surfaces. | hygiene |
| A4-02 | MEDIUM | Schema & Reviews | reviews_meta.json:3 (count 43) vs testimonials.astro:10 (meta description) | testimonials.astro:10 description = "36 verified reviews on Google" while reviews_meta.json:3 = `"count":43` drives the visible "43+ verified reviews" (line 79) and schema reviewCount (line 31) on the same page. Two contradictory Google counts (36 vs 43) ship on one page, proving the number is hand-authored and drifting. | Reconcile to a single count taken directly from the live Google profile; stop hardcoding review counts in prose meta descriptions where they drift from reviews_meta.json. | Google structured-data review policy (accurate, consistent with what users see); Google review content policy. | Live == source (both the "43" schema/badge and the "36 verified reviews on Google" meta ship live). | hygiene |

### LOW

| ID | Severity | Bucket | Location | Evidence | Fix | Citation | Live vs Source | Reality label |
|----|----------|--------|----------|----------|-----|----------|----------------|---------------|
| A3-02 | LOW | Illinois | data/suburbs.json:166 (Des Plaines FAQ, renders on used-cars-des-plaines-il) | "Illinois' statutory 15 day / 500 mile powertrain protection" appears without "qualifying". Isolated omission: sibling entries already carry it (Evanston line 98, Skokie line 286). | Add the qualifier: "... 15 day / 500 mile powertrain protection on qualifying cars, same day metal plates ..." to match the other suburb answers. | 815 ILCS 505/2L exemptions; guardrail C8. | Source drives the live page; gap renders live. | hygiene |
| A4-05 | LOW | Schema & Reviews | index.astro:119 ("Verified Review" span beside Google 'G'); testimonials.astro:79 | "Verified Review" sits beside the Google logo, and testimonials asserts "43+ verified reviews", but the labeled reviews are hand-keyed into reviews.json from Cars.com with no verification mechanism the site controls. | Drop the "Verified Review" wording (and "verified" in the testimonials hero/meta) unless reviews are pulled live from a platform that verifies purchase/authorship. A static JSON copy of third-party text cannot substantiate "verified". | FTC 16 CFR 255.2 (verification/authenticity claims must be substantiated — note: overstated here since these are genuine moderated-platform endorsements); Google review content policy. | Live == source (badge renders on the live homepage hero card). | hygiene |
| A4-08 | LOW | Schema & Reviews | contact.astro:30-31 vs index.astro:61-63 | contact.astro GeoCoordinates = 42.0334 / -87.7334, but index.astro (and the site-wide sameAs Google Maps URL, incl contact.astro:15) = 42.0464352 / -87.7546134 for the same location, ~1.5-2 km off. Postal NAP, name, phone, license are consistent everywhere. | Align contact.astro geo to the canonical 42.0464352 / -87.7546134 pair so all AutoDealer schema points to one map location. Textual NAP needs no change. | Google LocalBusiness / AutoDealer structured-data accuracy-and-consistency guidance. | Live == source (both coordinate pairs ship as written). | hygiene |

---

## PHASED FIX ROADMAP

Sequencing principle: the website did NOT cause the suspension and is NOT the reinstatement lever (see Honesty box), so nothing here is an emergency reinstatement play. Phase 1 is pure additive disclosure hardening with zero downside, safe to ship during the appeal freeze. Phase 2 is anything that changes a public-facing representation (NAP, hours, the review rating/count/source signals) that Google could be actively evaluating mid-appeal, so it is gated to after the verdict.

### Phase 1 — Safe during the appeal freeze (additive disclosure / qualifier hardening, website only)

These only narrow or clarify existing copy. They add nothing new about the business and cannot introduce a fresh inconsistency for a reviewer to catch. Ship anytime.

1. A2-01 — Add the canonical Reg Z footnote after the VDP More Vehicles grid (vehicle/[slug].astro after line 826). Closes the last bare-asterisk gap missed by the F1 sweep.
2. A5-F1 — Add "on qualifying vehicles" to the Volvo V60 VDP description, and fix the DealerCenter description template / sync sanitizer so the unqualified powertrain phrase cannot recur on future units.
3. A3-01 — Rewrite the after-repossession-bankruptcy FAQ schema answer to "qualifying units carry Illinois' 15 day / 500 mile statutory powertrain protection".
4. A3-02 — Add "on qualifying cars" to the Des Plaines suburb FAQ (suburbs.json:166).
5. A4-08 — Align contact.astro GeoCoordinates to the canonical 42.0464352 / -87.7546134 pair (internal schema consistency, protective).

### Phase 2 — Gated to after the appeal verdict (touches public review representation / any NAP or hours substance)

The review-authenticity cluster changes the visible star rating, review count, and source attribution. Those are exactly the signals a GBP reviewer may be looking at while the profile is under appeal, so changing them mid-appeal is avoided by default. This cluster is nonetheless the highest-severity work in the audit and should be first in the Phase 2 queue. If counsel decides the FTC 16 CFR 465 fabricated-review exposure warrants removal sooner, A4-01 / A4-03 / CC-01 / CC-02 can be expedited by REMOVING the fabricated aggregate and the Google branding (a subtractive de-risk), which is safer than restating new numbers during the freeze.

1. A4-01 (CRITICAL) — Replace or remove the fabricated 5.0 / 43 AggregateRating. Pull real figures directly from the live GBP once reinstated, or strip the AggregateRating JSON-LD and the on-page count until a genuine Google source exists.
2. A4-03 / CC-01 / CC-02 (HIGH) — Stop presenting Cars.com content under the Google logo and "on Google" labels across the homepage hero, the site-wide Header badge, and the Spanish homepage. Attribute to Cars.com or serve genuine Google reviews. Keep EN and ES in sync.
3. A4-02 (MEDIUM) — Reconcile the 36-vs-43 count contradiction to one figure sourced from the live profile; stop hardcoding counts in prose meta descriptions.
4. A4-05 (LOW) — Drop "Verified Review" / "verified" wording unless reviews are pulled from a platform that verifies authorship.
5. Any future NAP, hours, or business-claim edits — hold until the verdict; NAP is currently clean and must stay character-for-character identical.

---

## RECONCILIATION — updates the stale audit table in operations/compliance-guardrails.md

The prior audit tracked findings F1 through F5. Current status:

| Prior ID | Prior description | Prior status | Reconciled status (2026-07-12) |
|----------|-------------------|--------------|--------------------------------|
| F1 | 9 pages missing Reg Z payment footnote | FIXED, staged not pushed | FIXED and shipped via commit **c2778a2**. Residual: ONE host page (the VDP More Vehicles grid) was missed — tracked here as new finding A2-01. |
| F2 | Footer street address missing | OPEN | FIXED via commit **29ac38b**. |
| "Total Protection" overpromise | Unqualified "total/complete protection" wording | OPEN | FIXED via commit **c66e0ed**. |
| F5 | Powertrain statutory cost-share wording | OPEN | RESOLVED. return-policy.astro:64 now matches 815 ILCS 505/2L verbatim ("one half of the cost of each of the first two covered repairs, up to a maximum of $100 per repair") with all four exemptions stated accurately on source and live (see OK note A3-03). F5 can be closed. |

Genuinely NEW in this audit (not tracked by F1-F5):

- Entire review-authenticity cluster — A4-01 (CRITICAL), A4-03, CC-01, CC-02 (HIGH), A4-02, A4-05, A4-08. Previously undetected. This is the material new exposure surfaced by the re-audit.
- A2-01 — VDP More Vehicles grid Reg Z footnote gap. A missed spot within the F1 family, but a distinct new location.
- A5-F1, A3-01, A3-02 — three new powertrain "qualifying" omissions (VDP description, FAQ schema, one suburb FAQ). Related to the F5 powertrain family but distinct locations and distinct from the cost-share wording F5 covered.

Net: F1, F2, Total-Protection, and F5 are all closed. All 11 confirmed findings in this audit are new, and the center of gravity has moved from Reg Z / powertrain wording to review authenticity.

---

## HONESTY BOX

**The website was NOT the cause of the GBP suspension.** Forensics confirmed the suspension traces to the 7/1 GBP badge-graphic posts (delayed batch moderation explains the 7/11 timing). This audit hardens the site's legitimacy signal and removes real FTC / structured-data exposure, but it is NOT the reinstatement lever. Do not present any website fix as the thing that gets the profile back. The reinstatement path is the appeal already filed (verdict ~Jul 17-18) plus the planned purge of the 7/1 badge posts immediately after reinstatement.

Because the site is not the lever, none of these fixes are urgent for reinstatement. They are sequenced on their own risk merits: additive disclosures now (Phase 1), public-representation changes after the verdict (Phase 2).

### Rejected / false-positive findings (auditable reasoning)

- **A4-04** — Alleged "mathematical inconsistency" between a 5.0 aggregate and a marked-up 4-star review. Rejected: Google does not require the aggregate to equal the mean of the sampled on-page reviews; 42x5 + 1x4 = 214/43 = 4.976 legitimately rounds to 5.0 at one decimal; per-review schema honestly emits "4" for Chris S. The only real residue is a cosmetic hardcoded 5-star VISUAL glyph rendering a true 4-star review as 5 filled stars (display nit, not a structured-data or guardrail violation).
- **A4-06** — CARFAX Advantage Dealer badge "unauthorized" theory. Rejected: enrollment absence in the repo is not proof of a lapse; a genuine subscriber displaying the badge is routine and lawful. No hard guardrail covers CARFAX badge authorization. Records-hygiene only (keep evidence enrollment is active).
- **A4-07** — CarGurus deal badges. Rejected: attribution is explicit, values mirror the real per-VIN CarGurus rating, the finding's own suggested_fix says "No change needed", and the cited FTC 16 CFR 255 is satisfied, not breached. Only residual is an operational freshness check for a stale "Great Deal", not a compliance defect.

### Verified clean (OK notes, no action)

Federal ads: all 12 VehicleCard grid pages carry the canonical Reg Z footnote (A2-02); VDP/financing calculators expose down/APR/term with every rate labeled "APR" (A2-03); no guaranteed-approval language, "all credit levels" stays conditional (A2-04); no odometer/TMU or "certified" claims (A2-05). Illinois: zero-doc-fee all-in pricing consistent site-wide (A3-07); bankruptcy/repo copy stays conditional (A3-05); no cooling-off/buyer-remorse right implied, affirmatively disclaimed (A3-04); license DL7667 + IL SOS + IL AG 1-800-386-5438 complaint paths visible (A3-06); powertrain cost-share wording verbatim to statute (A3-03). Schema: core NAP and business name in JSON-LD are clean and match the guardrail everywhere.

---

## SLICE A1 — GBP LEGITIMACY & NAP (backfilled 2026-07-12)

The A1 auditor in the workflow errored on its structured output, so this slice was re-run separately. It is the most on-point slice for the Google policy that triggered this audit (business-name accuracy, NAP consistency, license visibility, hours parity, category). Results:

| ID | Severity | Bucket | Location | Evidence | Fix | Citation | Reality label |
|----|----------|--------|----------|----------|-----|----------|---------------|
| GL-01 | MEDIUM | GBP legitimacy | License present ONLY at terms.astro:39 and return-policy.astro:239; absent from Footer.astro (117-144) and contact.astro | Grep for "DL7667" across src/ returns exactly two hits, both on deep legal pages. The sitewide footer shows address, phone, email but no license number. | Add "Illinois Secretary of State Class D Used Vehicle Dealer, license DL7667." to the Footer brand column (around line 133) so it renders on every page. | GBP legitimacy / local-business verification: a state dealer license is a primary real-world legitimacy signal and should be crawlable sitewide, not two clicks deep. | hygiene |
| GL-02 | LOW-MEDIUM | Schema NAP | inventory.astro:41-47, testimonials.astro:21-27, about.astro:20-25 (Person), vehicle/[slug].astro:197 (seller) | PostalAddress nodes omit `streetAddress` (about.astro also omits `postalCode`), while index.astro, contact.astro, and every make/price/city landing page carry the full "9101 Terminal Ave". | Add `"streetAddress":"9101 Terminal Ave"` to the four incomplete PostalAddress nodes (and `"postalCode":"60077"` to about.astro) so the machine-readable NAP is identical everywhere. | NAP-consistency for GBP corroboration; partial addresses weaken the entity match Google uses to tie the site to the verified profile. | hygiene |
| GL-03 | LOW (informational, NOT a violation) | GBP name | Title tags: faq.astro:8, testimonials.astro:9, return-policy.astro:7, apply.astro:7, sell-trade.astro:6, plus Spanish set | HTML `<title>`/`og:title` strings append "Maxim Autos Skokie IL" (brand adjacent to city with no separator). | Optional polish only: separate with a pipe, e.g. "... | Maxim Autos | Skokie, IL". No compliance action required. | GBP name-stuffing policy governs the profile name and schema `name` (both clean here), not title tags; a city in the title tag is standard, permitted local SEO. | cosmetic |

**A1 VERIFIED CLEAN:** business-name entity signal exactly "Maxim Autos" in every JSON-LD `name` and og:site_name (zero appended keywords); phone consistent in all three forms; visible street-address text consistent wherever present; hours parity exact across footer, contact, es/contacto, faq.json, and JSON-LD (Wednesday intentionally omitted from openingHoursSpecification, which correctly handles "by appointment" without contradicting visible copy); category `AutoDealer` with only actually-offered services described.

> NOTE — this refines OK-note A3-06 above: the license number IS present and correct, but only on the two legal pages, not on the sitewide footer (see GL-01).

---

## SOURCES

- Google Business Profile prohibited-and-restricted-content policy (business-representation, reviews, and profile-content rules).
- Google Search structured-data policies: review-snippet policy (ratings must reflect genuine, verifiable reviews) and LocalBusiness / AutoDealer accuracy-and-consistency guidance.
- 815 ILCS 505/2L — Illinois used-vehicle statutory powertrain warranty (15 day / 500 mile; one-half cost share to a $100-per-repair cap on the first two repairs; exemptions: over 150,000 miles, rebuilt/flood titles, GVWR >= 8,000 lb, antique/collector). Related: 815 ILCS 505/2 (Consumer Fraud Act, ICFA) and 815 ILCS 510 (Loan Advertising to Bankrupts Act).
- 12 CFR 1026.24 (Regulation Z, TILA advertising): 1026.24(c) rate stated as APR; 1026.24(d)(2) a stated payment amount triggers disclosure of downpayment, terms of repayment, and APR.
- FTC 16 CFR 455 (Used Car Rule / Buyers Guide); 16 CFR 255 (Endorsement Guides, source-of-endorsement honesty); 16 CFR 465 (Rule on the Use of Consumer Reviews and Testimonials, fake/misattributed reviews); FTC Act Section 5.
- 14 Ill. Adm. Code 475 — Illinois motor-vehicle advertising regulations (all-in advertised price, no fee padding, clear and conspicuous disclosures).
- Internal: businesses/maxim-autos/operations/compliance-guardrails.md (guardrails C1-C8) and site/CLAUDE.md HARD RULES (Reg Z footnote, powertrain "qualifying", genuine-Google-reviews-only, character-for-character NAP).
