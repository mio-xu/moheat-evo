// Smoke test of the PRIVATE live talk (no TTS = no voice credits; one agent session counts against limits.json):
//   MOHEAT_LIVE_PASS_FILE=/tmp/p.txt PORT=8794 python3 tools/talk/server.py &      (a test password in /tmp/p.txt)
//   LIVE_PASS=$(cat /tmp/p.txt) LIVE_PORT=8794 node demos/for-men/Demo43_BlizzardInn/scripts/live_smoke.mjs     (run from the repo root)
// Runs this page's own shared/talk.js + live/live.js against the real agent: a story window (Hinata), keep-talking open + close (Nagisa).
import fs from 'fs'; import vm from 'vm';
const B = `http://127.0.0.1:${process.env.LIVE_PORT || 8771}`;
const r = await fetch(B + '/login', { method: 'POST', body: `pw=${encodeURIComponent(process.env.LIVE_PASS || '')}&next=/live`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
const cookie = r.headers.get('set-cookie').split(';')[0];
// the page's own code: shared/talk.js + live/live.js in a window stub, fetch with the cookie, the real WebSocket
const win = { location: { search: '' }, document: { getElementById: () => ({ hidden: false }), querySelector: () => null, createElement: () => ({}), head: { append() {} } }, INNAudio: { decode: async () => null } };
win.window = win; win.WebSocket = WebSocket; win.setTimeout = setTimeout; win.clearTimeout = clearTimeout; win.URLSearchParams = URLSearchParams; win.console = console;
win.fetch = (u, o = {}) => fetch(B + u, { ...o, headers: { ...(o.headers || {}), Cookie: cookie } });
const ctx = vm.createContext(win);
vm.runInContext(fs.readFileSync('demos/shared/talk.js', 'utf8'), ctx);
// no TTS during this test: count lines only
win.MoHeatTalk.live = ((orig) => (o) => { const c = orig(o); c.tts = async () => null; return c; })(win.MoHeatTalk.live);
vm.runInContext(fs.readFileSync('demos/for-men/Demo43_BlizzardInn/live/live.js', 'utf8'), ctx);
const L = win.INN_LIVE;
console.log('begin', await L.begin());
let lines = await L.turn({ mode: 'window', who: 'H', place: 'hall', said: '未来ではスマホでゲームするよ', kind: 'user' });
console.log('window H:', JSON.stringify(lines.map(({ who, pos, ja, en }) => ({ who, pos, ja, en })), null, 0));
lines = await L.turn({ mode: 'talk', who: 'N', place: 'door', said: null, kind: 'open' });
console.log('talk N open:', JSON.stringify(lines.map(({ who, pos, ja, en }) => ({ who, pos, ja, en })), null, 0));
lines = await L.turn({ mode: 'talk', who: 'N', place: 'door', said: 'ありがとう、もう帰らないと', kind: 'close' });
console.log('talk N close:', JSON.stringify(lines.map(({ who, pos, ja, en }) => ({ who, pos, ja, en })), null, 0), 'ended', L.ended());
L.end(); setTimeout(() => process.exit(0), 500);
