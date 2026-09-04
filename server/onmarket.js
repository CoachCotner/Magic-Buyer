// The on-market exclusion list, refreshed from a CRMLS export.
//
// This is not a one-time import. Listings change every week, so the file gets
// replaced regularly and the app re-reads it whenever it changes on disk — no
// restart, no import step.
//
// Which statuses to exclude is a licensing question, not a preference:
//
//   Under an agency agreement — DO NOT CONTACT
//     Active, Active Under Contract, Pending, Backup, Hold, Coming Soon,
//     and Withdrawn. A withdrawn listing is off the market but still listed
//     with the agent, which is exactly the trap worth avoiding.
//
//   Agency ended — fair to contact
//     Expired, Cancelled. These are ordinary listing leads.
//
//   Sold — not excluded here
//     A sale does not create an agency relationship with the new owner. If you
//     want to skip recently sold homes, that is the `years_owned` criterion.

import { existsSync, statSync } from 'node:fs';
import { readCsv } from './csv.js';
import { normalizeAddress } from './filter.js';

/** Statuses that mean the owner is still represented. Lowercased for matching. */
export const UNDER_AGENCY = [
  'active', 'active under contract', 'activeundercontract', 'a', 'auc',
  'pending', 'p', 'backup', 'back up', 'active backup',
  'hold', 'on hold', 'temporarily off market', 'coming soon', 'cs',
  'withdrawn', 'w', 'withdrawn subject to lease',
];

/** Statuses where the agency agreement has ended — safe to contact. */
export const AGENCY_ENDED = ['expired', 'x', 'cancelled', 'canceled', 'c', 'sold', 'closed', 's'];

/** CRMLS exports vary. Accept the common spellings for each field. */
const COLUMN_ALIASES = {
  address: ['address', 'street address', 'full address', 'property address', 'situs address',
            'streetaddressfilter', 'unparsedaddress', 'street_address'],
  zip: ['zip', 'zip code', 'zipcode', 'postal code', 'postalcode', 'zip5'],
  status: ['status', 'standard status', 'standardstatus', 'mls status', 'mlsstatus',
           'listing status', 'l/s', 's'],
};

const pickColumn = (headers, aliases) => {
  const lower = headers.map((h) => String(h).trim().toLowerCase());
  for (const alias of aliases) {
    const i = lower.indexOf(alias);
    if (i >= 0) return headers[i];
  }
  return null;
};

/**
 * Read a CRMLS export into a Set of normalized addresses to exclude.
 * @returns {{addresses:Set<string>, total:number, excluded:number, skipped:number,
 *            updated:Date|null, statusColumn:string|null, unknownStatuses:string[]}}
 */
export function loadOnMarket(file) {
  const empty = { addresses: new Set(), total: 0, excluded: 0, skipped: 0,
                  updated: null, statusColumn: null, unknownStatuses: [] };
  if (!file || !existsSync(file)) return empty;

  const rows = readCsv(file);
  if (!rows.length) return { ...empty, updated: statSync(file).mtime };

  const headers = Object.keys(rows[0]);
  const addressCol = pickColumn(headers, COLUMN_ALIASES.address);
  const zipCol = pickColumn(headers, COLUMN_ALIASES.zip);
  const statusCol = pickColumn(headers, COLUMN_ALIASES.status);

  const addresses = new Set();
  const unknown = new Set();
  let excluded = 0, skipped = 0;

  for (const row of rows) {
    const address = addressCol ? row[addressCol] : null;
    if (!address) { skipped++; continue; }

    if (statusCol) {
      const status = String(row[statusCol] ?? '').trim().toLowerCase();
      if (AGENCY_ENDED.includes(status)) { skipped++; continue; }
      if (!UNDER_AGENCY.includes(status)) {
        // An unrecognized status is excluded — the safe direction — and reported
        // so an unfamiliar CRMLS code can be added rather than silently guessed at.
        if (status) unknown.add(status);
      }
    }
    addresses.add(normalizeAddress(address, zipCol ? row[zipCol] : ''));
    excluded++;
  }

  return {
    addresses, total: rows.length, excluded, skipped,
    updated: statSync(file).mtime, statusColumn: statusCol,
    unknownStatuses: [...unknown].sort(),
  };
}

/** Whole days since the export was last refreshed. */
export const ageInDays = (updated) =>
  updated ? Math.floor((Date.now() - new Date(updated).getTime()) / 86_400_000) : null;

/** A CRMLS export older than this is probably out of date. */
export const STALE_AFTER_DAYS = 7;
