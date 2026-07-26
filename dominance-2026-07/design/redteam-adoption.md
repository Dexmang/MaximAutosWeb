# Red Team: Adoption

**Question asked:** will Jerry actually use and sustain what these four designs propose, or is this another excellent plan that stalls?

**Answer:** most of it stalls. Roughly 15 percent of the proposed surface survives contact with a one person dealership. The 15 percent that survives is worth shipping and is genuinely good. Everything else is either a new recurring job disguised as a feature, a bet on data that does not exist, or a build nobody can measure.

Everything below was verified this session against `pka_hub.db`, the live repo, the live scheduler, and primary sources. Where I could not verify, I say so.

---

## 1. The evidence base, recomputed

I did not take the brief's numbers on faith. I recomputed them and they are worse.

### 1.1 Task backlog

Query against `tasks` in `pka_hub.db`, 2026-07-25:

| Metric | Value |
|---|---|
| Open tasks, all contexts | 95 |
| Open AND past due | **36** |
| Of those, priority urgent | **24** |
| Oldest overdue urgent | #89, due 2026-06-02, **53 days late** |
| MaxGoogle | 12 done vs 25 open |
| MaxSEO | 5 done vs 24 not done (7 open, 10 waiting, 7 in progress) |
| STERLING | 0 done vs 12 open |

The brief said "20+ overdue urgent." It is 36 overdue, 24 of them urgent.

### 1.2 The `awaiting_owner` queue is the real story

Ten tasks sit in `awaiting_owner`. Six are assigned to Jerry. Ages as of today:

| Task | Created | Days waiting | What it asks of Jerry |
|---|---|---|---|
| #92 | 2026-06-03 | **52** | Unblock SMS/Voice/OAP automations |
| #128 | 2026-06-10 | **45** | Cancel a trial |
| #129 | 2026-06-10 | **45** | A2P 10DLC registration |
| #167 | 2026-07-03 | **22** (overdue 07-08) | **Verify Domain property maximautos.com in GSC via DNS TXT** |
| #168 | 2026-07-03 | **22** (overdue 07-08) | Add backup owner to GSC property |
| #211 | 2026-07-24 | 1 | Approve one GBP spotlight card |

Read #167 again. The DNS TXT token already exists at the apex (the technical audit resolved it: `google-site-verification=tCAvzBRJ12-XeubngsAhYQnxCxtBS_taZIz0naP-DBE`). The remaining work is Jerry clicking Verify in a UI. It has been sitting 22 days.

This single row invalidates the highest leverage item in the operator design. More on that in section 3.

The one counterexample worth naming honestly: task #205, a GBP approval, was created and closed on 2026-07-24 inside the same day. Jerry does respond, **when an agent is in session with him**. He does not respond to a queue. Every proposal that assumes asynchronous approval is assuming the thing that has failed six times.

### 1.3 The previous mission's adoption curve is visible in git

Human commits to the website repo, excluding the Actions bot and the automated OAP snapshot chores:

| Week | Human commits |
|---|---|
| 2026-W22 | 11 |
| W23 | 20 |
| W24 | 11 |
| W25 | 6 |
| W26 | **28** |
| W27 | 12 |
| W28 | 7 |
| W29 (current) | **2** |

That is what a stall looks like from the inside. The google-local-domination mission peaked in W26 and is at 2 human commits this week. Meanwhile the automated lane ran 40 commits in W29 without anyone touching it.

**The lesson is not "Jerry is undisciplined."** The lesson is that at Maxim, work that requires a human touch decays to zero in about six weeks, and work that runs itself runs forever. Every proposal must be graded on which of those two categories it lands in. No proposal gets credit for a plan to be disciplined.

### 1.4 The scheduler survey confirms the operator design's lane choice

Live `Get-ScheduledTask`, 2026-07-25:

```
Maxim GBP Spotlight Queue      Ready (registered 07-24, has never run)
Maxim Google Accountability    Disabled  (last ran 2026-07-11)
Maxim Lead Sync                Ready
Maxim OAP Feed Pull            Ready
```

Live `gh run list` on the website repo, last 25 runs: **25 of 25 succeeded**, spanning 2026-07-23 to 2026-07-26.

The operator design's central claim is correct and I am not attacking it. GitHub Actions is the only lane at Maxim with a survival record. Anything that ships should ship there.

### 1.5 The number that reframes the entire UX design

`ma_leads`: 83 rows. Source breakdown:

```
cargurus  83
```

Every single tracked lead in the business comes from CarGurus. Zero are attributed to the website.

`ma_credit_applications`: 2 rows total. One is Jerry's own test (`jerry test`, 2026-05-02). **One is a real customer** (2026-06-10). That is the complete production history of the 60 field SSN application the UX design spends four proposals fighting over.

`ma_leads` by stage: 78 of 83 sit at `new`. **49 leads are more than seven days old and still at `new`**, meaning never contacted.

