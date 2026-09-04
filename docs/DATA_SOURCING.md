# Where the property data actually comes from

The single biggest question in this project. Worth settling before any map code
gets written, because it decides both the cost and the achievable scope.

## He is not building a nationwide property database

A US-wide map of every home with owner names, beds/baths/sq ft, and values is
not something a small team assembles. There are roughly 150 million parcels
across more than 3,000 counties, each with its own assessor, its own file format,
its own refresh schedule, and its own rules about releasing owner names. Keeping
that current is a full-time business in itself.

It is also a business that already exists. Nationwide parcel and owner data is a
commodity that gets **licensed**, not built. That is almost certainly what sits
behind the tool in the recording: a bulk data license, wrapped in a nice map and
a letter generator.

**The map is not the clever part. The workflow is.** The genuinely good idea —
the one worth copying — is pointing outreach at a *real, named buyer* instead of
sending another "thinking of selling?" postcard. That reframing costs nothing to
replicate. The data underneath is a purchase.

## Who sells it

Vendors worth a quote, roughly in order of accessibility:

| Vendor | Notes |
|---|---|
| **Regrid** (formerly Loveland) | Nationwide parcels with owner names; the most accessible tier for small teams. Sells county, state, and national cuts. |
| **Estated** | Property data API, positioned at developers/small business. |
| **ATTOM Data** | Deep nationwide property + AVM. Enterprise-priced. |
| **CoreLogic / Black Knight / First American** | The incumbents. Enterprise contracts, heavy compliance terms. |

**Do not treat any pricing you have heard, including from me, as current.** These
are quote-driven and change; the only reliable number is one they put in writing
for the coverage you ask for. What is safe to say is the shape of it: buying one
county is ordinary small-business money, buying the nation is not.

Two license terms to read carefully before signing anything, because they bite
exactly this use case:

1. **Whether direct-mail marketing is a permitted use.** Some property-data
   licenses explicitly forbid it, or price it separately.
2. **Whether owner names are included.** They are frequently a separate, pricier
   tier — and names are the entire point here, since the letter is personal.

## The scope that actually matters

Here is the thing worth sitting with: **a nationwide map does nothing for this
business.**

The practice is South Bay / Palos Verdes. Every buyer, every letter, every
listing that could come from this lives in **Los Angeles County**. A US-wide
database would be 150 million parcels supporting outreach to a few hundred
homes in one corner of one county.

LA County's parcel data is **public and free**. It carries situs address, use
code, beds, baths, sq ft, lot size, year built, assessed value, and the mailing
address needed to derive the owner/absentee flag. Everything the six columns in
the paid tool display, except owner names — which the Phase 2 plan already sources
from a title rep, at no cost, as part of a relationship that already exists.

So the honest version is:

- **Same tool. Same workflow. Same five outputs. One county of coverage.**
- Cost: $0 in data.
- Covers 100% of the business as it exists today.

If this ever becomes a product sold to agents in other markets, *that* is when a
data license becomes worth paying for — and by then it would be a real expense
against real revenue, not a speculative one. Adding counties later is a data
question, not a rebuild: the map, filters, list, and generator do not change.

## Recommendation

Build for LA County on free public data. Treat nationwide coverage as a
commercial decision for later, not a v1 requirement.

If the goal is genuinely to sell this to other agents rather than to use it, that
is a different project with a different budget, and worth saying out loud now
rather than discovering at the licensing stage.
