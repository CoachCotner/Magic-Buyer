# Magic Buyer — Specification

Derived from screenshots of the ListingLeads webinar recording (Jimmy Mackin,
Sep 3 2026, 35:33 runtime). Screens observed directly; audio not yet
transcribed, so anything about timing, list size claims, or data sourcing
remains open — see **Open questions**.

Source tool: `magic-buyer-letter.listingleads.com`, "Creator Plan" tier.

---

## 1. The idea

For one real, pre-approved buyer, find the off-market homes that match what they
want, then contact those homeowners on that buyer's behalf. The homeowners become
listing leads. It inverts normal prospecting: instead of "thinking of selling?",
it is "I have a specific buyer, and your house fits."

---

## 2. The flow

```
Describe your buyer  →  Criteria (parsed, editable)  →  Recipients  →  Channels
   one sentence          live property count            the list       Letter (master)
                                                                       Email, Text, Call
```

Four screens. The whole thing is one pass, and the buyer is the unit of work —
a "Buyers" tab holds many, "New Buyer" starts one.

---

## 3. Screen 1 — Describe your buyer

The entry point, and the cleverest part of the product.

- Heading: **"Describe your buyer"**
- Subhead: **"One sentence is all it takes. We'll handle the rest."**
- A **single free-text field**. Not a form.
- Placeholder: `Sarah, $800K-1.2M, 3 bed in Newton MA, pre-approved`
- A **microphone icon** — dictation, so it can be done from a car after a
  showing.
- **Next →**
- Below, a worked example with a **Copy** link:
  > *"Sarah and Mike, 3 bed 2 bath in Auburn NH, $900K-$912K, pre-approved,
  > flexible closing, major reno ok, any years owned"*

On submit: **"AI is analyzing your description"** with a *Parsing* spinner. The
sentence is parsed into every structured criterion on the next screen.

**This is the design decision worth stealing.** An agent describes a buyer the
way they would to a colleague, and the software does the form-filling. The form
still exists — it is just pre-filled and reviewable rather than blank.

---

## 4. Screen 2 — Criteria & letter content

Titled with the buyer's name ("Sarah and Mike"), subtitled **"Search criteria &
letter content"**. Every field arrives pre-filled from the sentence and stays
editable.

### Fields, in order

| Group | Controls |
|---|---|
| **Location** | City · State · ZIP |
| **Value & Size** | Price min · Price max · Sq ft min · Sq ft max |
| *(sub-field)* | A price-gap/cap field beneath the range — exact label unread, needs confirming |
| **Lot Size (sqft)** | Lot min · Lot max |
| **Property type** | Single Family · Multi-Family · Condo · Mobile Home · Land · Other |
| **Years owned** \* | Any · 2+ · 5+ · 10+ |
| **Beds** \* | 2+ · 3+ · 4+ · 5+ |
| **Baths** \* | 1+ · 2+ · 3+ |
| **Financing** \* | Pre-approved · Cash buyer · FHA · VA · Conventional |
| **Closing flexibility** | Flexible · Quick close (21 days) · 30 days · No rush · Open to rent-back |
| **Property condition** | Minor updates OK · As-is / no repairs · Move-in ready only · Major renos OK |
| **Anything else?** | free text |

\* marked required in the UI.

Controls are **pill buttons, single-select**, not dropdowns — fast to scan and
fast to change.

### The live count

A banner reads **"26 properties found"** and updates as criteria change.

This is essential, and it answers the list-size question: **there is no target
size.** The count is whatever the filters return — it can be a handful or a few
hundred. The agent steers toward a mailable number by loosening or tightening
criteria and watching the count. Any build without this is missing the control
loop.

### Two groups that are about the buyer, not the property

**Financing**, **Closing flexibility**, and **Property condition** do not filter
parcels — a county assessor does not know whether a buyer is pre-approved. They
are **letter content**: the facts that make the buyer credible on the page. Hence
the subtitle, "Search criteria **& letter content**". Two jobs, one screen.

### ⚠ The "Anything else?" field is a fair housing hazard

Its placeholder text reads:

> *"e.g. relocating from NYC, first-time buyer, growing family…"*

