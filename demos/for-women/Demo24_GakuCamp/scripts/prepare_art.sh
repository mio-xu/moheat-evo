#!/bin/sh
# Raw 2K PNGs (assets/art, not in git) → the 1920×1080 JPGs the page loads (media/art).
cd "$(dirname "$0")/.." && mkdir -p media/art
for n in gaku_live gaku_log gaku_left gaku_coffee gaku_imo gaku_blanket gaku_whisper_R gaku_bye; do
  ffmpeg -y -loglevel error -i "assets/art/$n.png" -vf "scale=1920:1080:flags=lanczos" -q:v 3 "media/art/$n.jpg"
done
ls -la media/art
