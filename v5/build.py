#!/usr/bin/env python3
"""
EOS Smart Alert — Build script (React edition)
Produces a single-file HTML suitable for Google Apps Script doGet() or GitHub Pages.

Usage:
    python build.py              → dist/EOS_Smart_Alert.html  (GAS deploy)
    python build.py --pages      → ../../docs/index.html      (GitHub Pages)
    python build.py --watch      → rebuild on change (requires watchdog)
    python build.py --prod       → minify-ready (strips dev React URLs)
"""

import re
import sys
from pathlib import Path

BASE = Path(__file__).parent

# Output target: --pages → docs/index.html at repo root, else dist/
if '--pages' in sys.argv:
    DIST   = BASE.parent / 'docs'
    OUTPUT = DIST / 'index.html'
else:
    DIST   = BASE / 'dist'
    OUTPUT = DIST / 'EOS_Smart_Alert.html'

# Ordered JSX files — load order is critical
JSX_FILES = [
    'src/eos-data.jsx',
    'src/eos-icons.jsx',
    'src/eos-auth.jsx',
    'src/eos-primitives.jsx',
    'src/eos-sentinel.jsx',
    'src/eos-careplan.jsx',
    'src/eos-evidence.jsx',
    'src/eos-cmd.jsx',
    'src/eos-panels.jsx',
    'src/eos-app.jsx',
]

# React CDN URLs (development builds)
REACT_DEV = [
    '<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"',
    '<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"',
    '<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"',
]

REACT_SCRIPTS = '''\
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"
  integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L"
  crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"
  integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm"
  crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"
  integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y"
  crossorigin="anonymous"></script>'''

_LINK_CSS_RE   = re.compile(r'<link[^>]+href="eos\.css"[^>]*>', re.IGNORECASE)
_BABEL_SRC_RE  = re.compile(r'<script[^>]+type="text/babel"[^>]+src="src/[^"]+"[^>]*>\s*</script>', re.IGNORECASE | re.DOTALL)
# Remove CDN <script> blocks (multi-line, with integrity attr)
_REACT_CDN_RE  = re.compile(
    r'<!-- React \+ Babel.*?-->\s*'
    r'(<script src="https://unpkg\.com/(?:react|@babel)[^"]*"[^>]*(?:integrity[^>]*)?>.*?</script>\s*){1,4}',
    re.IGNORECASE | re.DOTALL
)


def build():
    DIST.mkdir(exist_ok=True)

    html = (BASE / 'index.html').read_text(encoding='utf-8')
    css  = (BASE / 'eos.css').read_text(encoding='utf-8')

    # Collect and concatenate JSX files
    parts = []
    for f in JSX_FILES:
        path = BASE / f
        if not path.exists():
            print(f'  [WARN] missing: {f}')
            continue
        parts.append(f'// ──── {f} ────\n' + path.read_text(encoding='utf-8'))
    jsx = '\n\n'.join(parts)

    # 1. Inline CSS
    html = _LINK_CSS_RE.sub(f'<style>\n{css}\n</style>', html)

    # 2. Remove all <script type="text/babel" src="jsx/..."> tags
    html = _BABEL_SRC_RE.sub('', html)

    # 3. Remove CDN comment + React/Babel CDN script blocks, replace with same scripts
    #    (they stay external CDN in GAS deploy — GAS can load external scripts fine)
    html = _REACT_CDN_RE.sub(REACT_SCRIPTS + '\n', html)

    # 4. Insert combined inline JSX just before </body>
    inline = f'<script type="text/babel">\n{jsx}\n</script>'
    html   = html.replace('</body>', f'{inline}\n</body>', 1)

    DIST.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding='utf-8')
    kb = OUTPUT.stat().st_size / 1024
    try:
        label = OUTPUT.relative_to(BASE)
    except ValueError:
        label = OUTPUT
    print(f'  [OK] {label}  ({kb:.1f} KB)')


def watch():
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
        import time
    except ImportError:
        print('pip install watchdog')
        sys.exit(1)

    class H(FileSystemEventHandler):
        def on_modified(self, event):
            p = Path(event.src_path)
            if p.suffix in ('.jsx','.css','.html') and 'dist' not in str(p):
                print(f'  changed: {p.name}')
                try: build()
                except Exception as e: print(f'  [ERR] {e}')

    print('Watching … (Ctrl+C to stop)')
    build()
    obs = Observer()
    obs.schedule(H(), str(BASE), recursive=True)
    obs.start()
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt: obs.stop()
    obs.join()


if __name__ == '__main__':
    print('Building EOS Smart Alert (React edition)…')
    build()
    print('Done.')