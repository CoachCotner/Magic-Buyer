// "Describe your buyer" — one sentence in, structured criteria out.
//
// This is the move worth stealing from the paid tool: an agent describes a buyer
// the way they would to a colleague, and the software fills the form. The form
// still exists, pre-filled and correctable — it is just never blank.
//
// Deliberately rule-based. It runs with no API key, no network, and no latency,
// and it is inspectable when it gets something wrong. server/generate.js uses
// the Claude API for prose; parsing a short structured sentence does not need it.

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const STATES = new Set(('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
  'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC').split(' '));

/** "$1.2M" → 1200000, "900k" → 900000, "$912,000" → 912000 */
export function parseMoney(raw) {
  if (!raw) return null;
  const m = String(raw).replace(/[$,\s]/g, '').match(/^(\d+(?:\.\d+)?)([kKmM])?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const suffix = (m[2] || '').toLowerCase();
  if (suffix === 'm') return Math.round(n * 1_000_000);
  if (suffix === 'k') return Math.round(n * 1_000);
  // A bare number under 10000 in a price context is almost certainly thousands.
  return Math.round(n < 10_000 ? n * 1_000 : n);
}

const num = (raw) => {
  if (raw == null) return null;
  const key = String(raw).toLowerCase();
  if (key in WORD_NUMBERS) return WORD_NUMBERS[key];
  const n = parseInt(String(raw).replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

const PROPERTY_TYPES = [
  [/\bsingle[- ]?family\b|\bsfr\b|\bhouses?\b/i, 'Single Family'],
  [/\bmulti[- ]?family\b|\bduplex\b|\btriplex\b|\bfourplex\b/i, 'Multi-Family'],
  [/\bcondos?\b|\bcondominiums?\b/i, 'Condo'],
  [/\btown(house|home)s?\b/i, 'Townhome'],
  [/\bmobile homes?\b|\bmanufactured\b/i, 'Mobile Home'],
  [/\bland\b|\blots?\b(?!\s*size)/i, 'Land'],
];

const FINANCING = [
  [/\bpre[- ]?approved?\b|\bpreapproval\b/i, 'Pre-approved'],
  [/\ball[- ]cash\b|\bcash buyers?\b|\bcash\b/i, 'Cash buyer'],
  [/\bfha\b/i, 'FHA'],
  [/\bva loan\b|\bva financing\b|\bva\b(?!\s*[A-Z])/i, 'VA'],
  [/\bconventional\b/i, 'Conventional'],
];

const CLOSING = [
  [/\bquick clos\w*\b|\b21[- ]days?\b|\bfast clos\w*\b/i, 'Quick close (21 days)'],
  [/\b30[- ]days?\b/i, '30 days'],
  [/\brent[- ]?back\b|\bleaseback\b/i, 'Open to rent-back'],
  [/\bno rush\b|\bnot in a hurry\b|\bpatient\b/i, 'No rush'],
  [/\bflexible clos\w*\b|\bflexible\b/i, 'Flexible'],
];

const CONDITION = [
  [/\bmajor reno\w*\b|\bgut\b|\bfixer\b|\bteardown\b|\bneeds work\b/i, 'Major renos OK'],
  [/\bas[- ]is\b|\bno repairs?\b/i, 'As-is / no repairs'],
  [/\bmove[- ]in ready\b|\bturn[- ]?key\b/i, 'Move-in ready only'],
  [/\bminor updates?\b|\bcosmetic\b|\blight work\b/i, 'Minor updates OK'],
];

const firstMatch = (text, table) => {
  for (const [pattern, value] of table) if (pattern.test(text)) return value;
  return null;
};

/**
 * @param {string} sentence
 * @returns {{criteria: object, unparsed: string[]}}
 */
export function parseBuyer(sentence) {
  const text = String(sentence || '').trim();
  const c = {
    nickname: null, city: null, state: null, zip: null,
    price_min: null, price_max: null, sqft_min: null, sqft_max: null,
    lot_min: null, lot_max: null, beds: null, baths: null,
    property_type: null, years_owned: 'Any', financing: null,
    closing: null, condition: null, notes: null,
  };
  if (!text) return { criteria: c, unparsed: [] };

  // --- price range: "$900K-$912K", "$800K to $1.2M", "between 900k and 1.2m"
  const range = text.match(
    /\$?\s*(\d[\d,]*(?:\.\d+)?\s*[kKmM]?)\s*(?:-|–|—|to|and)\s*\$?\s*(\d[\d,]*(?:\.\d+)?\s*[kKmM]?)/,
  );
  if (range) {
    const lo = parseMoney(range[1]);
    const hi = parseMoney(range[2]);
    // Guard against matching a bed/bath pair or a year range.
    if (lo && hi && hi >= lo && hi >= 50_000) { c.price_min = lo; c.price_max = hi; }
  }
  if (c.price_max == null) {
    const under = text.match(/\b(?:under|below|up to|max(?:imum)?|budget of)\s*\$?\s*(\d[\d,]*(?:\.\d+)?\s*[kKmM]?)/i);
    if (under) c.price_max = parseMoney(under[1]);
    const over = text.match(/\b(?:over|above|at least|min(?:imum)?|starting at)\s*\$?\s*(\d[\d,]*(?:\.\d+)?\s*[kKmM]?)/i);
    if (over) c.price_min = parseMoney(over[1]);
    if (c.price_min == null && c.price_max == null) {
      const single = text.match(/\$\s*(\d[\d,]*(?:\.\d+)?\s*[kKmM]?)/);
      if (single) c.price_max = parseMoney(single[1]);
    }
  }

  // --- beds / baths
  const beds = text.match(/\b(\d+|one|two|three|four|five|six)\s*\+?\s*(?:bed(?:room)?s?|bd|br)\b/i);
  if (beds) c.beds = num(beds[1]);
  const baths = text.match(/\b(\d+(?:\.\d)?|one|two|three|four|five)\s*\+?\s*(?:bath(?:room)?s?|ba)\b/i);
  if (baths) c.baths = num(baths[1]);

  // --- square feet, then lot size (lot checked first so it is not eaten by sqft)
  const lot = text.match(/\b([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)?\s*lot\b|\blot\s*(?:of|at least)?\s*([\d,]+)/i);
  if (lot) c.lot_min = num(lot[1] || lot[2]);
  const sqft = text.match(/\b([\d,]+)\s*\+?\s*(?:sq\.?\s*ft\.?|sqft|square feet)\b(?!\s*lot)/i);
  if (sqft && num(sqft[1]) !== c.lot_min) c.sqft_min = num(sqft[1]);

  // --- location: "in Auburn NH", "in Redondo Beach, CA 90277", "in Palos Verdes"
  const loc = text.match(
    /\bin\s+([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,3})\s*,?\s*([A-Z]{2})?\b\s*(\d{5})?/,
  );
  if (loc) {
    let city = loc[1].trim();
    let state = loc[2];
    // "in Newton MA" — the trailing token may be the state, glued to the city.
    const tail = city.split(/\s+/).pop();
    if (!state && STATES.has(tail?.toUpperCase()) && city.split(/\s+/).length > 1) {
      state = tail.toUpperCase();
      city = city.slice(0, -tail.length).trim();
    }
    if (state && !STATES.has(state)) state = null;
    c.city = city.replace(/,$/, '') || null;
    c.state = state || null;
    c.zip = loc[3] || null;
  }

  // --- pill-button fields
  c.property_type = firstMatch(text, PROPERTY_TYPES);
  c.financing = firstMatch(text, FINANCING);
  c.closing = firstMatch(text, CLOSING);
  c.condition = firstMatch(text, CONDITION);

  const years = text.match(/\b(?:owned?\s*(?:for)?\s*)?(\d+)\s*\+?\s*years?\b|\bany years?\s*owned\b/i);
  if (years) c.years_owned = years[1] ? `${years[1]}+` : 'Any';

  // --- nickname: leading text before the first comma, if it reads like names
  const head = text.split(',')[0].trim();
  if (head && head.length <= 48 && !/\d|\$/.test(head) && /^[A-Z]/.test(head)) {
    c.nickname = head.replace(/\s+and\s+/i, ' and ');
  }

  return { criteria: c, unparsed: unparsedBits(text, c) };
}

/** Rough report of what the parser did not claim — shown to the user as a hint. */
function unparsedBits(text, c) {
  const missing = [];
  if (!c.city) missing.push('location');
  if (!c.price_min && !c.price_max) missing.push('budget');
  if (!c.beds) missing.push('bedrooms');
  return missing;
}

/** Human summary, echoed back so the parse can be eyeballed in one line. */
export function describe(c) {
  const money = (n) => (n == null ? '?' : n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
    : `$${Math.round(n / 1000)}K`);
  const bits = [];
  if (c.nickname) bits.push(c.nickname);
  if (c.beds) bits.push(`${c.beds}+ bed`);
  if (c.baths) bits.push(`${c.baths}+ bath`);
  if (c.city) bits.push(`in ${c.city}${c.state ? ', ' + c.state : ''}`);
  if (c.price_min || c.price_max) bits.push(`${money(c.price_min)}–${money(c.price_max)}`);
  if (c.financing) bits.push(c.financing.toLowerCase());
  if (c.condition) bits.push(c.condition.toLowerCase());
  return bits.join(', ');
}
