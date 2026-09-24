#!/usr/bin/env python3
"""Collects every data-todo="…" marker in the prototype screens into todos.js, which index.html renders.
Run it after editing a screen:  python3 docs/prototype/collect-todos.py"""
import re, json, pathlib, html
root = pathlib.Path(__file__).parent
out = []
for role in ['public', 'customer', 'farmer', 'admin']:
    for f in sorted((root / role).glob('*.html')):
        s = f.read_text(encoding='utf-8')
        title = re.search(r'<title>(.*?) — MarketLink prototype</title>', s).group(1)
        for m in re.finditer(r'data-todo="([^"]+)"', s):
            out.append({'role': role, 'file': f.name, 'screen': title, 'text': html.unescape(m.group(1))})
(root / 'todos.js').write_text('window.PT_TODOS = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
print(len(out), 'open questions written to todos.js')
