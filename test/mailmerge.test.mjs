// Run: node test/mailmerge.test.mjs
import { mailingAddress, personalize, buildPdf, buildLabels } from '../server/mailmerge.js';

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log(`  ok   ${n}`); } else { fail++; console.log(`  FAIL ${n}`); } };

const owner = { owner: 'C. Testerman', address: '2440 Hawthorne Blvd', city: 'Palos Verdes Estates',
  state: 'CA', zip: '90274', mail_addr: '2440 Hawthorne Blvd', mail_zip: '90274' };
const absentee = { owner: 'D. Mockton', address: '2439 Esplanade', city: 'Redondo Beach',
  state: 'CA', zip: '90277', mail_addr: '1387 Wilshire Blvd', mail_zip: '90210', dnc: 'yes' };

console.log('\nWhere the letter is posted:');
const a = mailingAddress(owner), b = mailingAddress(absentee);
ok('owner-occupied → the property', a.line1 === '2440 Hawthorne Blvd' && !a.forwarded);
ok('absentee → the mailing address', b.line1 === '1387 Wilshire Blvd' && b.forwarded);
ok('absentee city line uses mailing zip', b.line2.includes('90210'));

console.log('\nPersonalization:');
const master = 'Dear Neighbor,\n\nI am writing about one buyer.';
ok('salutation replaced', personalize(master, owner).startsWith('Dear C. Testerman,'));
ok('body untouched', personalize(master, owner).includes('I am writing about one buyer.'));
ok('no owner name → left alone', personalize(master, { owner: '' }).startsWith('Dear Neighbor,'));

console.log('\nLabels:');
const csv = buildLabels([owner, absentee]);
ok('header correct', csv.split('\n')[0] === 'name,address,city_state_zip,property_address,mail_to');
ok('two rows', csv.trim().split('\n').length === 3);
ok('absentee flagged', csv.includes('mailing address (absentee)'));
ok('property address kept for reference', csv.includes('2439 Esplanade, Redondo Beach, CA 90277'));
ok('skipDnc drops the DNC row', buildLabels([owner, absentee], { skipDnc: true }).trim().split('\n').length === 2);

console.log('\nPDF:');
const pdf = await buildPdf([owner, absentee], master);
ok('is a PDF', pdf.subarray(0, 5).toString() === '%PDF-');
ok('has content', pdf.length > 1000);
const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
ok('one page per recipient', pages === 2, );
console.log(`       → ${pdf.length.toLocaleString()} bytes, ${pages} pages`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