**"Growing family" is familial status — a federally protected class.** The tool's
own example invites the user to type something that has no business in a letter
that goes to homeowners, and this text feeds the generator.

Our version keeps the field — the free-text box is genuinely useful — but:

1. The placeholder suggests **property and situation** only: *"e.g. relocating
   for work, needs a home office, wants a flat yard for a dog."*
2. Whatever is typed passes `server/fairhousing.js` before it can reach the
   generator, and again after generation.

This is a real differentiator, not a technicality. The screen enforces a rule his
does not.

---

## 5. Screen 3 — Recipients

Header: **"Recipients {n}"**, subtitle **"{x} with phone · {y} with email"**.
Observed: 68 recipients, 49 with phone (72%), 43 with email (63%). Contact-fill
gaps are shown honestly rather than hidden.

Search box across all fields: *"Search address, owner, phone, email…"*

### Columns (six)

| Column | Format |
|---|---|
| ADDRESS | pin icon; street, then "City, ST ZIP" |
| OWNER | full name |
| PHONE | `(NNN) NNN-NNNN`, or `—` |
| EMAIL | address, truncated with `…`, or `—` |
| VALUE | dollars, comma-separated, no cents |
| TYPE | pill badge: **Owner** or **Absentee** |

Missing data is an em dash, never blank. Beds/baths/sq ft are criteria, not
columns.

### Ours adds two

- **DNC** — nobody dials an unscrubbed number.
- **Status** — `new → sent → responded → appointment` (plus `dead`). Without it
  the follow-up cadence cannot be run at all.

---

## 6. Screen 4 — Channels

A left rail lists them, each with a status dot:

| Channel | Descriptor | Audience |
|---|---|---|
| Recipients | Addresses + contacts | — |
| **Letter** | Direct mail | **the homeowners** |
| **Email** | "Cold outreach" | **the agent's own sphere** |
| **Text** | SMS message | the agent's past clients |
| **Call script** | Phone talk track | the homeowners |
| ~~Social post~~ | *Coming soon* | not built — **cut from our scope** |

**Two audiences, not one.** The letter goes cold to homeowners. The email and
text go warm to people the agent already knows, asking them to forward or refer.
The email's closing ask is *"If you know anyone in Auburn who might be thinking
about putting their house on the market, please forward this email to them."*

### Output handling

Buttons: **Regenerate · Edit · Copy body · Copy all**.

**The tool never sends.** It produces text the agent copies into their own email
client or CRM. Worth replicating exactly: sending stays on the agent's own domain
and reputation, and the tool never becomes a bulk sender.

A **"Go to Campaign Page"** button implies a campaign view tying channels
together. Not yet observed.

### Email anatomy (fully captured)

Subject: `Buyer looking in [City, ST] — know anyone?`

1. One-line opener: just got off the phone with clients looking in [City],
   between [$low] and [$high] — round numbers, e.g. "$800K and $1.2M"
2. "Here's who they are and what they're looking for:"
3. Buyer first names
4. **Exactly three bullets:** readiness/financing · condition tolerance ·
   motivation and character
5. The ask: forward this, plus a direct phone number
6. "I appreciate your help," + name

Short, and asks for a forward rather than a reply.

---

## 7. What we build differently

| | Theirs | Ours |
|---|---|---|
| Coverage | nationwide, licensed data | LA County, free public parcels |
| Social post | "Coming soon" | cut |
| DNC column | absent | present |
| Status tracking | absent | present |
| Fair housing screen | absent; placeholder invites a violation | enforced before save |
| Cost | ~$1,600 + monthly | $0 software, $0 data, skip trace per list |

---

## 8. Open questions — need the audio

1. What does he claim for typical list size and mail volume per buyer?
2. Cadence — the Q&A implies **letter first, phone call about a week later**;
   confirm, and find where email and text sit.
3. Where do owner names come from in his pipeline?
4. Skip-trace provider and cost; is email append included?
5. Is the letter genuinely the master the others derive from, or is each channel
   generated independently?
6. The unread price sub-field under Value & Size.
7. From the Q&A: *"Does this list make sure [properties are] not currently listed,
   and haven't sold in the last 2 years"* — confirms an off-market filter and
   suggests a recent-sale exclusion. Both need pinning down.
