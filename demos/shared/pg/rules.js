// PG_RULES — the ONE place for the rules every game follows (2026-11-14, user: "修改引擎规定，就可以一键修改"). Change a number here and every game
// (diva-diary, hibiki-diary, …) changes with it; no game repeats these. Read by the engine in the browser (window.PG_RULES)
// and by the builder in node / python (tools/new_game.py reads the JSON between the RULES markers).
// presets: per genre (GAME_SETUP.genre) values merged over these (engine/raise/flow.js); thermal.safety = the ASMR scheduler (flip off ≥ flipOff s,
// caps, warm-only, onMax s on → rest s off). Cameras: face centre x / y + face height fh, fractions of the frame; p = phone portrait, w = wide (phone landscape AND desktop: one layout).
(function (root) {
  const RULES = /*RULES*/{
    "model": { "texLimit": 67108864, "texTarget": 0.975 },
    "cams": {
      "full":   { "p": { "x": 0.5, "y": 0.29, "fh": 0.095 }, "w": { "x": 0.5, "y": 0.3, "fh": 0.15 } },
      "talk":   { "p": { "x": 0.5, "y": 0.355, "fh": 0.13 }, "w": { "x": 0.5, "y": 0.34, "fh": 0.2 } },
      "earL":   { "p": { "x": 0.4, "y": 0.4, "fh": 0.22 }, "w": { "x": 0.42, "y": 0.42, "fh": 0.32 } },
      "earR":   { "p": { "x": 0.6, "y": 0.4, "fh": 0.22 }, "w": { "x": 0.58, "y": 0.42, "fh": 0.32 } },
      "bust":   { "p": { "x": 0.5, "y": 0.33, "fh": 0.14 }, "w": { "x": 0.5, "y": 0.34, "fh": 0.21 } },
      "plan":   { "p": { "x": 0.5, "y": 0.225, "fh": 0.058 }, "w": { "x": 0.3, "y": 0.38, "fh": 0.14 } },
      "title":  { "p": { "x": 0.5, "y": 0.37, "fh": 0.068 }, "w": { "x": 0.3, "y": 0.3, "fh": 0.13 } },
      "lesson": { "p": { "x": 0.5, "y": 0.29, "fh": 0.062 }, "w": { "x": 0.5, "y": 0.33, "fh": 0.1 } }
    },
    "talk": { "fullFirstLineInPlace": true, "fullPoses": ["x_raise", "x_bow"] },
    "ll": { "angle": { "x": 5, "y": 4, "z": 3 }, "poseCross": 180, "bounce": 220, "camEase": 0.24, "closeFh": { "p": 0.17, "w": 0.24 },
      "actSecs": 2.6, "lookSecs": 2.2, "lookK": 0.6, "mouth": { "floor": 0.06, "span": 0.55 }, "blink": [2200, 2800], "hopTap": 22 },
    "stage": { "hopSec": 0.15, "hopPx": [4, 5], "barHop": 1.8, "nodDeg": [18, 12], "poseBars": 2, "panRange": 0.3, "closeLead": 0.6, "winkSec": 1.1,
      "stand": { "rhythm": [0.21, 0.72], "watch": [0.17, 0.8], "wide": [0.24, 0.97] },
      "close": { "p": { "dx": 0.1, "y": 0.4, "fh": 0.2 }, "w": { "dx": 0.1, "y": 0.45, "fh": 0.3 } } },
    "layout": { "uWide": 0.86, "minAspect": 1.7778, "maxAspect": 2.2 },
    "keys": { "L": "f", "R": "j" },
    "ending": { "wideDir": "wide", "card": { "portrait": [1080, 1440], "wide": [1920, 1080] }, "panel": 0.58 },
    "thermal": { "safety": false, "flipOff": 1.2, "gap": 0.4, "capWarm": 0.8, "capCool": 0.7, "warmOnly": false, "onMax": 120, "rest": 10,
      "voice": { "close": 0.55, "mid": 0.25, "far": 0.08, "both": 0.8, "rise": 0.05, "fall": 0.8 }, "breath": { "haa": 0.6, "fuu": 0.65, "blow": 0.65 },
      "ambientMax": 0.3 },
    "presets": {
      "idol": {},
      "asmr-love": { "thermal": { "safety": true }, "talk": { "fullFirstLineInPlace": false, "fullPoses": [] },
        "dist": { "close": "ear", "mid": "talk", "far": "full" } }
    }
  }/*RULES*/;
  root.PG_RULES = RULES;
  if (typeof module !== 'undefined') module.exports = RULES;
})(typeof window !== 'undefined' ? window : globalThis);
