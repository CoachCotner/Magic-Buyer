// One-buyer apartment letter merge: a MAIL csv + an owners map -> one PDF per envelope,
// one combined PDF for printing, and a labels CSV for tools/labels-avery.mjs.
//
// usage: node tools/merge-letters.mjs lists/128_campaign.json
//
// campaign.json keys:
//   input      MAIL csv from tools/ingest-title.mjs (apn,address,city,owner,owner_kind,mail_*,years_held,est_units,...)
//   owners     json map { "OWNER STRING UPPERCASED": {sal, attn, src?} } — trusts parsed by hand, LLCs from CA SOS
//   out_dir    folder for the per-envelope PDFs      combined  single PDF of every letter      labels  labels csv
//   units_phrase  "ten to one hundred units"   area_phrase "the Riviera"   price_phrase "twelve million dollars"
//   agent      { name, brokerage, phone, email } (defaults below)
//
// Rules carried over from the 90503 mailing: group by mailing address (one envelope per owner, naming every
// building); a known person carries the group over "Redacted" rows; entity/trust -> "To the owners of ...";
// never the trust's legal name in the salutation; Article 16 footer on every letter; no prices in the letter.
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const cfgPath = process.argv[2];
if (!cfgPath) { console.error('usage: node tools/merge-letters.mjs <campaign.json>'); process.exit(1); }
const C = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const agent = Object.assign({ name: 'Lauren Cotner', brokerage: 'eXp Realty of California, Inc.', dre: 'DRE #01242185', phone: '310-508-5957', email: 'Lauren@laurencotner.com' }, C.agent || {});
const FOOTER = 'If your property is currently listed with another broker, this is not intended as a solicitation of that listing.';

const rows = parse(fs.readFileSync(C.input, 'utf8'), { columns: true, bom: true }).filter(r => !/sold|active|listed/i.test(r.on_market || ''));
const OWN = JSON.parse(fs.readFileSync(C.owners, 'utf8'));
fs.mkdirSync(C.out_dir, { recursive: true });
for (const f of fs.readdirSync(C.out_dir)) if (f.endsWith('.pdf')) fs.unlinkSync(path.join(C.out_dir, f));

