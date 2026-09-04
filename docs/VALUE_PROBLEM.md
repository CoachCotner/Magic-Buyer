# Assessed value is the wrong number to filter on in California

Raised by Lauren asking whether Zillow could supply the data. The instinct behind
the question is correct, and it exposes a flaw in the Phase 2 plan.

## The problem

Phase 2 filters parcels on **assessed value** from the LA County Assessor. In
California, Proposition 13 makes that number nearly useless as a proxy for what a
home is worth.

Under Prop 13, a property's assessed value is its purchase price, rising a maximum
of 2% a year, and it is only reset when the property changes hands. So:

| Bought | Paid | Assessed today (approx) | Actually worth |
|---|---|---|---|
| 2023 | $2.3M | ~$2.4M | ~$2.4M ✓ |
| 2005 | $1.1M | ~$1.6M | ~$2.4M ✗ |
| 1990 | $450K | ~$800K | ~$2.4M ✗✗ |

Three homes on the same street, worth the same money, with assessed values three
times apart.

## Why this breaks the tool specifically

Filtering on assessed value for a buyer at $2M–$2.4M returns mostly homes bought
**recently** — and silently drops every long-held home on the street.

That is exactly backwards. The long-held owner is the better prospect by a wide
margin: decades of equity, a house that may no longer fit, and no mortgage
holding them in place. The recent buyer is the least likely person on the block
to sell.

**So the current value filter selects against the best targets.** Worse, it does
it invisibly — the count still looks reasonable, so nothing appears wrong.

This also interacts with the `years_owned` filter. Setting "owned 10+ years" and
a $2M–$2.4M value range are close to contradictory under Prop 13: the first asks
for long-held homes, the second excludes them.

## Why Zillow is not the fix

A Zestimate is a market value, which is the right *kind* of number. But:

- **No legal bulk access.** The public API is retired; scraping breaks their terms
  and is actively blocked.
- **No owner names, ever.** The letter is addressed to a person. Zillow does not
  have that field at all, so it cannot replace the county data regardless.
- **Withdrawn listings are invisible** (see docs/DATA_SOURCING.md).

Right instinct, wrong source.

## The fix: build a value estimate from sold comps

Lauren has CRMLS access. Sold data is legitimately hers, and it is the same data
every AVM is built on.

Approach:

1. Export **sold** listings for the target cities, last 12–18 months, with
   `sold price`, `sqft`, `beds`, `year built`, `city`, `zip`.
2. Compute a **$/sqft figure per city, or per ZIP where there is enough volume**,
   using the median rather than the mean so one estate does not drag it.
3. Estimate each parcel: `sqft × $/sqft`, adjusted for lot size and age if the
   comps support it. Store it as `est_value` next to `value`.
4. **Filter on `est_value`, show both.** The list displays the estimate, with the
   assessed value available for reference — the gap between them is itself a
   signal about how long someone has owned.

This is free, uses data she already has, is legally clean, and is more accurate
for this purpose than an assessed value in a Prop 13 state.

### Caveats to keep honest

- A $/sqft median is a blunt instrument. It will be wrong on view lots, on
  waterfront, on the top and bottom of a market, and anywhere the housing stock
  is mixed. Palos Verdes in particular has enormous view premiums.
- It should be **labelled an estimate** in the UI, never presented as a value.
- It is for *filtering*, not for telling a homeowner what their home is worth.
  The letter never quotes a number, which is the right design and now also the
  safe one.

## Status

Not yet built. Needs Lauren's sold-comp export to calibrate. Until then the tool
filters on assessed value, which is **known to be wrong for long-held homes** —
worth remembering before reading anything into a list generated today.