Two honest caveats. First, the three Formspree forms do not write to `pka_hub.db`, so website form submissions may exist and simply be untracked. Second, GA4 exists but I have no report access. Both caveats point the same direction and make the finding worse, not better: **there is no instrument at Maxim capable of measuring whether any website UX change worked.** The one site surface that does write to the database has produced one real record in three months.

Meanwhile 49 real, named, phone number attached leads are sitting untouched.

I am not going to pretend that is a website problem. It is not. But it does mean every UX proposal below must be priced against a funnel with no measurement and one recorded conversion, and the ranking in section 6 reflects that.

---

## 2. The inspection proposals: verified fiction, three of four designs got it right

The brief asked me to interrogate this specifically rather than assume. I read the pipeline.

**What I verified:**

- `ma_vehicles` has **37 columns. Zero contain "insp", "video", or "report".**
- `vehicles.json` has 27 records, 38 keys each. `inspection` and `inspected` are both the literal boolean `True` on **all 27 records**, with no variation. They are hardcoded, not data.
- `businesses/maxim-autos/operations/inspection-report/maxim-inspection-report.html` is a blank printable form, 14,735 bytes, entirely CSS and empty `.line` rules. Its fields are ruled lines for handwriting: tread depth `___/32` per corner, brake pad `___ mm`, battery `___ volts`, "Technician signature", "Inspected by (print name)".
- **There is not one filled report anywhere in the repo.** Not a PDF, not a scan, not a photo, not a JSON record. Zero.

So: the report exists as an empty template. There is no evidence a single one has ever been completed, and no digital path from paper to site.

Worse, and nobody flagged this: **the blank form and the live claims already contradict each other.**

`web_assets/llms.txt` line 13, live right now:

> "Every vehicle sold includes a full independent mechanical inspection report prepared by a third-party mechanic. The report covers engine, drivetrain, brakes, suspension, tires, electrical systems, and interior/exterior."

The actual form has five sections: Road Test, Interior and Electronics, Under Hood and Fluids, Tires and Brakes, Repairs and Parts Replaced. **There is no suspension section. There is no drivetrain section.** And the form is Maxim branded with an "Inspected by (print name)" line, which is not what "prepared by a third party mechanic" describes.

The form header also reads **"100+ POINT INSPECTION"** above roughly 28 line items.

**Verdict on the inspection cluster:**

- design-operator, design-ai-visibility, and design-content-engine all independently reached the correct kill. Three of four designers checked the pipeline. Credit where due.
- design-ux's "SALVAGE: publish the fixed checklist once" is the only one I am killing outright, because publishing this checklist publishes a "100+ point" claim backed by 28 items and a footer carrying the C8 banned phrase, onto a site whose brand is literal accuracy.
- design-content-engine's Option A (adopt a 12 field capture at intake, "roughly 4 minutes per car") is fiction dressed as a small number. See section 4.1.
- **The live claims are already overstated and that is a defect that exists today, independent of anything anyone builds.** design-content-engine's "force the claim fork" proposal is the single most valuable item in that entire design and it costs nothing. It survives.

---

## 3. Attacks by design

### 3.1 design-ux

**CRITICAL: the Out The Door module computes the wrong tax for most of Maxim's buyers, and it is not fixable by verifying the rate.**

The proposal prints an itemized dollar total on every VDP using "the verified 7.25% Skokie motor vehicle rate."

Illinois vehicle sales tax has been **destination sourced since 2022**. The local Retailers' Occupation Tax rate keys to the **buyer's** address, not the dealership's. Per the Illinois Department of Revenue: "destination-based ROT means the total State and local ROT rate calculated for a sale using the rate in effect at the Illinois location to which the item sold is shipped or delivered, or at which possession is taken by the purchaser," and for an individual buyer you use the buyer's residence address.

Maxim's own site declares nine service cities: Skokie, Evanston, Niles, Morton Grove, Lincolnwood, Des Plaines, Wilmette, Glenview, Park Ridge. **Those are nine different local rates.** A Chicago buyer, who Maxim explicitly targets with `/used-cars-chicago-north-shore`, is materially higher.

So the signature proposal of the UX design publishes a specific dollar total ("$15,995 becomes $17,471 out the door") that will be wrong for the majority of buyers who see it, on a site whose entire brand position is "the advertised price plus tax, title and license is the total."

This is not a rate to double check. There is no single correct number. And note the demand audit already flagged the 7.25% figure as sourced from a secondary aggregator, never cross checked against a primary Illinois Department of Revenue breakdown. The designer built the headline feature on it anyway.

**Fix:** the module survives only if the tax line renders as a **range across the nine declared cities with the buyer's city as an input**, and the "total" is relabeled as an estimate with the sourcing rule stated. If it cannot be built that way, kill it. Do not ship a single number.

Secondary attack on the same proposal: it is labeled `ongoing human work: one_time` with the note that the doc fee cap "moves once a year with CPI, a one line edit." Verified: the $377.63 cap is CPI indexed from a $150 base and changes each January. That is a recurring obligation with a hard annual deadline where **the failure mode is publishing a false statutory figure**, right next to a claim about what competitors charge. It degrades to wrong, not to stale. Cost is trivial; the discipline requirement is not zero and should not be labeled zero.

