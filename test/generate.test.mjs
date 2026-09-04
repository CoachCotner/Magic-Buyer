// Run: node test/generate.test.mjs   (template mode — no API key needed)
import { generateAll, money } from '../server/generate.js';
import { isBlocking } from '../server/fairhousing.js';

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}`); } };

console.log('\nMoney rounding (the no-$X97 rule):');
ok('$2,437,912 → $2.4M', money(2437912) === '$2.4M');
ok('$912,000 → $912K',   money(912000) === '$912K');
ok('$1,000,000 → $1M',   money(1000000) === '$1M');

const buyer = {
  nickname: 'The Kims',
  city: 'Palos Verdes Estates', state: 'CA',
  budget_min: 2000000, budget_max: 2400000,
  beds: 4, baths: 3,
  financing: 'Pre-approved', closing: 'Flexible', condition: 'Minor updates OK',
  why_area: 'They want to be close to the bluff trails and a flat backyard.',
  toured: 'They have toured six homes on the peninsula since March and passed on each one.',
  agent_cell: '(310) 555-0142', agent_name: 'Lauren Cotner',
  agent_brokerage: 'eXp Realty', agent_dre: '01242185',
};

const r = await generateAll(buyer, { force: true });

console.log(`\nMode: ${r.mode}`);
ok('runs without an API key', r.mode === 'template');
ok('produces all four channels', ['letter', 'email', 'text', 'call'].every((k) => r.channels[k]));
ok('email has subject and body', r.channels.email.subject && r.channels.email.body);

console.log('\nFair housing:');
ok('nothing blocking', !r.blocked);
for (const [ch, f] of Object.entries(r.flags)) ok(`${ch} clean`, f.ok);

console.log('\nContent rules:');
const all = [r.channels.letter, r.channels.email.subject, r.channels.email.body, r.channels.text, r.channels.call].join('\n');
ok('no charm pricing',      !/\$\s?\d[\d,]*(97|99|95)\b/.test(all));
ok('no exclamation marks',  !all.includes('!'));
ok('letter names the buyer', r.channels.letter.includes('The Kims'));
ok('letter has the ask',     /thought about selling/i.test(r.channels.letter));
ok('letter carries DRE',     r.channels.letter.includes('01242185'));
ok('email asks for forward', /forward this email/i.test(r.channels.email.body));
ok('email has 3 bullets',    (r.channels.email.body.match(/^- /gm) || []).length === 3);
ok('text under 320 chars',   r.channels.text.length < 320);
ok('call script has opt-out',/take you off my list/i.test(r.channels.call));
ok('call script sets status',/Mark status/i.test(r.channels.call));

console.log('\nA buyer note that violates fair housing is caught:');
const bad = await generateAll({ ...buyer, why_area: 'They are a growing family and want good schools.' }, { force: true });
ok('flags the note', !bad.flags.buyer_notes.ok);
ok('blocks the save', bad.blocked);
console.log(`       → ${bad.flags.buyer_notes.flags.map((f) => `${f.category}: "${f.phrase}"`).join('; ')}`);

console.log('\n──────── LETTER ────────');
console.log(r.channels.letter);
console.log('\n──────── EMAIL ────────');
console.log(`Subject: ${r.channels.email.subject}\n`);
console.log(r.channels.email.body);
console.log('\n──────── TEXT ────────');
console.log(r.channels.text);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