8. Also asked live: *"what if you don't have any buyers?"* — his answer may
   reveal an intended workflow for prospecting without a live buyer.

---

## 9. The map and filters — from a sibling tool, not Magic Buyer

**Accuracy note.** These screens live at `cs.listingleads.com` under **Segments**,
not at `magic-buyer-letter.listingleads.com`. They are a different product in the
same suite. Magic Buyer itself was never seen with a map — it went straight from
the criteria screen to a recipient list.

They matter anyway, because the brief asks for a Leaflet polygon-draw map, and
this is the same company solving that exact problem.

### Area selection — three modes

A toolbar offers: **Draw a shape** · **ZIP codes** · **Radius**, plus *Clear
selection* and **Use this area**.

Worth copying all three. Drawing is precise but fiddly; ZIP and radius cover the
common cases in one click. A drawn shape is summarized in plain language —
*"Auburn — about 44.5 square miles"* — with **Edit on map** and **Clear**.

### The eight filter types

A "Property filters" panel offers, as add-a-rule buttons:

| | |
|---|---|
| Property type | Beds |
| Square feet | Home value |
| Years owned | Year built |
| Owner status | **Listing status** |

**"Listing status" is the off-market filter** — the mechanism behind the Q&A
question *"Does this list make sure [properties are] not currently listed, and
haven't sold in the last 2 years?"* Our Phase 2 plan does the same job by
excluding addresses matching a CRMLS export.

### Rules read as sentences

Conditions render as editable English, not form rows:

- *"is a **[single family]** home"*
- *"and home is worth **[over]** **[$750,000]**"*
- *"and is **[absentee]**"*

Each chip is a dropdown; each rule has an × to remove it; **+ Add a condition**
appends. And a note: *"The same rules as the rule. Change one here and it changes
there."* — filters are shared state between map and list, not two copies.

### Live counts, everywhere

The map corner shows **"50 homes inside"** and **"42 in your database"**. The
segment builder shows **"184 of your 1,284 contacts"** with a plain-English
restatement of the rule beneath it.

Same pattern as Magic Buyer's *"26 properties found"*. **Every selection surface
in this suite shows a live count.** It is how the user steers to a workable list
size, and it is not optional.

### Natural language, again

The segment builder takes a sentence — *"past clients in Rosewood I haven't
talked to in 90 days"* — and a **Build it** button turns it into conditions. Same
move as "Describe your buyer".

That is the house style, and it is the right one: **type a sentence, get
structured filters you can then correct.** Our map screen should accept the same.

### One more distinction it draws

"Who is this for?" offers **Your database · Your farm · Both** — the same
two-audience split Magic Buyer makes between the letter (homeowners) and the
email/text (sphere).

---

## 10. Rules from the room

Two things attendees said that belong in the build.

### Do not mail withdrawn listings

> *"do not send to withdrawn. its still listed with the agent. so we on crmls
> cannot send to them"* — Lauren, in the webinar chat

A withdrawn listing is still under an agency agreement. Contacting that owner is
a violation, not merely bad manners. **Our off-market filter must exclude
withdrawn and expired-but-still-listed properties, not just actives and
pendings.** The CRMLS export used to exclude on-market parcels needs to carry
listing status so withdrawn can be excluded specifically.

This did not come from the tool. It came from a working CRMLS agent, and it is
the kind of rule that gets a licensee in trouble.

### Attendees asked for the tracking his tool lacks

> *"After you send the letter can you save this activity in a short list
> somewhere so that you can follow up with calls/emails after you send the
> letter?"*

That is exactly the `status` column — `new → sent → responded → appointment`.
Independent confirmation that the gap is real and felt by working agents.

Also in the room, on cadence: *"So I should call next week, if I do not hear back
from my letter"*, answered with *"more days"* — so the call follow-up is more
than a week after the letter.

### Campaign view

A sibling "Everything" screen lists generated pieces grouped by campaign, with
Draft/Live status — including *"For owners who match a buyer"*, *"Four buyers
looking in your price range"*, and *"Second touch for anyone who opened"*.

The last one implies **open-tracking-driven follow-up sequencing**. Out of scope
for v1, but it is where the Magic Buyer "Go to Campaign Page" button leads.
