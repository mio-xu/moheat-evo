#!/bin/bash
# assets/video/*.mp4 (Seedance raw, not in git) → media/video/*.mp4 for the game: forward + reversed (ping-pong, so the loop
# has no seam even when the model does not return to its first frame), 1280 wide, H.264 CRF 26, no audio, faststart.
cd "$(dirname "$0")/.."; mkdir -p media/video
for f in assets/video/*.mp4; do
  n=$(basename "$f"); [ media/video/$n -nt "$f" ] && [ media/video/$n -nt "$0" ] && continue
  ffmpeg -y -loglevel error -i "$f" -an -filter_complex "[0:v]scale=1280:-2,split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[v]" -map "[v]" \
    -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart media/video/$n && echo "$n $(du -h media/video/$n | cut -f1)"
done
