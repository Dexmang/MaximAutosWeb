/**
 * listing-readiness.mjs  ::  when a DealerCenter unit is ready to be advertised at all.
 *
 * The owner's go-live checklist (businesses/maxim-autos/operations/decision-rights.md,
 * "Push listings live"): a unit goes live once photos are uploaded and the all in
 * price is set. DealerCenter's OAP feed does not enforce that. A unit flipped to
 * In Inventory before the checklist passes arrives with SpecialPrice 0 and no photo
 * URLs, and on 2026-10-27 J10280EV (2024 Hyundai Palisade) was published exactly that
 * way: a featured card at "$0" with a blank photo on the home page, the inventory grid
 * and its VDP, while build-gmc-feed.js held it out of the Google feed for having no
 * photos. The two checkers that watch the feed (scripts/audit-feed-vdp-parity.js in
 * CI and pull_oap_sftp.verify_live_site on the PKA machine) both counted that hold as
 * a mismatch, so the alert fired three times for a unit that was correctly absent and
 * nothing pointed at the $0 card.
 *
 * One predicate, imported by every consumer so they can never disagree:
 *   - build-inventory.js        holds a not ready unit off the site the way a web hold
 *                               does: omitted from vehicles.json, no card, no VDP,
 *                               never marked SOLD
 *   - build-gmc-feed.js         keeps it out of the Google feed and does not count it
 *                               against --strict parity
 *   - audit-feed-vdp-parity.js  expects it to be absent from the feed
 *
 * The hold is automatic and releases itself: on the first build where the newest
 * DealerCenter feed carries a price and at least one photo, the unit is listed
 * everywhere. Nothing to run, nothing to un-hold.
 */

/**
 * Why a vehicles.json record is not ready to advertise. An empty array means ready.
 * Field names are vehicles.json's (price, photoUrls), which is also what
 * build-inventory.js has in hand right before it writes the file.
 */
export function notReadyReasons(v) {
  const reasons = [];
  if (!(Number(v?.price) > 0)) reasons.push('no price');
  if (!((v?.photoUrls || []).length > 0)) reasons.push('no photos');
  return reasons;
}

/** True when the unit has an all in price and at least one photo. */
export function isListingReady(v) {
  return notReadyReasons(v).length === 0;
}