---

**CRITICAL: the whole UX program has no measurement instrument.**

Out The Door, `/out-the-door`, the compare tray, the homepage hero rebuild, the lightbox fix, and the header CTA are collectively a large build. Their justification is conversion. Verified above: one real credit application in three months, 83 of 83 tracked leads from CarGurus, Formspree submissions not landing in the database at all, no GA4 report access in this run.

Nothing here can be measured in 30 days, or 90. It will be shipped on taste and never validated.

**Fix:** before any conversion feature ships, make the site's own leads visible. The conversion audit already found that GA4 `generate_lead` fires in the capture phase before the `fetch()` runs, so it counts clicks, not submissions. That is a bug, not a feature, and it means the one existing instrument reports a number that cannot be trusted either. Fix the event to fire on fetch success. That is a small change with zero recurring cost and it is the prerequisite for everything else in this design.

---

**HIGH: `/out-the-door` budget page inherits the tax defect and adds a second failure mode.**

It solves the amortization backwards and shows "which cars land in range, each with its own out the door number." Same wrong tax, now driving which cars a buyer is shown. A buyer told a car fits their budget who then finds it does not at signing is a worse outcome than never showing the page.

**Fix:** blocked behind the tax fix. If the tax fix lands as a range, this page can only filter on the low end of the range and must say so.

---

**MEDIUM: compare tray is the wrong feature at this inventory depth.**

Effort: large. Ongoing cost: genuinely zero, I grant that. But the argument is "at 15 units, comparing the CR-V, Crosstrek and XC60 currently requires three tabs." At 7 to 15 units, on a lot where the owner personally texts every buyer, the shopper who wants to compare three cars calls Jerry. Large effort, zero measurable result, no compliance surface. It is not wrong, it is just the lowest ranked survivor.

---

**These UX items survive unattacked and are excellent:**

- Six invisible phone numbers becoming tappable `tel:` anchors. Trivial, zero recurring, and on a lot where calling is the actual conversion path this is the highest value item in the entire design.
- Retargeting the three financing CTAs from `/apply` to `/financing#apply`. Link and copy change. Verified against the conversion audit and against the one real credit app in the database, which is exactly what a 60 field SSN form on a subprime lot produces.
- Computing the price band from the live set instead of hardcoding it in four places.
- Canonicalizing the forked Spanish Reg Z string. That is a live compliance defect and nobody had flagged it before this run.
- Replacing the two dead price chips with a ceiling slider. Two of five chips return zero results today and the most expensive car is reachable by no chip.

---

### 3.2 design-operator

**CRITICAL: the GSC service account unblock is gated behind a Jerry step strictly harder than one already stalled 22 days.**

The design calls this "the single highest leverage unblock." It requires Jerry to create a Google Cloud project, enable an API, create a service account, add it as a restricted user on the property, and store a key as a repo secret. Five steps across two consoles.

Task #167 asks Jerry to click Verify on a GSC domain property where **the DNS TXT token already exists**. One step, one console. It has been `awaiting_owner` for 22 days and is 17 days overdue. #168, its sibling, same.

The design is honest that this needs Jerry once. It is not honest about the base rate. Two checks (index state and rank) will print UNAVAILABLE forever, and the design explicitly makes those "SPEC section 8's stated primary rank signal." So the operator ships without its primary signal.

**Fix:** do not put the service account on the critical path. Ship the operator with 11 checks that need nothing from Jerry and let checks 7 and 8 print UNAVAILABLE with `blocked_by: task #167`. Then, separately, get #167 done **in a live session while Jerry is at the keyboard**, because that is the only mechanism with a demonstrated success rate at this business. Do not create a new awaiting_owner row. There are already six.

---

**CRITICAL: the weekly approval card is the exact mechanism that has already failed six times.**

"A single APPROVAL-CARD.md at a stable path... Jerry reads seven lines and types 1 yes, 2 yes, 3 no."

The card is a markdown file committed to a repo Jerry does not open, surfaced through one `awaiting_owner` task in a database whose `awaiting_owner` queue is currently 52, 45, 45, 22, and 22 days deep. The design's own mitigation, auto snooze at three weeks pending, means the honest steady state is: **every item auto snoozes, and the card becomes a weekly file nobody reads.** The 90 day snooze only handles an explicit NO. It does nothing for silence, and silence is the observed behavior.

The design correctly diagnoses that "a task list is not an execution mechanism." It then builds a task list with a nicer format.

**Fix, and this is the one structural change I would insist on across all four designs:** the card must not be a file plus a task. It must be an **ntfy push to Jerry's phone**, using the `maxim-autos-feed` topic that already exists and already works (the OAP pull sends inventory change alerts through it twice a day and those land). One push, seven lines, reply by text or by opening the link. ntfy is free, already wired, and already reaches him. A committed markdown file does not.

Second fix: cap the card at **three** items, not seven. Seven is a backlog. The evidence for three is #205, which Jerry approved same day when it was one thing.

---

