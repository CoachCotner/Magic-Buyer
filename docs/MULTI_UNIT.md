# Expired and cancelled multi-unit — Hermosa, Redondo, Torrance

Source: three CRMLS full exports (Hermosa multi-unit, Redondo multi-unit, income
properties), expired or cancelled, roughly 90–365 days out.

81 rows, **75 unique** after deduping on APN + street. All Residential Income.

- **34 Expired · 41 Cancelled**
- Torrance 37 · Redondo Beach 26 · Hermosa Beach 12
- Unit counts: **47 are 2–4 units**, 19 are 5–10, 5 are 11–20, 1 is 41 units
- 36 sat 90 days or more; 21 sat 180 days or more
- 24 took a price cut before coming off
- 62 of 75 carry gross scheduled income; 24 carry a stated cap rate
- Heaviest single pocket: **21 in area 122, Harbor Gateway**

## The blocker: no street numbers

`StreetNumber` is **empty on all 81 rows**. The export carries street name,
direction, suffix and unit — but not the number. So nothing here is mailable as
it stands.

Two ways out, and the second is better:

1. Re-run the export with `StreetNumber` added to the column template.
2. **Take the APNs to Realist.** 72 of 75 rows have a parcel number. Realist
   turns an APN into the full situs address *and* the owner's name and mailing
   address — which the MLS export does not have at all (`OwnerName` is populated
   on 3 rows, and two of those say "Owner" and "Tenant").

Route 2 is one lookup and it produces a mailable list. Route 1 produces an
address with no owner behind it. The APN list is the deliverable.

## Why this list is different from the single-family expireds

An owner of a fourplex is not an emotional seller. The pitch that works on a
tired single-family expired — "the market moved, let's reset" — is noise here.
What moves an income-property owner is arithmetic.

**Gross rent multiplier** (list price ÷ gross scheduled income) is the fastest
read. Median across the 58 rows that carry income is **17.4**. High GRM means the
asking price was well above what the rents actually support, and that is almost
always why it did not sell.

Worst offenders, all of which sat:

| GRM | Cap | $/unit | Units | DOM | Status | Property |
|---|---|---|---|---|---|---|
| 33.0 | 2.63% | $725K | 2 | 252 | Expired | Redondo, Camino Real |
| 27.6 | 2.36% | $1.24M | 2 | 34 | Cancelled | Hermosa, 15th Place |
| 25.7 | 2.57% | $500K | 5 | 195 | Expired | Redondo, Mathews Ave |
| 25.0 | — | $750K | 2 | 358 | Expired | Torrance, Newton St |
| 21.7 | 3.79% | $575K | 4 | 355 | Expired | Redondo, Curtis Ave |
| 21.2 | 3.05% | $1.80M | 5 | 348 | Expired | Hermosa, The Strand |
| 20.3 | 2.09% | $575K | 3 | 180 | Expired | Redondo, Curtis Ave |

Against the bottom of the range — Torrance W Carson at GRM 10.4 and a 6.2% cap,
W 206th at 10.4 — the spread is more than 2x on the same product type in the
same submarket. That gap is the conversation.

**Two rows have bad data:** both Barbara Street listings (4 units and 7 units)
report gross scheduled income of $5K and $8K against asking prices of $2.9M and
$4.25M, which computes to a GRM over 500. Those are almost certainly monthly
figures entered in an annual field, or a typo. Flag, do not quote.

## The longest sitters

| DOM | Property | Note |
|---|---|---|
| 1,045 | Torrance, Kenwood Ave, 3 units | Nearly three years. Cancelled 12/13/25. |
| 606 | Torrance, W 226th St, 4 units | 6.15% cap and it still expired. |
| 542 | Torrance, W 224th St, 3 units | Cut 13.7% and still did not sell. |
| 375 | Hermosa, Pier Ave | $14.25M, eXp's own listing. |
| 358 | Torrance, Newton St, 2 units | GRM 25, never cut. |
| 355 | Redondo, Curtis Ave, 4 units | Cut 8%, GRM still 21.7. |

## What the letter says

Nothing about the previous agent — Article 15 applies here the same as in
Cannonball. The opening is the number:

> Your building was asking about $X per unit, against gross scheduled rents of
> $Y. That is a gross rent multiplier of Z. The four buildings of this size that
> traded in Harbor Gateway this year went at a multiplier between A and B.

Then one question: is the plan still to sell, or has it turned into a hold? Both
are real answers and either one gives her something to do.

## Contact path

Same as Cannonball, plus one addition: many of these are owned by an LLC or a
trust, so the mailing address in Realist is the manager or the trustee, not a
resident. That is fine — it is the right person to reach — but the salutation
has to handle an entity name, and the letter goes to the mailing address, never
the property.
