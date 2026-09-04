# Magic Buyer

For one real, pre-approved buyer, find 100–150 off-market homes that match their
criteria, mail those homeowners a personal letter, then follow up by email, text,
and phone. The homeowners become the listing leads.

Built for a California (DRE #01242185) South Bay / Palos Verdes practice.

## Status

Phase 1 (learn from the webinar recording) — **scaffolded, blocked on source media.**
See `BUILD_NOTES.md` for blockers and decisions.

## Phases

1. **Learn** — extract frames + transcript from the webinar recording, write
   `MAGIC_BUYER_SPEC.md` describing every screen, filter, field, and output channel.
2. **Data** — LA County Assessor parcels, owner names from title rep CSV, CRMLS
   export to exclude on-market listings, skip-trace round trip with a DNC column.
   Free/cheap sources only; no paid property API without approval.
3. **Tool** — local web app: Leaflet map with polygon draw + criteria filters,
   recipient list, buyer profile form, five-channel generator, fair housing guard,
   PDF mail merge.

## Layout

```
media/      webinar recording + screenshot (gitignored, not committed)
phase1/     frame extraction and transcription
lists/      recipient lists as CSV (gitignored — contains owner PII)
data/       parcel and MLS source data (gitignored)
docs/       spec and reference docs
```

## Running Phase 1

```bash
bash phase1/extract_frames.sh     # frames every 10s + audio.wav
python3 phase1/transcribe.py      # timestamped transcript
```

## Ground rules

- No paid API without explicit approval; costs logged in `BUILD_NOTES.md`.
- Round numbers in generated copy — never $X97-style pricing language.
- Every generated text passes the fair housing check before it is saved:
  property criteria only, never who the buyer is or who a neighborhood suits.
- Owner data stays out of git.
