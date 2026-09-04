// Field definitions for the whole tool. One source of truth: the recipient CSV
// header, the table UI, and the skip-trace round trip all read from here, so a
// column cannot drift between them.

/**
 * Recipient list columns.
 *
 * The first six mirror the paid tool's list exactly (see
 * docs/SCREENSHOT_FINDINGS.md). `dnc` and `status` do not exist there — they
 * are ours: nobody dials a number that has not been scrubbed, and without
 * status there is no follow-up cadence.
 */
export const RECIPIENT_FIELDS = [
  { key: 'apn',        label: 'APN',        source: 'parcel',     export: true  },
  { key: 'address',    label: 'Address',    source: 'parcel',     export: true  },
  { key: 'city',       label: 'City',       source: 'parcel',     export: true  },
  { key: 'state',      label: 'State',      source: 'parcel',     export: true  },
  { key: 'zip',        label: 'ZIP',        source: 'parcel',     export: true  },
  { key: 'owner',      label: 'Owner',      source: 'title',      export: true  },
  { key: 'phone',      label: 'Phone',      source: 'skiptrace',  export: false },
  { key: 'email',      label: 'Email',      source: 'skiptrace',  export: false },
  { key: 'value',      label: 'Value',      source: 'parcel',     export: true  },
  { key: 'type',       label: 'Type',       source: 'derived',    export: true  },
  { key: 'dnc',        label: 'DNC',        source: 'skiptrace',  export: false },
  { key: 'status',     label: 'Status',     source: 'campaign',   export: false },
  { key: 'mail_addr',  label: 'Mailing address', source: 'parcel', export: true },
  { key: 'beds',       label: 'Beds',       source: 'parcel',     export: true  },
  { key: 'baths',      label: 'Baths',      source: 'parcel',     export: true  },
  { key: 'sqft',       label: 'Sq ft',      source: 'parcel',     export: true  },
  { key: 'lot_sqft',   label: 'Lot sq ft',  source: 'parcel',     export: true  },
  { key: 'year_built', label: 'Year built', source: 'parcel',     export: true  },
  { key: 'lat',        label: 'Latitude',   source: 'parcel',     export: true  },
  { key: 'lon',        label: 'Longitude',  source: 'parcel',     export: true  },
];

/** The six columns the list actually shows, in the paid tool's order. */
export const LIST_COLUMNS = ['address', 'owner', 'phone', 'email', 'value', 'type'];

/** Occupancy, derived by comparing mailing address to situs address. */
export const OWNER_TYPES = ['Owner', 'Absentee'];

/**
 * Campaign status. Ordered as a funnel — a recipient only moves forward, which
 * is what makes "43 responded of 68 mailed" meaningful.
 */
export const STATUS_VALUES = ['new', 'sent', 'responded', 'appointment', 'dead'];

/**
 * Buyer profile. These feed the generator, and only these — see
 * server/fairhousing.js for why the list contains nothing about who the buyer
 * is, only what they want to buy.
 */
export const BUYER_FIELDS = [
  { key: 'nickname',      label: 'Buyer nickname',        type: 'text',
    help: 'How you refer to them in the letter. No surnames.' },
  { key: 'budget_min',    label: 'Budget from',           type: 'money' },
  { key: 'budget_max',    label: 'Budget to',             type: 'money' },
  { key: 'timeline',      label: 'Timeline / close flexibility', type: 'text',
    help: 'e.g. "can close in 21 days, or wait until summer"' },
  { key: 'condition',     label: 'Condition tolerance',   type: 'text',
    help: 'e.g. "will take a fixer" or "wants turnkey"' },
  { key: 'neighborhoods', label: 'Target neighborhoods',  type: 'text' },
  { key: 'why_area',      label: 'Why this area',         type: 'textarea',
    help: 'Property and location reasons only — schools, commute, lot size.' },
  { key: 'toured',        label: 'Toured and passed on',  type: 'textarea',
    help: 'Shows the letter reader this buyer is real and active.' },
  { key: 'agent_cell',    label: 'Your cell',             type: 'text' },
];

/**
 * The four outputs. Letter is the master; the rest derive from it.
 *
 * Social post was cut. It is greyed out as "Coming soon" in the paid tool, so
 * there was nothing to replicate, and it is the one channel that reaches
 * nobody in particular — the whole point here is reaching a named homeowner.
 */
export const CHANNELS = [
  { key: 'letter', label: 'Letter',      descriptor: 'Direct mail',        master: true },
  { key: 'email',  label: 'Email',       descriptor: 'Cold outreach' },
  { key: 'text',   label: 'Text',        descriptor: 'SMS to past clients' },
  { key: 'call',   label: 'Call script', descriptor: 'Phone talk track' },
];

export const recipientHeader = () => RECIPIENT_FIELDS.map((f) => f.key);

/** Columns sent out to a batch skip-trace service — never the ones it fills in. */
export const skipTraceExportHeader = () =>
  RECIPIENT_FIELDS.filter((f) => f.export).map((f) => f.key);
