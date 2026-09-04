/* Magic Buyer — front end. Vanilla; no build step. */
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const api = async (path, opts) => {
  const r = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
};

const state = {
  criteria: {}, area: null, matches: [], count: 0, meta: null,
  listName: '', channels: null, channel: 'letter', flags: {},
};

const PILLS = {
  property_type: ['Any', 'Single Family', 'Multi-Family', 'Condo', 'Townhome', 'Mobile Home', 'Land'],
  beds:          ['Any', 2, 3, 4, 5],
  baths:         ['Any', 1, 2, 3, 4],
  owner_status:  ['Any', 'Owner', 'Absentee'],
  years_owned:   ['Any', '2+', '5+', '10+'],
  financing:     ['Pre-approved', 'Cash buyer', 'FHA', 'VA', 'Conventional'],
  closing:       ['Flexible', 'Quick close (21 days)', '30 days', 'No rush', 'Open to rent-back'],
  condition:     ['Minor updates OK', 'As-is / no repairs', 'Move-in ready only', 'Major renos OK'],
};
const FILTERING = new Set(['property_type', 'beds', 'baths', 'owner_status', 'years_owned']);
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

/* ── navigation ─────────────────────────────────────── */
let step = 1;
function go(n) {
  step = n;
  $$('.screen').forEach((s, i) => { s.hidden = i + 1 !== n; });
  $$('.step').forEach((b, i) => b.classList.toggle('on', i + 1 === n));
  if (n === 2) setTimeout(() => map && map.invalidateSize(), 60);
}
$$('.step').forEach((b) => b.addEventListener('click', () => {
  const t = +b.dataset.goto;
  if (t === 1 || (t === 2 && state.criteria.city !== undefined) ||
      (t >= 3 && state.matches.length)) go(t);
}));

/* ── step 1: parse ──────────────────────────────────── */
$('#tryit').addEventListener('click', () => {
  $('#sentence').value = 'The Kims, 4 bed 3 bath single family in Palos Verdes Estates CA, $2M-$2.4M, pre-approved, flexible closing, minor updates ok';
  $('#parse').click();
});
$('#sentence').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#parse').click(); });

$('#parse').addEventListener('click', async () => {
  const sentence = $('#sentence').value.trim();
  if (!sentence) return;
  const res = await api('/api/parse', { method: 'POST', body: JSON.stringify({ sentence }) });

  renderFlags($('#parse-flags'), res.flags,
    'That description mentions something that cannot go in a letter to homeowners.');
  if (res.flags.flags.some((f) => f.severity === 'high')) return;

  state.criteria = res.criteria;
  fillForm(res.criteria);
  $('#buyer-title').textContent = res.criteria.nickname || 'Your buyer';
  $('#buyer-summary').textContent = res.summary || 'Search criteria & letter content';
  go(2);
  search();
});

/* ── step 2: criteria form ──────────────────────────── */
function buildPills() {
  for (const [key, values] of Object.entries(PILLS)) {
    const host = $(`#p-${key}`);
    if (!host) continue;
    host.innerHTML = '';
    for (const v of values) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill';
      b.textContent = typeof v === 'number' ? `${v}+` : v;
      b.dataset.value = v;
      b.addEventListener('click', () => {
        [...host.children].forEach((c) => c.classList.remove('on'));
        b.classList.add('on');
        state.criteria[key] = v === 'Any' ? null : v;
        if (FILTERING.has(key)) search();
      });
      host.appendChild(b);
    }
  }
}
buildPills();

function fillForm(c) {
  for (const k of ['city', 'state', 'zip', 'price_min', 'price_max', 'sqft_min', 'sqft_max', 'lot_min', 'lot_max']) {
    const el = $(`#f-${k}`); if (el) el.value = c[k] ?? '';
  }
  for (const key of Object.keys(PILLS)) {
    const host = $(`#p-${key}`); if (!host) continue;
    const want = c[key] ?? 'Any';
    [...host.children].forEach((b) => {
      const v = b.dataset.value;
      b.classList.toggle('on', String(v) === String(want) || (want == null && v === 'Any'));
    });
  }
}

$$('#screen-2 input, #screen-2 textarea').forEach((el) => {
  el.addEventListener('input', () => {
    const k = el.id.replace(/^f-/, '');
    const numeric = /price|sqft|lot/.test(k);
    state.criteria[k] = el.value === '' ? null : (numeric ? Number(String(el.value).replace(/[^0-9.]/g, '')) : el.value);
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      if (k === 'why_area') return checkWhy(el.value);
      search();
    }, 280);
  });
});

async function checkWhy(text) {
  if (!text.trim()) return $('#why-flags').hidden = true;
  const res = await api('/api/parse', { method: 'POST', body: JSON.stringify({ sentence: text }) });
  renderFlags($('#why-flags'), res.flags, 'This cannot go in the letter.');
}

