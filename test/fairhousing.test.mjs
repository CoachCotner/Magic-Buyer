// Run: node test/fairhousing.test.mjs
import { screen, isBlocking } from '../server/fairhousing.js';

let pass = 0, fail = 0;

const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`); }
};

console.log('\nShould be FLAGGED:');
const bad = [
  ['familial status', 'I have a young family looking for a home in your neighborhood.'],
  ['steering',        'They love how safe the neighborhood is and the good schools.'],
  ['age',             'My buyers are a retired couple hoping to downsize nearby.'],
  ['religion',        'A lovely Christian couple who would fit right in here.'],
  ['disability',      'Perfect for someone who can manage the stairs.'],
  ['marital status',  'A single woman relocating for work.'],
  ['income source',   'Cash buyers only, no Section 8.'],
  ['coded exclusion', 'They want to be in this exclusive neighborhood.'],
  ['charm pricing',   'Comparable homes are selling around $1,199,997 right now.'],
];
for (const [label, text] of bad) {
  const r = screen(text, label);
  check(`${label} flagged`, !r.ok);
  if (!r.ok) console.log(`       → ${r.flags[0].category}: "${r.flags[0].phrase}"`);
}

console.log('\nShould be CLEAN (property criteria only):');
const good = [
  'My buyer is pre-approved to $1,400,000 and can close in 21 days.',
  'They are looking for four bedrooms, at least 2,400 square feet, and a flat lot.',
  'They have toured six homes on the peninsula and passed on each one.',
  'They would consider a home needing work, and can be flexible on the closing date.',
  'If you have ever thought about selling, I would like to tell you about them.',
  'Homes like yours have recently sold around $1,200,000.',
];
for (const text of good) {
  const r = screen(text, 'letter');
  check(`clean: "${text.slice(0, 46)}…"`, r.ok);
  if (!r.ok) console.log(`       → false positive: ${r.flags.map(f => f.phrase).join(', ')}`);
}

console.log('\nBlocking behaviour:');
check('high severity blocks',      isBlocking(screen('a young family', 'x')));
check('charm pricing warns only', !isBlocking(screen('about $999,997', 'x')));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
