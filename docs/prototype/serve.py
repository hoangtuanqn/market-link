#!/usr/bin/env python3
"""Serves the repo with caching turned off, so an edited screen is the screen you see.

`python3 -m http.server` sends Last-Modified and nothing else, and a browser will happily keep
serving a stale prototype.js or data.js while the HTML is fresh. That makes a review of the
prototype untrustworthy: a screen can look broken because the browser is running yesterday's code.

    python3 docs/prototype/serve.py          # from the repo root, port 8765
    python3 docs/prototype/serve.py 8766     # another port

Then open http://localhost:8765/docs/prototype/index.html
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = partial(NoCacheHandler, directory=".")
    print(f"Serving with no-store on http://localhost:{port} — Ctrl+C to stop")
    ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
