// The generator. One buyer profile in, four pieces of outreach out.
//
// The letter is the master; email, text and call script derive from it, which is
// why they all sound like the same agent wrote them in one sitting.
//
// Two modes:
//   - Claude API when a key is available (ANTHROPIC_API_KEY, or an `ant auth
//     login` profile — the SDK resolves either).
//   - Templates otherwise, so the tool is usable offline and on day one.
// Both paths go through the same fair housing screen before anything is saved.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { screen, isBlocking, report } from './fairhousing.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_FILE = join(ROOT, 'magic_buyer_letter_master.md');

/**
 * The voice. Everything above the first `---` in magic_buyer_letter_master.md is
 * the letter Lauren approved; the notes below it are for her, not the model.
 * Re-read on each call so edits take effect without a restart.
 */
export function loadMaster() {
  if (!existsSync(MASTER_FILE)) return null;
  const text = readFileSync(MASTER_FILE, 'utf8');
  const body = text.split(/^---$/m)[0];
  // Drop the leading "# Master letter" heading and its explanatory preamble.
  const start = body.search(/^Dear /m);
  return {
    letter: (start >= 0 ? body.slice(start) : body).trim(),
    updated: statSync(MASTER_FILE).mtime,
  };
}

const MODEL = 'claude-opus-5';

/** Round money the way the brief demands — never $X97. */
export function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `$${(Math.round(m * 10) / 10).toString().replace(/\.0$/, '')}M`;
  }
  return `$${Math.round(v / 1000)}K`;
}

const range = (lo, hi) =>
  lo && hi ? `${money(lo)} and ${money(hi)}` : hi ? `up to ${money(hi)}` : lo ? `${money(lo)} and up` : '';

const place = (b) => [b.city, b.state].filter(Boolean).join(', ');

/** Reads correctly after "Their budget is …". */
const budgetPhrase = (b) => {
  if (b.budget_min && b.budget_max) return `between ${money(b.budget_min)} and ${money(b.budget_max)}`;
  if (b.budget_max) return `up to ${money(b.budget_max)}`;
  if (b.budget_min) return `${money(b.budget_min)} and up`;
  return 'flexible';
};

/**
 * The three bullets, in the order the source tool uses them:
 * readiness → condition tolerance → motivation.
 */
