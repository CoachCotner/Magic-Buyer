# Who you can contact, and how

Three different rulebooks govern three different channels. The tool enforces
what it can and surfaces the rest, because the exposure is per-contact and lands
on the licensee, not the software.

## Phone — the Do Not Call registry

**The registry applies to the number, not the listing.** There is no expired-listing
exemption in the federal rules. It is a widely held belief in the business and it
is not in the regulation. A prospecting call to a registered number is
telemarketing to a registered number, and penalties are assessed per call.

The daily lead sheet flags each number it appends. In one day's LA file, **58 of
144 distinct numbers were flagged**, and 5 of 40 records had no clean number at
all.

**What the tool does**

- shows a record's first **non-flagged** number as its phone, never a flagged one
- marks a record `DNC` when every number it carries is flagged, and labels it
  mail-only
- reports both counts on import, so the exposure is visible rather than implied

Nothing in the interface should make it easy to dial a flagged number by accident.

**Exemptions worth knowing** (confirm against your broker's guidance):

| Situation | Window |
|---|---|
| They enquire — reply to a letter, fill a form, call you | roughly 3 months |
| Established business relationship — a past client | roughly 18 months |
| Express written consent | as granted |

This is why the letter is not a consolation prize on a DNC record. **It is what
earns the phone call.** A response opens the window.

## Mail — unrestricted

Direct mail is not governed by the DNC registry. A record with every number
flagged is still perfectly mailable, and the tool routes those to letters.

For absentee owners the letter goes to the **mailing address**, not the property.
Mailing an absentee owner at the property sends the letter to their tenant. The
mail merge handles this and marks each row `property` or `mailing address
(absentee)` on the label CSV.

## Email — CAN-SPAM

A different rulebook, and a workable one. What it requires:

- a real physical postal address in the message
- accurate headers and a subject line that is not misleading
- a working opt-out, honoured promptly

Cold email to a homeowner is legal in the US on that basis. It is **not** legal in
Canada, where CASL requires prior consent.

### One tactic deliberately not implemented

A common recommendation is to send at randomised intervals and vary subject lines
specifically to avoid tripping spam filters. The personalisation half is sound
and is built. The interval-randomising is deliverability evasion, and the domain
it burns is the agent's own. This tool's email path stays: genuinely personal,
sane volume, real opt-outs, honest headers.

## Fair housing — every channel, every time

Describe the property and the buyer's situation. Never who the buyer is, never
who a neighbourhood suits. `server/fairhousing.js` screens the typed description,
the free-text notes, and the finished copy, and blocks the mail merge outright on
a high-severity finding. Federal FHA classes plus the California additions.

## Expired listings — the agency question

Excluded because the owner is still represented: **Active, Pending, Backup, Hold,
Coming Soon, and Withdrawn.** A withdrawn listing is off the market but still
under an agency agreement.

Fair to contact: **Expired and Cancelled.** The agreement has ended.

An unrecognised status is excluded in the safe direction and reported, never
silently guessed.

---

None of this is legal advice. The broker and the E&O carrier are who defend it;
this file exists so the defaults are the safe ones and the decisions are written
down.
