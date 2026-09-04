// Run: node test/onmarket.test.mjs
import { loadOnMarket, ageInDays, UNDER_AGENCY, AGENCY_ENDED } from '../server/onmarket.js';
import { normalizeAddress } from '../server/filter.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let pass = 0, fail = 0;
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`  ok   ${n}${extra}`); } else { fail++; console.log(`  FAIL ${n}${extra}`); } };
const dir = mkdtempSync(join(tmpdir(), 'mb-'));
const write = (name, text) => { const p = join(dir, name); writeFileSync(p, text); return p; };

console.log('\nStatus handling — the licensing question:');
const f = write('crmls.csv', [
  'Address,City,Zip,Standard Status',
  '1 Active St,Torrance,90503,Active',
  '2 Pending Ave,Torrance,90503,Pending',
  '3 Withdrawn Rd,Torrance,90503,Withdrawn',
  '4 Expired Ln,Torrance,90503,Expired',
  '5 Cancelled Ct,Torrance,90503,Cancelled',
  '6 Sold Way,Torrance,90503,Sold',
  '7 Coming Dr,Torrance,90503,Coming Soon',
].join('\n'));
const r = loadOnMarket(f);
const has = (a) => r.addresses.has(normalizeAddress(a, '90503'));

ok('Active excluded',       has('1 Active St'));
ok('Pending excluded',      has('2 Pending Ave'));
ok('WITHDRAWN excluded',    has('3 Withdrawn Rd'), '  ← still under agency');
ok('Coming Soon excluded',  has('7 Coming Dr'));
ok('Expired NOT excluded',  !has('4 Expired Ln'), '  ← agency ended, fair game');
ok('Cancelled NOT excluded',!has('5 Cancelled Ct'));
ok('Sold NOT excluded',     !has('6 Sold Way'));
ok('counts add up', r.excluded === 4 && r.skipped === 3, `  → ${r.excluded} excluded, ${r.skipped} skipped`);

console.log('\nColumn-name flexibility (CRMLS exports vary):');
for (const [label, header] of [
  ['Address/Zip/Status',                'Address,Zip,Status'],
  ['Street Address/Postal Code',        'Street Address,Postal Code,MLS Status'],
  ['Property Address/Zip Code',         'Property Address,Zip Code,Listing Status'],
  ['UnparsedAddress/StandardStatus',    'UnparsedAddress,ZipCode,StandardStatus'],
]) {
  const p = write(`${label.replace(/\W/g, '')}.csv`, `${header}\n9 Test Blvd,90503,Active`);
  ok(label, loadOnMarket(p).excluded === 1);
}

console.log('\nSafety behaviour:');
const noStatus = write('nostatus.csv', 'Address,Zip\n10 Any St,90503\n11 Other Rd,90503');
ok('no status column → exclude everything', loadOnMarket(noStatus).excluded === 2);

const weird = write('weird.csv', 'Address,Zip,Status\n12 Odd St,90503,Probate Pending Court Confirm');
const w = loadOnMarket(weird);
ok('unknown status excluded (safe direction)', w.excluded === 1);
ok('unknown status reported, not silent', w.unknownStatuses.length === 1, `  → "${w.unknownStatuses[0]}"`);

ok('missing file is not an error', loadOnMarket(join(dir, 'nope.csv')).excluded === 0);
ok('blank address row skipped', loadOnMarket(write('blank.csv', 'Address,Zip,Status\n,90503,Active')).excluded === 0);

console.log('\nFreshness:');
ok('age reported', typeof ageInDays(new Date()) === 'number');
ok('null when never loaded', ageInDays(null) === null);
ok('8 days ago reads as 8', ageInDays(new Date(Date.now() - 8 * 86400000)) === 8);

console.log('\nStatus lists do not overlap:');
ok('no status in both lists', !UNDER_AGENCY.some((s) => AGENCY_ENDED.includes(s)));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