**HIGH: the DealerCenter description screen chose the version that requires discipline when a zero discipline version exists.**

The proposal: run the banned phrase rules against `ma_vehicles.description` during the OAP pull, and "stage a corrected string for Jerry to paste back into DealerCenter."

That is: read an alert, open DealerCenter, find the unit, edit the description, save. Four to six minutes per car, requires a login and a decision, at roughly eight intake cars a month. Call it 40 minutes a month of nagging.

The site already has `sanitizeDescription()` in the build path, silently rewriting feed copy for two other rules. The design even cites it. **Extend that function.** Feed copy is not an argument that needs a human to preserve its meaning; it is product copy where the correct behavior is deterministic replacement. The banned phrase never reaches the live VDP or the Merchant Center feed, Jerry does nothing, and DealerCenter stays wrong internally where it harms no one.

The design's own reasoning for the silent rewrite versus loud failure split (content-engine, CG rules) reached the right answer for exactly this case and then the operator design did the opposite.

**Fix:** sanitize at build. Log what was rewritten. Do not ask Jerry to paste anything.

---

**MEDIUM: three deadman watchers is correct, and the design should say what happens when the deadman fires.**

Three independent watchers, threshold 8 days, response is an ntfy CRITICAL plus one urgent DB task. Two of the three do not need the Windows box. This is genuinely good and I am not attacking the mechanism.

The gap: an urgent DB task is what 24 already dead items look like. The ntfy is the part that works. Say so explicitly and drop the DB task, or the deadman's own alert decays into the backlog it is meant to detect.

---

**These operator items survive and are the strongest things in the run:**

- The C8 footer fix. Verified live: "Every vehicle inspected, every price transparent, every customer protected" is in the shared footer, on all 56 pages, and I confirmed the same sentence sits in `llms.txt` as a standalone line. One string, one file, removes a live compliance exposure of the same class as the purged warranty claim.
- The "all credit" marquee truncation fix. Same shape, live on all 56 pages, and it violates a hard MEMORY rule.
- IndexNow derived from the sitemap. 37 submitted vs 56 in the sitemap. 22 URLs never submitted, including the entire Spanish site and the entire financing hub. Zero recurring cost, and it is a far cheaper test of the indexing hypothesis than task #170's backlink acquisition, which has been open and is overdue.
- Containing the GitHub Pages mirror with noindex. Verified live by the technical audit: 200, byte identical homepage, self referencing canonical.
- The `feed-parity-audit.yml` dead `workflow_run` trigger. One line.
- Correcting the five wrong rows in the automations registry, especially deleting the "3 posts per week via native GBP scheduling" description. The registry is what a future agent reads before re enabling something, 39 days after a suspension cleared.

---

### 3.3 design-content-engine

**CRITICAL: the per vehicle inspection capture is a new four handoff workflow, not "roughly 4 minutes per car."**

The claimed cost is 4 minutes per car, about 35 minutes a month. Recompute it honestly.

The chain is: mechanic fills the paper form → Jerry receives the paper → Jerry does not lose the paper → Jerry sits at a computer and transcribes 12 fields including four tread depths, two pad thicknesses and a battery voltage into JSON → commit → build.

Transcribing 12 numeric fields from handwriting, accurately, with any verification pass at all, is six to ten minutes, not four. At eight intake cars a month that is 48 to 80 minutes. But the minutes are not the problem.

**The problem is handoff one.** There is not a single completed inspection form anywhere in the repo. The design assumes the mechanic currently fills this form. Nothing in the pipeline demonstrates that. If handoff one does not currently happen, this is not a transcription cost, it is "establish a new process with a third party vendor, then transcribe it forever."

And the consequence of a lapse is the worst on this entire list. The design's own inspection coverage guard is honest about it: if coverage drops below 100 percent, the sitewide claim must render at the strength of the weakest car. So three weeks of Jerry skipping this does not produce a stale page. It produces **the sitewide inspection claim silently downgrading across 15 pages and the Spanish mirror**, which is the single most load bearing trust claim the business makes.

**Fix:** kill the capture proposal. Keep the coverage guard concept but point it at a probe, exactly as SPEC gates the video: ask Jerry for **one photographed, filled inspection form within 7 days**. If it appears, the question of whether handoff one exists is settled and the design can be revisited. If it does not, the answer is known and nothing was built.

Then ship the claim fork, which costs nothing and fixes a live problem.

---

**HIGH: `maxverify`, the adversarial claim verifier, needs a token budget nobody priced and a human to read its verdicts.**

"A separate agent run on the diff only... On failure it writes a verdict file, opens a DB task, and blocks staging. No override flag."

Ongoing human work is declared `none`. It is not none. Someone reads the verdict file and decides. "Jerry reads a short list of failing sentences" is right there in the justification, which is by definition recurring human work.

Second problem: "no override flag" plus "blocks staging" on a repo where the deploy path is a GitHub Action that currently runs 25 for 25 green and pushes inventory every six hours. A non deterministic agent with veto power over a pipeline that keeps the live inventory accurate is a bad trade. When it produces a false positive at 2am, the site stops updating prices.

