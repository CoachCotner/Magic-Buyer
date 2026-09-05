# The daily lead sheet

A daily email delivers FSBO, expired, NOD and NOT lists as both PDF and **CSV**,
for six Southern California counties (LA, Orange, San Diego, Riverside, San
Bernardino, Ventura). `LA FSBO Expired <date>.csv` is the one that matters here.

It arrives every day. It costs nothing. It removes two vendors from the plan.

## What one day's LA file actually contains

From the 2026-09-04 file — 40 records, 142 columns:

| Field | Coverage |
|---|---|
| Owner name and mailing address | 40/40 |
| APN, days on market, price, sq ft, beds | 40/40 |
| Listing remarks (the original ad copy) | 40/40 |
| Estimated value | 37/40 |
| At least one phone | 39/40 — 202 numbers |
| At least one email | 31/40 |

Statuses were 26 Canceled and 14 Expired — every row a Cannonball target.

### Why this replaces two purchases

- **Realist / title rep** — owner name, mailing address and an owner-occupied
  flag are already here, joined to the property.
- **Skip trace** — the numbers and emails are already appended, and each phone
  carries its own DNC flag.
- **The Prop 13 problem** — an `Estimated Value` column means these rows do not
  need the assessed figure, which understates long-held homes badly. See
  docs/VALUE_PROBLEM.md.

## The DNC flags are the important part

Of 144 distinct numbers in that file, **58 were flagged Do-Not-Call**. Four
records had no clean number at all.

The importer therefore:

- shows each record's **first non-DNC number** as its phone, never a flagged one
- marks a record `DNC` when every number it has is flagged — mail only
- reports both counts on import, so the exposure is visible rather than implied

Calling a flagged number is a per-call liability. Nothing in the tool should ever
make it easy to do by accident.

## Import

`Data → Choose parcel CSV`. The sheet is detected by its own column signature and
read by a dedicated adapter rather than the generic column matcher — the format
is stable and arrives daily, so it is worth handling exactly.

Rows flow both ways: expired and cancelled listings become Cannonball targets,
and the same rows stay in the property list, since an owner whose listing just
expired is a reasonable Magic Buyer match too.
