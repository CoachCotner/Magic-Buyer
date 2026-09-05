# Magic Buyer — Build Notes

Running log of decisions, blockers, and anything that costs money.

---

## 2026-09-04 — Session 1: environment survey, Phase 1 scaffold

### What this project is
A standalone tool that, for one real pre-approved buyer, finds 100–150 off-market
homes matching that buyer's criteria, and generates outreach to those homeowners
across five channels. Homeowners are the listing leads.

Not a feature of Recalltext. Separate project, separate repo.

### Environment: this is a cloud container, not the Mac

Phase 1 assumed a local Finder folder. This session runs in an ephemeral Linux
container in the cloud. Consequences:

- There is no Finder, and no files dropped locally reach it.
- **Nothing survives the session unless it is committed and pushed to a repo.**

### Tooling checked

| Tool | Status |
|---|---|
| ffmpeg / ffprobe | **Installed** this session (`apt-get install ffmpeg`, 7:6.1.1). Free. |
| Python | 3.11.15, present |
| Node | 22.22.2, present |
| Whisper | **Not installed — install abandoned deliberately.** See below. |
| Disk / RAM / CPU | 26 GB free, 15 GB RAM, 4 cores. Enough for frame extraction. |

### BLOCKER 1 — no source media

`media/` is empty. No webinar recording, no recipient-list screenshot. Phase 1
steps 2 and 3 cannot start until the recording is in this container.

Transfer options, best first:
1. **Google Drive** — this session has a Drive connector. Put the video in Drive
   and it can be pulled directly. Works for large files. Recommended.
2. Attach the screenshot straight into chat — images can be read inline.
3. Chat file upload for the video — likely too large for a screen recording.

### BLOCKER 2 — outbound network is restricted to package registries

The environment's network policy allows pypi, npm, crates.io, Go proxy, and the
Anthropic API. General internet is denied (403 at the egress proxy). Verified:

| Host | Needed for | Result |
|---|---|---|
| `pypi.org` | installing packages | HTTP 200 |
| `api.anthropic.com` | Phase 3 generator | HTTP 401 (reachable; 401 = no key sent) |
| `data.lacounty.gov` | **Phase 2 parcel data** | **403 — denied** |
| `openaipublic.azureedge.net` | Whisper model weights | **403 — denied** |
| `huggingface.co` | faster-whisper model weights | **403 — denied** |

Two consequences:

- **Local transcription cannot work here as-is.** `openai-whisper` installs fine
  from pypi, but its model weights come from a blocked host, and the CPU-friendly
  alternative (faster-whisper) pulls weights from HuggingFace, also blocked. The
  install was killed mid-download rather than spend 4 GB of CUDA wheels on a
  dead end. No cost incurred.
- **Phase 2 parcel download is blocked** at the same wall. LA County's open data
  portal is unreachable from this environment.

Fix for both: change the environment's network policy to allow those domains
(or full access). That is a setting on the environment, not a code change —
see https://code.claude.com/docs/en/claude-code-on-the-web

Workaround if the policy stays as-is: transcribe on the Mac and upload the text;
download the parcel CSV on the Mac and upload it.

### What was built anyway

The Phase 1 pipeline, ready to run the second the media lands:

- `phase1/extract_frames.sh` — finds the video, prints its duration, extracts one
  frame per 10s (`INTERVAL` env var to change) plus a 16 kHz mono WAV.
  Frame `frame_NNNN.jpg` = timestamp `10 * (NNNN - 1)` seconds.
- `phase1/transcribe.py` — Whisper transcription to both plain and timestamped
  transcripts, so spec claims can be traced to a moment in the recording.
  **Written but not yet runnable** — see Blocker 2.

### Costs so far
**$0.** ffmpeg is free and open source. No paid API touched. No property-data API
called. Per the brief, none will be without explicit approval.

### Open decisions for Lauren
1. Repo name and destination for this project.
2. How to get the recording in (Drive is the easy answer).
3. Whether to open the network policy, or hand over transcript + parcel CSV by hand.

---

## 2026-09-04 — Session 1, continued: connector findings

Three decisions taken: Google Drive for file transfer, open the network policy,
create a private `magic-buyer` repo. Results of acting on them:

### Repo creation — FAILED, needs a manual step
`POST /user/repos` → **403 "Resource not accessible by integration"**. The GitHub
App connected to this session can read and write repos it has been granted, but
is not permitted to create new ones under the `CoachCotner` account.

