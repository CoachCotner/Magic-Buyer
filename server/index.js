// Magic Buyer — local web app. Nothing leaves this machine except the optional
// Claude API call that writes the copy.

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, statSync } from 'node:fs';

import { parseBuyer, describe } from './parse-buyer.js';
import { applyFilters, normalizeAddress, deriveOwnerType } from './filter.js';
import { generateAll, hasApiKey } from './generate.js';
import { screen, isBlocking } from './fairhousing.js';
import { buildPdf, buildLabels, mailingAddress } from './mailmerge.js';
import { loadOnMarket, ageInDays, STALE_AFTER_DAYS } from './onmarket.js';
import { readCsv, writeCsv, listFiles, slug, listPath, toCsvString } from './csv.js';
import { RECIPIENT_FIELDS, LIST_COLUMNS, BUYER_FIELDS, CHANNELS, STATUS_VALUES,
         recipientHeader, skipTraceExportHeader } from './schema.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTS = join(ROOT, 'lists');
const DATA = join(ROOT, 'data');
const PORT = process.env.PORT || 4000;

// Parcels load once at boot. Real county data if imported, sample data otherwise.
const PARCEL_FILE = existsSync(join(DATA, 'parcels.csv'))
  ? join(DATA, 'parcels.csv') : join(DATA, 'sample-parcels.csv');
const parcels = readCsv(PARCEL_FILE);
const usingSampleData = PARCEL_FILE.endsWith('sample-parcels.csv');

// On-market exclusions from a CRMLS export. This file gets replaced regularly —
// listings change weekly — so it is re-read whenever it changes on disk rather
// than at boot. No restart, no import step.
const ON_MARKET_FILE = join(DATA, 'on-market.csv');
let onMarketState = loadOnMarket(ON_MARKET_FILE);
let onMarketMtime = existsSync(ON_MARKET_FILE) ? statSync(ON_MARKET_FILE).mtimeMs : 0;

function currentOnMarket() {
  const mtime = existsSync(ON_MARKET_FILE) ? statSync(ON_MARKET_FILE).mtimeMs : 0;
  if (mtime !== onMarketMtime) {
    onMarketMtime = mtime;
    onMarketState = loadOnMarket(ON_MARKET_FILE);
    console.log(`  on-market list refreshed: ${onMarketState.excluded} addresses excluded`);
  }
  return onMarketState;
}

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(join(ROOT, 'public')));
app.use('/vendor/leaflet', express.static(join(ROOT, 'node_modules/leaflet/dist')));
app.use('/vendor/leaflet-draw', express.static(join(ROOT, 'node_modules/leaflet-draw/dist')));

app.get('/api/meta', (_req, res) => {
  const om = currentOnMarket();
  const days = ageInDays(om.updated);
  res.json({
    parcels: parcels.length,
    usingSampleData,
    onMarket: {
      present: om.updated != null,
      excluded: om.excluded,
      skipped: om.skipped,
      rows: om.total,
      updated: om.updated,
      ageDays: days,
      stale: days != null && days > STALE_AFTER_DAYS,
      statusColumn: om.statusColumn,
      unknownStatuses: om.unknownStatuses,
    },
    generator: hasApiKey() ? 'claude' : 'template',
    fields: { recipient: RECIPIENT_FIELDS, buyer: BUYER_FIELDS, listColumns: LIST_COLUMNS },
    channels: CHANNELS,
    statuses: STATUS_VALUES,
    lists: listFiles(LISTS).map((f) => f.replace(/\.csv$/, '')),
  });
});

/** One sentence → structured criteria. */
app.post('/api/parse', (req, res) => {
  const { sentence } = req.body ?? {};
  const { criteria, unparsed } = parseBuyer(sentence);
  const flags = screen(sentence || '', 'buyer description');
  res.json({ criteria, unparsed, summary: describe(criteria), flags });
});

/** Criteria (+ optional drawn area) → matching parcels and a live count. */
app.post('/api/search', (req, res) => {
  const criteria = req.body?.criteria ?? {};
  const result = applyFilters(parcels, criteria, { excludeAddresses: currentOnMarket().addresses });
  const cap = Number(req.body?.limit) || 500;
  res.json({
    count: result.count,
    excluded: result.excluded,
    matches: result.matches.slice(0, cap).map(publicParcel),
    truncated: result.count > cap,
  });
});

const publicParcel = (p) => ({
  apn: p.apn, address: p.address, city: p.city, state: p.state, zip: p.zip,
  owner: p.owner, phone: p.phone, email: p.email, value: Number(p.value) || 0,
  type: p.type || deriveOwnerType(p), dnc: p.dnc, status: p.status || 'new',
  mail_addr: p.mail_addr, mail_zip: p.mail_zip,
  beds: p.beds, baths: p.baths, sqft: p.sqft, lot_sqft: p.lot_sqft,
  year_built: p.year_built, years_owned: p.years_owned,
  property_type: p.property_type,
  lat: Number(p.lat), lon: Number(p.lon),
});

/** Save a recipient list as CSV under /lists. */
app.post('/api/lists', (req, res) => {
  const { name, rows } = req.body ?? {};
  if (!name || !Array.isArray(rows)) return res.status(400).json({ error: 'name and rows required' });
  const header = recipientHeader();
  const normalized = rows.map((r) => Object.fromEntries(header.map((k) => [k, r[k] ?? ''])));
  const n = writeCsv(listPath(LISTS, name), normalized, header);
  res.json({ saved: n, file: `${slug(name)}.csv` });
});

