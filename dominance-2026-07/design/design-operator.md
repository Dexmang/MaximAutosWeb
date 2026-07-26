# The Autonomous SEO Operator

**Design run, 2026-07-25. Nothing here has been built, deployed, scheduled, or published.**
Scope: Maxim Autos only (`ma_vehicles`, J series). Sherman Dodge appears nowhere in this document.

---

## 0. The verdict, in one paragraph

The 20 overdue Google tasks are not a planning failure and not a Jerry failure. They are an
infrastructure failure with a measurable signature: **every automation lane at Maxim is dead
except one, and every stalled plan was parked in a dead lane.** GitHub Actions on the
MaximAutosWeb repo ran 12 times in the last 48 hours with zero failures. Every cloud routine that
touches Google is disabled. The one Windows task that enforces closure discipline is disabled.
So the operator does not get a new scheduler, a new routine, or a new daemon. It gets built as a
GitHub Action in the lane that already survives, it writes its output as a file committed to the
repo instead of a row on a machine that might be off, it is watched by two independent jobs that
already run green, and it produces exactly one approval card per week with a hard cap of seven
items. That is the whole design. The rest of this document is the specification and the evidence.

---

## 1. What I verified this session

Everything below was reproduced live on 2026-07-25 or 2026-07-26 UTC. Three of these correct the
brief I was given.

### 1.1 Three corrections to the brief

| Brief said | Verified reality | Evidence |
|---|---|---|
| **D10 is named a live re suspension hazard**, with `maxgoogle-weekly-gbp-sweep` scheduled to build 3 GBP posts per week | **REFUTED as a live hazard.** The routine is `enabled: false` and has been since 2026-07-11. So is `maxgoogle-daily-gbp-check`. So is `maxgoogle-monthly-report`. Nothing will fire on Monday. | `mcp__scheduled-tasks__list_scheduled_tasks`, this session. All three return `"enabled": false`. |
| **D12: the gh CLI is unauthenticated locally** so the OAP sync trigger fails silently | **REFUTED.** `gh auth status` returns logged in as `Dexmang` via keyring, token scopes `gist, read:org, repo`, active account true. And the trigger demonstrably works: 6 successful `Build Inventory` runs plus 6 successful `Deploy` runs in the last 48 hours. | `gh auth status`; `gh run list --limit 12`, this session. |
| The registry is the source of truth for what runs | **The registry is wrong on five rows.** It marks three disabled cloud routines as ENABLED, it omits a live Windows task (`Maxim Lead Sync`, ran 2026-07-25 19:00, result 0), and it does not record that the only enabled cloud routine left is `gbp-appeal-verdict-watch`, which is moot because the verdict landed 7/14 and the profile verified 7/24 yet it still fires daily. | `memory/protocols/automations-registry.md` lines 12, 13, 18 vs the live scheduler listing; `Get-ScheduledTask`, this session. |

**Why this matters more than the original D10.** The danger was never a cron about to fire. The
danger is that the registry is the document a human or an agent reads before deciding to re enable
something. A registry that says "ENABLED, 3 posts per week via native GBP scheduling" is a loaded
gun pointed at a profile that was suspended once for exactly that collision. The fix is not to
disable a routine that is already disabled. The fix is Check 13 below, which diffs the registry
against the live schedulers every week and refuses to report green when they disagree.

### 1.2 New defects found this session that no audit caught

**A. The footer makes a blanket protection claim on all 56 pages.**

I scanned every URL in the live sitemap for the guardrail vocabulary. Result: 56 of 56 scanned,
zero unreachable.

```
RULE HITS (occurrences sitewide)
  106  em dash (U+2014)
   78  hyphenated compound ("first-time", "5-Star", "Same-...")
   62  C8 blanket protection claim
   49  B4 "all credit" truncated
    3  B4 "guaranteed financing"      <- ALL FALSE POSITIVES, see 1.3
    3  C7 "certified"                 <- ALL FALSE POSITIVES, see 1.3
```

The 62 blanket protection hits are one string in the shared footer, live right now on the
homepage: *"Quality used cars in Skokie, IL. Every vehicle inspected, every price transparent,
every customer protected."* Guardrail C8 bans any phrase implying comprehensive coverage on an
AS IS car. "Every customer protected" is exactly that phrase, and it is on every page of the site.
This is the same defect class as the purged 3 month warranty claim, it just never got scanned for
because nothing scans.

The 49 "all credit" hits are the page top marquee: *"No doc fee, All credit welcome."* MEMORY.md
carries this as a hard rule: **"Financing for all credit levels" only, never truncated to "all
credit."** The `/financing` page body says it correctly and the marquee on that same page
contradicts it.

**B. IndexNow has never submitted 22 of the 56 sitemap URLs.** Reproduced by diffing
`node scripts/ping-indexnow.js --dry-run` against the live sitemap.

```
indexnow=37   sitemap=56

IN THE SITEMAP, NEVER PINGED (22):
  /                                    <- see below
  /es  /es/aplicacion-de-credito  /es/compra-en-linea  /es/contacto
  /es/financiamiento  /es/inventario  /es/sobre-nosotros  /es/vender-intercambiar
  /financing-bad-credit  and all 5 of its children
  /privacy-policy  /return-policy  /terms
  /used-suvs-skokie-il
  3 VDPs sold 8 to 13 days ago (still in the sitemap under the 14 day rule)

PINGED BUT NOT IN THE SITEMAP (3):
  https://www.maximautos.com/          <- trailing slash, non canonical form
  2 retired slugs (correct behavior, they 301)
```

Three root causes, all mechanical:

1. `STATIC_PATHS` at `scripts/ping-indexnow.js:50` is a hand maintained array of 17 paths. The
   Spanish site, the financing hub, the legal pages, and `/used-suvs-skokie-il` were added to the
   site and never added to the array.
2. `canonicalUrl()` at line 77 has an off by one: `if (u.length > BASE_URL.length + 1 && u.endsWith("/"))`.
   For the homepage, `u.length === BASE_URL.length + 1`, so the strip never runs and the homepage
   is submitted as `https://www.maximautos.com/` while its canonical is `https://www.maximautos.com`.
3. `RECENT_EVENT_DAYS = 7` but the sitemap keeps a sold VDP for 14 days. A car sold 8 to 13 days
   ago sits in the sitemap, is noindex, and its last IndexNow ping happened while it was still for
   sale. Engines are never told it flipped.

