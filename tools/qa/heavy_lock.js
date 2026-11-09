// Node half of tools/qa/heavy_lock.py (one heavy job at a time, load guard, background priority). First line of a heavy node script:
//   require('<repo>/tools/qa/heavy_lock.js').wrapSelf('promo render');
// The script re-runs itself under `heavy_lock.py run`, so there is one implementation of the queue. Exit 75 = the job did not run (machine busy).
const { spawnSync } = require('child_process'), path = require('path');
exports.wrapSelf = (job, { browser = false } = {}) => {   // browser: the script drives a browser, nice only (see heavy_lock.py step 3)
  const h = process.env.MOHEAT_HEAVY_HOLDER;
  if (h) { try { process.kill(+h, 0); return; } catch {} }
  const r = spawnSync('python3', [path.join(__dirname, 'heavy_lock.py'), 'run', job, '--', process.execPath, ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, MOHEAT_HEAVY_WATCH_PARENT: '1', ...(browser ? { MOHEAT_QA_PRIORITY: process.env.MOHEAT_QA_PRIORITY || 'nice' } : {}) } });
  process.exit(r.status === null ? 1 : r.status);
};