app.get('/api/lists/:name', (req, res) => {
  const file = listPath(LISTS, req.params.name);
  if (!existsSync(file)) return res.status(404).json({ error: 'no such list' });
  res.json({ rows: readCsv(file) });
});

/** Columns out to a batch skip-trace service — never the ones it fills in. */
app.get('/api/lists/:name/skiptrace.csv', (req, res) => {
  const file = listPath(LISTS, req.params.name);
  if (!existsSync(file)) return res.status(404).send('no such list');
  const header = skipTraceExportHeader();
  const rows = readCsv(file).map((r) => Object.fromEntries(header.map((k) => [k, r[k] ?? ''])));
  res.set('content-type', 'text/csv; charset=utf-8');
  res.set('content-disposition', `attachment; filename="${slug(req.params.name)}-skiptrace.csv"`);
  res.send(toCsvString(rows, header));
});

/** Load phones, emails and DNC back in, matched on APN then address. */
app.post('/api/lists/:name/skiptrace', (req, res) => {
  const file = listPath(LISTS, req.params.name);
  if (!existsSync(file)) return res.status(404).json({ error: 'no such list' });
  const incoming = req.body?.rows ?? [];
  const rows = readCsv(file);

  const byApn = new Map(rows.map((r) => [String(r.apn).trim(), r]));
  const byAddr = new Map(rows.map((r) => [normalizeAddress(r.address, r.zip), r]));

  let matched = 0, phones = 0, emails = 0, dnc = 0;
  for (const inc of incoming) {
    const row = byApn.get(String(inc.apn ?? '').trim())
      ?? byAddr.get(normalizeAddress(inc.address, inc.zip));
    if (!row) continue;
    matched++;
    if (inc.phone && !row.phone) { row.phone = inc.phone; phones++; }
    if (inc.email && !row.email) { row.email = inc.email; emails++; }
    if (inc.dnc != null && String(inc.dnc) !== '') {
      row.dnc = /^(1|true|y|yes)$/i.test(String(inc.dnc)) ? 'yes' : '';
      if (row.dnc) dnc++;
    }
  }
  writeCsv(file, rows, recipientHeader());
  res.json({ incoming: incoming.length, matched, phones, emails, dnc, unmatched: incoming.length - matched });
});

/** Update one recipient's campaign status. */
app.patch('/api/lists/:name/status', (req, res) => {
  const { apn, status } = req.body ?? {};
  if (!STATUS_VALUES.includes(status)) return res.status(400).json({ error: `status must be one of ${STATUS_VALUES.join(', ')}` });
  const file = listPath(LISTS, req.params.name);
  if (!existsSync(file)) return res.status(404).json({ error: 'no such list' });
  const rows = readCsv(file);
  const row = rows.find((r) => String(r.apn).trim() === String(apn).trim());
  if (!row) return res.status(404).json({ error: 'no such recipient' });
  row.status = status;
  writeCsv(file, rows, recipientHeader());
  res.json({ apn, status });
});

/** Mail merge: one PDF, one page per recipient, addressed where post actually goes. */
app.post('/api/lists/:name/merge.pdf', async (req, res) => {
  const file = listPath(LISTS, req.params.name);
  if (!existsSync(file)) return res.status(404).json({ error: 'no such list' });
  const letter = req.body?.letter;
  if (!letter) return res.status(400).json({ error: 'letter required' });

  // Nothing gets printed that would not pass the screen.
  const flags = screen(letter, 'letter');
  if (isBlocking(flags)) return res.status(422).json({ error: 'letter failed the fair housing check', flags });

  const rows = readCsv(file);
  const pdf = await buildPdf(rows, letter, { skipDnc: false });
  res.set('content-type', 'application/pdf');
  res.set('content-disposition', `attachment; filename="${slug(req.params.name)}-letters.pdf"`);
  res.send(pdf);
});

/** Envelope / label CSV, same order as the PDF. */
app.get('/api/lists/:name/labels.csv', (req, res) => {
  const file = listPath(LISTS, req.params.name);
  if (!existsSync(file)) return res.status(404).send('no such list');
  res.set('content-type', 'text/csv; charset=utf-8');
  res.set('content-disposition', `attachment; filename="${slug(req.params.name)}-labels.csv"`);
  res.send(buildLabels(readCsv(file)));
});

/** Buyer profile → four channels, screened. */
app.post('/api/generate', async (req, res) => {
  try {
    const result = await generateAll(req.body?.buyer ?? {}, { force: Boolean(req.body?.forceTemplate) });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Magic Buyer → http://localhost:${PORT}`);
  console.log(`  ${parcels.length} parcels loaded from ${usingSampleData ? 'SAMPLE data' : 'data/parcels.csv'}`);
  const om = currentOnMarket();
  if (om.updated) {
    console.log(`  ${om.excluded} on-market/withdrawn addresses excluded (export ${ageInDays(om.updated)} days old)`);
    if (om.unknownStatuses.length) console.log(`  unrecognized statuses, excluded to be safe: ${om.unknownStatuses.join(', ')}`);
  } else {
    console.log('  no CRMLS export at data/on-market.csv — nothing excluded');
  }
  console.log(`  generator: ${hasApiKey() ? 'Claude API' : 'templates (no API key set)'}\n`);
});
