# Pick the perfect list price — the free homeowner pricing tool

One page, one step. The homeowner types a street, the blur lifts, and they see a
sweet spot range built from real recent sales near them, a price they can test,
a map, and the comps. A drawer offers the written home value report and texts
Lauren the request. Spec from ListingLeads (Jimmy), Oct 2026.

## Build it

```
node tools/build-price-tool.mjs lists/in/sold_90503.csv web/price/index.html
```

Input is the MLS "sold" export for the last six months. The script looks for
these columns by name (any order, any case): street address, subdivision or
tract, property sub type, bedrooms, bathrooms, living area, year built, list
price, close price, DOM, close date. Optional: latitude, longitude, photo URL.
Agent and owner columns are never read.

What the page gets: the street name only (house number and unit stripped),
the numbers above, and a map point rounded to three decimals, which is about a
block. Missing coordinates are geocoded with the free US Census geocoder and
cached in `lists/geocache.json`. `--no-geocode` skips that. `--sample` adds a
red banner for layout tests with made-up data; never ship a sample.

Agent block defaults to Lauren; pass `--agent agent.json` to change it.

## How the numbers work

- Comps: same type, within 25% of the size and one bedroom, scored by distance,
  months since sale, size gap and bedroom gap. Up to 12. If fewer than six
  qualify the size and bedroom bands widen.
- Sweet spot: the 25th to 75th percentile of the comps' price per sq ft, times
  the home's sq ft, rounded to $1,000.
- "Your price" defaults to the median $/sq ft times size. The stats under it
  count comps that sold for that or more, how many of those sold under the
  median days and over asking, and the middle days to sell among them.
- Above the sweet spot: a checklist, plus one or two facts computed from the
  comps that sold higher (years newer, sq ft bigger, how many went over asking).
- Removing a comp recomputes everything. "Put them back" restores.

## What it needs from Lauren

An MLS export of closed sales, last six months, for the zip or area the page is
for. One page per area works best (West Torrance, the Riviera, Hermosa). Photo
URLs make the dots and pins real photos; without them the dots are colored discs.

## Rules kept

Real numbers only. Street names only. No agents, no owners. Plain words, no em
dashes. Works on a phone. Footer carries name, brokerage, DRE number and the
Article 16 line.
