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
- **Mail merge to PDF** — the one Phase 3 item not yet built.
- **Skip-trace provider** — still unchosen, still unpaid. Email append must be
  confirmed as included.

### Still $0 spent.
