# tools/animate — make a still move without Live2D (test, 2026-11-08)

Two free, local, automatic methods; no rig, no Seedance credits.

1. **LivePortrait** (`lp_pose.py`): re-renders only the face of a still (blink, mouth from the voice, head turn, gaze, smile) and pastes it back at full resolution, so clips start and end on the still.
   - `stills <still> <dir>`: a test sheet of 10 poses
   - `talk <still> <voice.m4a> <out.mp4>`: mouth follows the voice loudness, small head motion, blinks
   - `idle <still> <out.mp4> --sec 6`: seamless breathing / blink loop
   - ~0.8 s per 1080p frame on the M5 (MPS + CPU fallback).
2. **Depth parallax** (`depth.py`): a Depth Anything V2 depth map (white = near, dilated so the stretch lands on the background). The page warps the still (or a LivePortrait clip) in WebGL with the mouse / phone tilt. Keep the offset small (≈1 % of the width) or hair edges smear.

3. **Layers from a finished still** (`split_layers.py`, venv `~/ml/layers`): isnet-anime cut-out (character + chair, RGBA) and a LaMa-inpainted empty background. Better for new demos: generate the empty background once per location (guide §6.2).
4. **Character clip with alpha** (`pack_alpha.py`): mats every frame of a LivePortrait clip (only the moving head is re-matted, the rest uses the still's mask), crops to the character box and packs colour on top / alpha below in one H.264 MP4; the page's WebGL shader rebuilds RGBA, so it plays in every browser incl. Safari.

The page stacks: background (depth parallax + fire shimmer / flicker in the shader) → character (idle loop ↔ talk clip, 0.1 s dissolve, both sit on the still; warm rim light from the fire side) → code particles (embers, snow, `mix-blend-mode: screen`).

Setup (outside the repo, ~2 GB weights):
```
brew install uv
git clone --depth 1 https://github.com/KwaiVGI/LivePortrait.git ~/ml/LivePortrait && cd ~/ml/LivePortrait
uv venv -p 3.10 .venv && uv pip install -p .venv/bin/python --index-strategy unsafe-best-match -r requirements_macOS.txt "huggingface_hub[cli]<0.30" "transformers<4.50"
.venv/bin/huggingface-cli download KlingTeam/LivePortrait --local-dir pretrained_weights --exclude "*.git*" "README.md" "docs"
```
Run every script with `~/ml/LivePortrait/.venv/bin/python`.
Best input: a front-facing face that is not too small; it works on the realistic-anime style (Demo24 Gaku). Licences: LivePortrait MIT; Depth Anything V2 Base/Large are CC-BY-NC (non-commercial), so use `--model small` (Apache-2.0) for anything commercial.
