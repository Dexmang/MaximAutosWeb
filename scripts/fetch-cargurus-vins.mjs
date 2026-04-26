#!/usr/bin/env node
// One-off helper: fetch live CarGurus VINs and print them. Used for the
// 2026-04-26 forced reconciliation. Safe to keep around for future audits.

const url = 'https://www.cargurus.com/Cars/m-Maxim-Autos-sp457703';
const html = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
}).then(r => r.text());

const marker = '"tiles":[';
const start = html.indexOf(marker);
let pos = start + marker.length - 1, depth = 0, inStr = false, esc = false;
const arrayStart = pos;
for (; pos < html.length; pos++) {
  const ch = html[pos];
  if (esc) { esc = false; continue; }
  if (ch === '\\' && inStr) { esc = true; continue; }
  if (ch === '"') { inStr = !inStr; continue; }
  if (inStr) continue;
  if (ch === '[' || ch === '{') depth++;
  if (ch === ']' || ch === '}') { depth--; if (depth === 0) break; }
}
const tiles = JSON.parse(html.substring(arrayStart, pos + 1));
const listings = tiles.filter(t => t.type === 'LISTING_USED_STANDARD' && t.data);
console.log(`CarGurus live count: ${listings.length}`);
for (const t of listings) {
  const d = t.data;
  console.log(`  ${d.vin}  ${d.ontologyData?.carYear} ${d.ontologyData?.makeName} ${d.ontologyData?.modelName} ${d.ontologyData?.trimName || ''}  $${d.priceData?.current?.toLocaleString() || '?'}`);
}