/* ── live count ─────────────────────────────────────── */
let searching = false, queued = false;
async function search() {
  if (searching) { queued = true; return; }
  searching = true;
  try {
    const criteria = { ...state.criteria, area: state.area };
    const res = await api('/api/search', { method: 'POST', body: JSON.stringify({ criteria }) });
    state.matches = res.matches; state.count = res.count;
    $('#count').textContent = `${res.count} ${res.count === 1 ? 'property' : 'properties'} found`;
    const bits = [];
    if (res.excluded.onMarket) bits.push(`${res.excluded.onMarket} excluded as listed or withdrawn`);
    if (state.area) bits.push('inside your selected area');
    $('#countnote').textContent = bits.join(' · ') || 'Adjust the criteria and this updates.';
    drawPins(res.matches);
  } finally {
    searching = false;
    if (queued) { queued = false; search(); }
  }
}

/* ── map ────────────────────────────────────────────── */
let map, pinLayer, drawLayer, drawControl, radiusCentre, radiusCircle, mode = 'draw';
function initMap() {
  map = L.map('map', { zoomControl: true }).setView([33.79, -118.38], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap',
  }).addTo(map);
  pinLayer = L.layerGroup().addTo(map);
  drawLayer = new L.FeatureGroup().addTo(map);

  drawControl = new L.Control.Draw({
    draw: { polygon: { allowIntersection: false, showArea: true }, polyline: false,
            rectangle: {}, circle: false, marker: false, circlemarker: false },
    edit: { featureGroup: drawLayer },
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (e) => {
    drawLayer.clearLayers();
    drawLayer.addLayer(e.layer);
    const ring = e.layer.getLatLngs()[0].map((p) => [p.lat, p.lng]);
    state.area = { type: 'polygon', ring };
    $('#areanote').textContent = `Drawn area — ${ring.length} points.`;
    search();
  });

  map.on('click', (e) => {
    if (mode !== 'radius') return;
    radiusCentre = e.latlng;
    applyRadius();
  });
}

function applyRadius() {
  if (!radiusCentre) return;
  const miles = Number($('#radius-miles').value) || 1.5;
  if (radiusCircle) map.removeLayer(radiusCircle);
  radiusCircle = L.circle(radiusCentre, { radius: miles * 1609.34, color: '#1c5d4a', weight: 2, fillOpacity: 0.05 }).addTo(map);
  state.area = { type: 'radius', lat: radiusCentre.lat, lon: radiusCentre.lng, miles };
  $('#areanote').textContent = `${miles} mile radius.`;
  search();
}
$('#radius-miles').addEventListener('input', applyRadius);

$$('.mode').forEach((b) => b.addEventListener('click', () => {
  $$('.mode').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  $('#zipbox').hidden = mode !== 'zips';
  $('#radiusbox').hidden = mode !== 'radius';
  if (mode === 'draw') map.addControl(drawControl); else map.removeControl(drawControl);
}));

$('#zips').addEventListener('input', (e) => {
  const zips = e.target.value.split(/[,\s]+/).map((z) => z.trim()).filter(Boolean);
  state.area = zips.length ? { type: 'zips', zips } : null;
  $('#areanote').textContent = zips.length ? `ZIP codes: ${zips.join(', ')}` : 'No area selected.';
  clearTimeout(e.target._t);
  e.target._t = setTimeout(search, 300);
});

$('#clear-area').addEventListener('click', () => {
  state.area = null; drawLayer.clearLayers();
  if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
  radiusCentre = null; $('#zips').value = '';
  $('#areanote').textContent = 'No area selected — filtering the whole dataset.';
  search();
});

function drawPins(rows) {
  pinLayer.clearLayers();
  const pts = [];
  for (const r of rows.slice(0, 400)) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) continue;
    pts.push([r.lat, r.lon]);
    L.circleMarker([r.lat, r.lon], {
      radius: 5, weight: 1, color: '#1c5d4a',
      fillColor: r.type === 'Absentee' ? '#c8811f' : '#1c5d4a', fillOpacity: 0.8,
    }).bindPopup(`<b>${r.address}</b><br>${r.city} ${r.zip}<br>${money(r.value)} · ${r.beds}bd ${r.baths}ba<br>${r.type}`)
      .addTo(pinLayer);
  }
  if (pts.length && !state.area) map.fitBounds(pts, { padding: [30, 30], maxZoom: 14 });
}

/* ── step 3: recipients ─────────────────────────────── */
$('#to-recipients').addEventListener('click', () => { renderList(); go(3); });

