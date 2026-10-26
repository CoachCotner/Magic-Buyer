// Build the one-page home pricing tool from an MLS "sold" export.
//
// usage: node tools/build-price-tool.mjs <sold.csv> <out.html> [--agent agent.json] [--sample] [--no-geocode]
//
// Reads: street address, subdivision/tract, property type, beds, baths, living sq ft, year built,
//        list price, sold price, days on market, close date, and (if present) latitude, longitude, photo url.
// Never reads agent or owner columns. Strips the house number and unit before anything leaves this script.
// Geocodes with the free US Census geocoder (full address, used only here) and rounds to 3 decimals
// (about a block) so pins sit on the street, not the house. Cache: lists/geocache.json.
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const [inCsv, outHtml] = args.filter(a => !a.startsWith('--'));
if (!inCsv || !outHtml) { console.error('usage: node tools/build-price-tool.mjs <sold.csv> <out.html> [--agent agent.json] [--sample] [--no-geocode]'); process.exit(1); }
const flag = f => args.includes(f);
const agentPath = args.includes('--agent') ? args[args.indexOf('--agent') + 1] : null;
const AGENT = Object.assign({ name: 'Lauren Cotner', first: 'Lauren', brokerage: 'eXp Realty of California, Inc.', dre: '01242185', phone: '310-508-5957', region: 'Torrance, CA' },
  agentPath && !agentPath.startsWith('--') ? JSON.parse(fs.readFileSync(agentPath, 'utf8')) : {});

const rows = parse(fs.readFileSync(inCsv, 'utf8'), { columns: true, bom: true, relax_column_count: true });
const H = Object.keys(rows[0] || {});
const find = (...pats) => H.find(h => pats.some(p => p.test(h.toLowerCase().replace(/[^a-z0-9]/g, ''))));
const col = {
  addr: find(/^(street)?address$/, /^fulladdress/, /^situs/, /^address/, /streetaddress/, /^propertyaddress/),
  street: find(/^streetname$/, /^street$/),
  sub: find(/subdivision/, /^tract/, /neighborhood/, /^area$/, /^community/),
  type: find(/propertysubtype/, /^subtype/, /^propertytype/, /^type$/, /dwellingtype/, /^style$/),
  beds: find(/^bed/, /^br$/, /bedrooms?/), baths: find(/^bath/, /^ba$/, /bathrooms?total/, /bathrooms?/),
  sqft: find(/livingarea/, /^sqft/, /squarefeet/, /^sf$/, /buildingarea/, /^livingsqft/),
  year: find(/yearbuilt/, /^built/, /^yr/),
  list: find(/^listprice/, /^originallistprice/, /^lp$/, /^listingprice/), sold: find(/^closeprice/, /^soldprice/, /^saleprice/, /^sp$/, /^closedprice/, /^price$/),
  dom: find(/^dom$/, /daysonmarket/, /^cdom$/, /cumulativedays/), date: find(/^closedate/, /^solddate/, /^closingdate/, /^saledate/, /^closed$/),
  lat: find(/^lat/), lng: find(/^lon/, /^lng/), photo: find(/photo/, /^image/, /thumbnail/),
};
console.error('columns:', col);
for (const k of ['sqft', 'sold', 'date']) if (!col[k]) { console.error(`missing a column for ${k}; headers are: ${H.join(' | ')}`); process.exit(1); }

const num = v => { const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();
const cap = s => tidy(s).toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\b(Ne|Nw|Se|Sw|N|S|E|W)\b/g, m => m.toUpperCase());
const streetOf = a => cap(tidy(a).replace(/^\d+[A-Za-z]?\s+/, '').replace(/\s*(#|apt|unit|ste)\s*\S+$/i, '').replace(/,.*$/, ''));
const typeOf = t => { const s = tidy(t).toLowerCase(); if (/condo/.test(s)) return 'Condo'; if (/town/.test(s)) return 'Townhouse'; if (/duplex|triplex|multi|units/.test(s)) return 'Multi unit'; if (/manufact|mobile/.test(s)) return 'Manufactured'; return 'House'; };
const dateOf = d => { const t = new Date(d); return isNaN(t) ? null : t.toISOString().slice(0, 10); };

const cachePath = 'lists/geocache.json';
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
async function geocode(full) {
  if (cache[full]) return cache[full];
  const url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=' + encodeURIComponent(full);
  try {
    const r = await fetch(url); const j = await r.json();
    const m = j?.result?.addressMatches?.[0]?.coordinates;
    if (m) { cache[full] = { lat: +m.y.toFixed(3), lng: +m.x.toFixed(3) }; return cache[full]; }
  } catch (e) { /* offline or blocked: pin is skipped, comp still counts */ }
  return null;
}

const comps = [];
for (const r of rows) {
  const sold = num(r[col.sold]), sqft = num(r[col.sqft]), soldDate = dateOf(r[col.date]);
  if (!sold || !sqft || !soldDate) continue;
  const rawAddr = col.addr ? r[col.addr] : (col.street ? r[col.street] : '');
  const c = {
    street: col.street && !col.addr ? cap(r[col.street]) : streetOf(rawAddr),
    subdivision: col.sub ? cap(r[col.sub]) : '',
    type: typeOf(col.type ? r[col.type] : ''),
    beds: num(r[col.beds]), baths: num(r[col.baths]), sqft, year: col.year ? Math.round(num(r[col.year])) : 0,
    list: col.list ? num(r[col.list]) : sold, sold, dom: col.dom ? Math.round(num(r[col.dom])) : 0, soldDate,
    lat: col.lat ? num(r[col.lat]) || null : null, lng: col.lng ? num(r[col.lng]) || null : null,
    photo: col.photo ? tidy(r[col.photo]) || undefined : undefined,
  };
  if (c.lat == null && !flag('--no-geocode') && rawAddr) {
    const g = await geocode(tidy(rawAddr) + (/,/.test(rawAddr) ? '' : ', ' + AGENT.region));
    if (g) { c.lat = g.lat; c.lng = g.lng; }
  }
  if (c.lat != null) { c.lat = +c.lat.toFixed(3); c.lng = +c.lng.toFixed(3); }
  comps.push(c);
}
fs.mkdirSync('lists', { recursive: true }); fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));

let html = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../web/price/price.template.html'), 'utf8');
html = html.replace('/*COMPS_JSON*/', JSON.stringify(comps)).replace('/*AGENT_JSON*/', JSON.stringify(AGENT));
if (flag('--sample')) html = html.replace('<!--SAMPLE_BANNER-->', '<div class="banner">SAMPLE DATA. These are not real sales. For layout only.</div>');
fs.mkdirSync(path.dirname(outHtml), { recursive: true });
fs.writeFileSync(outHtml, html);
const withPins = comps.filter(c => c.lat != null).length;
console.log(`comps: ${comps.length} (${withPins} with map pins) | types: ${[...new Set(comps.map(c => c.type))].join(', ')} | streets: ${new Set(comps.map(c => c.street)).size} | wrote ${outHtml} (${(fs.statSync(outHtml).size / 1024).toFixed(0)} KB)`);
