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
const isChrome = (c) => /Google Chrome|chromium/i.test(String(c)), isServer = (c, a) => /python/.test(String(c)) && (a || []).some((x) => /serve\.py$|^http\.server$/.test(String(x)));
const tmpProfile = (a) => { const m = (a || []).map((x) => /^--user-data-dir=(.+)$/.exec(String(x))).find(Boolean); return m && path.resolve(m[1]).startsWith(fs.realpathSync(os.tmpdir())) ? path.resolve(m[1]) : null; };
function closeAll() {
  for (const k of kids) try { k.kill('SIGKILL'); } catch {}
  kids.clear();
  for (const p of profiles) try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
  profiles.clear(); release();
}
cp.spawn = function (cmd, args, opts) {
  const chrome = isChrome(cmd), server = isServer(cmd, args);
  if (chrome) take();
  const k = realSpawn.call(cp, cmd, args, opts);
  if (chrome || server) {
    kids.add(k);
    k.once('exit', () => { kids.delete(k); if (chrome && ![...kids].some((x) => isChrome(x.spawnfile))) release(); });
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
