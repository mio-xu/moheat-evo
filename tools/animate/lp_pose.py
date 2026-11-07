"""Procedural character animation from ONE still with LivePortrait (no rig, no driving video).

Run with the LivePortrait venv (installed outside the repo at ~/ml/LivePortrait):
  ~/ml/LivePortrait/.venv/bin/python tools/animate/lp_pose.py stills  <still.jpg> <out_dir>
  ~/ml/LivePortrait/.venv/bin/python tools/animate/lp_pose.py talk    <still.jpg> <voice.m4a> <out.mp4> [--sec N]
  ~/ml/LivePortrait/.venv/bin/python tools/animate/lp_pose.py idle    <still.jpg> <out.mp4> [--sec N]

Every frame is a full-resolution copy of the still with only the face re-rendered (paste-back),
so loops start and end exactly on the still (handoff §4b rule: switch only at the still).
Controls per frame: eye (0 closed .. 1 as drawn), lip (0 as drawn .. 1 wide open), pitch / yaw / roll
(degrees, relative), gaze_x / gaze_y, smile, eyebrow.
"""
import os, sys, math, subprocess, argparse
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
LP = os.path.expanduser("~/ml/LivePortrait")
CWD = os.getcwd()
sys.argv = [sys.argv[0]] + [a if a.startswith("-") or a in ("stills", "talk", "idle") or a.replace(".", "").isdigit() else os.path.abspath(a) for a in sys.argv[1:]]
sys.path.insert(0, LP)
os.chdir(LP)  # model paths in the configs are relative

import cv2, numpy as np, torch
from src.config.argument_config import ArgumentConfig
from src.config.inference_config import InferenceConfig
from src.config.crop_config import CropConfig
from src.live_portrait_wrapper import LivePortraitWrapper
from src.utils.cropper import Cropper
from src.utils.camera import get_rotation_matrix
from src.utils.crop import prepare_paste_back, paste_back
from src.utils.retargeting_utils import calc_eye_close_ratio, calc_lip_close_ratio
from src.gradio_pipeline import GradioPipeline


def fields(cls, d):
    return cls(**{k: v for k, v in d.items() if hasattr(cls, k)})


class Puppet:
    def __init__(self, still):
        args = ArgumentConfig()
        icfg, ccfg = fields(InferenceConfig, args.__dict__), fields(CropConfig, args.__dict__)
        self.w = LivePortraitWrapper(inference_cfg=icfg)
        self.cropper = Cropper(crop_cfg=ccfg)
        self.dev = self.w.device
        bgr = cv2.imread(still)
        self.img = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        crop = self.cropper.crop_source_image(self.img, self.cropper.crop_cfg)
        if crop is None:
            raise SystemExit("no face found in " + still)
        I_s = self.w.prepare_source(crop['img_crop_256x256'])
        self.lmk = crop['lmk_crop']
        self.M = crop['M_c2o']
        self.mask = prepare_paste_back(icfg.mask_crop, self.M, dsize=(self.img.shape[1], self.img.shape[0]))
        self.info = self.w.get_kp_info(I_s)
        self.f_s = self.w.extract_feature_3d(I_s)
        self.x_s = self.w.transform_keypoint(self.info)
        self.R_s = get_rotation_matrix(self.info['pitch'], self.info['yaw'], self.info['roll'])
        self.eye0 = float(calc_eye_close_ratio(self.lmk[None]).mean())
        self.lip0 = float(calc_lip_close_ratio(self.lmk[None])[0][0])
        # borrow the expression helpers (smile / gaze / eyebrow) from the gradio pipeline without building it
        self.gp = GradioPipeline.__new__(GradioPipeline)
        print(f"device={self.dev} eye0={self.eye0:.2f} lip0={self.lip0:.2f}")

    @torch.no_grad()
    def frame(self, eye=1.0, lip=0.0, pitch=0., yaw=0., roll=0., gaze_x=0., gaze_y=0., smile=0., eyebrow=0.):
        i = self.info
        R_d = get_rotation_matrix(i['pitch'] + pitch, i['yaw'] + yaw, i['roll'] + roll)
        R = (R_d @ self.R_s.permute(0, 2, 1)) @ self.R_s
        delta = i['exp'].clone().to(self.dev)
        t = lambda v: torch.tensor(v).to(self.dev)
        if gaze_x or gaze_y:
            delta = self.gp.update_delta_new_eyeball_direction(t(gaze_x), t(gaze_y), delta)
        if smile:
            delta = self.gp.update_delta_new_smile(t(smile), delta)
        if eyebrow:
            delta = self.gp.update_delta_new_eyebrow(t(eyebrow), delta)
        x_d = i['scale'] * (i['kp'] @ R + delta) + i['t']
        if abs(eye - 1.0) > 1e-3:
            er = self.eye0 * max(eye, 0.0)
            x_d = x_d + self.w.retarget_eye(self.x_s, self.w.calc_combined_eye_ratio([[er]], self.lmk))
        if lip > 1e-3:
            lr = self.lip0 + lip * 0.55  # 0.55 ≈ wide open on this model
            x_d = x_d + self.w.retarget_lip(self.x_s, self.w.calc_combined_lip_ratio([[lr]], self.lmk))
        x_d = self.w.stitching(self.x_s, x_d)
        out = self.w.parse_output(self.w.warp_decode(self.f_s, self.x_s, x_d)['out'])[0]
        return paste_back(out, self.M, self.img, self.mask)


