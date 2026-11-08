// Layer data for ../../shared/layers.js — written by tools/art/build_stage.py from project/stage.json (do not edit by hand).
window.MOHEAT_LAYERS = {
 "views": {
  "ren_call": {
   "view": "call",
   "fire": null,
   "bg": {
    "src": "art/bg_street.webp?v=ed50f505",
    "fire": [
     0.578,
     0.69
    ]
   },
   "char": {
    "src": "art/char_call.webp?v=712ea4f5",
    "w": 1700,
    "h": 1304,
    "x": 0.6694,
    "y": 1.02,
    "height": 1.0,
    "box": [
     935,
     0,
     2813,
     1440
    ]
   },
   "patches": [
    {
     "src": "art/call_mouth.webp?v=6c470729",
     "rect": [
      670,
      434,
      150,
      110
     ],
     "kind": "mouth"
    },
    {
     "src": "art/call_eyes.webp?v=d4e1b6e5",
     "rect": [
      522,
      217,
      332,
      227
     ],
     "kind": "eyes"
    }
   ]
  },
  "ren_close": {
   "view": "close",
   "fire": null,
   "bg": {
    "src": "art/bg_window.webp?v=6ca99571",
    "fire": [
     0.194,
     0.79
    ]
   },
   "char": {
    "src": "art/char_close.webp?v=68f06984",
    "w": 1700,
    "h": 1061,
    "x": 0.55,
    "y": 1.02,
    "height": 1.02,
    "box": [
     252,
     0,
     2560,
     1440
    ]
   },
   "patches": [
    {
     "src": "art/close_mouth.webp?v=278b8846",
     "rect": [
      848,
      439,
      342,
      219
     ],
     "kind": "mouth"
    },
    {
     "src": "art/close_eyes.webp?v=f01b36c7",
     "rect": [
      618,
      133,
      577,
      338
     ],
     "kind": "eyes"
    }
   ]
  },
  "ren_door": {
   "view": "door",
   "fire": null,
   "bg": {
    "src": "art/bg_door.webp?v=9e305517",
    "fire": [
     0.187,
     0.551
    ]
   },
   "char": {
    "src": "art/char_door.webp?v=9aa2a55b",
    "w": 1597,
    "h": 1440,
    "x": 0.5,
    "y": 1.02,
    "height": 1.0,
    "box": [
     590,
     0,
     2187,
     1440
    ]
   },
   "patches": [
    {
     "src": "art/door_mouth.webp?v=e564e9c1",
     "rect": [
      544,
      472,
      276,
      186
     ],
     "kind": "mouth"
    },
    {
     "src": "art/door_eyes.webp?v=bca30f15",
     "rect": [
      403,
      178,
      432,
      237
     ],
     "kind": "eyes"
    }
   ]
  },
  "ren_hug": {
   "view": "hug",
   "fire": null,
   "bg": {
    "src": "art/bg_door.webp?v=9e305517",
    "fire": [
     0.187,
     0.551
    ],
    "zoom": 1.2
   },
   "char": {
    "src": "art/char_hug.webp?v=546d444c",
    "w": 1700,
    "h": 1012,
    "x": 0.5541,
    "y": 1.02,
    "height": 1.02,
    "box": [
     413,
     0,
     2832,
     1440
    ]
   },
   "patches": [
    {
     "src": "art/hug_mouth.webp?v=3c50008e",
     "rect": [
      937,
      564,
      216,
      119
     ],
     "kind": "mouth"
    }
   ]
  }
 },
 "skipVideo": "media/video/",
 "hooks": {
  "view": "CALL.S.view",
  "mouth": "CALL.FW.mouth"
 }
};
