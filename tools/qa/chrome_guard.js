// Every QA tool that launches Chrome loads this first: `require('./chrome_guard')` BEFORE require('child_process') (user 2026-11-09: don't open
// many browsers when testing, and close them all when done; DEMO_DESIGN_GUIDE §11.1).
//  · closes its headless Chrome + local test server on normal exit, SIGINT / SIGTERM / SIGHUP and uncaught errors;
//  · a small watchdog does the same when this process is SIGKILLed (a timeout in check_demo), so nothing is left with ppid=1;
//  · at most 1 browser per agent (MOHEAT_AGENT, else one shared slot); MOHEAT_MAX_BROWSERS=2 only when explicitly set. A second tool waits for the slot.
const cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const realSpawn = cp.spawn, kids = new Set(), profiles = new Set();
const MAX = Math.max(1, +process.env.MOHEAT_MAX_BROWSERS || 1), AGENT = String(process.env.MOHEAT_AGENT || 'shared').replace(/[^\w-]/g, '_');
const DIR = path.join(os.tmpdir(), 'moheat-chrome-slots', AGENT), WAIT_MS = 20 * 60000;
let slot = null;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const nap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function take() {   // synchronous: spawn() is
  if (slot) return;   // one process = one slot, however many pages it opens
  fs.mkdirSync(DIR, { recursive: true });
  const t0 = Date.now(); let said = false;
  for (;;) {
    for (let i = 0; i < MAX; i++) {
      const f = path.join(DIR, `slot${i}`);
      try { const fd = fs.openSync(f, 'wx'); fs.writeSync(fd, String(process.pid)); fs.closeSync(fd); slot = f; return; }
      catch { let o = 0; try { o = +fs.readFileSync(f, 'utf8'); } catch {} if (o && !alive(o)) try { fs.unlinkSync(f); } catch {} }   // its owner is gone
    }
    if (Date.now() - t0 > WAIT_MS) throw new Error(`chrome_guard: no browser slot after ${WAIT_MS / 60000} min (agent ${AGENT}, max ${MAX})`);
    if (!said) { said = true; console.error(`chrome_guard: waiting for a browser slot (agent ${AGENT}, max ${MAX})`); }
    nap(500);
  }
}
const release = () => { if (!slot) return; try { if (+fs.readFileSync(slot, 'utf8') === process.pid) fs.unlinkSync(slot); } catch {} slot = null; };
// Low priority (user 2026-11-09): QA browsers run under `nice -n 10`, so the user's own work wins when the CPU is contended. NOT `taskpolicy -b`: measured 2026-11-09 on Demo22
// (check_mouth, idle machine) -b = 6-8 fps, `-c utility` = 12 fps, nice 10 / 19 = 60 fps, same as normal. Timing checks that still get starved answer "machine busy, retry"
// (exit 75 / BUSY row), they don't fail. MOHEAT_QA_PRIORITY=normal = normal priority. Linux (GitHub Actions): system Chrome.
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
function launch(cmd, args) {
  let c = String(cmd), a = [...(args || [])];
  if (c === MAC_CHROME && process.platform !== 'darwin') { c = process.env.CHROME_BIN || 'google-chrome'; a.push('--no-sandbox', '--disable-dev-shm-usage'); }
  if (process.env.MOHEAT_QA_PRIORITY === 'normal') return [c, a];
  return ['nice', ['-n', '10', c, ...a]];
}
// What is ours, for tools/qa/patrol.py --clean: a small record per QA tool / server (pid + start time), removed on a normal exit.
const REG = path.join(process.env.MOHEAT_HEAVY_DIR || path.join(os.homedir(), '.moheat_heavy'), 'qa'), regd = new Set();
function register(pid, kind) {
  try { fs.mkdirSync(REG, { recursive: true }); const f = path.join(REG, `${pid}.json`); fs.writeFileSync(f, JSON.stringify({ pid, kind, owner: process.pid, started: Date.now(), tool: process.argv[1] || '' })); regd.add(f); } catch {}
}
register(process.pid, 'tool');
const isChrome = (c) => /Google Chrome|chromium/i.test(String(c)), isServer = (c, a) => /python/.test(String(c)) && (a || []).some((x) => /serve\.py$|^http\.server$/.test(String(x)));
const tmpProfile = (a) => { const m = (a || []).map((x) => /^--user-data-dir=(.+)$/.exec(String(x))).find(Boolean); return m && path.resolve(m[1]).startsWith(fs.realpathSync(os.tmpdir())) ? path.resolve(m[1]) : null; };
function closeAll() {
  for (const k of kids) try { k.kill('SIGKILL'); } catch {}
  kids.clear();
  for (const p of profiles) try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
  profiles.clear(); release();
  for (const f of regd) try { fs.unlinkSync(f); } catch {}
  regd.clear();
}
cp.spawn = function (cmd, args, opts) {
  const chrome = isChrome(cmd), server = isServer(cmd, args);
  if (chrome) take();
  const [c2, a2] = chrome ? launch(cmd, args) : [cmd, args];
  const k = realSpawn.call(cp, c2, a2, opts);
  if (chrome || server) {
    k.__chrome = chrome; kids.add(k);
    if (server && k.pid) register(k.pid, 'server');
    k.once('exit', () => { kids.delete(k); if (chrome && ![...kids].some((x) => x.__chrome)) release(); });
    const prof = chrome ? tmpProfile(args) : null; if (prof) profiles.add(prof);
    if (k.pid) {   // this process killed outright (SIGKILL): the watchdog closes what it left, only while that child is still alive
      const w = realSpawn.call(cp, '/bin/sh', ['-c', 'while kill -0 "$1" 2>/dev/null && kill -0 "$2" 2>/dev/null; do sleep 3; done; if ! kill -0 "$1" 2>/dev/null; then kill -9 "$2" 2>/dev/null; sleep 1; [ -n "$3" ] && rm -rf -- "$3"; fi', 'sh', String(process.pid), String(k.pid), prof || ''], { detached: true, stdio: 'ignore' });
      w.unref();
    }
  }
  return k;
};
process.on('exit', closeAll);
for (const [s, n] of [['SIGINT', 2], ['SIGTERM', 15], ['SIGHUP', 1]]) process.on(s, () => { closeAll(); process.exit(128 + n); });
for (const e of ['uncaughtException', 'unhandledRejection']) process.on(e, (err) => { console.error(err); closeAll(); process.exit(1); });