def save(path, rgb, q=92):
    cv2.imwrite(path, cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, q])


class Writer:
    def __init__(self, path, size, fps, audio=None):
        w, h = size
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
               "-r", str(fps), "-i", "-"]
        if audio:
            cmd += ["-i", audio, "-af", "apad", "-c:a", "aac", "-b:a", "128k", "-shortest"]
        cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-movflags", "+faststart", path]
        self.p = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    def add(self, rgb):
        self.p.stdin.write(np.ascontiguousarray(rgb).tobytes())

    def close(self):
        self.p.stdin.close(); self.p.wait()


def blink_curve(t, starts, dur=0.16):
    """eye openness 1→0→1 around each blink start"""
    v = 1.0
    for s in starts:
        x = (t - s) / dur
        if 0 <= x <= 1:
            v = min(v, abs(1 - 2 * x) ** 0.8)
    return v


def idle_pose(t, T):
    """small breathing-like head motion, periodic in T so the loop closes on the still"""
    p = 2 * math.pi * t / T
    s = math.sin(p)
    return dict(pitch=1.2 * math.sin(2 * p) * 0.5, yaw=2.0 * s * math.sin(p / 2) ** 2 * 1.4, roll=0.8 * s)


def audio_env(path, fps):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = 16000 // fps
    n = len(a) // hop
    rms = np.array([np.sqrt(np.mean(a[k * hop:(k + 1) * hop] ** 2) + 1e-9) for k in range(n)])
    ref = np.percentile(rms[rms > 1e-3], 90) if (rms > 1e-3).any() else 1
    env = np.clip((rms / ref - 0.12) / 0.88, 0, 1) ** 0.7
    # attack fast, release slower — mouths close slower than they open
    out, v = np.zeros_like(env), 0.0
    for k, e in enumerate(env):
        v = e if e > v else v * 0.55 + e * 0.45
        out[k] = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["stills", "talk", "idle"])
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--sec", type=float, default=0)
    ap.add_argument("--fps", type=int, default=24)
    a = ap.parse_args()
    pup = Puppet(a.paths[0])
    H, W = pup.img.shape[:2]

    if a.mode == "stills":
        out = a.paths[1]; os.makedirs(out, exist_ok=True)
        poses = {
            "00_still": {}, "01_blink": dict(eye=0.0), "02_half_eye": dict(eye=0.5),
            "03_mouth_half": dict(lip=0.4), "04_mouth_open": dict(lip=0.9),
            "05_smile": dict(smile=0.8), "06_look_left": dict(yaw=-12, gaze_x=-8),
            "07_look_right": dict(yaw=12, gaze_x=8), "08_nod_down": dict(pitch=-8, eye=0.75),
            "09_tilt": dict(roll=-6, yaw=5, smile=0.5),
        }
        for k, p in poses.items():
            save(f"{out}/{k}.jpg", pup.frame(**p)); print(k)
        return

    fps = a.fps
    if a.mode == "talk":
        voice, outp = a.paths[1], a.paths[2]
        env = audio_env(voice, fps)
        n = len(env) + int(0.5 * fps)
        env = np.concatenate([env, np.zeros(n - len(env))])
        T = n / fps
        blinks = [0.9, 2.7, 4.6, 6.1, 8.3, 10.2][: max(1, int(T / 1.8))]
        wr = Writer(outp, (W, H), fps, audio=voice)
        for k in range(n):
            t = k / fps
            pose = idle_pose(t, T)
            # nod a little with emphasis, settle to the still at both ends
            fade = min(1.0, t / 0.3, (T - t) / 0.4)
            pose = {kk: v * fade for kk, v in pose.items()}
            pose["pitch"] += -2.5 * env[k] * fade
            wr.add(pup.frame(eye=blink_curve(t, blinks), lip=float(env[k]), smile=0.15 * fade, **pose))
            if k % 24 == 0: print(f"{k}/{n}")
        wr.close()
    else:
        outp = a.paths[1]
        T = a.sec or 6.0
        n = int(T * fps)
        wr = Writer(outp, (W, H), fps)
        for k in range(n):
            t = k / fps
            wr.add(pup.frame(eye=blink_curve(t, [T * 0.35, T * 0.8]), **idle_pose(t, T)))
            if k % 24 == 0: print(f"{k}/{n}")
        wr.close()
    print("wrote", outp)


if __name__ == "__main__":
    main()
