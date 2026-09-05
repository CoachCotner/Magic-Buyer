# Reverse mortgages: how to spot one, and why the LTV column lies

## The fingerprint

A HECM deed of trust is recorded at **150% of the FHA maximum claim amount**, not
at the borrower's balance. So the loan figure on a foreclosure lead sheet is a
statutory artifact, and dividing it by 1.5 lands exactly on the FHA lending limit
for the year the loan was originated.

Three filings in the September pull, checked against the published limits:

| Property | Recorded loan | ÷ 1.5 | FHA HECM limit | Origination year |
|---|---|---|---|---|
| Pasadena | $1,724,737 | $1,149,825 | $1,149,825 | 2024 |
| **2414 Alvord Ln, Redondo** | $1,019,475 | $679,650 | $679,650 | 2018 |
| **1205 11th St, Hermosa** | $1,456,200 | $970,800 | $970,800 | 2022 |

Three for three, to the dollar. That is not coincidence — it is the rule.

FHA HECM limits: 2018 $679,650 · 2019 $726,525 · 2020 $765,600 · 2021 $822,375 ·
2022 $970,800 · 2023 $1,089,300 · 2024 $1,149,825 · 2025 $1,209,750.

**This matters because the Hermosa filing does not name a reverse lender.** The
beneficiary is "PHH Mortgage Corporation," which services both forward and
reverse loans. Nothing in the row says HECM. The 1.5× arithmetic is what says it.

## What the LTV column does with these

Nothing useful. Alvord came through at LTV 999.99, Hermosa at 448%. Both are the
recorded 150%-of-max-claim figure divided by a Prop 13 assessed value that is
decades stale. The number is meaningless in both directions and should be
suppressed, not displayed.

**Rule for the app:** when `loan_amt ÷ 1.5` matches an FHA HECM limit within a
few hundred dollars, tag the row `reverse mortgage`, suppress LTV, and change the
letter. Do not compute equity from these fields at all.

## Why the situation is different

A forward mortgage defaults when someone stops paying. A HECM defaults when the
borrower **dies, moves out, or lets taxes or insurance lapse**. The person who
has to act is usually a successor trustee or an heir, often out of the area, and
often on a deadline set by the servicer rather than by a foreclosure calendar.

They are not a homeowner in trouble. They are a family settling an estate. The
letter is a different letter, and urgency language is worse here than anywhere.

## The case that proves it: 2414 Alvord Ln

Pulled from First American IgniteRE — transaction history plus two recorded
documents.

| Date | Event |
|---|---|
| 07/06/2018 | HECM recorded, Finance of America Reverse, $1,019,475 face (= $679,650 max claim), 4.62% adjustable |
| 11/26/2024 | Janice Ann Davis deeds to the Janice Ann Siler Revocable Living Trust |
| 05/28/2026 | Assignment |
| **08/17/2026** | **Notice of Default recorded** (2026.612273) |
| 08/19/2026 | Affidavit — Death of Trustee. Cybil Armstrong-Cutright, successor trustee, of Copperopolis CA |
| **08/19/2026** | **Sold to MABA Development LLC for $1,050,000**, full value, Upward Title (2026.622737) |
| 08/25–26/2026 | **Substitution of Trustee and Deed of Reconveyance** — loan paid off, lien released (2026.637964) |

The default and the sale are **two days apart**. Escrow was already open when the
servicer recorded; the NOD was housekeeping on a dead borrower's loan, not a
distress event.

**And the lead sheets still list it.** Both the 09/01 and the 09/04 pulls carry
2414 Alvord as a live NOD, seventeen days after it sold and nine days after the
lien was reconveyed. The vendor does not rule out cured or sold filings.

## What this forces us to build

Cannonball already answers "what has happened since" for expired listings by
subtracting anything that came back as sold, leased, pending or active. **The
foreclosure list needs the same pass, and the MLS cannot provide it** — Alvord
sold off-market to an LLC and never touched the MLS. Only the recorder saw it.

Signals that a filing is dead, in recorder terms:

| Recorded after the NOD | Means |
|---|---|
| Deed of Reconveyance / Substitution of Trustee and Deed of Reconveyance | Loan paid off — filing is over |
| Rescission of Notice of Default | Cured |
| Deed Transfer with a full-value sale price | Sold |
| Trustee's Deed Upon Sale | Went to auction; bank or a third party owns it |
| Notice of Trustee Sale | Still alive, escalated to the next stage |

Source for this: **First American IgniteRE** (ignitere.firstam.com), which Lauren
already has through her title rep. Per-property, not bulk — but the South Bay
list is nine names, so nine pulls covers it. Ask the title rep whether they will
run the batch.

## Postscript: the buyer is the lead now

MABA Development LLC paid $1,050,000 for a 2-bed, 800 sq ft house in 90278. That
is lot value. They will scrape it or add to it and relist. That is a real listing
opportunity — but the conversation is with a developer about a rebuild, not with
a homeowner about a sale.
