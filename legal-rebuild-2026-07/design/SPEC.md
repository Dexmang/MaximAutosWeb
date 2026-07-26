# Maxim Autos Legal Pages Compliance Rebuild — SPEC

**Date:** July 12, 2026
**Scope:** three legal pages only, local files, nothing deployed.

## Verdict
All three legal pages are compliance-clean and publish-ready. Every critical and high finding is closed on the pages themselves. The one remaining risk lives elsewhere on the site (a Spanish marketing strip advertising a nonexistent "3 month warranty") and is out of this scope. Attorney review recommended before go-live.

## Files changed
- `site/src/pages/privacy-policy.astro`
- `site/src/pages/terms.astro`
- `site/src/pages/return-policy.astro`

## Top fixes per page

### Privacy Policy (was critical)
- Killed the false "no cookies / analytics / pixels" claim; replaced with a truthful GA4 disclosure (ID `G-H05CD3EHE9`), GA cookies, `generate_lead` events, opt-out choices. *(number one fix — already landed by drafter, verified live)*
- Disclosed the real credit-app pipeline: Vercel Blob (encrypted storage) + Resend (alert email) as processors of financial data; Formspree for the other three forms only.
- Effective date July 12, 2026; response window reconciled to 45 days.
- "IDOT" corrected to Illinois Secretary of State dealer regulations.
- Illinois "rights" reframed as a voluntary courtesy, not statutory rights wrongly attributed to ICFA / PIPA / BIPA.
- Added Google Fonts disclosure; noted credit data can enter DealerCenter; softened SMS STOP language; qualified "chat" as future; named **Maxim Autos LLC** as controller.

### Terms of Use (was medium)
- Added the **815 ILCS 505/2L carve-out** so the implied-warranty disclaimer no longer overstates during the 15 day / 500 mile window.
- IL Attorney General consumer fraud hotline corrected to Chicago **1-800-386-5438**.
- Standardized "AS IS"; fixed copy-rule hyphens (Third Party Links, "Buyers who live outside Illinois", "free of errors").
- Named **Maxim Autos LLC** in intro and contact block.

### Return Policy (was medium)
- Corrected statutory deductible: **one half of the cost of each of the first two covered repairs, up to $100 per repair**, per 815 ILCS 505/2L (old text "a deductible per repair" implied an uncapped charge).
- FTC "As Is" box em dash changed to a hyphen to match the official Buyer's Guide.
- Added **Maxim Autos LLC** and license **DL7667** to the contact block.

## Findings status summary
| Severity | Count | Resolved | Open |
|---|---|---|---|
| Critical | 2 | 2 | 0 |
| High | 4 | 2 | 2 (out of scope) |
| Medium | 6 | 6 | 0 |
| Low | 11 | 11 | 0 |

The two open High findings are the Spanish "free 3 month warranty" claims in `src/layouts/Layout.astro` and `src/pages/es/index.astro` — both outside the three-legal-page scope of this pass.

## Confirmed facts used
- Entity: **Maxim Autos LLC** (owner Jerry Franco).
- License: IL Secretary of State, Class D Used Vehicle Dealer, **DL7667**.
- Address: 9101 Terminal Ave, Skokie, IL 60077.
- Phone (only): (847) 510-8947 = `tel:8475108947`.
- Email/site: jfranco@maximautos.com · www.maximautos.com.
- GA4: `G-H05CD3EHE9` on every page.
- Statutory floor: 815 ILCS 505/2L, 15 days / 500 miles; consumer pays half of each of the first two repairs, capped at $100/repair.

## Locked decisions honored
- **Publish-ready:** accuracy revision, not regeneration. GLBA notice, statute citations, and the FTC box preserved verbatim.
- **AS IS default:** all sales final; no Illinois cooling-off period; only unwind path is the spot-delivery financing contingency.
- **Statutory floor is the warranty:** 2L powertrain protection is the "peace of mind"; no free Maxim warranty, no CPO, "certified" never used as a claim.
- **Copy rules:** no em dashes, no hyphenated compounds in prose (exceptions only for the FTC box and formal statute names); voice is "we", warm and direct.

## Open items for the human
1. **Attorney review** recommended before publish (GLBA, ICFA, CCPA/CPRA, FTC, 2L surfaces).
2. **Soften the Spanish "free 3 month warranty" wording** in `Layout.astro` and `es/index.astro`. Suggested: `Inspeccion · CARFAX Gratis · Sin Cargos de Dealer`. Out of scope here; flag for a follow-up pass.
3. **FTC box was verified, not expanded.** The box text is the complete current (revised 2018) FTC "As Is - No Dealer Warranty" wording; the red-team compared against the pre-2018 version. Only the em dash was corrected. Do not add the old sentences.
4. **Ops note:** move the credit-app Resend alert to a verified maximautos.com sending domain (deliverability + brand). No page change.