Manual fix (about 30 seconds): create an empty **private** repo named
`magic-buyer` at https://github.com/new — no README, no .gitignore, no license,
so the first push is clean. Then this session can be pointed at it and push.

### Source media — NOT in Drive
Searched Drive for video, for recent images, and for anything titled or
containing "magic", "buyer", "listing", or "ListingLeads".

- The only video folder is **"Walkthrough"** — ~18 screen recordings from
  Aug 30 – Sep 2, all auto-named `screen-YYYYMMDD-HHMMSS-*.mp4`, 19 MB to 228 MB.
  Nothing identifies which, if any, is the ListingLeads webinar.
- Recent images in Drive are all CommLocker / CommChecker branding assets — a
  different project. **No recipient-list screenshot found.**

Conclusion: the webinar recording and the screenshot are still on the Mac. They
have not been uploaded anywhere this session can reach.

### Note on how to move the video

The Drive connector returns file content **inline as base64**. For a 200 MB+
screen recording that is not workable — it would flood the session before a
single frame was extracted. Two better routes:

1. **Preferred:** once the network policy is opened, set the Drive file to
   "anyone with the link", and the file can be pulled straight to disk with
   `curl`. No size problem, nothing passes through the conversation.
2. Trim the recording on the Mac to just the tool demo, or export audio only,
   and upload the smaller file.

The screenshot is small — pasting it directly into chat is the fastest path and
needs no Drive step at all.

### Still $0 spent.

---

## 2026-09-04 — Session 1, part 3: started building

Lauren's call: the paid tool is ~$1,600 for the data plus a monthly fee, which
is not happening. Build the same flow for her own use. Scope settled as LA
County, since that is where the entire practice is — see docs/DATA_SOURCING.md.

### Cost model, ours vs theirs

| Piece | Theirs | Ours |
|---|---|---|
| Software | in the fee | $0, built here |
| Property data | in the fee | $0, LA County public parcels |
| Owner names | in the fee | $0, title rep CSV |
| Skip trace | bundled | per-record, only for who is actually mailed |
| Letter generation | monthly | Claude API, cents per buyer |
| Postage + printing | not included | unchanged either way |

The recurring monthly fee goes away entirely. Skip trace remains the only
per-use data cost, and it is paid per list rather than per month.

### Built this session

- **`server/schema.js`** — one source of truth for every field. The six list
  columns match the paid tool exactly; `dnc` and `status` are ours. Also carries
  the buyer profile fields and the five channels. The skip-trace export header is
  derived here (16 of 20 columns go out; the 4 the service fills in do not).
- **`server/fairhousing.js`** — screens generated text before saving. Nine
  categories covering federal FHA classes plus the California FEHA additions
  (marital status, source of income, military/veteran), a steering check for
  neighborhood-characterizing language, and the charm-pricing ban from the brief.
  High severity blocks; medium and low warn.
- **`test/fairhousing.test.mjs`** — 17 assertions, all passing. Nine violating
  phrasings caught, six legitimate property-criteria sentences pass clean, and
  blocking vs warning behaviour verified.

Leaflet and leaflet-draw are vendored from npm rather than a CDN, so the map
works with no outside network at run time.

### Still $0 spent.

### Decision: social post cut, four channels

Lauren: no social post, emails matter. Both point the same way.

The social post was already the odd one out — greyed out as "Coming soon" in the
paid tool, so nothing to replicate, and the only channel that reaches nobody in
particular. Everything else here is addressed to a named homeowner. Cut.

**Channels are now: Letter (master) → Email, Text, Call script.**

#### What this puts on email

Email is now a primary channel, not a nice-to-have, so two things follow:

1. **Email fill rate is the constraint.** His demo showed 43 of 68 with an email
   (63%). Whatever skip-trace service we pick has to do email append, not just
   phones — worth confirming it is included rather than a pricier add-on, since
   some services charge separately for it. Goes on the list of things to check
   before paying anyone.
2. **Cold email to homeowners has its own rules**, the same way calling has DNC.
   CAN-SPAM requires a real physical postal address in the message, accurate
   headers and subject line, and a working opt-out that gets honored. None of
   that is onerous, but the generator should produce compliant footers rather
   than leave it to be remembered per-send. Adding to the Phase 3 build.

The recipient list already carries `email` and `dnc`. An `email_opt_out` column
will be needed alongside them once sending starts.

---

## 2026-09-04 — Session 1, part 4: the tool works end to end

