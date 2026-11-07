#!/bin/bash
# assets/video/*.mp4 (Seedance raw, not in git) → media/video/*.mp4 for the game. Loops (all but v_off) are forward + reversed
# (ping-pong, so the loop has no seam); v_off is a one-shot and stays forward only. Native width up to 1920 (720p clips stay
# 1280, 1080p clips 1920), H.264 CRF 20 (sharper than Demo 12's 26), no audio, faststart.
cd "$(dirname "$0")/.."; mkdir -p media/video
for f in assets/video/*.mp4; do
  n=$(basename "$f"); [ media/video/$n -nt "$f" ] && [ media/video/$n -nt "$0" ] && continue
  if [ "$n" = v_off.mp4 ]; then fc="[0:v]scale='min(1920,iw)':-2[v]"
  else fc="[0:v]scale='min(1920,iw)':-2,split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[v]"; fi
  ffmpeg -y -loglevel error -i "$f" -an -filter_complex "$fc" -map "[v]" -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart media/video/$n \
    && echo "$n $(du -h media/video/$n | cut -f1)"
done
