# Phase 1 — findings from the recipient-list screenshot

Source: a still captured during the ListingLeads webinar (presenter: Jimmy Mackin),
Mac menu bar reads Thu Sep 3, 12:12 PM. Delivered as an image, not a file.

Observations are split from inferences on purpose. Anything marked INFERRED needs
confirming against the recording before it drives a build decision.

> Note: the screenshot shows real homeowner names, phone numbers, and emails from
> the presenter's demo data (Auburn, NH). Those are other people's personal details,
> so they are described structurally here and deliberately not transcribed into
> this repo.

---

## 1. Where the tool lives

URL bar: `magic-buyer-letter.listingleads.com/new`

The `/new` path with a **"New Buyer"** button beside a **"Buyers"** tab means the
unit of work is one buyer, and the tool holds many of them. This matches the
concept exactly: one buyer in, a recipient list and outreach out.

Account badge reads **"Creator Plan"** — a paid tier.

## 2. Magic Buyer is one tool among several

The far-left rail lists sibling products, Magic Buyer highlighted as active:

- ZMA
- **Magic Buyer** ← active
- Cannon Ball
- Deal of the Week
- Client Reviews
- Market Update

Only Magic Buyer is in scope.

## 3. The five channels — and one that does not exist yet

A CHANNELS panel runs down the left of the workspace. Each has a label, a
one-line descriptor, and a status dot:

| Channel | Descriptor | State |
|---|---|---|
| Recipients | Addresses + contacts | active (dot) |
| Letter | Direct mail | active (dot) |
| Email | Cold outreach | active (dot) |
| Text | SMS message | active (dot) |
| Call script | Phone talk track | active (dot) |
| Social post | **Coming soon** | greyed out, disabled |

**This matters.** The brief asks for five generated outputs including a
Nextdoor/Facebook post. In the paid tool that fifth one **is not built** — it is
an unshipped placeholder. So the social post is not a feature to replicate; it
is net-new. Worth deciding whether it earns its place in v1.

Note also that "Recipients" sits inside the same channel list as the outputs —
the list is treated as one step in a single flow, not a separate screen.

## 4. The recipient list

Header: **"Recipients 68"**, subtitle **"49 with phone · 43 with email"**.

Two things fall out of that:

- **List size in the live demo was 68**, not the 100–150 in the brief. Either the
  demo used a smaller area, or the real-world number lands lower than the pitch.
  Flag for the recording — it changes mail volume and cost per buyer.
- **Contact-fill rates are shown on the list itself:** 49/68 phone (72%),
  43/68 email (63%). Skip-trace never returns everything, and the tool surfaces
  that up front rather than hiding it. Our version should do the same, since it
  drives how many of the 68 are actually reachable by follow-up.

Search box placeholder: "Search address, owner, phone, email…" — one search box
across all four fields.

### Table columns (exactly six)

| Column | Format |
|---|---|
| ADDRESS | pin icon, street on line 1, "City, ST ZIP" on line 2 |
| OWNER | full name, one line |
| PHONE | phone icon, `(NNN) NNN-NNNN`, or `—` when missing |
| EMAIL | envelope icon, address, truncated with `…` when long, or `—` when missing |
| VALUE | dollars, comma-separated, no cents |
| TYPE | pill badge: **Owner** or **Absentee** |

Missing data renders as an em dash, never as a blank cell.

### What the columns tell us

- **Owner names ship with the list.** In the paid tool the name is simply there.
  Our Phase 2 plan gets names from a title rep CSV, since the LA County parcel
  dataset does not carry them. Same output, different route.
- **The owner/absentee split is a first-class field**, not a hidden filter —
  consistent with deriving it from mailing address vs. situs address.
- **Beds, baths, sq ft, lot size, year built do not appear.** They are search
  criteria, not list columns. Keeps the table readable.
- **All rows in the demo were a single town and ZIP**, and values sat in a narrow
  band (roughly $810K–$1.16M) — consistent with one drawn area plus a value range
  tied to one buyer's budget.

## 5. Columns the brief wants that the paid tool does not show

Neither appears anywhere in the screenshot:

- **DNC-scrubbed flag** — required before anyone calls those 49 phone numbers.
- **Status** (sent / responded / appointment) — the follow-up tracking.

These are additions, not replications. Both are worth keeping: the DNC column is
a compliance matter given the brief's own call-script channel, and without a
status column there is no way to run the follow-up cadence the concept depends on.

---

## Open questions for the recording

1. Is 68 typical, or was the demo area deliberately small? What does he claim for
   a normal run?
2. What criteria does the map actually expose, and in what order?
3. Where do owner names come from in his data pipeline?
4. Does he mention skip-trace cost or provider?
5. Follow-up cadence — how long after the mail drop does the email/text/call go?
6. Is the letter genuinely the master that the others derive from, or is each
   channel generated independently?
