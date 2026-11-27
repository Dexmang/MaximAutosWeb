// The free per VIN CARFAX report link, one builder for the whole site. The link shows on the
// vehicle page only, never where a car is listed (Jerry, 2026-11-27).
// partner=DVW_1 is Maxim Autos' CARFAX Advantage link code. The report opens only while
// "Display CARFAX in Online Listings" is on for the unit in DealerCenter; see the CARFAX
// section of businesses/maxim-autos/operations/inventory-pipeline.md.
export const CARFAX_PARTNER = 'DVW_1';
export const CARFAX_LINKS_LIVE = true;

/** The report URL for a VIN, or null when there is no usable VIN or the links are off. */
export function carfaxUrl(vin?: string | null): string | null {
  if (!CARFAX_LINKS_LIVE || !vin || vin === 'TBD' || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return null;
  return `https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=${CARFAX_PARTNER}&vin=${vin.toUpperCase()}`;
}
