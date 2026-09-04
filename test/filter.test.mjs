// Run: node test/filter.test.mjs
import { applyFilters, insidePolygon, distanceMiles, normalizeAddress, deriveOwnerType } from '../server/filter.js';
import { parseBuyer } from '../server/parse-buyer.js';
import { readCsv } from '../server/csv.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const parcels = readCsv(join(ROOT, 'data', 'sample-parcels.csv'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${extra}`); }
  else { fail++; console.log(`  FAIL ${name}${extra}`); }
};

console.log(`\nLoaded ${parcels.length} sample parcels`);

console.log('\nGeometry:');
const square = [[0, 0], [0, 10], [10, 10], [10, 0]];
ok('inside polygon',  insidePolygon(5, 5, square));
ok('outside polygon', !insidePolygon(15, 5, square));
ok('distance LAX→PV ≈ 12mi', Math.abs(distanceMiles(33.9416, -118.4085, 33.7787, -118.3934) - 11.3) < 1.5);

console.log('\nAddress normalization (MLS matching):');
ok('street suffix variants match',
  normalizeAddress('123 Silver Spur Road', '90274') === normalizeAddress('123 Silver Spur Rd.', '90274'));
ok('different zip does not match',
  normalizeAddress('123 Silver Spur Rd', '90274') !== normalizeAddress('123 Silver Spur Rd', '90275'));
ok('direction abbreviated',
  normalizeAddress('45 North Prospect Ave', '90277') === normalizeAddress('45 N Prospect Av', '90277'));

console.log('\nOwner vs absentee:');
ok('same mailing = Owner',    deriveOwnerType({ address: '1 A St', zip: '90274', mail_addr: '1 A St', mail_zip: '90274' }) === 'Owner');
ok('different mailing = Absentee', deriveOwnerType({ address: '1 A St', zip: '90274', mail_addr: '9 B Blvd', mail_zip: '90210' }) === 'Absentee');

console.log('\nFiltering a real sentence:');
const { criteria } = parseBuyer('The Kims, 4 bed 3 bath single family in Palos Verdes Estates CA, $2M-$3.2M, cash buyer, turnkey only');
const r = applyFilters(parcels, criteria);
ok('returns a workable count', r.count > 0 && r.count < parcels.length, `  → ${r.count} of ${parcels.length}`);
ok('all in the right city',  r.matches.every((p) => p.city === 'Palos Verdes Estates'));
ok('all meet bed minimum',   r.matches.every((p) => +p.beds >= 4));
ok('all inside price range', r.matches.every((p) => +p.value >= 2_000_000 && +p.value <= 3_200_000));
ok('all single family',      r.matches.every((p) => p.property_type === 'Single Family'));

console.log('\nTightening criteria lowers the count (the steering loop):');
const wide   = applyFilters(parcels, { city: 'Torrance' }).count;
const narrow = applyFilters(parcels, { city: 'Torrance', beds: 4 }).count;
const tighter= applyFilters(parcels, { city: 'Torrance', beds: 4, price_max: 1_200_000 }).count;
ok('monotonic', wide >= narrow && narrow >= tighter, `  → ${wide} → ${narrow} → ${tighter}`);

console.log('\nArea selection:');
const zips = applyFilters(parcels, { area: { type: 'zips', zips: ['90266'] } });
ok('zip area', zips.matches.every((p) => p.zip === '90266') && zips.count > 0, `  → ${zips.count}`);
const radius = applyFilters(parcels, { area: { type: 'radius', lat: 33.8847, lon: -118.4109, miles: 2 } });
ok('radius area', radius.count > 0 && radius.count < parcels.length, `  → ${radius.count}`);
const poly = applyFilters(parcels, { area: { type: 'polygon', ring: [[33.86, -118.43], [33.91, -118.43], [33.91, -118.38], [33.86, -118.38]] } });
ok('polygon area', poly.count > 0 && poly.count < parcels.length, `  → ${poly.count}`);

console.log('\nOff-market exclusion (actives, pendings AND withdrawn):');
const onMarket = new Set(parcels.slice(0, 25).map((p) => normalizeAddress(p.address, p.zip)));
const filtered = applyFilters(parcels, {}, { excludeAddresses: onMarket });
ok('excludes listed addresses', filtered.count === parcels.length - onMarket.size,
   `  → removed ${filtered.excluded.onMarket}`);

console.log('\nOwner status filter:');
const abs = applyFilters(parcels, { owner_status: 'Absentee' });
ok('absentee only', abs.matches.every((p) => p.type === 'Absentee') && abs.count > 0, `  → ${abs.count}`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
