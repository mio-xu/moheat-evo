#!/usr/bin/env python3
"""?v= content hashes in ONE demo's own pages only: python3 tools/web/bump_page.py <demo folder> (a demo being built: leaves every other page alone; bump.py --auto <shared file> rewrites ALL pages that use it — guide §11.1)."""
import hashlib,os,re,sys
d=os.path.abspath(sys.argv[1])
for page in ['index.html','live/index.html']:
    p=os.path.join(d,page)
    if not os.path.exists(p): continue
    base=d if page=='index.html' else d
    s=open(p,encoding='utf-8').read()
    def r(m):
        f=os.path.normpath(os.path.join(base,m.group(1)))
        if not os.path.exists(f): return m.group(0)
        return m.group(1)+'?v='+hashlib.sha1(open(f,'rb').read()).hexdigest()[:8]
    n=re.sub(r'((?:\.\./)*[\w./-]+\.(?:js|css))\?v=\w+',r,s)
    if n!=s: open(p+'.tmp','w',encoding='utf-8').write(n); os.replace(p+'.tmp',p); print('bumped',page)