**This is the most likely mechanical cause of task #166** ("28 money pages Discovered, currently
not indexed"). The pages that are not indexed are largely the pages that are never submitted.
Task #170 names backlinks as the indexing bottleneck. Backlinks may well matter, but a URL that
has never been submitted to the one indexing API the site already pays nothing for is a cheaper
thing to fix first, and it is fixable by a pure function of the build output.

**C. The GitHub Pages mirror is an uncontained duplicate.** Verified live: `https://dexmang.github.io/MaximAutosWeb/`
returns 200, carries `<link rel="canonical" href="https://dexmang.github.io/MaximAutosWeb">` (self
referencing, not pointing at production), has **no** robots noindex meta, and its `robots.txt`
disallows nothing but `/inventory?`. Byte identical homepage content competing with production.

**D. `reviews_meta.json` has no owner.** `update-reviews.yml` is disabled (Google blocks the
scraper). `maxgoogle-daily-gbp-check`, which the workflow comment says "now owns reviews_meta.json",
is `enabled: false`. The file reads `{"rating": 5.0, "count": 46, "updated": "2026-07-24"}` and its
last commit was a hand authored parity commit, not an automated one. Nothing will update it again.

**E. The DealerCenter description field is an unscreened compliance surface.** The live
`/vehicle/2015-honda-civic-se` renders a description ending *"Every car inspected. Every price
transparent. Every customer protected."* That text originates in DealerCenter, flows through
`ingest_oap.py` to `ma_vehicles`, then `build-inventory.js` to `vehicles.json`, then onto the live
VDP **and** into the GMC feed that Merchant Center reads. There is no compliance gate anywhere on
that path. Whatever Jerry types into DealerCenter is published to Google.

### 1.3 The false positives, and why they are the most important finding here

A naive banned phrase scanner would have reported six critical violations on `/terms` and
`/return-policy`. Every single one is inside a negated disclaimer:

- `/return-policy`: *"...we do not certify vehicles. Any vehicle described as 'certified' anywhere on this site or in any listing is incorrect..."*
- `/terms`: *"...does not run a certified vehicle program of any kind. We never describe a vehicle as certified."*
- `/terms`: *"...do not represent a credit decision, loan commitment, or guaranteed financing offer."*

These pages exist to say those things are not true. Flagging them is the operator crying wolf on
the guardrail's own text. **An operator that does this once gets ignored forever, which is exactly
how the last three pushes died.** So the scanner ships with a negation window and a disclaimer path
allowlist from day one, and every suppressed match is still written to the JSON report at INFO so
the suppression itself is auditable. Precision before recall. A weekly report Jerry trusts is worth
more than a complete one he stops opening.

---

## 2. Why the last three pushes died, measured

| Lane | Jobs | Currently working | Evidence |
|---|---|---|---|
| **GitHub Actions (MaximAutosWeb)** | deploy, sync-inventory, feed-parity-audit | **3 of 3 green.** 12 runs in 48h, zero failures. | `gh run list`, this session |
| **Cloud routines (scheduled-tasks MCP)** | 9 registered | **1 of 9 enabled, and that one is moot.** The 3 Google routines are disabled since 7/11. `gbp-appeal-verdict-watch` still fires daily for a verdict that landed 7/14. | `list_scheduled_tasks`, this session |
| **Windows Task Scheduler** | 6 Maxim or SD tasks | **Mixed and degrading.** `Maxim Google Accountability` DISABLED, last ran 7/11. `VinCue Weekly Pull` last result 2147946720 (failed). `Maxim GBP Spotlight Queue` registered 7/24, never fired. `Maxim Lead Sync` running but undocumented. | `Get-ScheduledTask`, this session |
| **Python daemons** | 4 described in the registry | **0 of 4 running.** Confirmed in the 2026-07-25 setup audit: the only live python process on the machine is `businesses/maxim-autos/app/server.py`. | `automations-registry.md` lines 49 to 53 |

The pattern is unambiguous. **Anything that depends on this Windows machine being awake, or on a
cloud routine staying enabled through an incident, dies. Anything that runs in GitHub Actions
lives.** The three failed pushes all built in the dying lanes.

Second pattern, equally clear: **`update-reviews.yml` is the template for how these things die
quietly.** Its own header comment says it best: the scraper "went blind (Google blocks the request,
parses null, exits 0 silently)." It reported success while doing nothing for an unknown number of
weeks. Every check in this design therefore has three states, never two.

---

## 3. Where it runs, and why

**Decision: one new GitHub Action in the MaximAutosWeb repo. Zero new Windows scheduled tasks.
Zero new cloud routines. Zero new daemons.**

| Option | Verdict | Why |
|---|---|---|
| GitHub Action, MaximAutosWeb repo | **CHOSEN** | The only lane with a 100 percent success record. Runs whether the Windows box is on or off. Free on a public repo. Already proven to fetch the live site (`feed-parity-audit.yml` curls `www.maximautos.com` and passed 2026-07-25), already proven to commit back to the repo (`sync-inventory.yml`), already proven to push ntfy alerts. |
| New Windows scheduled task | **REJECTED** | Every Google related Windows task registered in this system is now disabled, failed, or has never fired. Registering a sixth one is the definition of repeating the failure. |
| New cloud routine | **REJECTED** | 8 of 9 disabled. They also get suspended as a group during an incident, which is precisely when checking matters most. |
| Local python daemon | **REJECTED** | 0 of 4 described daemons are running. |

**Cadence:** `cron: '0 11 * * 1'` (Monday 06:00 CT during CDT, 05:00 CT during CST; GitHub cron is
UTC and does not follow DST, and that drift is acceptable because both times land before the 07:30
spotlight routine and long before the lot opens at 15:00). Plus `workflow_dispatch` for manual runs.

**Why Monday morning:** the card must be sitting there before Jerry's week starts, and before
`gbp_spotlight_monday.py` runs at 07:30, so the spotlight routine can consume fresh parity data
rather than deriving its own.

### The one thing the Action cannot do, and how that is solved

The Action cannot reach `pka_hub.db`. That database is local and is the source of truth for tasks
and notes. Rather than build a new local job to bridge the gap, **the bridge is a step added to
`Maxim OAP Feed Pull`,** the most reliable local job in the system (2x daily, last result 0, and it
already git pulls and pushes against this exact repo). It adds roughly two seconds:

