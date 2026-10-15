/**
 * The named list of dealer fees that are $0 at Maxim Autos, in one place.
 *
 * Jerry, 2026-10-15: "dealers usually charge much more than the doc fee allowed by the state,
 * such as destination and other fees. The entire message on the site mentions only the doc
 * fee." Every promise surface (vehicle page callout, homepage pillar, fee page hero and list,
 * trust strip, window card) now names the whole list, so "no dealer fees" is read as what it
 * is: nothing a dealer adds, of any kind. Each item is a statement about Maxim's own pricing,
 * true on every deal (operations/pricing-policy.md), so it stays inside 14 Ill. Adm. Code
 * 475.360 and 475.370: no competitor, no figure for what others charge, no savings claim.
 * The dollar proof (the state cap) stays in facts.fees; this file carries words only.
 */
export const FEE_LIST = {
  en: 'No doc fee, no prep fee, no delivery or destination fee, no installed add ons, no filing fee.',
  es: 'Sin cargo de documentacion, sin cargo de preparacion, sin cargo de entrega o destino, sin accesorios instalados, sin cargo de tramite.',
} as const;

/** The short form for the trust strip, where width is the limit. */
export const FEE_STRIP = {
  en: 'No doc fee, no prep, no add ons',
  es: 'Sin documentacion, preparacion ni accesorios',
} as const;

/** The list as line items, for the fee page's "what you pay" list and the window card. */
export const FEE_ITEMS = {
  en: ['Doc fee', 'Prep or reconditioning', 'Delivery or destination', 'Installed add ons', 'Electronic filing', 'Market adjustment'],
  es: ['Cargo de documentacion', 'Preparacion o reacondicionamiento', 'Entrega o destino', 'Accesorios instalados', 'Tramite electronico', 'Ajuste de mercado'],
} as const;
