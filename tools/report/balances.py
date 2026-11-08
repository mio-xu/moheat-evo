#!/usr/bin/env python3
"""Remaining API resources + per-demo budget (user 2026-11-08: 每小时汇报近况 + 各 API 剩余资源; 提效标准「预算 80% 预警」).

  python3 tools/report/balances.py                 # API balances + per-demo OpenAI budget table
  python3 tools/report/balances.py --budget        # only the per-demo table (no network)
  python3 tools/report/balances.py --budget --write docs/budget.md   # also write the table as Markdown
  python3 tools/report/balances.py --demo <folder> # one demo: exit 1 at ≥ 80 % of the cap, 2 over the cap (check_demo G8 uses it)

Seedance: credits balance (via Demo10's seedance_images.py client, ~/.seedance_key).
ElevenLabs: characters used / limit this period (tools/eleven/tts.py client).
OpenAI: no balance API with a normal key → spend estimated per demo from demos/*/*/project/openai_log.json: tokens × PRICE where the
        log has usage, else ~$0.2 per image; re-runs of the same job are counted through "prior_usage" (tools/openai/images.py keeps
        it). Cap: $10 per demo (user 2026-11-08) → ⚠ at 80 %, ✗ STOP over the cap (leave it to the user). Real balance: OpenAI billing.
"""
import argparse, glob, importlib.util, json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CAP_USD, WARN_AT = 10.0, 0.8
# $ per 1M tokens — gpt-image estimate (text in / image in / image out); edit here when OpenAI's price list changes.
PRICE = {'text_in': 5.0, 'image_in': 8.0, 'image_out': 30.0}
FALLBACK_USD = 0.2   # one 2K image when the log has no usage


def load(name, path):
    sp = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m


def usd(u):
    if not u: return FALLBACK_USD
    i = u.get('input_tokens_details') or {}
    ti, ii = i.get('text_tokens', 0), i.get('image_tokens', 0)
    if not (ti or ii): ti = u.get('input_tokens', 0)
    return (ti * PRICE['text_in'] + ii * PRICE['image_in'] + u.get('output_tokens', 0) * PRICE['image_out']) / 1e6


def demo_spend(log_path):
    try: log = json.load(open(log_path))
    except Exception: return 0, 0.0
    items = log.values() if isinstance(log, dict) else log
    n, s = 0, 0.0
    for e in items:
        for u in [e.get('usage')] + list(e.get('prior_usage') or []):
            n += 1; s += usd(u)
    return n, s


def budget_rows():
    rows = []
    for p in sorted(glob.glob(os.path.join(REPO, 'demos', '*', '*', 'project', 'openai_log.json'))):
        d = os.path.relpath(os.path.dirname(os.path.dirname(p)), REPO)
        n, s = demo_spend(p)
        state = '✗ STOP (over cap)' if s > CAP_USD else '⚠ ≥ 80 %' if s >= CAP_USD * WARN_AT else 'ok'
        rows.append((d, n, s, state))
    return rows


def table(rows):
    out = ['| Demo | OpenAI images | est. $ | of $10 cap | state |', '|---|---:|---:|---:|---|']
    for d, n, s, st in rows: out.append(f'| {d} | {n} | {s:.2f} | {s / CAP_USD:.0%} | {st} |')
    out.append(f'| **total** | {sum(r[1] for r in rows)} | {sum(r[2] for r in rows):.2f} | | |')
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--budget', action='store_true'); ap.add_argument('--write'); ap.add_argument('--demo')
    a = ap.parse_args()
    if a.demo:
        d = os.path.abspath(a.demo)
        n, s = demo_spend(os.path.join(d, 'project', 'openai_log.json'))
        msg = f'{os.path.relpath(d, REPO)}: {n} OpenAI image(s) ≈ ${s:.2f} of the ${CAP_USD:.0f} cap ({s / CAP_USD:.0%})'
        code = 2 if s > CAP_USD else 1 if s >= CAP_USD * WARN_AT else 0
        print(msg + {2: ' — ✗ over the cap: STOP, leave it to the user', 1: ' — ⚠ 80 % reached: plan the rest, ask before more', 0: ''}[code])
        sys.exit(code)
    if not a.budget:
        try:
            sd = load('sd', glob.glob(os.path.join(REPO, 'demos', '*', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))[0])
            print('Seedance credits:', sd.unwrap(sd.call('GET', '/credits/balance', tries=2)))
        except Exception as e:
            print('Seedance credits: unavailable —', str(e)[:120])
        try:
            E = load('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py'))
            s = E.client().user.subscription.get()
            print(f'ElevenLabs: {s.character_count:,} / {s.character_limit:,} characters used, {s.character_limit - s.character_count:,} left'
                  + (f' (resets {s.next_character_count_reset_unix})' if getattr(s, 'next_character_count_reset_unix', None) else ''))
        except Exception as e:
            print('ElevenLabs: unavailable —', str(e)[:120])
    rows = budget_rows()
    print('\nOpenAI spend per demo (estimate from project/openai_log.json; real balance: OpenAI billing page)\n' + table(rows))
    for d, n, s, st in rows:
        if st != 'ok': print(f'{st}: {d} ≈ ${s:.2f}')
    if a.write:
        p = os.path.join(REPO, a.write); tmp = p + '.tmp'
        open(tmp, 'w').write('# OpenAI budget per demo\n\nWritten by `python3 tools/report/balances.py --budget --write ' + a.write
                             + '` (estimate; cap $10 per demo, ⚠ at 80 %).\n\n' + table(rows) + '\n')
        os.replace(tmp, p); print('wrote', a.write)


if __name__ == '__main__':
    main()