Third: the design does not price the agent's token cost, and NO NEW SPENDING is a hard guardrail. It is not free.

**Fix:** `maxverify` runs on the **editorial diff only** and never on the inventory sync path, and it **advises, it does not block**. The deterministic gate (`content-guard.mjs`) blocks. That split is already the design's own stated principle and it should be applied here too.

---

**MEDIUM: "No blog" is the single best judgment call in the entire run.**

Killing a dated post format because it creates a cadence obligation one person cannot meet is exactly the right reasoning, made without prompting. It should be quoted back into the SPEC as a standing rule.

---

**MEDIUM: the second evergreen hub is 5 pages of new writing labeled `ongoing human work: none`.**

That is true after publication and false before it. Effort is correctly graded large. But it is 5 pages of Illinois statutory content that must be legally accurate, plus Tier B Spanish siblings in the same commit per the design's own rule, so it is really 10 pages. And it competes for the same finite build window as the linter and the entity graph.

The demand audit's finding that this family has near zero dealer competition is verified and real. The content is the right content. **It is just not Phase 1**, because it produces nothing measurable in 30 days and it consumes the window that the zero cost structural fixes need.

---

**These content engine items survive and rank high:**

- `content-guard.mjs`. See section 5.
- `facts.json` as the single fact source. This is the same idea as ai visibility's `dealer.json` and it should be merged into one artifact, not two.
- The claim fork. Trivial, one time, and it is the correct response to a live inconsistency.
- Killing the programmatic crossproducts and retiring `used-audi-skokie`. Verified: that page filters `vehicles.json` for make Audi against 27 records containing zero Audi. It is live thin content today.
- Rescuing the 20 dead end sold VDPs with a live rail and adopting the 8 orphan pages. Zero new pages, 28 pages fixed, zero recurring.

---

### 3.4 design-ai-visibility

This design has the best ratio in the run. Almost everything in it is generated, which means almost everything in it has genuinely zero recurring cost. My attacks are narrow.

**HIGH: the VideoObject contract cannot persist a video key, because `vehicles.json` is generated.**

The proposal: define `vehicles.json[].video = {url, thumbnailUrl, uploadDate, name, description, duration}`, emit only when present, "do not build upload plumbing."

Verified: `vehicles.json` is generated by `build_vehicles_json.py` from `ma_vehicles`, and the ground truth is explicit that it is never hand edited. **`ma_vehicles` has 37 columns and none of them is a video column.** So a hand added `video` key is destroyed on the next OAP pull, which runs twice a day.

Without plumbing the contract does not work. With plumbing it is a schema migration plus an input surface plus a per car workflow.

Now price the per car workflow honestly, because the design labels it `per_car` without a number. Film a walkaround, transfer off the phone, trim, upload to YouTube, write a title and description, copy the URL, get a thumbnail, enter six fields. **Fifteen to twenty minutes per car**, at eight cars a month, is two to two and a half hours a month of new work.

Task #177 asks for exactly this. It is open, due 2026-07-31, and `web_assets/videos/` is empty (verified: the directory contains nothing).

**Fix:** the design's instinct is right that Video is the last vehicle adjacent rich result standing, and the engineering should not be on the critical path. But state the true cost: a column migration plus 15 to 20 minutes per car. And honor the SPEC probe gate literally. If one video does not exist within 7 days, do not build the contract.

---

**MEDIUM: `/inventory.json` is a real surface with an honest zero, and the design should say the zero out loud.**

The design is admirably brutal about `llms.txt` (97 percent of files received zero requests, 408 of 500M AI bot visits). It then proposes `/inventory.json`, a new machine surface, without applying the same skepticism. No agent is shopping a 7 car lot in Skokie today.

I am not killing it. It is generated, costs nothing to maintain, and the argument that building it first turns a future assistant from a risky project into a small one is correct. But grade it the way `llms.txt` was graded: near zero expected result, positive only because the cost is zero.

---

**MEDIUM: the Person node's `alternateName` needs Jerry's approval and that is a blocking dependency.**

"alternateName 'Przemyslaw Piechowiak' flagged for Jerry's explicit approval." Correct call. But it means the Person node ships incomplete or waits in a queue that is currently six deep. Ship it without `alternateName` and never ask. The name adds nothing to a search entity that `worksFor` and `knowsAbout` do not already carry.

---

**LOW: the Atom feed.**

The design says "nobody subscribes to a 7-car lot's Atom feed in 2026" and ships it anyway at 40 lines. Honest, self aware, and fine. It is last on the ranking for a reason.

---

**These ai visibility items survive and are the structural core:**

