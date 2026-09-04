// Fair housing screen. Runs on every generated text before it can be saved.
//
// The rule this enforces: describe the PROPERTY, never the PEOPLE. A letter may
// say a buyer wants four bedrooms and a flat lot. It may not say who the buyer
// is, or who a neighborhood would suit.
//
// Federal (FHA) protected classes: race, color, religion, sex including sexual
// orientation and gender identity, national origin, familial status, disability.
// California (FEHA) adds: marital status, source of income, ancestry, age,
// genetic information, immigration status, primary language, and military or
// veteran status.
//
// This is a drafting aid, not legal advice and not a compliance certification.
// It catches the common phrasings; a human still reads the letter.

const rule = (category, severity, patterns, why) => ({ category, severity, patterns, why });

const RULES = [
  rule('familial status', 'high', [
    /\b(great|perfect|ideal|good)\s+(for|place for)\s+(a\s+)?(famil(y|ies)|kids|children)\b/i,
    /\b(young|growing|new|starter)\s+famil(y|ies)\b/i,
    /\bfamily[- ]friendly\b/i,
    /\b(no|without)\s+(kids|children)\b/i,
    /\b(empty[- ]nester|newlywed|childless)s?\b/i,
    /\bbachelor\s+(pad|apartment)\b/i,
    /\badult\s+(community|living|only)\b/i,
  ], 'Describes the household composition of who should live there.'),

  rule('age', 'high', [
    /\b(retire(d|e|es|ment)|senior|elderly|mature)\s+(buyer|couple|community|living)?\b/i,
    /\byoung\s+(professional|couple|buyer)s?\b/i,
    /\bmillennial|gen[- ]?z|boomer\b/i,
  ], 'References the age of the buyer or intended residents.'),

  rule('religion', 'high', [
    /\b(christian|catholic|jewish|muslim|hindu|buddhist|mormon)\b/i,
    /\bchurch[- ]going\b/i,
    /\bwalking distance to (the )?(church|synagogue|mosque|temple)\b/i,
  ], 'References religion, or proximity to worship as a selling point.'),

  rule('race, color, national origin, ancestry', 'high', [
    /\b(white|black|asian|hispanic|latino|caucasian|african[- ]american)\b/i,
    /\b(ethnic|integrated|diverse|multicultural)\s+(neighborhood|area|community)\b/i,
    /\bexclusive\s+(neighborhood|community|area)\b/i,
    /\b(american|foreign|immigrant)[- ]born\b/i,
    /\bmust speak\b/i,
  ], 'References race, ethnicity, origin, or uses coded exclusivity language.'),

  rule('disability', 'high', [
    /\b(handicap|disabled|wheelchair|able[- ]bodied|healthy)\s*(buyer|person|individual)?s?\b/i,
    /\bno\s+(wheelchairs?|service animals?)\b/i,
    /\bperfect for someone who can\b/i,
  ], 'References physical or mental ability of the buyer or residents.'),

  rule('sex, marital status', 'high', [
    /\b(single|married|divorced|widowed)\s+(man|woman|male|female|buyer|couple|person)\b/i,
    /\b(bachelor|bachelorette|spinster)\b/i,
    /\b(husband|wife) and (wife|husband)\b/i,
  ], 'References sex or marital status of the buyer.'),

  rule('source of income', 'medium', [
    /\bno\s+(section\s*8|vouchers?|housing assistance)\b/i,
    /\b(cash|conventional)\s+buyers?\s+only\b/i,
  ], 'Screens on how the purchase is funded — a protected class in California.'),

  rule('military or veteran status', 'medium', [
    /\b(veterans?|military|active[- ]duty|servicemem?ber)s?\b/i,
  ], 'References military or veteran status — protected in California.'),

  rule('steering', 'high', [
    /\b(safe|safer|good|better|nice|desirable|bad|rough)\s+(neighborhood|area|part of town|schools?)\b/i,
    /\b(right|wrong)\s+(kind|type)\s+of\s+(people|neighbor)/i,
    /\bpeople like you\b/i,
    /\byou'?ll fit (right )?in\b/i,
    /\bthe kind of (people|family|buyer)\b/i,
  ], 'Characterizes a neighborhood or its residents rather than the property.'),
];

// "$X97" and friends — the brief bans this pricing style outright.
const CHARM_PRICE = /\$\s?\d[\d,]*(97|99|95)\b/;

/**
 * Screen a block of generated text.
 * @param {string} text
 * @param {string} [channel] label used in the report, e.g. "letter"
 * @returns {{ok: boolean, flags: Array, channel: string}}
 */
export function screen(text, channel = 'text') {
  const flags = [];
  if (!text) return { ok: true, flags, channel };

  for (const { category, severity, patterns, why } of RULES) {
    for (const pattern of patterns) {
      for (const match of text.matchAll(new RegExp(pattern, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))) {
        flags.push({
          category,
          severity,
          why,
          phrase: match[0].trim(),
          context: excerpt(text, match.index, match[0].length),
        });
      }
    }
  }

  const charm = text.match(CHARM_PRICE);
  if (charm) {
    flags.push({
      category: 'pricing style',
      severity: 'low',
      why: 'Round numbers only — no $X97-style pricing.',
      phrase: charm[0],
      context: excerpt(text, charm.index, charm[0].length),
    });
  }

  return { ok: flags.length === 0, flags, channel };
}

function excerpt(text, at, len, pad = 45) {
  const start = Math.max(0, at - pad);
  const end = Math.min(text.length, at + len + pad);
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '…' : '');
}

/** True when nothing high-severity was found. Medium and low are warnings. */
export const isBlocking = (result) => result.flags.some((f) => f.severity === 'high');

export function report(result) {
  if (result.ok) return `${result.channel}: clean`;
  return [
    `${result.channel}: ${result.flags.length} flag(s)`,
    ...result.flags.map((f) => `  [${f.severity}] ${f.category} — "${f.phrase}"\n      ${f.why}\n      ${f.context}`),
  ].join('\n');
}