function renderList() {
  const rows = state.matches;
  $('#rcount').textContent = rows.length;
  const withPhone = rows.filter((r) => r.phone).length;
  const withEmail = rows.filter((r) => r.email).length;
  $('#fill').textContent = `${withPhone} with phone · ${withEmail} with email`;
  if (!$('#listname').value) $('#listname').value = state.criteria.nickname || 'buyer list';
  drawRows(rows);
}

function drawRows(rows) {
  const tb = $('#rtable tbody');
  tb.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><div>${esc(r.address)}</div><div class="city">${esc(r.city)}, ${esc(r.state)} ${esc(r.zip)}</div></td>` +
      `<td>${esc(r.owner) || dash()}</td>` +
      `<td>${r.phone ? esc(r.phone) : dash()}</td>` +
      `<td>${r.email ? esc(r.email) : dash()}</td>` +
      `<td class="num">${money(r.value)}</td>` +
      `<td><span class="badge ${r.type === 'Absentee' ? 'absentee' : ''}">${esc(r.type)}</span></td>` +
      `<td>${r.dnc ? '<span class="badge dnc">DNC</span>' : dash()}</td>` +
      `<td><select data-apn="${esc(r.apn)}">${
        (state.meta?.statuses ?? ['new']).map((s) => `<option${s === (r.status || 'new') ? ' selected' : ''}>${s}</option>`).join('')
      }</select></td>`;
    tb.appendChild(tr);
  }
  tb.querySelectorAll('select').forEach((sel) => sel.addEventListener('change', async () => {
    const row = state.matches.find((m) => m.apn === sel.dataset.apn);
    if (row) row.status = sel.value;
    if (state.listName) {
      await api(`/api/lists/${encodeURIComponent(state.listName)}/status`,
        { method: 'PATCH', body: JSON.stringify({ apn: sel.dataset.apn, status: sel.value }) }).catch(() => {});
    }
  }));
}
const dash = () => '<span class="muted">&mdash;</span>';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

$('#rsearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  drawRows(!q ? state.matches : state.matches.filter((r) =>
    [r.address, r.owner, r.phone, r.email, r.city, r.zip].some((v) => String(v ?? '').toLowerCase().includes(q))));
});

$('#save-list').addEventListener('click', async () => {
  const name = $('#listname').value.trim() || 'buyer list';
  const res = await api('/api/lists', { method: 'POST', body: JSON.stringify({ name, rows: state.matches }) });
  state.listName = name;
  banner(`Saved ${res.saved} recipients to lists/${res.file}`);
});

$('#dl-skiptrace').addEventListener('click', () => {
  if (!state.listName) return banner('Save the list first.', true);
  location.href = `/api/lists/${encodeURIComponent(state.listName)}/skiptrace.csv`;
});

$('#up-skiptrace').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!state.listName) return banner('Save the list first.', true);
  const rows = parseCsv(await file.text());
  const res = await api(`/api/lists/${encodeURIComponent(state.listName)}/skiptrace`,
    { method: 'POST', body: JSON.stringify({ rows }) });
  banner(`Matched ${res.matched} of ${res.incoming} · ${res.phones} phones · ${res.emails} emails · ${res.dnc} on DNC` +
         (res.unmatched ? ` · ${res.unmatched} unmatched` : ''));
  const fresh = await api(`/api/lists/${encodeURIComponent(state.listName)}`);
  const byApn = new Map(fresh.rows.map((r) => [String(r.apn), r]));
  state.matches = state.matches.map((m) => ({ ...m, ...pickContact(byApn.get(String(m.apn))) }));
  renderList();
});
const pickContact = (r) => (r ? { phone: r.phone, email: r.email, dnc: r.dnc, status: r.status } : {});

function banner(text, warn) {
  const el = $('#import-result');
  el.textContent = text; el.hidden = false;
  el.style.background = warn ? 'var(--warn-soft)' : 'var(--accent-soft)';
  el.style.color = warn ? 'var(--warn)' : 'var(--accent)';
}

/** Minimal CSV reader for the skip-trace file the user picks. */
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase().replace(/﻿/g, ''));
  return rows.filter((r) => r.some((c) => c.trim()))
             .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/* ── step 4: outreach ───────────────────────────────── */
const BUYER_INPUTS = [
  ['nickname', 'Buyer nickname'], ['why_area', 'Why this area'], ['toured', 'Toured and passed on'],
  ['agent_name', 'Your name'], ['agent_cell', 'Your cell'],
  ['agent_brokerage', 'Brokerage'], ['agent_dre', 'DRE #'],
];
function buildBuyerFields() {
  const host = $('#buyerfields');
  host.innerHTML = '';
  const saved = JSON.parse(localStorage.getItem('mb_agent') || '{}');
  for (const [key, label] of BUYER_INPUTS) {
    const l = document.createElement('label');
    l.textContent = label;
    const input = key === 'why_area' || key === 'toured' ? document.createElement('textarea') : document.createElement('input');
    if (input.tagName === 'TEXTAREA') input.rows = 2;
    input.id = `b-${key}`;
    input.value = saved[key] ?? state.criteria[key] ?? '';
    l.appendChild(input);
    host.appendChild(l);
  }
}
$('#to-outreach').addEventListener('click', () => { buildBuyerFields(); go(4); });

$$('.chan').forEach((b) => b.addEventListener('click', () => {
  $$('.chan').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  state.channel = b.dataset.chan;
  showChannel();
}));

async function generate() {
  const buyer = { ...state.criteria };
  for (const [key] of BUYER_INPUTS) buyer[key] = $(`#b-${key}`)?.value ?? '';
  localStorage.setItem('mb_agent', JSON.stringify({
    agent_name: buyer.agent_name, agent_cell: buyer.agent_cell,
    agent_brokerage: buyer.agent_brokerage, agent_dre: buyer.agent_dre,
  }));
  $('#out').textContent = 'Writing…';
  try {
    const res = await api('/api/generate', { method: 'POST', body: JSON.stringify({ buyer }) });
    state.channels = res.channels; state.flags = res.flags;
    $('#genmode').textContent = res.mode === 'claude'
      ? 'Written by Claude.' : 'Written from templates — set ANTHROPIC_API_KEY for Claude-written copy.';
    renderFairHousing(res);
    showChannel();
  } catch (err) {
    $('#out').textContent = `Could not generate: ${err.message}`;
  }
}
$('#generate').addEventListener('click', generate);
$('#regen').addEventListener('click', generate);