- The entity graph with stable `@id` URIs. Verified premise: 0 `@id` occurrences, 19 AutoDealer nodes, 16 PostalAddress copies, 13 AggregateRating copies across 16 files. This is a real structural defect and the fix is generated.
- The build time compliance linter. Merge with `content-guard.mjs`.
- The crawler policy fix. Trivial, generated, and removing the ClaudeBot crawl delay costs nothing.
- Deleting 12 of 13 AggregateRating copies. Verified justification: self serving reviews on LocalBusiness are ineligible for star rich results, so 12 copies buy nothing while being the mechanism by which review count drift happened.
- The hero chips pointing at robots disallowed URLs. Two string edit that fixes two separate defects (`/inventory?price=under10k` is disallowed by the site's own robots.txt, and the static pages it should point to are two of the eight orphans).
- Repointing `build_ai_knowledge_base.py` at the shared fact source. This is the best find in the run that no audit covered. That file feeds the GoHighLevel conversation AI that talks to customers, and it currently says "1. Total Protection", wrong hours, a wrong email, and 34+ reviews against a live 46. It is a live compliance exposure in a customer facing channel.
- Killing the public sold archive. Correct: publishing 27 indexable vehicle pages, 74 percent unavailable, 39 days after a GBP suspension cleared, is a bad idea for a small SEO prize.
- Killing Speakable, HowTo, SearchAction, Carousel, Product on vehicle, QAPage, and competitor Review markup. Each verified dead or wrong type. This is the most valuable kind of work in a design run and it gets no credit, so it should be noted.

---

## 4. What happens when Jerry skips it for three weeks

The brief's real question. Answered per proposal class.

| Class | Three week skip produces | Verdict |
|---|---|---|
| Generated artifacts (entity graph, llms.txt, inventory.json, IndexNow, Atom, facts ledger) | Nothing. They regenerate every six hours from the feed. | **Safe** |
| Build gates (content-guard, lint-compliance) | Nothing. They only fire when someone commits. | **Safe** |
| One time string fixes (C8 footer, marquee, Spanish Reg Z, hero chips, CTA retarget) | Nothing. They are done. | **Safe** |
| Comparison page with 90 day expiry | The block stops rendering. Page degrades to less content, not to false content. | **Safe by design** |
| Reviews_meta staleness check | A visible one line ask, which is what the design intended. | **Safe** |
| Weekly approval card | Auto snoozes to nothing. The operator becomes a file nobody reads. Detected by the deadman only if the Action stops, which it will not, because the Action keeps running and writing a card nobody reads. **This is the one failure mode the deadman cannot see.** | **Silent death** |
| DealerCenter description paste back | Banned phrase stays live. Same as today. No regression, no benefit. | **No op, so kill it** |
| Video per car | Nothing breaks. The VideoObject simply never emits. | **Safe, but then it was never worth building** |
| **Inspection capture** | **The sitewide inspection claim silently downgrades across 15 English pages plus the Spanish mirror, because the coverage guard is doing its job.** A visitor sees a weakened claim on the strongest trust asset the business owns, with no one aware it happened. | **Actively harmful. Kill.** |
| **Out The Door with a single tax rate** | Not a skip problem. It is wrong on day one for most buyers and stays wrong. | **Actively harmful as specified** |

Add one more that no design covered: the **doc fee CPI update every January**. Skip it and the site publishes a false statutory cap next to a competitor comparison. That is the only recurring item in the surviving set and it needs an owner and a calendar entry, or the fee sub label must be phrased without the specific dollar figure.

---

## 5. The Phase 1 cut

Criteria applied literally: zero net new recurring discipline, a real measurable result inside 30 days, and it proves the rest is worth building.

Most proposals fail criterion two, not criterion one. Rankings and AI citations are not measurable in 30 days. What **is** measurable in 30 days is a state change you can verify with `curl`, a build exit code, or a `grep` that returns zero.

**Six items survive. One of them is load bearing and the other five are what it locks in.**

### Item 1, load bearing: the deterministic build gate

Merge `content-guard.mjs` (content-engine) and `lint-compliance.js` (ai-visibility) into **one** script, wired into `deploy.yml` and `sync-inventory.yml`, exit non zero on failure.

Rules, all verified as live defects today: banned vocabulary (certified, guaranteed, total protection, every customer protected, 3 month warranty, "all credit" truncated), the U+2014 character in any generated artifact, hyphenated compound phrases against a spec allowlist, any price band string disagreeing with live min and max, any hardcoded review count disagreeing with `reviews_meta.json`, Reg Z footnote presence in both languages, NAP verbatim, non Google Review JSON LD, and feed `g:link` trailing slash matching the VDP canonical.

**Why it is first and why it is the proof.** This is the only proposal in the entire run that converts a recurring human job into a machine job. Every other compliance item on the list is a thing someone has to notice. Ship this and they become things the build refuses. It is measurable in one afternoon: seed a defect, watch the build fail.

Zero recurring cost. Runs in the only lane with a 25 for 25 record.

### Item 2: the three live compliance string fixes it will then enforce

- Footer: "every customer protected" to "every car documented". 62 occurrences, all 56 pages, verified live.
- Marquee: "all credit" to "Financing for all credit levels". 49 occurrences, all 56 pages, violates a hard MEMORY rule.
- The same sentence in `web_assets/llms.txt` (verified present as a standalone line) and in `build_ai_knowledge_base.py`, which feeds the customer facing GoHighLevel AI and currently also carries wrong hours, a wrong email address, and 34+ reviews against a live 46.

One time. Zero recurring. Removes a live compliance exposure across every surface simultaneously.

### Item 3: one fact source, computed price band

Merge `dealer.json` and `facts.json` into a single generated ledger. Price band, unit count, review count, rating, NAP, hours. Every page reads it. Hardcoding becomes a lint failure under item 1.

Measurable in 30 days: `grep "$5,000 to $15,000"` across the built site returns **0**, down from 15 today, including the homepage `priceRange` JSON LD that currently tells Google a price floor $4,000 below anything on the lot.

### Item 4: IndexNow list derived from the built sitemap

37 submitted vs 56 in the sitemap. 22 URLs have never been submitted, including the entire Spanish tree, the entire financing hub, all three legal pages, and `/used-suvs-skokie-il`.

Zero recurring. Measurable in 30 days by counting submitted URLs, and it is the cheapest available test of the indexing hypothesis that task #170 attributes to backlinks. #170 is open, overdue, and proposes acquiring backlinks, which is unbounded human work. This is a config change.

It is also the direct fix for the AI citation audit's critical finding, the stale "3 Month Warranty" served to answer engines through a Bing index of six URLs.

### Item 5: noindex the GitHub Pages mirror

Verified live: `dexmang.github.io/MaximAutosWeb` returns 200, byte identical homepage, self referencing canonical. Add `noindex` plus `Disallow: /` on the mirror only. Production untouched.

One time, zero recurring, verifiable by `curl` the same day.

### Item 6: the two link fixes

- Homepage hero chips at `index.astro:139-141` point at `/inventory?price=under10k` and `/inventory?body=SUV`, which the site's own `robots.txt` disallows. Repoint at `/used-cars-under-10000-skokie` and `/used-suvs-skokie-il`, which are two of the eight orphan pages. Two defects, one edit.
- The three financing CTAs from `/apply` to `/financing#apply`. Verified cost of the current behavior: one real credit application in three months.

One time, zero recurring, two files.

---

**Explicitly held back from Phase 1, with reasons:**

- **The entity graph.** Zero recurring cost and it is the most structurally correct proposal in the run. It is held only for sequencing: migrating 16 files off inline schema literals without the gate from item 1 already in place is how drift gets reintroduced. It should ship the week after, still inside 30 days. It is **not** the proof, because it produces nothing measurable in 30 days.
- **The second evergreen hub.** Right content, verified demand gap, wrong phase.
- **Out The Door.** Blocked on the destination sourcing fix.
- **Everything with a per car cost.** Video, inspection capture, DealerCenter paste back.
- **The weekly approval card.** Blocked until the delivery channel changes from a committed file to an ntfy push and the cap drops from seven to three.

---

## 6. Ranking: expected result divided by ongoing human cost

Method, stated so it can be argued with. **Result** is 0 to 10 and measures what verifiably changes, not what might: 10 removes a live compliance exposure or eliminates a defect class permanently, 7 to 8 fixes a live defect across many pages, 4 to 6 is a plausible indexing or citation gain that cannot be verified in 30 days, 1 to 3 is speculative, 0 is nothing. **Cost** is honest recurring human minutes per month, recomputed by me, with a floor of 1 representing one minute of residual attention. **Score = Result / Cost.** Higher is better.

| # | Proposal | Design | Result | Cost min/mo | **Score** |
|---|---|---|---|---|---|
| 1 | Deterministic build gate (merged content-guard + linter) | content-engine + ai-visibility | 10 | 1 | **10.0** |
| 2 | C8 footer + marquee + llms.txt + knowledge base string fixes | operator + ai-visibility | 10 | 1 | **10.0** |
| 3 | One fact source, computed price band | content-engine + ai-visibility | 9 | 1 | **9.0** |
| 4 | Entity graph with stable @id URIs | ai-visibility | 9 | 1 | **9.0** |
| 5 | IndexNow derived from sitemap | operator + ai-visibility | 8 | 1 | **8.0** |
| 6 | Six phone numbers become tappable tel: anchors | ux | 8 | 1 | **8.0** |
| 7 | Financing CTA retarget to /financing#apply | ux + conversion audit | 8 | 1 | **8.0** |
| 8 | Noindex the GitHub Pages mirror | operator | 8 | 1 | **8.0** |
| 9 | Delete 12 of 13 AggregateRating copies, merge sameAs | ai-visibility | 8 | 1 | **8.0** |
| 10 | Hero chips repointed off robots disallowed URLs | ai-visibility | 7 | 1 | **7.0** |
| 11 | Canonicalize the forked Spanish Reg Z string | ux | 7 | 1 | **7.0** |
| 12 | Kill dead schema types (Speakable, HowTo, SearchAction, Product, QAPage) | ai-visibility | 7 | 1 | **7.0** |
| 13 | Claim fork on inspection (soften five live claims) | content-engine | 7 | 1 | **7.0** |
| 14 | Ship the operator as one GitHub Action, 11 checks | operator | 7 | 1 | **7.0** |
| 15 | Fix GA4 generate_lead to fire on fetch success | conversion audit | 7 | 1 | **7.0** |
| 16 | Retire used-audi-skokie, kill the crossproducts | content-engine | 7 | 1 | **7.0** |
| 17 | Correct the five wrong automations registry rows | operator | 7 | 1 | **7.0** |
| 18 | Data derived price and mileage sliders | ux | 6 | 1 | **6.0** |
| 19 | Rescue 20 sold VDPs + adopt 8 orphan pages | content-engine | 6 | 1 | **6.0** |
| 20 | Three deadman watchers on the heartbeat | operator | 6 | 1 | **6.0** |
| 21 | Crawler policy, drop the ClaudeBot delay | ai-visibility | 6 | 1 | **6.0** |
| 22 | Inventory URL state + share control | ux | 6 | 1 | **6.0** |
| 23 | Fix feed-parity-audit workflow_run trigger | operator | 6 | 1 | **6.0** |
| 24 | Empty results state becomes an SMS capture | ux | 6 | 1 | **6.0** |
| 25 | Service nodes (CVR, inspection process) | ai-visibility | 6 | 1 | **6.0** |
| 26 | Homepage FAQPage from faq.json | ai-visibility | 5 | 1 | **5.0** |
| 27 | Jerry Person node, no alternateName | ai-visibility | 5 | 1 | **5.0** |
| 28 | /answers question index | content-engine | 5 | 1 | **5.0** |
| 29 | Reviews_meta staleness check | operator | 5 | 1 | **5.0** |
| 30 | hasOfferCatalog on /inventory | ai-visibility | 4 | 1 | **4.0** |
| 31 | Mobile lightbox fix (dcResize + swipe) | ux | 4 | 1 | **4.0** |
| 32 | One payment estimator instead of two | ux | 4 | 1 | **4.0** |
| 33 | VDP price to screen one, one CarGurus instance | ux | 4 | 1 | **4.0** |
| 34 | Header CTA at zero extra width | ux | 4 | 1 | **4.0** |
| 35 | Sold record page (asking price + days on lot) | content-engine | 4 | 1 | **4.0** |
| 36 | Homepage hero rebuilt to one phone screen | ux | 4 | 1 | **4.0** |
| 37 | Second evergreen hub, /illinois-car-buying | content-engine | 7 | 2 | **3.5** |
| 38 | Retarget mirror-photos.js at DealerCenter | ai-visibility + operator | 6 | 2 | **3.0** |
| 39 | /inventory.json | ai-visibility | 3 | 1 | **3.0** |
| 40 | Tiered Spanish, 5 new pages | content-engine | 5 | 2 | **2.5** |
| 41 | Compare tray | ux | 2 | 1 | **2.0** |
| 42 | Atom feed of new arrivals | ai-visibility | 1 | 1 | **1.0** |
| 43 | Doc fee comparison page (90 day expiry) | content-engine | 5 | 10 | **0.50** |
| 44 | Weekly approval card, **as designed** (file + DB task, 7 items) | operator | 4 | 22 | **0.18** |
| 44b | Weekly approval card, **fixed** (ntfy push, 3 items) | operator | 7 | 10 | **0.70** |
| 45 | Out The Door, **as designed** (single Skokie rate) | ux | **negative** | 5 | **KILL** |
| 45b | Out The Door, **fixed** (city input, stated range) | ux | 7 | 5 | **1.40** |
| 46 | DealerCenter description paste back | operator | 3 | 40 | **0.075** |
| 46b | Same rule extended into sanitizeDescription() at build | operator | 6 | 1 | **6.0** |
| 47 | VideoObject contract + per car walkaround | ai-visibility | 5 | 130 | **0.038** |
| 48 | Per vehicle inspection capture | content-engine | **negative** | 65 | **KILL** |
| 49 | Publish the inspection checklist as /inspection | ux | **negative** | 1 | **KILL** |
| 50 | Grounded on site assistant | both designs already killed it | 0 | n/a | **already dead, stays dead** |

Read the shape of that table. **Thirty six proposals score 4.0 or higher and every one of them costs one minute a month or less.** Three proposals are actively negative. The gap between those two groups is the entire adoption question, and it maps almost perfectly onto "is this generated or does a human touch it."

---

## 7. The thing nobody in this run addressed

Forty nine leads, more than seven days old, with names and phone numbers, sitting at stage `new` in `ma_leads`. Never contacted. All from CarGurus, which is the only channel producing leads at all.

Four designs, roughly ninety proposals, and not one of them touches the highest value action available to this business. The website is not the bottleneck at Maxim. The follow up is. I am flagging it because a red team that only argues about the plan it was handed is not doing its job.

That is not this mission's scope and I am not proposing scope creep. But if the orchestrator is deciding where 30 days of effort goes, the honest answer is that item 1 through item 6 above cost about two days of engineering and the remaining 28 days would return more if aimed at 49 uncontacted leads than at any schema node on this list.
