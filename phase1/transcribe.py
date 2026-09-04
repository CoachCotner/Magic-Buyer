#!/usr/bin/env python3
"""Phase 1, step 1b: transcribe the webinar audio locally with Whisper.

Writes a timestamped transcript so spec claims can be traced back to the
moment in the recording that supports them.
"""
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUDIO = HERE / "audio.wav"
OUT_DIR = HERE / "transcript"
MODEL = os.environ.get("WHISPER_MODEL", "small.en")


def find_audio() -> Path:
    if AUDIO.exists():
        return AUDIO
    media = HERE.parent / "media"
    vids = [p for p in media.iterdir()
            if p.suffix.lower() in {".mp4", ".mov", ".mkv", ".webm", ".m4v"}]
    if not vids:
        sys.exit(f"No audio.wav and no video in {media}. Run extract_frames.sh first.")
    print("audio.wav missing — extracting from", vids[0].name)
    subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(vids[0]),
         "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(AUDIO)],
        check=True,
    )
    return AUDIO


def hhmmss(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 3600:02d}:{(s % 3600) // 60:02d}:{s % 60:02d}"


def main() -> None:
    import whisper

    audio = find_audio()
    OUT_DIR.mkdir(exist_ok=True)

    print(f"Loading Whisper model '{MODEL}' (first run downloads weights) ...")
    model = whisper.load_model(MODEL)

    print("Transcribing — this runs on CPU and takes a while for a long webinar ...")
    result = model.transcribe(str(audio), verbose=False, fp16=False)

    (OUT_DIR / "transcript.txt").write_text(result["text"].strip() + "\n")

    lines = [f"[{hhmmss(seg['start'])} → {hhmmss(seg['end'])}] {seg['text'].strip()}"
             for seg in result["segments"]]
    (OUT_DIR / "transcript_timestamped.txt").write_text("\n".join(lines) + "\n")

    print(f"Wrote {OUT_DIR/'transcript.txt'}")
    print(f"Wrote {OUT_DIR/'transcript_timestamped.txt'} ({len(lines)} segments)")


if __name__ == "__main__":
    main()