Built overnight while Lauren was away, on her go-ahead. Phase 1's deliverable
(`MAGIC_BUYER_SPEC.md`) was done, so this is Phase 3.

### What runs

`npm start` → http://localhost:4000. Four screens matching the spec:

1. **Describe your buyer** — one sentence, parsed into every criterion.
2. **Criteria** — pre-filled and editable, with a live count and a map offering
   all three area modes (draw, ZIP, radius).
3. **Recipients** — the six columns from the paid tool, plus DNC and status.
   Save as CSV, export for skip trace, import the results back.
4. **Outreach** — letter, email, text, call script, each with a Copy button and
   a fair housing verdict above it.

### Verified, not assumed

Driven with a real browser end to end: parse → 8 properties → widen the price
range → 56 → save list → generate. Screenshots in the session.

Two real bugs the run surfaced and fixed:

- **Skip-trace export 404'd.** `res.download` refuses dotfiles by default and the
  temp file was named `.skiptrace-*.csv`. Now streamed from memory — no temp file.
- **Absentee owners had no mailing address.** The API dropped `mail_addr` on the
  way to the browser, so a saved list could not have been mailed to an absentee
  owner at all — the single most valuable segment. Now carried through, with
  `mail_zip` added to the schema.

Also fixed: `hidden` was losing to `display:flex` on the map mode boxes, so the
ZIP and radius panels showed at once.

### Test coverage — 100 assertions, 4 suites

| Suite | What it holds down |
|---|---|
| `parse-buyer` (40) | money in every form, word numbers, "Newton MA" glued state, all pill fields |
| `filter` (19) | geometry, MLS address matching, owner/absentee, monotonic counts, off-market exclusion |
| `fairhousing` (17) | nine violation categories caught, six legitimate letters pass clean |
| `generate` (24) | round numbers, no hype, three bullets, DRE on the letter, a bad note blocked |

### Still open

- **LA County parcel data** — blocked by the network policy. Everything is built
  against the real schema; it is a file swap.
- **CRMLS export** — needs Lauren's download to exclude on-market and withdrawn.
- **Skip-trace provider** — still unchosen, still unpaid. Email append must be
  confirmed as included.

### Still $0 spent.

### Mail merge — built

`POST /api/lists/:name/merge.pdf` returns one PDF, one page per recipient, and
`GET /api/lists/:name/labels.csv` returns envelope labels in the same order.

The detail that matters: **an absentee owner does not live at the property.**
Mailing the letter to the house sends it to their tenant. Every recipient is
addressed at their mailing address when one differs, with a small `re: <property
address>` line so the owner knows which house is meant. The label CSV marks each
row `property` or `mailing address (absentee)`.

The fair housing screen runs again at this last gate — a letter that fails it
returns 422 and no PDF is produced. Nothing gets printed that could not be sent.

Verified by rendering the PDF: 8 recipients, 8 pages, correct salutation, address
block and DRE line.

**Phase 3 is now complete.**

---

## 2026-09-04 — the letter, and the CRMLS refresh

### Master letter written

`magic_buyer_letter_master.md` — the voice for everything. Lauren asked me to
write it since the Letter screen never appeared in the screenshots I received;
the recipient list, criteria, describe and email screens did, so the letter is
built from the email's structure (which derives from it) rather than transcribed.
**It is mine, not his, and it is hers to edit.**

The generator reads everything above the `---` as the voice: with an API key it
is handed to Claude as the style to match; without one its `{placeholders}` are
filled directly. Re-read on every call, so edits take effect with no restart.
Below the `---` are notes on why each paragraph is there, so editing is informed
rather than guesswork.

One test had to change with it. `letter has the ask` asserted the literal phrase
"thought about selling" — my template's wording, now living in a file Lauren
owns. Replaced with assertions on behaviour that survive her edits: the letter
asks a question, leaves no unfilled placeholders, gives an easy no, and carries
no pressure language.

### CRMLS export is a recurring job, not an import

Lauren: *"that will need to be done on a regular basis."* Correct — listings
change weekly. Rebuilt accordingly:

- **Re-read on change.** The file's mtime is checked per request; a replaced
  export is picked up mid-session. Overwrite the file, that is the whole workflow.
