#!/usr/bin/env python3
"""Writes project/script_scripted.md (the readable draft) from ../lines.js + ../scenes.js: per place the duo script with
positions and thermal notes, and which lines each solo plays (both = ◎, Nobunaga only = N, Ieyasu only = I); then the bridges.
Run after editing lines.js:  python3 scripts/script_md.py"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
S = json.loads(src[src.index('window.TALK_SCRIPT = ') + 21:src.rindex('}') + 1])
sc = open(os.path.join(ROOT, 'scenes.js'), encoding='utf-8').read()
NAME = {'N': '信長', 'I': '家康'}
POS = {'seat': 'seat · 座 1.3 m：声 ×0.3', 'near': 'near · 目の前 50 cm：声 ×0.6', 'left_ear': 'left_ear · 左耳 12 cm：声 ×1（左耳が温かい）',
       'right_ear': 'right_ear · 右耳 12 cm：声 ×1（右耳が温かい）', 'left': 'left · 左 1 m：声 ×0.3', 'right': 'right · 右 1 m：声 ×0.3',
       'window': 'window · 窓辺 4 m：声 ×0.1', 'behind': 'behind · 背後 0.9 m：声 ×0.3'}
TITLE = {m.group(1): m.group(2) for m in re.finditer(r"id: '(\w+)', ja: '([^']+)'", sc)}
def events(pid):
    block = sc[sc.index(f"id: '{pid}'"):]; block = block[block.index('events: {'):block.index('} } }') + 5]
    return {m.group(1): m.group(2) for m in re.finditer(r"(\w+): \{[^}]*?ja: '([^']+)'", block)}
def casts(l):
    if 'in' in l: return l['in']
    return ['NI', 'N', 'I'] if 'ev' in l else ['NI', l['who']]
mark = lambda c: ' '.join({'NI': '◎', 'N': 'N', 'I': 'I'}[x] for x in ['NI', 'N', 'I'] if x in c)
out = ['# 台本版（公開ページ）· Scripted preview · 5 places × 3 casts', '',
       '> 生成元：`../lines.js` + `../scenes.js`（このファイルは `python3 scripts/script_md.py` で再生成。直すときは lines.js を直して',
       '> `scripts/voice.py --count` → `scripts/voice.py`）。', '> 人の声は常に温かく、耳元ほど強い（DUAL）。場所の冷熱は scenes.js の amb（常時）と events（数秒）。',
       '> 「どの版」列：◎ = ふたり、N = 信長のみ、I = 家康のみ。ソロ版は同じ人物のふたり版の台詞をそのまま使い、ソロ専用の台詞を少しだけ足す。', '']
for pid, p in S['scenes'].items():
    ev = events(pid)
    out += [f'## {TITLE.get(pid, pid)} (`{pid}`)', '']
    if p.get('topics'): out += ['この場所の話題キーワード：' + '、'.join(f'`{k}`' for k, _ in p['topics']), '']
    for bi, b in enumerate(p['beats']):
        out += [f'### Beat {bi}' + (' · はい／いいえの問い' if b.get('ask') == 'yn' else '') + (' · 締め (final)' if b.get('final') else ''),
                '| どの版 | 話者 | 位置 · 冷熱 | 日本語 | English | 中文 |', '|---|---|---|---|---|---|']
        for l in b['lines']:
            if 'ev' in l: out.append(f'| {mark(casts(l))} | — | 🌡 `{l["ev"]}`：{ev.get(l["ev"], "")}（5 s） | | | |')
            else: out.append(f'| {mark(casts(l))} | {NAME[l["who"]]} `{l["id"]}` | {POS[l["pos"]]} | {l["ja"]} | {l["en"]} | {l["zh"]} |')
        out.append('')
        if not b.get('final'): out += ['→ **あなたの番** → 次のビートの最初の話者がブリッジを一言。', '']
    if any(p['bridges'].values()):
        out += ['この場所だけのブリッジ（共通の同じ種類を置き換える）：', '', '| 話者 | 種類 | 日本語 | English | 中文 |', '|---|---|---|---|---|']
        for who, kinds in p['bridges'].items():
            for k, lst in kinds.items():
                for l in lst: out.append(f'| {NAME[who]} | {k} `{l["id"]}` | {l["ja"]} | {l["en"]} | {l["zh"]} |')
        out.append('')
out += ['## 共通ブリッジ（次のビートを話し始める人が言う · 同じものは一回の会話で二度使わない）', '',
        '話題の判定（上から最初に当たったもの）：leave → no → yes → その場所の話題 → ' + ' → '.join(k for k, _ in S['topics'] if k not in ('leave', 'no', 'yes')) +
        '。yes / no は「はい／いいえ」の問いの後だけ。何も当たらなければ generic、黙っていれば silence。', '']
for who, kinds in S['bridges'].items():
    out += [f'### {NAME[who]}', '| 種類 | 日本語 | English | 中文 |', '|---|---|---|---|']
    for k, lst in kinds.items():
        for l in lst: out.append(f'| {k} `{l["id"]}` | {l["ja"]} | {l["en"]} | {l["zh"]} |')
    out.append('')
open(os.path.join(ROOT, 'project', 'script_scripted.md'), 'w', encoding='utf-8').write('\n'.join(out))
print('written', len(out), 'lines')
