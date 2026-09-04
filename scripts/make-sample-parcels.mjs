#!/usr/bin/env node
// Generates SAMPLE South Bay parcels so the tool is demoable before the LA County
// download works. Everything here is synthetic — owner names are obviously fake
// and no row describes a real property or a real person.
//
// Replace with real data via scripts/import-parcels.mjs once the county dataset
// is reachable. Shape matches the real thing exactly, so nothing downstream changes.

import { writeCsv } from '../server/csv.js';
import { deriveOwnerType } from '../server/filter.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Real place names and plausible coordinates; the parcels themselves are invented.
const AREAS = [
  { city: 'Palos Verdes Estates',  state: 'CA', zip: '90274', lat: 33.7787, lon: -118.3934, base: 2_400_000, spread: 1_400_000 },
  { city: 'Rancho Palos Verdes',   state: 'CA', zip: '90275', lat: 33.7445, lon: -118.3870, base: 1_850_000, spread: 1_100_000 },
  { city: 'Rolling Hills Estates', state: 'CA', zip: '90274', lat: 33.7877, lon: -118.3573, base: 2_050_000, spread: 900_000 },
  { city: 'Torrance',              state: 'CA', zip: '90503', lat: 33.8358, lon: -118.3406, base: 1_150_000, spread: 500_000 },
  { city: 'Redondo Beach',         state: 'CA', zip: '90277', lat: 33.8492, lon: -118.3884, base: 1_600_000, spread: 800_000 },
  { city: 'Manhattan Beach',       state: 'CA', zip: '90266', lat: 33.8847, lon: -118.4109, base: 3_100_000, spread: 1_600_000 },
];

const STREETS = ['Via Campesina', 'Palos Verdes Dr', 'Hawthorne Blvd', 'Crenshaw Blvd', 'Silver Spur Rd',
  'Granvia Altamira', 'Calle Mayor', 'Anza Ave', 'Prospect Ave', 'Aviation Blvd', 'Highland Ave',
  'Camino Real', 'Rolling Hills Rd', 'Deep Valley Dr', 'Esplanade', 'Vista Del Mar'];

const SURNAMES = ['Sample', 'Testerman', 'Placeholder', 'Example', 'Demoworth', 'Fixture',
  'Mockton', 'Sampleton', 'Dummett', 'Stubbs'];
const GIVEN = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'J.', 'K.', 'L.', 'M.'];

// Deterministic PRNG so regenerating gives the same file (clean git diffs).
let seed = 20260904;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + rnd() * (hi - lo);
const round = (n, to) => Math.round(n / to) * to;

const rows = [];
const COUNT = 600;

for (let i = 0; i < COUNT; i++) {
  const area = AREAS[Math.floor(rnd() * AREAS.length)];
  const sqft = round(between(1200, 4800), 10);
  const beds = sqft < 1600 ? 2 : sqft < 2300 ? 3 : sqft < 3200 ? 4 : 5;
  const baths = Math.max(1, Math.min(5, Math.round(beds - 1 + (rnd() < 0.4 ? 1 : 0))));
  const yearBuilt = Math.floor(between(1948, 2019));
  const value = round(area.base + (sqft - 2400) * between(280, 620) + between(-1, 1) * area.spread * 0.35, 1000);
  const yearsOwned = Math.floor(between(0, 42));
  const absentee = rnd() < 0.22;

  const streetNo = Math.floor(between(100, 6800));
  const street = pick(STREETS);
  const address = `${streetNo} ${street}`;

  const parcel = {
    apn: `7${String(Math.floor(between(100, 999)))}-${String(Math.floor(between(1, 40))).padStart(3, '0')}-${String(Math.floor(between(1, 99))).padStart(3, '0')}`,
    address,
    city: area.city,
    state: area.state,
    zip: area.zip,
    owner: `${pick(GIVEN)} ${pick(SURNAMES)}`,
    phone: '',
    email: '',
    value: Math.max(650_000, value),
    type: '',
    dnc: '',
    status: 'new',
    mail_addr: absentee ? `${Math.floor(between(100, 9000))} ${pick(['Wilshire Blvd', 'Ventura Blvd', 'Main St'])}` : address,
    mail_zip: absentee ? pick(['90210', '91403', '94105', '89109']) : area.zip,
    beds,
    baths,
    sqft,
    lot_sqft: round(sqft * between(1.6, 5.5), 100),
    year_built: yearBuilt,
    years_owned: yearsOwned,
    property_type: rnd() < 0.86 ? 'Single Family' : 'Condo',
    lat: +(area.lat + between(-0.018, 0.018)).toFixed(6),
    lon: +(area.lon + between(-0.018, 0.018)).toFixed(6),
  };
  parcel.type = deriveOwnerType(parcel);
  rows.push(parcel);
}

const out = join(ROOT, 'data', 'sample-parcels.csv');
writeCsv(out, rows);

const absentees = rows.filter((r) => r.type === 'Absentee').length;
console.log(`Wrote ${rows.length} SAMPLE parcels to data/sample-parcels.csv`);
console.log(`  ${absentees} absentee (${Math.round((absentees / rows.length) * 100)}%), ${rows.length - absentees} owner-occupied`);
console.log(`  values $${Math.min(...rows.map(r => r.value)).toLocaleString()} – $${Math.max(...rows.map(r => r.value)).toLocaleString()}`);
console.log(`  cities: ${[...new Set(rows.map(r => r.city))].join(', ')}`);
