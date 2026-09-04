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