- **Status-aware, by legal meaning.** Active, Pending, Backup, Hold, Coming Soon
  and **Withdrawn** are excluded — all still under an agency agreement. Expired,
  Cancelled and Sold are left in: the agency ended, and expireds are ordinary
  listing leads. An unrecognized status is excluded (the safe direction) and
  *reported*, so an unfamiliar CRMLS code gets added rather than silently guessed.
- **Column-name tolerant.** Address / Street Address / Property Address /
  UnparsedAddress, Zip / Postal Code / ZipCode, Status / Standard Status /
  MLS Status — a CRMLS export can be dropped in unedited.
- **Freshness on screen.** Age of the export in the corner, flagged after 7 days,
  with a tooltip breaking down excluded vs skipped. Polled every 30s.

Verified live: 78 Torrance parcels → 69 after dropping an export in mid-session,
9 excluded (Active + Pending + Withdrawn), the 3 Expired correctly kept, no
restart.

**138 assertions, 6 suites.**

## Sept 5 — foreclosure and multi-unit data, and the landing page that already exists

Sorted four LA County NOD/NOT lead sheets (09/01 and 09/04): 154 unique filings,
11 in the South Bay, 10 of those residential. Four of the eleven are HOA liens in
the low four figures, not mortgage defaults — treating those as distress would be
both wrong and predatory. Written up in `docs/FORECLOSURE.md`.

Sorted three CRMLS expired/cancelled multi-unit exports: 75 unique buildings
across Torrance, Redondo and Hermosa, 47 of them 2-4 units. `StreetNumber` is
empty on every row, so none of it is mailable from the MLS export alone — but 72
of 75 carry an APN, and Realist turns an APN into owner name and mailing address,
which the MLS never had. The APN list is the deliverable, not the address list.
Written up in `docs/MULTI_UNIT.md`.

Found `getyourhomeoptions.com` on her Netlify (project `stellular-parfait-de9bd4`,
forms enabled). It already carries a form named `foreclosure-leads` with a
`vip_code` field and a `received_letter` radio. That is the missing destination
for the foreclosure mode: print a per-recipient code on the letter, and the form
submission identifies the property. The export needs a `vip_code` column and the
generator needs to mint the codes.

Costs money: nothing new.

## Sept 5 — Cole Information, $795/yr unlimited: not yet

**Costs money. Evaluated, recommended against for now.**

Cole Realty Resource / Cole Information sells an unlimited seat at $795/yr. What
it gives that nothing else in the stack does: consumer phone and email keyed to a
household, **with DNC status flagged**, plus radius search around an address and
CSV export.

The gap it would fill today, counted against real files:

| Gap | Records |
|---|---|
| Multi-unit owners — no name, phone or email in the MLS export | 75 |
| South Bay foreclosure filings with no phone (12 of 13) | 12 |
| Expired/FSBO rows where every number is DNC-flagged | 11 |
| **Total** | **~99** |

Ninety-nine records is roughly $25 of per-hit skip trace. $795 buys unlimited,
and unlimited is not what a 99-record gap needs.

Three reasons to wait rather than buy:

1. **Check the association first.** A lot of REALTOR associations and MLSs carry
   Cole as an included member benefit. CRMLS product dashboard and SBAOR member
   benefits. Either $0 or $795 — worth the five minutes.
2. **The machine isn't built.** Foreclosure mode and multi-unit mode don't exist
   yet. Buying data ahead of the tool that consumes it is exactly how the Realist
   export burned 5,000 records and produced no file. That already happened once
   on this project.
3. **Cole is weakest where the gap is biggest.** 75 of the 99 records are
   multi-unit owners, and multi-unit owners are disproportionately LLCs, trusts
   and out-of-area managers. Cole is a *household* database — it is built to
   answer "who lives at this address." It will whiff on "Smith Family Trust c/o a
   property manager in Irvine." Cole is also historically landline-heavy, which
   is a poor fit for beach-city owners.

**Revisit when Deal of the Week becomes weekly.** Circle prospecting is the one
use here that is genuinely unlimited-shaped: 200 neighbors a week is 10,000
records a year, and at that volume $795 is cheap and per-hit pricing is not. That
is the trigger, not the current list.

**Before signing anything:** confirm the term. Annual data contracts are usually
12-month commitments with auto-renew, and "unlimited" usually carries a fair-use
cap. Ask for both in writing, and ask for a trial to test coverage on a block she
knows before committing.

One thing Cole does *not* do: it will not make a DNC-flagged number callable. For
the 11 mail-only rows it either finds a different number that happens to be
clean, or it confirms the same wall. It is not an unlock.