function bullets(b) {
  const out = [];
  out.push(readinessLine(b));
  if (b.condition) out.push(conditionLine(b.condition));
  out.push(motivationLine(b));
  return out.filter(Boolean).slice(0, 3);
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Financing plus closing flexibility, joined so it reads like a sentence. */
function readinessLine(b) {
  const financing = b.financing === 'Cash buyer' ? 'An all-cash buyer'
    : b.financing === 'Pre-approved' ? 'Pre-approved'
    : b.financing ? `Approved for ${b.financing} financing` : 'Pre-approved';
  const timing = {
    'Flexible': 'flexible on timing',
    'Quick close (21 days)': 'able to close in about three weeks',
    '30 days': 'able to close in about thirty days',
    'No rush': 'in no particular hurry',
    'Open to rent-back': 'happy to offer a rent-back if you need time to move',
  }[b.closing];
  return timing ? `${financing} and ${timing}` : `${financing} and ready to move`;
}

function conditionLine(condition) {
  switch (condition) {
    case 'Major renos OK':      return 'Open to a home that needs real work';
    case 'As-is / no repairs':  return 'Happy to buy as-is, with no repairs asked for';
    case 'Move-in ready only':  return 'Looking for something already in good shape';
    case 'Minor updates OK':    return 'Open to a home that needs minor updates';
    default:                    return null;
  }
}

function motivationLine(b) {
  if (b.toured) return `Has already toured homes in the area and has not found the right one yet`;
  return 'Knows what they want and can move quickly when the right home comes up';
}

// ---------------------------------------------------------------- templates

/** Fill {placeholders} in the master letter. Unknown ones are dropped cleanly. */
export function fillMaster(master, b) {
  const three = bullets(b);
  const values = {
    owner_name: 'Neighbor',            // the mail merge replaces this per recipient
    city: place(b) || 'the neighborhood',
    buyer_nickname: b.nickname || 'a client of mine',
    readiness: three[0] || '',
    condition_tolerance: three[1] || '',
    motivation: three[2] || three[1] || '',
    budget_range: budgetPhrase(b),
    why_area: (b.why_area || '').trim(),
    agent_cell: b.agent_cell || '[your cell]',
    agent_name: b.agent_name || 'Lauren Cotner',
    agent_brokerage: b.agent_brokerage || 'eXp Realty',
    agent_dre: b.agent_dre || '01242185',
  };
  let out = master.replace(/\{(\w+)\}/g, (m, key) => (key in values ? values[key] : m));
  // A dropped bullet must not leave a stray "  • " line behind.
  out = out.replace(/^\s*[•-]\s*$/gm, '').replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function letterTemplate(b) {
  const where = place(b) || 'the neighborhood';
  const budget = range(b.budget_min, b.budget_max);
  const lines = [];

  lines.push(`Dear Neighbor,`, '');
  lines.push(
    `I am a real estate agent here in ${where}, and I am writing about one specific buyer I am working with — ${b.nickname || 'a client of mine'}.`,
    '',
  );
  lines.push(`Here is what they are looking for:`, '');
  for (const bullet of bullets(b)) lines.push(`  • ${bullet}`);
  if (budget) lines.push(`  • Budget ${budget.startsWith('up to') || budget.startsWith('$') && !budget.includes(' and ') ? budget : 'between ' + budget}`);
  lines.push('');

  if (b.why_area) lines.push(`${b.why_area.trim()}`, '');
  if (b.toured) lines.push(`${b.toured.trim()}`, '');

  lines.push(
    `Your home fits what they are looking for. I am not asking you to list it, and this is not a mass mailing — I am asking one question: if you have ever thought about selling, would you be open to a short conversation?`,
    '',
  );
  lines.push(
    `If the timing is wrong, I understand completely, and you will not hear from me again about it.`,
    '',
  );
  lines.push(`You can reach me directly at ${b.agent_cell || '[your cell]'}.`, '');
  lines.push(`Sincerely,`, b.agent_name || 'Lauren Cotner', b.agent_brokerage || 'eXp Realty', `DRE #${b.agent_dre || '01242185'}`);

  return lines.join('\n');
}

function emailTemplate(b) {
  const where = place(b) || 'the area';
  const budget = range(b.budget_min, b.budget_max);
  const lines = [];

  lines.push(`I just got off the phone with my clients who are looking for a home in ${where}${budget ? `, anywhere between ${budget}` : ''}.`, '');
  lines.push(`Here's who they are and what they're looking for:`, '');
  lines.push(b.nickname || 'My buyers', '');
  for (const bullet of bullets(b)) lines.push(`- ${bullet}`);
  lines.push('');
  lines.push(
    `If you know anyone in ${b.city || where} who might be thinking about putting their house on the market, please forward this email to them. They can contact me directly at ${b.agent_cell || '[your cell]'}.`,
    '',
  );
  lines.push(`I appreciate your help,`, b.agent_name || 'Lauren Cotner');

  return { subject: `Buyer looking in ${where} — know anyone?`, body: lines.join('\n') };
}

function textTemplate(b) {
  const where = b.city || place(b) || 'the area';
  const budget = range(b.budget_min, b.budget_max);
  return `Hi — quick one. I'm working with ${b.nickname || 'a buyer'} looking in ${where}${budget ? ` ${budget.startsWith('up to') ? budget : 'between ' + budget}` : ''}. ` +
    `They're ${(b.financing || 'pre-approved').toLowerCase()} and ready to go. ` +
    `Do you know anyone there who's thought about selling? Even a maybe helps. — ${b.agent_name || 'Lauren'}`;
}

function callTemplate(b) {
  const where = place(b) || 'the area';
  const budget = range(b.budget_min, b.budget_max);
  return [
    `OPENING`,
    `"Hi, is this [name]? This is ${b.agent_name || 'Lauren Cotner'} — I'm a real estate agent here in ${where}. I sent you a letter last week about a buyer I'm working with. Do you have thirty seconds?"`,
    ``,
    `IF YES — THE BUYER`,
    `"I'm working with ${b.nickname || 'a buyer'}. They're ${(b.financing || 'pre-approved').toLowerCase()}${budget ? `, ${budget.startsWith('up to') ? 'budget ' + budget : 'between ' + budget}` : ''}, and ${(b.closing || 'flexible').toLowerCase()} on timing. Your home is the kind of home they're looking for."`,
    ``,
    `THE ASK`,
    `"I'm not asking you to list your house. I'm asking whether you'd be open to hearing what they'd pay for it."`,
    ``,
    `IF NOT SELLING`,
    `"Completely understood — thanks for taking the call. If anything changes, my number is ${b.agent_cell || '[your cell]'}."`,
    `→ Mark status: dead. Do not call again for this buyer.`,
    ``,
    `IF MAYBE`,
    `"Would it help if I put together what your home would likely sell for right now? No obligation, no listing conversation."`,
    `→ Mark status: responded. Follow up within 48 hours.`,
    ``,
    `IF THEY ASK "HOW DID YOU GET MY NUMBER?"`,
    `"Public property records. If you'd rather I didn't call again, just say so and I'll take you off my list."`,
    `→ If they ask to be removed, mark DNC and honor it.`,
  ].join('\n');
}

// ---------------------------------------------------------------- Claude path

const SYSTEM = `You write direct-mail and outreach copy for a California real estate agent.

VOICE: warm, direct, plain. No hype, no exclamation marks, no "I have a buyer for
your home!" energy. Write the way a competent neighbor writes. Short sentences.

HARD RULES:
- Describe the PROPERTY and the BUYER'S SITUATION only. Never describe who the
  buyer is in terms of family, age, religion, race, national origin, disability,
  marital status, or immigration status. Never say who a neighborhood suits.
- Round numbers only. Write $900K or $1.2M. Never $899,997 or similar.
- Never promise a price, a sale, or a timeline.
- Never imply the recipient must sell, or that this is their last chance.
- The letter must make one small ask: a short conversation.

Return ONLY the requested piece. No preamble, no explanation.`;

async function callClaude(prompt, { maxTokens = 2000 } = {}) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') throw new Error('Model declined to generate this text.');
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function buyerBrief(b) {
  const rows = [
    ['Buyer nickname', b.nickname],
    ['Area', place(b)],
    ['Budget', range(b.budget_min, b.budget_max)],
    ['Beds / baths', [b.beds && `${b.beds}+ bed`, b.baths && `${b.baths}+ bath`].filter(Boolean).join(', ')],
    ['Financing', b.financing],
    ['Closing flexibility', b.closing],
    ['Condition tolerance', b.condition],
    ['Why this area', b.why_area],
    ['Toured and passed on', b.toured],
    ['Agent', [b.agent_name, b.agent_brokerage, b.agent_cell].filter(Boolean).join(' · ')],
  ];
  return rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
}

/**
 * Generate all four channels. Letter first; the rest are told to derive from it.
 * @returns {Promise<{channels: object, flags: object, mode: string}>}
 */
export async function generateAll(buyer, { force = false } = {}) {
  const useApi = hasApiKey() && !force;
  const brief = buyerBrief(buyer);

  let letter, email, text, call;

  const master = loadMaster();

  if (useApi) {
    letter = await callClaude(
      (master
        ? `Here is the agent's own master letter. Match its voice, structure and length closely — this is how she writes.\n\n---\n${master.letter}\n---\n\n`
        : '') +
      `Write a one-page letter from the agent to a homeowner whose house matches this buyer.\n\n${brief}\n\n` +
      `The homeowner has not listed their home. Make one small ask: a short conversation. Sign off with the agent's name, brokerage and DRE number.`,
      { maxTokens: 1600 },
    );
    const derive = (what, extra) => callClaude(
      `Here is the master letter:\n\n---\n${letter}\n---\n\nBuyer details:\n${brief}\n\n${what}\n${extra || ''}`,
      { maxTokens: 1200 },
    );
    [email, text, call] = await Promise.all([
      derive(
        `Write an EMAIL to the agent's own sphere — past clients and neighbors, NOT the homeowners. Ask them to forward it to anyone thinking of selling.`,
        `Structure exactly: one-line opener naming the area and budget; "Here's who they are and what they're looking for:"; the buyer nickname; exactly three bullets (readiness, condition tolerance, motivation); the forward ask with the agent's phone; "I appreciate your help," and the name. Start your reply with "Subject: " on the first line.`,
      ),
      derive(`Write a SHORT text message to past clients asking if they know anyone in the area thinking of selling. Under 320 characters. No links.`),
      derive(`Write a PHONE CALL SCRIPT for calling a homeowner who received the letter.`,
        `Include labelled sections: OPENING, IF YES, THE ASK, IF NOT SELLING, IF MAYBE, and a response to "how did you get my number?" that offers to remove them from the list.`),
    ]);
    const m = email.match(/^Subject:\s*(.+)\n+([\s\S]+)$/);
    email = m ? { subject: m[1].trim(), body: m[2].trim() } : { subject: `Buyer looking in ${place(buyer)} — know anyone?`, body: email };
  } else {
    letter = master ? fillMaster(master.letter, buyer) : letterTemplate(buyer);
    email = emailTemplate(buyer);
    text = textTemplate(buyer);
    call = callTemplate(buyer);
  }

  const channels = { letter, email, text, call };

  // Screen everything — both paths. Nothing is saved before this runs.
  const flags = {
    letter: screen(letter, 'letter'),
    email: screen(`${email.subject}\n${email.body}`, 'email'),
    text: screen(text, 'text'),
    call: screen(call, 'call script'),
  };
  // The free-text buyer note is screened too — it is what feeds the generator.
  if (buyer.why_area || buyer.toured || buyer.notes) {
    flags.buyer_notes = screen([buyer.why_area, buyer.toured, buyer.notes].filter(Boolean).join('\n'), 'buyer notes');
  }

  return {
    channels,
    flags,
    blocked: Object.values(flags).some(isBlocking),
    mode: useApi ? 'claude' : 'template',
  };
}

export { letterTemplate, emailTemplate, textTemplate, callTemplate, report };
