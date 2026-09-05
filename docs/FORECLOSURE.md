# Foreclosure (NOD / NOT) — what the September files actually contain

Source: eight lead-sheet CSVs, LA County, filings dated 08/25, 08/27, 09/01 and
09/04/2026. Deduped on `(APN, document_number)` because the dates overlap heavily
— the eight files hold 283 distinct filings, not eight files' worth.

## Totals

- **283 unique filings** — 203 Notices of Default, 80 Notices of Trustee Sale
- LA County by property type:

  | Count | Type |
  |---|---|
  | 248 | Residential, 1 unit |
  | 14 | Commercial |
  | 9 | Multi-unit (2) |
  | 5 | Multi-unit (3) |
  | 3 | Industrial |
  | 2 | Multi-unit (4) |
  | 1 | Multi-unit (5) |
  | 1 | Land / agricultural |

## South Bay — 13 of 283

Carson 4 · Redondo Beach 2 · Rancho Palos Verdes 2 · Torrance 2 · Hawthorne 1 ·
Hermosa Beach 1 · San Pedro 1. Twelve residential, one commercial.

Twelve days of filings added only two South Bay names. That is the real rate:
about one a week across the whole peninsula and beach cities. It is a slow list,
which is an argument for running it standing rather than in bursts.

| Kind | City | Address | LTV | Default | Loan | Auction |
|---|---|---|---|---|---|---|
| NOT | Carson | 23245 S Main St (commercial) | 34% | $33,029 | $612,250 | 09/16/26 |
| NOD | Carson | 7 Tomahawk Ln | 6% | $4,612 | HOA lien | — |
| NOD | Carson | 4 Union Hill Ln | 2% | $6,483 | HOA lien | — |
| NOT | Carson | 19614 Campaign Dr | 54% | $27,098 | $457,000 | 10/02/26 |
| NOD | Hawthorne | 14405 Cerise Ave #37 | 3% | $8,964 | HOA lien | — |
| NOD | Hermosa Beach | 1205 11th St | **448%** | $208,023 | $1,456,200 | — |
| NOD | Rancho Palos Verdes | 4255 Exultant Dr | 125% | $64,612 | $1,326,000 | — |
| NOD | Rancho Palos Verdes | 26622 Whitehorn Dr | 72% | $47,856 | $1,170,000 | — |
| NOD | Redondo Beach | 108 N Pacific Coast Hwy | 5% | — | $4,881 | — |
| NOD | Redondo Beach | 2414 Alvord Ln | — | $177,079 | $1,019,475 | — |
| NOT | San Pedro | 1760 El Rey Rd | 73% | $222,911 | $686,000 | 09/17/26 |
| NOD | Torrance | 23030 Kathryn Ave | 36% | $74,262 | $772,500 | — |
| NOT | Torrance | 23310 Audrey Ave | 80% | $36,164 | $702,000 | 09/28/26 |

## How to read these

**LTV is the whole story.** It is loan against assessed value, and Prop 13 makes
assessed value understate a long-held house badly — so a low LTV here almost
always means real equity, and a high one may or may not.

- **Low LTV, small default (Carson x2, Hawthorne, Redondo Beach)** — these are
  HOA liens, not mortgages. Four figures against a house worth six or seven.
  Nobody loses this house; it is a bookkeeping problem. A letter that treats it
  as a crisis is wrong and will read as predatory.
- **Middle LTV (Carson Campaign, Torrance Kathryn, RPV Whitehorn, San Pedro)** —
  real mortgage defaults on houses that almost certainly carry equity above the
  loan. These are the ones where selling is genuinely an option and where a
  letter about options is honest.
- **High LTV (Hermosa 11th St at 448%, RPV Exultant at 125%)** — assessed value
  is stale, so this may still be fine, but it may also be a short sale. Do not
  promise anything here.

**Redondo, 2414 Alvord Ln, is its own category.** The beneficiary is Finance of
America *Reverse* — a HECM. A reverse mortgage goes into default when the
borrower dies, moves out, or stops paying taxes and insurance, not when they miss
a payment. The person who has to act is usually an heir, not the borrower, and
heirs of a paid-off Redondo house with a $1.02M accrued balance almost always
need to sell. The letter for that one is written to a family settling an estate,
not to a homeowner in trouble.

**The NOTs with auction dates are the only ones with a clock.** Carson Main St
sells 09/16/26, San Pedro 09/17/26, Torrance Audrey Ave 09/28/26. By the time
mail arrives the first two are essentially over; Audrey Ave has about three
weeks.

## Rules before any of this goes in the mail

1. **Ask the broker first.** California Civil Code §2945 (foreclosure
   consultants) and §1695 (equity purchasers) govern who may contact a homeowner
   in default and what has to be disclosed. eXp will have a policy. Get it in
   writing before the first envelope.
2. **Never imply the letter can stop the foreclosure.** It cannot.
3. **No urgency language, no "we buy houses," no cash-offer framing.** The guard
   in the app blocks these.
4. **Options, not opportunity.** The homeowner has several: reinstate, refinance,
   sell with equity, short sale, loan modification, do nothing. The letter names
   them and says which ones an agent can help with.

## Where the letter sends them

`getyourhomeoptions.com` already exists and already has a Netlify form named
`foreclosure-leads` with these fields: first/last name, phone, email, address,
whether they live there, a situation checklist (behind on payments, got a
notice, auction date set, tax issue, inherited, not sure), a
`received_letter` radio, and a **`vip_code`** text field.

That `vip_code` field is the join. Give each mailed letter a code, print it on
the letter, and the form submission comes back identifiable — which property,
which mailing, which week. That turns the mail from a hope into a measured
campaign. The foreclosure mode should generate the codes and the export should
carry `vip_code` as a column.

## Coverage

Two dates in one month is a thin slice. NODs run about 90 to 120 days ahead of a
trustee sale, so the useful window is filings from roughly three months back.
Older lead sheets are worth loading — the same dedupe key handles them, and the
interesting question is which NODs from June and July have *not* since sold or
cured.
