// Mail merge: one PDF, one page per recipient, plus a label CSV.
//
// The mailing address matters here. An absentee owner does not live at the
// property — mailing the letter to the house sends it to their tenant. Every
// recipient is addressed at their mailing address when one differs.

import PDFDocument from 'pdfkit';
import { toCsvString } from './csv.js';

const MARGIN = 72;           // 1 inch
const LABEL_HEADER = ['name', 'address', 'city_state_zip', 'property_address', 'mail_to'];

/** Where this recipient's letter should actually be posted. */
export function mailingAddress(r) {
  const usesMailing = r.mail_addr && String(r.mail_addr).trim() &&
    String(r.mail_addr).trim().toLowerCase() !== String(r.address).trim().toLowerCase();
  return usesMailing
    ? { line1: r.mail_addr, line2: cityLine(r.mail_city, r.mail_state ?? r.state, r.mail_zip), forwarded: true }
    : { line1: r.address, line2: cityLine(r.city, r.state, r.zip), forwarded: false };
}

const cityLine = (city, state, zip) =>
  [[city, state].filter(Boolean).join(', '), zip].filter(Boolean).join(' ').trim();

/**
 * Personalize the master letter for one recipient.
 * Only the salutation changes — the body is the letter the agent approved.
 */
export function personalize(letter, recipient) {
  const name = String(recipient.owner || '').trim();
  if (!name) return letter;
  return letter.replace(/^Dear Neighbor,/m, `Dear ${name},`);
}

/**
 * @param {object[]} recipients
 * @param {string} letter master letter text
 * @param {object} [opts] {skipDnc: boolean}
 * @returns {Promise<Buffer>}
 */
export function buildPdf(recipients, letter, opts = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: MARGIN, autoFirstPage: false });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const rows = recipients.filter((r) => !(opts.skipDnc && r.dnc));

    for (const r of rows) {
      doc.addPage();
      const to = mailingAddress(r);

      doc.font('Helvetica').fontSize(10.5).fillColor('#444');
      doc.text(r.owner || 'Current Resident');
      doc.text(to.line1);
      if (to.line2) doc.text(to.line2);
      if (to.forwarded) {
        doc.fillColor('#888').fontSize(8.5)
           .text(`re: ${r.address}, ${cityLine(r.city, r.state, r.zip)}`);
      }
      doc.moveDown(2);

      doc.font('Helvetica').fontSize(11).fillColor('#111');
      doc.text(personalize(letter, r), { align: 'left', lineGap: 2.5 });
    }

    if (!rows.length) { doc.addPage().fontSize(12).text('No recipients.'); }
    doc.end();
  });
}

/** Envelope / label CSV — one row per letter, in the same order as the PDF. */
export function buildLabels(recipients, opts = {}) {
  const rows = recipients
    .filter((r) => !(opts.skipDnc && r.dnc))
    .map((r) => {
      const to = mailingAddress(r);
      return {
        name: r.owner || 'Current Resident',
        address: to.line1 || '',
        city_state_zip: to.line2 || '',
        property_address: `${r.address}, ${cityLine(r.city, r.state, r.zip)}`,
        mail_to: to.forwarded ? 'mailing address (absentee)' : 'property',
      };
    });
  return toCsvString(rows, LABEL_HEADER);
}