function showChannel() {
  if (!state.channels) return;
  const c = state.channels[state.channel];
  const titles = { letter: 'Letter', email: 'Email', text: 'Text', call: 'Call script' };
  $('#outtitle').textContent = titles[state.channel];
  $('#out').textContent = state.channel === 'email' ? `Subject: ${c.subject}\n\n${c.body}` : c;
  // Mail merge only makes sense for the letter — it is the only piece that gets posted.
  const isLetter = state.channel === 'letter';
  $('#merge-pdf').hidden = !isLetter;
  $('#merge-labels').hidden = !isLetter;
}

$('#merge-pdf').addEventListener('click', async () => {
  if (!state.listName) return alert('Save the recipient list first (step 3).');
  const btn = $('#merge-pdf');
  btn.textContent = 'Building…';
  try {
    const r = await fetch(`/api/lists/${encodeURIComponent(state.listName)}/merge.pdf`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: state.channels.letter }),
    });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.listName}-letters.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert(`Could not build the letters: ${err.message}`);
  } finally {
    btn.textContent = 'Letters PDF';
  }
});

$('#merge-labels').addEventListener('click', () => {
  if (!state.listName) return alert('Save the recipient list first (step 3).');
  location.href = `/api/lists/${encodeURIComponent(state.listName)}/labels.csv`;
});

$('#copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('#out').textContent);
  $('#copy').textContent = 'Copied';
  setTimeout(() => ($('#copy').textContent = 'Copy'), 1400);
});

function renderFairHousing(res) {
  const all = Object.values(res.flags).flatMap((f) => f.flags);
  const el = $('#fh');
  if (!all.length) {
    el.hidden = false; el.className = 'flags good';
    el.innerHTML = '<b>Fair housing check passed</b>Property criteria only — nothing describing who the buyer is, or who the area suits.';
    return;
  }
  const blocking = all.some((f) => f.severity === 'high');
  el.hidden = false;
  el.className = `flags ${blocking ? 'stop' : 'warn'}`;
  el.innerHTML = `<b>${blocking ? 'Do not send — fair housing' : 'Worth a look'}</b>` +
    `<ul>${all.map((f) => `<li><b>${esc(f.category)}</b> — “${esc(f.phrase)}”. ${esc(f.why)}</li>`).join('')}</ul>`;
}

function renderFlags(el, result, lead) {
  if (!result || result.ok) { el.hidden = true; return; }
  const blocking = result.flags.some((f) => f.severity === 'high');
  el.hidden = false;
  el.className = `flags ${blocking ? 'stop' : 'warn'}`;
  el.innerHTML = `<b>${lead}</b><ul>${result.flags.map((f) =>
    `<li><b>${esc(f.category)}</b> — “${esc(f.phrase)}”. ${esc(f.why)}</li>`).join('')}</ul>`;
}

/* ── boot ───────────────────────────────────────────── */
(async function boot() {
  initMap();
  state.meta = await api('/api/meta');
  $('#meta').innerHTML =
    `${state.meta.parcels.toLocaleString()} parcels` +
    (state.meta.usingSampleData ? ' <span class="sample">SAMPLE DATA</span>' : '') +
    `<br>generator: ${state.meta.generator}`;
  go(1);
  $('#sentence').focus();
})();
