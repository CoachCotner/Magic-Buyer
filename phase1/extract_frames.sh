#!/usr/bin/env bash
# Phase 1, step 1: pull one frame every 10s from the webinar recording,
# and extract a 16kHz mono WAV for transcription.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
MEDIA="$ROOT/media"
FRAMES="$HERE/frames"
INTERVAL="${INTERVAL:-10}"   # seconds between frames

VIDEO="$(find "$MEDIA" -maxdepth 1 -type f \
  \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.mkv' -o -iname '*.webm' -o -iname '*.m4v' \) \
  | head -1)"

if [[ -z "$VIDEO" ]]; then
  echo "ERROR: no video found in $MEDIA" >&2
  echo "Drop the webinar recording there, then re-run this script." >&2
  exit 1
fi

echo "Video:    $VIDEO"
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "$VIDEO"

rm -f "$FRAMES"/frame_*.jpg
mkdir -p "$FRAMES"

echo "Extracting a frame every ${INTERVAL}s ..."
ffmpeg -nostdin -loglevel error -i "$VIDEO" \
  -vf "fps=1/${INTERVAL},scale=1600:-2" -q:v 3 \
  "$FRAMES/frame_%04d.jpg"

echo "Extracting audio ..."
ffmpeg -nostdin -loglevel error -y -i "$VIDEO" \
  -vn -ac 1 -ar 16000 -c:a pcm_s16le "$HERE/audio.wav"

echo "Frames: $(ls -1 "$FRAMES"/frame_*.jpg 2>/dev/null | wc -l)  (frame_NNNN.jpg = t + $((INTERVAL)) * (NNNN-1) sec)"
echo "Audio:  $HERE/audio.wav"