```
existing OAP pull steps ...
  + git pull the website repo (already happens)
  + read dominance-2026-07/operator/APPROVAL-CARD.md
  + if its week stamp is newer than the last ingested week:
        file ONE awaiting_owner task for Jerry (db_tasks.py add, exactly as
        gbp_spotlight_monday.py:431 file_jerry_task already does)
        write one seo_check_runs row per check into pka_hub.db
  + if operator/HEARTBEAT.json is older than 8 days:
        ntfy CRITICAL + one urgent DB task
```

If the Windows box is off for a week, nothing is lost. The card is a committed file. The ingest
catches up on the next run and files the task then. **Nothing in the critical path requires the
local machine, Chrome, or Jerry.** That is the structural difference from every previous attempt.

---

## 4. Architecture

```
                        GitHub Actions  (the lane that survives)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  seo-operator.yml     cron '0 11 * * 1'  +  workflow_dispatch            │
  │                                                                          │
  │   1. checkout                                                            │
  │   2. node scripts/operator/run-checks.mjs   ── 13 checks, live HTTP      │
  │   3. lighthouse (lab CWV, 3 URLs)                                        │
  │   4. node scripts/operator/apply-safe-fixes.mjs  ── AUTOFIX whitelist    │
  │   5. node scripts/operator/render-card.mjs  ── rank, cap 7, honor snooze │
  │   6. commit  (GITHUB_TOKEN → does NOT retrigger deploy.yml)              │
  │   7. ntfy push  |  8. if: failure() → ntfy CRITICAL                      │
  └───────────────┬──────────────────────────────────────────────────────────┘
                  │ writes, committed to the repo (NOT web published:
                  │ deploy.yml publishes site/dist only)
                  ▼
   dominance-2026-07/operator/
      APPROVAL-CARD.md          <- THE card. Stable path. Overwritten weekly.
      HEARTBEAT.json            <- {"last_run_utc": ..., "checks_ran": 11, "checks_unavailable": 2}
      decisions.json            <- Jerry's yes/no history + snooze_until (anti nag)
      reports/2026-W31.md       <- full human report, every check, every suppression
      reports/2026-W31.json     <- machine report, trendable
      baseline/                 <- last known good schema + redirect + NAP snapshots
                  │
                  ▼
   ┌───────────────────────────────┐        ┌──────────────────────────────┐
   │ Maxim OAP Feed Pull (2x/day)  │        │ feed-parity-audit.yml (daily)│
   │  + ingest card → ONE Jerry    │        │  + heartbeat age check       │
   │    task, seo_check_runs rows  │        │  + ntfy if > 8 days stale    │
   │  + heartbeat deadman          │        │  (watcher 2, independent)    │
   │  (watcher 1)                  │        └──────────────────────────────┘
   └───────────────────────────────┘
                  │
                  ▼
   pka_hub.db :  seo_check_runs (new)  ·  tasks (one awaiting_owner)  ·  notes
```

**Three independent deadman lanes.** The Action alerts on its own failure. The daily parity Action
alerts if the weekly heartbeat goes stale. The local OAP pull alerts if the heartbeat goes stale.
Two of those three do not require the Windows box. Killing this operator silently requires three
separate independent failures.

---

## 5. The check register

Every check returns one of exactly three states. **There is no two state check anywhere in this
design.**

| State | Meaning | Card behavior |
|---|---|---|
| `PASS` | Ran to completion, found nothing | Silent |
| `FAIL` | Ran to completion, found n findings | Ranked into the card or the report |
| `UNAVAILABLE` | Could not run. Carries a machine readable `reason` and a `blocked_by` | **Printed at the top of the card.** Never counted as pass. |

The report header is a coverage line, always, in this exact shape:

> **Coverage: 11 of 13 checks ran. 2 could not run.** Check 7 (index state) UNAVAILABLE:
> no GSC credential exists on this runner. Check 8 (rank) UNAVAILABLE: depends on check 7.

