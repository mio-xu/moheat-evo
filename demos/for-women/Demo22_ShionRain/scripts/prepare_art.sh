#!/bin/sh
# Raw Seedance PNGs (assets/art/shion_*.png, not in git) → media/art/shion_*.jpg (1920×1080, cropped to 16:9) and the cover.
cd "$(dirname "$0")/.." || exit 1
for f in assets/art/shion_*.png; do
  n=$(basename "$f" .png)
  ffmpeg -y -loglevel error -i "$f" -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -q:v 3 "media/art/$n.jpg"
  echo "$n"
done
