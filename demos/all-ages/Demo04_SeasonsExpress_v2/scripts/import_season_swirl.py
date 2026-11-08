"""Extract the selected Seedance still; the player supplies rotation and growth."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'video/seedance/fx_season_swirl_selected.mp4'
TARGET = ROOT / 'assets/seasonal_chaos/fx_season_swirl.png'
FRAME_SECONDS = 1.1  # Complete spiral with room around the outer particles.


def main():
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-ss', str(FRAME_SECONDS),
        '-i', str(SOURCE), '-vf',
        'crop=1080:1080:420:0,scale=1024:1024,format=rgba,colorkey=0x000000:0.025:0.15',
        '-frames:v', '1', str(TARGET),
    ], check=True)
    print(TARGET)


if __name__ == '__main__':
    main()
