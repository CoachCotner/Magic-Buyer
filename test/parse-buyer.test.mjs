// Run: node test/parse-buyer.test.mjs
import { parseBuyer, describe as summarize, parseMoney } from '../server/parse-buyer.js';

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n         got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

console.log('\nMoney:');
eq('$1.2M',     parseMoney('$1.2M'),    1200000);
eq('900k',      parseMoney('900k'),      900000);
eq('$912,000',  parseMoney('$912,000'),  912000);
eq('800K',      parseMoney('800K'),      800000);

console.log("\nHis own example sentence:");
const a = parseBuyer("Sarah and Mike, 3 bed 2 bath in Auburn NH, $900K-$912K, pre-approved, flexible closing, major reno ok, any years owned").criteria;
eq('nickname',   a.nickname,   'Sarah and Mike');
eq('beds',       a.beds,        3);
eq('baths',      a.baths,       2);
eq('city',       a.city,       'Auburn');
eq('state',      a.state,      'NH');
eq('price_min',  a.price_min,   900000);
eq('price_max',  a.price_max,   912000);
eq('financing',  a.financing,  'Pre-approved');
eq('closing',    a.closing,    'Flexible');
eq('condition',  a.condition,  'Major renos OK');
eq('years',      a.years_owned,'Any');

console.log('\nHis placeholder:');
const b = parseBuyer('Sarah, $800K-1.2M, 3 bed in Newton MA, pre-approved').criteria;
eq('nickname',  b.nickname,  'Sarah');
eq('city',      b.city,      'Newton');
eq('state',     b.state,     'MA');
eq('min',       b.price_min,  800000);
eq('max',       b.price_max,  1200000);

console.log('\nSouth Bay phrasing Lauren would actually type:');
const c = parseBuyer("The Kims, 4 bed 3 bath single family in Palos Verdes Estates CA, up to $2.4M, cash buyer, turnkey only, 2400 sqft").criteria;
eq('nickname',  c.nickname,      'The Kims');
eq('city',      c.city,          'Palos Verdes Estates');
eq('state',     c.state,         'CA');
eq('beds',      c.beds,           4);
eq('max',       c.price_max,      2400000);
eq('type',      c.property_type, 'Single Family');
eq('financing', c.financing,     'Cash buyer');
eq('condition', c.condition,     'Move-in ready only');
eq('sqft',      c.sqft_min,       2400);

console.log('\nLoose phrasing:');
const d = parseBuyer('Dana, condo in Redondo Beach, CA 90277, under $950,000, FHA, no rush').criteria;
eq('city',   d.city,          'Redondo Beach');
eq('state',  d.state,         'CA');
eq('zip',    d.zip,           '90277');
eq('type',   d.property_type, 'Condo');
eq('max',    d.price_max,      950000);
eq('fin',    d.financing,     'FHA');
eq('close',  d.closing,       'No rush');

const e = parseBuyer('three bed two bath in Torrance CA owned 10+ years').criteria;
eq('word beds',  e.beds,        3);
eq('word baths', e.baths,       2);
eq('years',      e.years_owned,'10+');

console.log('\nMissing-field reporting:');
eq('flags gaps', parseBuyer('someone who wants a house').unparsed, ['location', 'budget', 'bedrooms']);

console.log('\nSummary line:');
console.log('  ' + summarize(a));
console.log('  ' + summarize(c));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