const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();
const cap = s => tidy(s).toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\bLlc\b/g, 'LLC').replace(/\bLp\b/g, 'LP').replace(/\bInc\b/g, 'Inc.').replace(/\bLtd\b/g, 'Ltd.').replace(/\bPo Box\b/g, 'P.O. Box');
const streetOnly = a => tidy(a).replace(/\s(#|APT|UNIT)\s*\S+$/i, '').replace(/\s[A-Z]$/, '');
const streetName = a => streetOnly(a).replace(/^\d+\s+/, '').replace(/\bSt$/, 'Street').replace(/\bAve$/, 'Avenue').replace(/\bDr$/, 'Drive').replace(/\bBlvd$/, 'Boulevard').replace(/\bCt$/, 'Court').replace(/\bHwy$/, 'Highway');
const joinAnd = xs => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
const streetsOf = g => joinAnd([...new Set(g.map(x => streetName(x.address)))]);
const addrsOf = g => [...new Set(g.map(x => streetOnly(x.address)))];
const blank = r => /REDACTED|RECORD OWNER/i.test(r.owner);
const known = r => OWN[tidy(r.owner).toUpperCase()];
// owners map may also carry an envelope override keyed by mailing address: "@28441 HIGHRIDGE RD #320": {sal, attn, person:false}
const groupPerson = g => { const o = OWN['@' + tidy(g[0].mail_addr).toUpperCase()]; if (o) return o;
  const ks = g.filter(r => !blank(r)).map(known); if (ks.length && ks.every(Boolean) && new Set(ks.map(k => k.attn)).size === 1) return ks[0]; return null; };
const BLD = C.buildings || {};
for (const r of rows) if (!r.building_name && BLD[streetOnly(r.address)]) r.building_name = BLD[streetOnly(r.address)];
const isPerson = r => r.owner_kind === 'individual' && !/redacted|builders|properties|management|enterprises|co\b|company/i.test(r.owner);

function salutation(g) {
  const r = g[0];
  const gp = groupPerson(g); if (gp) return gp.sal;
  const addrs = addrsOf(g);
  if (addrs.length > 1) return `To the owners of the ${streetsOf(g)} buildings`;
  if (isPerson(r)) { const last = tidy(r.owner).split(' ')[0]; return `Dear ${cap(last)} Family`; }
  return r.building_name ? `To the owners of ${r.building_name}` : `To the owners of ${streetOnly(r.address)}`;
}
function body(g) {
  const r = g[0]; const addrs = addrsOf(g); const multi = addrs.length > 1;
  const bname = multi ? 'your buildings' : (r.building_name || streetOnly(r.address));
  const where = multi ? `Your buildings on ${streetsOf(g)} are` : `Your building on ${streetOnly(r.address)} is`;
  const kind = multi ? 'the kind of properties' : 'the kind of property';
  const yrs = Number(r.years_held || 0);
  const held = multi ? `You've held them a long time, and I assume that is on purpose.`
    : yrs >= 4 ? `You've owned ${bname} for ${yrs} years and I assume that is on purpose.`
    : yrs > 0 ? `You bought ${bname} fairly recently, and I assume you meant to keep it.`
    : `You've held ${bname} a long time, and I assume that is on purpose.`;
  return [
    `I'm writing to you about one particular buyer, rather than about ${bname}.`,
    `There is a family here in the South Bay — they live here, they own apartment buildings here, and they keep them. They are in a 1031 exchange, which means they have a deadline and the money is already in hand. They are looking for ${C.units_phrase} in ${C.area_phrase}, up to about ${C.price_phrase}, and they can close in forty-five days. A building that needs work is fine with them.`,
    `Two things about how they buy, because they matter to you. They buy off-market — no listing, no sign, no brokers' tour, no marketing period. And they don't bring their own agent. So if this happened, it would be quiet, it would be quick, and there would be one agent in the room.`,
    `${where} ${kind} they've asked me to find. I would rather ask you directly than wonder, so my question is simple: is there any price or any set of terms at which you'd consider selling, privately, to a local owner who would keep it?`,
    `If the answer is no, that is a completely fine answer, and I won't write again. ${held}`,
    `If the answer is "it depends," I'd be glad to tell you what buildings like yours have actually traded for in the last year — ${C.comps_phrase || 'several have within a few blocks of you'} — and let you decide from there. Nothing gets listed, nothing gets marketed, and nothing goes anywhere without you.`,
  ];
}

const groups = new Map();
for (const r of rows) { const k = (tidy(r.mail_addr) + '|' + String(r.mail_zip).slice(0, 5)).toUpperCase(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function render(doc, g, i) {
  const r = g[0]; const gp = groupPerson(g); const addrs = addrsOf(g);
  const owners = [...new Set(g.map(x => tidy(x.owner).toUpperCase()))];
  const toName = gp ? gp.attn : (owners.length > 1 ? 'Owner' : cap(r.owner));
  // under a named person, repeat the entity of record (LLC / LP) so the mailroom routes it; never the raw trust string
  const attnLine = gp && gp.person !== false && owners.length === 1 && /entity|institutional/.test(r.owner_kind) ? cap(r.owner) : null;
  const mail = gp && gp.mail ? gp.mail : [cap(r.mail_addr), `${cap(r.mail_city)}, ${r.mail_state} ${String(r.mail_zip).slice(0, 5)}`];
  const re = addrs.length > 1 ? addrs.join(' · ') : `${r.building_name ? r.building_name + ', ' : ''}${streetOnly(r.address)}, ${cap(r.city)}`;
  doc.font('Times-Roman').fontSize(11.5).fillColor('#222');
  doc.text(agent.name).text(`${agent.brokerage}  ·  ${agent.dre}`).text(`${agent.phone}  ·  ${agent.email}`);
  doc.moveDown(1.6).text(date);
  doc.moveDown(1.2).text(toName); if (attnLine && attnLine !== toName) doc.text(attnLine); doc.text(mail[0]).text(mail[1]);
  doc.moveDown(.6).font('Times-Italic').text('Re: ' + re).font('Times-Roman');
  doc.moveDown(1.2).text(salutation(g) + ',');
  for (const p of body(g)) doc.moveDown(.8).text(p, { align: 'left', lineGap: 2.5 });
  doc.moveDown(1.2).text(C.sign_off || 'Warm regards,');
  doc.moveDown(3).text(agent.name);           // three blank lines for a hand signature
  const mb = doc.page.margins.bottom; doc.page.margins.bottom = 0;   // footer sits inside the bottom margin; don't let pdfkit start a new page
  doc.fontSize(8.5).fillColor('#777').text(FOOTER, 81, 728, { width: 450, align: 'left', lineBreak: false });
  doc.page.margins.bottom = mb;
  return { toName, mail, re, gp };
}

const labels = []; let i = 0;
const all = new PDFDocument({ size: 'LETTER', margins: { top: 72, bottom: 72, left: 81, right: 81 }, autoFirstPage: false });
all.pipe(fs.createWriteStream(C.combined));
for (const [, g] of groups) {
  i++; const r = g[0];
  const file = path.join(C.out_dir, String(i).padStart(2, '0') + '_' + streetOnly(r.address).replace(/[^A-Za-z0-9]+/g, '_') + (addrsOf(g).length > 1 ? '_portfolio' : '') + '.pdf');
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 72, bottom: 72, left: 81, right: 81 } });
  doc.pipe(fs.createWriteStream(file));
  const info = render(doc, g, i); doc.end();
  all.addPage(); render(all, g, i);
  labels.push({ envelope: i, name: info.toName, entity: [...new Set(g.map(x => cap(x.owner)))].join(' / '), named_person: info.gp && info.gp.person !== false ? 'yes' : 'no',
    address: info.mail[0], city_state_zip: info.mail[1], re: addrsOf(g).join('; '), buildings: addrsOf(g).length, salutation: salutation(g),
    owner_kind: r.owner_kind, years_held: r.years_held, units: g.map(x => x.units_verified || x.est_units + '~').join('; '), src: info.gp?.src || '' });
}
all.end();
fs.writeFileSync(C.labels, stringify(labels, { header: true }));
console.log('envelopes:', i, '| letters covering', rows.length, 'parcels,', new Set(rows.map(r => streetOnly(r.address))).size, 'buildings');
console.log('named a person:', labels.filter(l => l.named_person === 'yes').length, 'of', labels.length, 'envelopes');
console.log('still addressed to an entity:'); labels.filter(l => l.named_person !== 'yes').forEach(l => console.log('  ', l.entity.slice(0, 55).padEnd(55), '|', l.re.slice(0, 45)));
console.log('portfolio envelopes:'); labels.filter(l => l.buildings > 1).forEach(l => console.log('  ', l.name, '|', l.address, '|', l.re));
