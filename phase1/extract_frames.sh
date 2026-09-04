#!/usr/bin/env bash
# Phase 1, step 1: turn the webinar recording into reviewable stills + audio.
#
# Two passes, because a screen recording is mostly static:
#   grid/   one frame every INTERVAL seconds  (even coverage, as specified)
#   scenes/ one frame per detected screen change (the distinct screens)
#
# Scene frames are what make a long webinar reviewable — 90 minutes of video
# is ~540 grid frames but usually only a few dozen actual screens.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
MEDIA="$ROOT/media"
FRAMES="$HERE/frames"
INTERVAL="${INTERVAL:-10}"      # seconds between grid frames
SCENE="${SCENE:-0.08}"          # scene-change sensitivity, 0..1 (lower = more frames)

VIDEO="$(find "$MEDIA" -maxdepth 1 -type f \
  \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.mkv' -o -iname '*.webm' -o -iname '*.m4v' \) \
  | head -1)"

if [[ -z "$VIDEO" ]]; then
  echo "ERROR: no video found in $MEDIA" >&2
  echo "Put the webinar recording there, then re-run this script." >&2
  exit 1
fi

echo "Video: $VIDEO"
DURATION="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO" | cut -d. -f1)"
printf 'Length: %02d:%02d:%02d (%s seconds)\n' \
  $((DURATION/3600)) $((DURATION%3600/60)) $((DURATION%60)) "$DURATION"

rm -rf "$FRAMES/grid" "$FRAMES/scenes"
mkdir -p "$FRAMES/grid" "$FRAMES/scenes"

echo
echo "Pass 1: grid, one frame every ${INTERVAL}s ..."
ffmpeg -nostdin -loglevel error -i "$VIDEO" \
  -vf "fps=1/${INTERVAL},scale='min(1600,iw)':-2" -q:v 3 \
  "$FRAMES/grid/t%05d.jpg"

# Rename grid frames to their real timestamp, so the filename IS the citation.
n=0
for f in "$FRAMES"/grid/t*.jpg; do
  t=$(( n * INTERVAL ))
  printf -v stamp '%02d-%02d-%02d' $((t/3600)) $((t%3600/60)) $((t%60))
  mv "$f" "$FRAMES/grid/grid_${stamp}.jpg"
  n=$((n+1))
done

echo "Pass 2: scene changes (threshold ${SCENE}) ..."
ffmpeg -nostdin -loglevel info -i "$VIDEO" \
  -vf "select='gt(scene,${SCENE})',showinfo,scale='min(1600,iw)':-2" \
  -vsync vfr -q:v 3 "$FRAMES/scenes/scene_%04d.jpg" 2> "$FRAMES/scenes/_showinfo.log"

# Map each scene frame to its timestamp from ffmpeg's showinfo output.
python3 - "$FRAMES/scenes" <<'PY'
import re, sys
from pathlib import Path

d = Path(sys.argv[1])
log = (d / "_showinfo.log").read_text(errors="replace")
times = [float(m) for m in re.findall(r"pts_time:([0-9.]+)", log)]
frames = sorted(d.glob("scene_*.jpg"))

for frame, t in zip(frames, times):
    s = int(t)
    stamp = f"{s//3600:02d}-{s%3600//60:02d}-{s%60:02d}"
    frame.rename(d / f"scene_{stamp}.jpg")

print(f"  {len(frames)} scene frames, {len(times)} timestamps")
PY

echo
echo "Extracting audio ..."
ffmpeg -nostdin -loglevel error -y -i "$VIDEO" \
  -vn -ac 1 -ar 16000 -c:a pcm_s16le "$HERE/audio.wav"

echo
echo "Done."
echo "  grid frames:  $(ls -1 "$FRAMES"/grid/*.jpg 2>/dev/null | wc -l)"
echo "  scene frames: $(ls -1 "$FRAMES"/scenes/scene_*.jpg 2>/dev/null | wc -l)"
echo "  audio:        $HERE/audio.wav"
echo
echo "Filenames carry the timestamp: grid_00-04-30.jpg = 4m30s into the recording."