| # | Check | What it asserts | How, concretely | Runs where | Proven? |
|---|---|---|---|---|---|
| 1 | **Banned phrase scan** | No guardrail vocabulary on any public surface | Fetch all sitemap URLs + `/llms.txt` + `/feeds/vehicles.xml` + `gbp-canonical.json` description. Strip script/style/comments, unescape, collapse whitespace. Apply the C7/C8/B4/style rule set with a 60 char negation window and a disclaimer path allowlist (`/terms`, `/return-policy`, `/privacy-policy`). | Action | **YES, run this session. 56 of 56 fetched. Found the footer C8 violation and the "all credit" truncation. Correctly identified all 6 legal page hits as false positives.** |
| 2 | **Schema validity** | Every JSON-LD block on every URL parses, and each page class carries its required types | `JSON.parse` every `application/ld+json`. Assert by class: VDP needs Car or Vehicle + Offer + FAQPage + BreadcrumbList; home needs Organization + AutoDealer + AggregateRating; SRP needs ItemList. Diff the type set against `baseline/schema.json` and flag any type that disappeared. | Action | Pattern proven: `audit-feed-vdp-parity.js:94 findVehicleSchema()` already does the parse and the array form type match. Extend it. |
| 3 | **Canonical and hreflang integrity** | Canonical is absolute, self consistent, trailing slash correct, and hreflang self reference agrees with it | Per URL: canonical present, absolute, `https://www.` host, no trailing slash (site is `trailingSlash: 'never'`), canonical of a sitemap URL equals that URL. For `/es` pages assert the `hreflang` self reference string equals the canonical string exactly. | Action | **Defect D2 reproduced live this session: `/es` and `/es/` both return 200 with `num_redirects=0`.** |
| 4 | **Redirect chain integrity** | Every declared redirect is exactly one hop, permanent, and lands on a 200 | Load the 55 rules from `vercel.json`, plus apex, plus `http://`. For each: assert `num_redirects <= 1`, assert 301 or 308 (not 302 or 307), assert the destination returns 200. | Action | **Verified live: apex returns 307, not 301 (task #89). `vercel.json` holds 55 rules, 54 permanent, 1 with `permanent: false` (`/sitemap.xml`), which is the second 307 nobody had named.** |
| 5 | **Feed to VDP parity** | Merchant feed price, availability, VIN, image, and link all match the live VDP | **Do not rebuild this.** `scripts/audit-feed-vdp-parity.js --json` already asserts all six. Shell out, capture the JSON, fold into the report. | Action | Already running daily and passing (`Feed-VDP Parity Audit` succeeded 2026-07-25 15:42). |
| 6 | **Indexability and submission coverage** | Every indexable URL is in the sitemap, is not orphaned, and has actually been submitted to IndexNow | Three diffs: (a) built route set vs sitemap; (b) sitemap vs `ping-indexnow.js --dry-run` output; (c) inbound internal link count per URL from the built HTML, flagging zero inbound. Plus assert the IndexNow event window is at least as long as the sitemap sold retention window. | Action | **YES, run this session. Found the 22 unpinged URLs, the homepage trailing slash form, and the 7 vs 14 day window mismatch.** |
| 7 | **Index state (Google's own answer)** | What Google actually has indexed | **UNAVAILABLE at build time.** Verified: zero Google API credentials exist anywhere on this machine, and a repo wide grep for `searchconsole` / `webmasters` returns only `node_modules` noise. Unblocking is free but needs a one time Jerry action (section 9.4). | Action, once unblocked | **Honestly blocked. Verified absent this session.** |
| 8 | **Rank on a fixed query set** | Position for the query basket | **UNAVAILABLE headless and it always will be.** Google blocks scripted SERP reads and SPEC section 5C already killed the manual multi surface basket as measurement theater. When check 7 unblocks, this becomes GSC average position on the English basket, which is Google's own logged data and is what SPEC section 8 already designates the primary rank signal. Until then the card prints UNAVAILABLE with the reason, and the quarterly 5 query Maps spot check stays a Chrome line item. | n/a until 7 lands | **Honestly blocked. I will not fake this.** |
| 9 | **Review count drift** | Every surface agrees with `reviews_meta.json`, and that file is itself fresh | Grep the built HTML plus `suburbs.json` plus `llms.txt` for any review count integer. Assert all equal `reviews_meta.count`. Separately assert `reviews_meta.updated` is under 14 days old, and if not, raise it as its own finding because **nothing owns that file any more**. | Action | **Verified this session: `{"count": 46, "updated": "2026-07-24"}`, both owners disabled. The staleness check is the point.** |
| 10 | **NAP consistency across directories** | The verbatim NAP block appears correctly on every reachable citation | Fetch a fixed watchlist. Normalize phone to digits, address to USPS abbreviations. Assert exact match. **Any host returning 403, a Cloudflare challenge, or a timeout is recorded as `UNVERIFIED`, never as pass.** iSeeCars carries a known wrong phone, (847) 250-4971, so it is seeded as a standing FAIL until proven otherwise. | Action | Partial by nature. The competitive audit proved several dealer and directory hosts hard block scripted fetches, so the UNVERIFIED bucket is load bearing, not an excuse. |
| 11 | **Core Web Vitals** | Performance has not regressed | `npx lighthouse` headless on 3 URLs (home, SRP, one VDP), mobile preset. Assert LCP, CLS, INP against `baseline/cwv.json` and flag regressions over 15 percent. **Labelled LAB DATA in every report line.** | Action | **PSI API is not an option: verified 429 with `Quota exceeded for quota metric 'Queries' ... per day` on the anonymous shared project. Lighthouse in Actions needs no key and no money.** |
| 12 | **Mirror containment** | The GitHub Pages mirror is not competing for production's rankings | Fetch the mirror root, assert either a cross domain canonical to `https://www.maximautos.com` or a `noindex` robots meta, and assert its `robots.txt` disallows all. | Action | **Verified live this session: 200, self canonical, no noindex, robots.txt permits crawling. Currently FAILS all three assertions.** |
| 13 | **Automation truth check** | The registry matches reality | Compare `automations-registry.md` rows against the live scheduler state committed in `operator/baseline/schedulers.json` (refreshed by the OAP ingest step, which can read both schedulers locally). Any row whose stated enabled state, cadence, or posting count disagrees with reality is a finding. Any automation whose declared cadence exceeds the SPEC cap is a **critical** finding. | Action, fed by local ingest | **This is the real D10 fix. Verified the registry is wrong on 5 rows this session.** |

**On check 13 and D10 specifically.** The registry currently promises `maxgoogle-weekly-gbp-sweep`
builds "3 GBP posts per week" via "GBP native scheduling." SPEC section 4 caps posting at 1 per
week through day 45 and section 11 explicitly names "3 posts/week or native GBP scheduling in
window" as a re suspension risk and a second automated posting owner. Check 13 encodes the SPEC cap
as a number in `operator/baseline/cadence-caps.json` and fails on any registered automation that
declares a higher one. It catches the class, not just this instance, and it catches it before
someone re enables the routine rather than after.

---

## 6. The fix line: exactly where autonomy stops

A finding is eligible for AUTOFIX **if and only if all four are true.** Any single failure means it
stages.

> **1. Pure function.** The corrected value is derived entirely from data already in the repo or
>    the DealerCenter feed. No judgment, no new information, no external lookup.
> **2. No claim surface.** It changes a value that is supposed to mirror source data. It never
>    changes a sentence that makes a claim about price, warranty, financing, condition, or identity.
> **3. Existing generator.** A deterministic script in `scripts/` already owns that output. The fix
>    is running the generator, never hand patching its output.
> **4. Single revert.** Undoing it is one `git revert` with no external side effect. Nothing already
>    sent, posted, or submitted to a third party.

### The AUTOFIX whitelist (closed set; adding to it is a human change to this document)

| Fix | Passes the four part test because |
|---|---|
| Regenerate `llms.txt` from `vehicles.json` + `reviews_meta.json` | Price band and review count are pure functions of live data. The prose template is fixed and human authored. |
| Rebuild the IndexNow submission list from the built sitemap instead of `STATIC_PATHS` | Pure function of build output. No content changes. IndexNow is idempotent by spec (`ping-indexnow.js:24`). |
| Re ping IndexNow for URLs whose canonical, status, or noindex state changed | Idempotent, submits nothing but URLs. |
| Regenerate the GMC feed with the em dash and trailing slash normalized | D5 and D6 are deterministic string normalization inside `build-gmc-feed.js`. |
| Propagate `reviews_meta.count` into every generated review count | Pure function. Note: hardcoded counts in `suburbs.json` are **not** in scope until a human converts them to derived, because editing a hand authored data file is a claim edit. |
| Refresh `operator/baseline/*.json` after Jerry approves a change | Bookkeeping only. |

### The NEVER AUTO list, and the reason each is permanent

| Never | Reason |
|---|---|
| **Any GBP mutation of any kind.** Post, photo, reply, attribute, hours, category, description, settings toggle. | SPEC section 7 rule 1 and MEMORY.md hard rule. Jerry approves every GBP change individually. This is not a tuning parameter. The profile was suspended once. **The operator never arms `posting_owner_guard.py` and never opens Chrome.** |
| Any new or reworded customer facing sentence | Fails test 2. Every sentence on this site is a compliance surface. |
| Any `vercel.json` redirect change, including fixing the apex 307 | Fails test 4. A wrong redirect rule can dark the whole site, and the blast radius is not one page. It stages as card item 1, with the exact diff prewritten. |
| Any canonical, hreflang, or noindex change | Fails test 4 in effect. Deindexing is slow to detect and slow to undo. |
| Deleting, unpublishing, or 410ing any page | Fails test 4. |
| Anything touching the DealerCenter description text | Fails test 2 and test 1. It originates outside the repo. The operator **flags** the phrase and stages the corrected text for Jerry to paste into DealerCenter. |
| Anything the check itself marked `UNAVAILABLE` | An unrun check produces no fix. Ever. |

**The stated line, in one sentence:** the operator may recompute a value that was always supposed
to equal something else, and may tell an indexing API that a URL exists. It may not decide what the
site says, what Google sees as canonical, or what appears on the Business Profile.

---

## 7. The approval card

One file, one stable path, overwritten weekly: `dominance-2026-07/operator/APPROVAL-CARD.md`.

**Three rules that make it a card instead of a task list:**

1. **Hard cap of 7 items.** Everything below rank 7 goes into the report, not the card. A card with
   20 items is a backlog, and this system already proved that a backlog does not get executed.
2. **Every item is one yes or no, with the consequence prewritten.** No item requires Jerry to look
   anything up, open anything, or decide how. The how is already built and staged.
3. **A NO is durable.** It writes `snooze_until = today + 90 days` into `operator/decisions.json`
   and the item cannot resurface before then. Without this the card re nags, and a re nagging card
   gets ignored. This is the single most important anti decay mechanism in the design.

**Ranking:** `severity_weight x confidence`, where severity is
`legal_compliance (100) > index_blocking (60) > drift_from_source (40) > style (10) > cosmetic (5)`
and confidence is zero for anything the negation rule suppressed. Ties break toward the cheaper fix.

### Worked example, built from this session's real verified findings

```markdown
# Maxim SEO Operator: Approval Card, Week of 2026-07-27

Coverage: 11 of 13 checks ran. 2 could not run.
  Check 7 (index state)  UNAVAILABLE. No GSC credential exists on this runner. See 9.4.
  Check 8 (rank)         UNAVAILABLE. Depends on check 7.
AUTOFIXED without asking (3): llms.txt price band $5,000-$15,000 -> $8,995-$15,995 ·
  IndexNow list rebuilt from sitemap, 37 -> 56 URLs · GMC feed title em dash normalized.
  All three: commit 4a1c9e2, one revert undoes all of it.

Reply with the numbers. Example: "1 yes, 2 yes, 3 no, 4 yes"

---
### 1. LEGAL: the footer claims "every customer protected" on all 56 pages
ON YES:  Footer.astro tagline becomes "Every vehicle inspected, every price transparent,
         every car documented." One string, one file, deploys on the next build.
EVIDENCE: 62 live occurrences, verified 2026-07-25. Homepage renders it now.
RULE:    compliance-guardrails.md C8. No phrase implying comprehensive coverage on an AS IS car.
         Same defect class as the 3 month warranty claim already purged.
REVERT:  one commit.
                                                                          YES / NO ___

### 2. LEGAL: the page top marquee says "All credit welcome" on all 56 pages
ON YES:  Marquee string becomes "Financing for all credit levels."
EVIDENCE: 49 live occurrences. The /financing page body already says it correctly, so the
         marquee contradicts the body on the same page.
RULE:    MEMORY.md hard rule. Never truncate to "all credit". Guardrail B4 (ECOA).
REVERT:  one commit.
                                                                          YES / NO ___

### 3. INDEX: the apex still redirects with a 307, not a 301
ON YES:  vercel.json gains an explicit permanent apex rule. Diff is prewritten and attached.
EVIDENCE: curl https://maximautos.com/ -> 307. Open as task #89 since 2026-06-02.
         Also found: /sitemap.xml carries "permanent": false, a second 307 nobody had named.
WHY NOT AUTO: a bad redirect rule can dark the entire site. Not a one page blast radius.
REVERT:  one commit, but verify live before closing.
                                                                          YES / NO ___

### 4. INDEX: the GitHub Pages mirror competes with production for the homepage
ON YES:  Every mirror page gets noindex, and the mirror robots.txt gets Disallow: /.
         Production is untouched.
EVIDENCE: dexmang.github.io/MaximAutosWeb returns 200, self canonical, no noindex,
         robots.txt permits crawling. Byte identical homepage. Verified 2026-07-25.
REVERT:  one commit.
                                                                          YES / NO ___

### 5. DRIFT: reviews_meta.json now has no owner at all
ON YES:  Files one Chrome line item on the next session Jerry is already in Chrome:
         read the live Google count, commit it. No new routine, no new schedule.
EVIDENCE: update-reviews.yml disabled (Google blocks the scraper).
         maxgoogle-daily-gbp-check, named as the replacement owner, is enabled: false.
         File reads count 46, updated 2026-07-24, and nothing will ever update it again.
                                                                          YES / NO ___

### 6. INDEX: 22 sitemap URLs had never been submitted to IndexNow
STATUS:  Already AUTOFIXED this run. Listed here for visibility only, no decision needed.
         Root causes: hand maintained STATIC_PATHS array, an off by one in canonicalUrl()
         at ping-indexnow.js:77 that submits the homepage with a trailing slash, and a
         7 day event window against a 14 day sitemap retention window. All three now derive
         from the built sitemap. Likely mechanical cause of task #166.

### 7. REGISTRY: automations-registry.md is wrong on 5 rows
ON YES:  Registry corrected: 3 Google cloud routines marked ENABLED are actually disabled,
         Maxim Lead Sync is undocumented and running, gbp-appeal-verdict-watch still fires
         daily for a verdict that landed 7/14. Also removes the "3 posts per week via native
         GBP scheduling" line, which SPEC section 11 names as a re suspension risk and which
         is the document a future agent would read before re enabling anything.
EVIDENCE: live scheduler listing vs registry lines 12, 13, 18. Verified 2026-07-25.
                                                                          YES / NO ___
---
Below the cap this week (in reports/2026-W31.md, not asked about):
  106 em dashes and 78 hyphenated compounds sitewide (style, not legal)
  /es and /es/ both return 200 (D2)
  8 orphan pages with zero inbound internal links
  6 matches on /terms and /return-policy SUPPRESSED as negated disclaimers, correctly
```

That is the entire weekly ask. Seven lines of reading, one line of reply. Compare against the
current state, which is 20 overdue urgent tasks that each require Jerry to reconstruct context
before he can even decide.

---

## 8. What happens when it fails

| Failure | Detection | Response |
|---|---|---|
| The Action throws | `if: failure()` step in the workflow | ntfy CRITICAL to `maxim-autos-operator`, same pattern as `feed-parity-audit.yml`. The previous week's card stays in place and is not overwritten. |
| A single check throws | Per check try/catch. **Every check is wrapped, and an uncaught throw sets that check to UNAVAILABLE with the exception text as the reason.** | The other 12 still run. Coverage line drops to `12 of 13`. |
| A check silently returns nothing (the `update-reviews.yml` death) | Each check declares an expected minimum yield. Check 1 expects 56 pages fetched, check 4 expects 57 redirect probes. **A check that fetches fewer than its declared minimum is UNAVAILABLE, not PASS.** | This is the specific fix for the failure mode that killed `update-reviews.yml`, which parsed null and exited 0. |
| An AUTOFIX produces a bad diff | Every autofix run is followed by a re run of the check that triggered it. If the check does not now pass, the commit is abandoned and the item is downgraded to a staged card item. | No unverified autofix ever commits. |
| The whole operator stops running | Two independent heartbeat watchers, neither of which is the operator: the daily `feed-parity-audit.yml` and the twice daily local OAP pull. Threshold 8 days. | ntfy CRITICAL plus one urgent DB task. |
| The Windows box is off for a week | Nothing. The Action does not need it. | The card waits in the repo. Ingest catches up. |
| Jerry does not answer the card | Unanswered items carry a `weeks_pending` counter into the next card. **At 3 weeks pending an item is auto snoozed for 90 days with a note saying so.** | The card refuses to become a backlog. Non response is treated as information, not as a queue. |

**The honesty contract, stated as code:**

```js
// Never permitted anywhere in this operator:
if (!result) return PASS;              // silence read as success
catch (e) { /* ignore */ }             // swallowed failure
status = findings.length ? FAIL : PASS // two state, hides UNAVAILABLE

// The only permitted shape:
{ check: "banned_phrase", status: "PASS"|"FAIL"|"UNAVAILABLE",
  reason: null|"...", blocked_by: null|"...",
  expected_min_yield: 56, actual_yield: 56, findings: [...], suppressed: [...] }
```

---

## 9. The live conflicts, resolved

### 9.1 D10, the 3 posts per week versus 1 post per week conflict

**Resolution: the automation is already off. The document is the hazard. Fix the document and
encode the cap as a number a machine checks.**

Verified live: `maxgoogle-weekly-gbp-sweep` is `enabled: false`, last ran 2026-07-06, and will not
fire Monday. The technical audit's recommendation to "disable it before its next Monday 09:02 run"
is acting on a state that does not exist. Three actions instead:

1. Correct the registry row (card item 7). Remove "3x/week cadence" and "GBP native scheduling"
   from the description entirely. SPEC section 11 names both as re suspension risks.
2. Write `operator/baseline/cadence-caps.json` holding the SPEC numbers: `{"gbp_posts_per_week": 1,
   "until": "2026-09-07", "then": 2, "native_scheduling": false, "max_posting_owners": 1}`.
3. Check 13 fails critical on any registered automation whose declared cadence exceeds that file.
   The guard now applies to automations that do not exist yet, which is the point.

**Note on the SPEC.** This does not contradict SPEC section 4. It enforces it. `posting_owner_guard.py`
already prevents two owners posting simultaneously. Nothing prevented a *document* from telling a
future agent that 3 per week was the approved cadence. Check 13 closes that.

### 9.2 D12, the gh CLI

**Resolution: refuted, nothing to fix, but add the check that would have caught it.** `gh auth
status` returns authenticated as `Dexmang`, and the trigger works end to end (6 successful
`Build Inventory` runs plus 6 successful `Deploy` runs in 48 hours). What was actually missing was
any way to know. The operator adds one assertion: if the newest `Build Inventory` run is more than
8 hours old, that is a finding. It costs one `gh run list` call and it makes the 6 hour cron stop
being a mask.

### 9.3 The disabled Maxim Google Accountability task

**Resolution: do not re enable it. Absorb the one piece of it that matters.**

The registry's own open question 1 is correct that re enabling risks reopening a batch of tasks at
once. That is a real risk and it is also beside the point: the task has been disabled for two weeks
and nobody noticed, which tells you what its enforcement was worth. Its VERIFIED token rule (R5,
`google_accountability.py:398 reopen_task`) is genuinely valuable, so **the operator inherits R5 as
a check with no auto reopen.** It reports "3 Google tasks were closed this week without a VERIFIED
token" as a single card line. Reporting, not reopening. If Jerry wants the auto reopen back, that
is a separate decision made with the list in front of him rather than by a task that fires at 07:45
and reopens 20 things.

The remaining pieces of that script (due date stamping, priority bumps, re delegation) act on a
backlog that this whole design argues should shrink through the card, not be re prioritized in
place. Formally retire the Windows task, keep the file.

### 9.4 update-reviews.yml, and the free GSC unblock

**reviews_meta.json:** both declared owners are disabled. The operator cannot fix this because a
live Google review count requires an authenticated GBP read, which requires Chrome, which requires
Jerry. So it does the honest thing: **check 9 asserts the file is under 14 days old and raises it
as a card item when it is not.** That converts a silent decay into a visible weekly one line ask
during a Chrome session Jerry is already having. It does not build a new routine that will die.

**The GSC unblock, priced explicitly at zero dollars:** checks 7 and 8 are the two blocked ones,
and they unblock together. The Search Console API has no charge. The setup is one time and needs
Jerry once:

1. Create a Google Cloud project (free tier, no card on file needed for this API).
2. Enable the Search Console API, create a service account, download the JSON key.
3. Add the service account email as a restricted user on the maximautos.com GSC property.
4. Store the key as a GitHub repository secret.

Then checks 7 and 8 run headless forever with no Jerry time, and SPEC section 8's stated primary
rank signal (GSC average position) becomes real rather than aspirational. **I flag this as needing
Jerry because it involves creating an account, which I do not do, and because it should be a
conscious decision. It is zero dollars. It is also the single highest leverage unblock in this
entire design, because it converts "we think indexing is the problem" into Google's own answer.**
A useful side effect: the DNS TXT `google-site-verification=tCAvzBRJ12-XeubngsAhYQnxCxtBS_taZIz0naP-DBE`
already exists on the apex (technical audit, verified via nslookup), so a Domain property may
already be verified and step 3 may be a two minute UI check rather than a setup.

Until that happens, checks 7 and 8 print UNAVAILABLE with the reason and the unblock path, every
single week, at the top of the card. It stays visible until it is resolved or explicitly declined.

---

## 10. Build order

Ship in this sequence. Each phase is independently useful, so a stall does not waste the prior work.

| Phase | Build | Effort | Why first |
|---|---|---|---|
| **1** | `scripts/operator/lib/fetch-all.mjs` + `check-banned-phrases.mjs` + `.github/workflows/seo-operator.yml` writing `reports/` only. No card, no autofix, no commit back. | small | Highest value check, already proven this session, zero write risk. Produces the C8 footer finding in week one. |
| **2** | Checks 2, 3, 4, 6, 12. `render-card.mjs` with the 7 item cap and the ranking function. Commit back with GITHUB_TOKEN. | medium | This is the whole reporting product. Verify the GITHUB_TOKEN push does not retrigger `deploy.yml`; `sync-inventory.yml`'s own comment documents that it will not. |
| **3** | The OAP pull ingest step + `seo_check_runs` DDL (via `apply_schema.py`, never `migrate.py`, per the note at `schema.sql:3`) + `decisions.json` snooze logic. | medium | Closes the loop into `pka_hub.db` and Jerry's task list. |
| **4** | Both heartbeat watchers. Checks 5, 9, 10, 11, 13. | medium | Deadman plus the long tail. |
| **5** | `apply-safe-fixes.mjs`, whitelist only, each fix followed by a re run of its own check. | small | Autofix last, deliberately. Earn write access after the read only version has run clean for two weeks. |
| **6** | Checks 7 and 8, gated on the GSC service account. | small | Blocked on Jerry, not on engineering. |

**Files created.** All inside `businesses/maxim-autos/website/`:
`.github/workflows/seo-operator.yml`, `scripts/operator/*.mjs`,
`dominance-2026-07/operator/{APPROVAL-CARD.md, HEARTBEAT.json, decisions.json, reports/, baseline/}`.
**Files modified:** `operations/pull_oap_sftp.py` (ingest step),
`.github/workflows/feed-parity-audit.yml` (heartbeat step),
`memory/protocols/automations-registry.md` (the 5 wrong rows).
**Files never touched by the operator at runtime:** anything under `site/` or `web_assets/` except
through an existing generator on the whitelist.

**One bug to fix while in there, unrelated but free:** `feed-parity-audit.yml` declares
`workflow_run: workflows: ["Sync Inventory from CarGurus"]`, but that workflow was renamed to
`Build Inventory (DealerCenter feed = source of truth)`. That trigger has been dead since the
rename. The daily cron masks it, which is the same masking pattern as D12. One line.

---

## 11. The candidate innovations, judged from the operator lane

| # | Candidate | Verdict | Reasoning from this lane |
|---|---|---|---|
| 1 | **Publish the inspection reports** | **KILL as specified. Replace with a probe.** I checked the pipeline: `vehicles.json` carries `"inspection": true` and `"inspected"` as **booleans**. There is no report file, no PDF, no line items, nothing structured, anywhere in the repo or the feed. The reports exist on paper. Publishing them requires a new per car manual step (scan, or transcribe), which is precisely the "surfaces over workflows that never run" failure SPEC section 5B was written to prevent. **Probe instead: ask Jerry to photograph exactly one inspection report within 7 days. If the file appears, build the pipeline for one car. If it does not, the answer is settled and no apparatus was wasted.** Same gate structure SPEC already applies to the walkaround video. |
| 2 | **Grounded on site assistant** | **KILL, and the reason is compliance, not price.** A generative surface on this site is an uncontrolled copy channel under a regime with hard banned phrases, where a single generated sentence containing "certified" or an unqualified protection claim is the exact defect class that is already live in the footer. The operator can scan static pages. It cannot scan an answer that does not exist until a stranger asks for it. Paid API cost is the second objection. This one is the first. |
| 3 | **Jerry as a search entity** | **SUPPORT, and the operator makes it safe.** Person schema is static, verifiable, and cheap. It also creates a new claim surface (a bio that says something about Jerry), so it goes straight into check 1's scan set and check 2's required type assertions on the pages that carry it. |
| 4 | **The sold archive as price transparency** | **Defer to legal review, and note the operator implication.** 20 sold VDPs are already live under noindex. Making them indexable multiplies the pages check 1 and check 2 must cover by roughly 4x and creates 20 new price claim surfaces. Not my call to make on advertising law, but the operator cost is real and should be priced into that decision. |
| 5 | **Honest comparison pages** | **SUPPORT with a hard operator condition.** Any page making a factual claim about a named competitor must carry a machine checkable assertion with a source URL and a `verified_at` date, and check 1 gains a rule that fails on any competitor claim older than 90 days. A stale factual claim about a competitor is a different and worse liability than a stale claim about yourself. |
| 6 | **Self hosted images** | **STRONG SUPPORT. It is the operator's biggest single lever.** Right now every vehicle photo is a hotlink to `imagesdl.dealercenter.net`, which means the LCP element on all 27 VDPs is outside Maxim's control, and check 11 can measure the regression but can never fix it. `scripts/mirror-photos.js` already exists and is not wired in. Wiring it converts CWV from a metric into a controllable one, unlocks AVIF and filename SEO, and removes a dependency that `audit-feed-vdp-parity.js` already has to probe on every run. |
| 7 | **Walkaround video** | **Already correctly probe gated by SPEC 5B. No change.** I verified `web_assets/videos/` is empty. The operator's only role is to check for the file's existence and stage the VideoObject schema when one appears. Do not build the pipeline before the file. |
| 8 | **CWV as a stated weapon** | **SUPPORT with an honesty correction.** The 92 KB vs 724 KB gap is real and verified by two independent measurements. But the operator can only produce **lab** data without a key, and lab data is not what Google ranks on. Say "lab" in every report line. The field data unblock rides along with the GSC service account in 9.4, since the CrUX API is the same free Google Cloud key. |

### Two things nobody on the list has raised

**A. A DealerCenter description compliance gate.** The highest risk uncontrolled copy surface at
Maxim is not the website. It is the DealerCenter description field, which Jerry types by hand and
which flows unscreened to the live VDP **and** the Merchant Center feed. That path produced the
live "Every customer protected" claim. The operator should scan `ma_vehicles.description` at OAP
ingest time, before it reaches the site, and stage a corrected string for Jerry to paste back. This
catches a claim before Google sees it rather than a week after. It is a small addition to a job
that already runs twice a day and never fails, and it is the highest value new check in this whole
document.

**B. The 8 orphan pages are an IndexNow problem, not only a link problem.** The technical audit
found 8 pages with zero inbound internal links. I found that several of the same pages have also
never been submitted to IndexNow. They are invisible to Google's crawl graph **and** have never
been announced. Fixing internal links is a content change that stages. Fixing submission is a pure
function that autofixes. Do the free one first, then measure whether the links were even the
constraint. That is a cheaper test of task #170's backlink hypothesis than acquiring backlinks.

---

## 12. What makes THIS one survive

Six structural differences. Each maps to a specific, verified way the previous attempts died.

| # | This design | The failure it prevents, with evidence |
|---|---|---|
| **1** | **It runs in the only lane with a survival record.** GitHub Actions, MaximAutosWeb. | 12 of 12 Action runs green in 48h. 8 of 9 cloud routines disabled. 1 of 6 Windows tasks failing, 1 disabled, 1 never fired, 1 undocumented. 0 of 4 daemons running. The previous pushes all built in the dying lanes. |
| **2** | **Zero new schedulers.** No new Windows task, no new cloud routine, no new daemon. The one local hook is a step inside `Maxim OAP Feed Pull`, which has never failed. | Every Google related Windows task ever registered here is now disabled or failing. A new scheduler is a new thing to die. |
| **3** | **No human and no Chrome in the critical path.** Every check is headless HTTP or a git read. Nothing waits on Jerry to run it. | SPEC section 5B names it directly: apparatus stacked on Jerry initiated habits he is documented weak at. The three dead pushes each had a human step inside the loop of the automation. |
| **4** | **The output is a committed file, not a database row on a machine that might be off.** The card exists whether or not the Windows box booted. | `Maxim Google Accountability` last ran 7/11 and nobody noticed for two weeks, because its output only existed where nobody looked. |
| **5** | **One card, hard capped at 7, where NO is durable for 90 days.** | 20 overdue urgent tasks is the proof that a task list is not an execution mechanism. A card that re nags becomes a task list within a month, so the snooze is not a nicety, it is the mechanism. |
| **6** | **Three states, declared minimum yields, and three independent deadman watchers.** | `update-reviews.yml` reported success while doing nothing: "went blind, parses null, exits 0 silently." That is the exact failure this system is architected to make impossible. Silence is never success here. |

**And the seventh reason, which is the honest one.** This design does not ask Jerry to do anything
new. It does not ask him to film a video, scan a report, run a script, remember a cadence, or open a
dashboard. It asks him to read seven lines on Monday and type a few numbers. Every previous plan in
this folder was excellent and every one of them required a new habit from a man who runs a
dealership alone and sells 5 to 8 cars a month. **The correct amount of new discipline to require
from him is zero, and this is the first design in the folder that actually costs zero.**

The measurable test, at 30 days: 4 weekly cards produced, 4 answered, coverage never silently
green, and the C8 footer claim gone from the live site. If cards 3 and 4 go unanswered, the design
has failed on the same axis as its predecessors and should be cut rather than nursed.

---

## 13. Unverified, and what I did not solve

- **Lighthouse in GitHub Actions has not been proven on this repo.** It is standard and free, but I
  did not run it. Phase 4 must verify it before the CWV check is trusted.
- **The GSC API free tier claim** is stated from knowledge, not verified this session. No credential
  exists to test with. Verify before promising checks 7 and 8.
- **The NAP directory watchlist is unwritten**, and the competitive audit proved several relevant
  hosts hard block scripted fetches. The reachable fraction is unknown until check 10 runs once.
- **`seo_check_runs` DDL is specified but not written.** It must go through `apply_schema.py`, never
  `migrate.py`, per the warning at `schema.sql:3` that the migration tracker is drifted.
- **The em dash and hyphenated compound counts (106 and 78) are raw regex counts** and were not
  individually reviewed. Some will be inside code identifiers or third party markup. They are
  reported as style findings below the card cap precisely because I have not verified each one.
- **I did not verify that the ingest step's git pull will not conflict** with the OAP pull's own
  push to the same repo. Phase 3 must handle that explicitly.
- **I did not test the GITHUB_TOKEN anti recursion behavior myself.** It is documented in
  `sync-inventory.yml`'s own inline comment as the reason the explicit dispatch step exists, which
  is strong evidence, but phase 2 should confirm the operator's commit does not fire `deploy.yml`.
- **Whether the three "money pages not indexed" in task #166 overlap the 22 unpinged URLs** is
  unknown without GSC access. The overlap hypothesis is strong and cheap to act on, but it is a
  hypothesis until check 7 unblocks.
