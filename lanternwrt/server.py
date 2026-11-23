"""LanternWrt's local HTTP server."""
import argparse
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from .router import RouterError, apply_wifi, read_router, rpc

STATIC = Path(__file__).with_name("static")
DEMO = Path(__file__).with_name("demo.json")
ASSETS = {"/": ("index.html", "text/html"), "/app.js": ("app.js", "text/javascript"),
          "/styles.css": ("styles.css", "text/css"), "/lantern.svg": ("lantern.svg", "image/svg+xml")}


class State:
    def __init__(self, demo, origins):
        self.demo = demo
        self.origins = origins
        self.writes = not demo and os.environ.get("LANTERN_ENABLE_WRITES") == "1"
        self.read_lock = threading.Lock()
        self.write_lock = threading.Lock()
        self.cached = None
        self.cached_at = 0
        self.pending = None

    def status(self):
        with self.read_lock:
            now = time.monotonic()
            if now - self.cached_at >= 3 or self.cached is None:
                data = json.loads(DEMO.read_text()) if self.demo else read_router()
                self.cached = {**data, "demo": self.demo, "writes": self.writes, "sampledAt": time.time()}
                self.cached_at = now
            return self.cached

    def wifi(self, action, data):
        if not self.writes:
            raise PermissionError
        with self.write_lock:
            now = time.monotonic()
            if self.pending and self.pending[1] <= now:
                self.pending = None
            if action == "apply":
                if self.pending:
                    raise BlockingIOError
                start = time.monotonic()
                self.pending = (apply_wifi(data.get("id"), data.get("values")), start + 60)
            else:
                if not self.pending:
                    raise BlockingIOError
                rpc("uci", action, {"ubus_rpc_session": self.pending[0]})
                self.pending = None
            self.cached_at = 0
            return {"remaining": max(0, round(self.pending[1] - time.monotonic())) if self.pending else 0,
                    "pending": self.pending is not None}


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(16)

    def log_message(self, *_):
        pass

    def reply(self, status, content, mime="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", mime + ("" if mime == "image/svg+xml" else "; charset=utf-8"))
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(content)

    def json(self, status, data):
        self.reply(status, json.dumps(data, ensure_ascii=False).encode())

    def accepted_host(self):
        return any(self.headers.get("Host") == urlsplit(origin).netloc for origin in self.server.state.origins)

    def do_GET(self):
        if not self.accepted_host():
            return self.json(403, {"error": "forbidden"})
        path = urlsplit(self.path).path
        if path == "/api/status":
            try:
                return self.json(200, self.server.state.status())
            except (RouterError, ValueError, KeyError, OSError):
                return self.json(502, {"error": "router_unavailable"})
        if path in ASSETS:
            file, mime = ASSETS[path]
            return self.reply(200, (STATIC / file).read_bytes(), mime)
        self.json(404, {"error": "not_found"})

    def do_POST(self):
        origin = self.headers.get("Origin")
        if not self.accepted_host() or origin not in self.server.state.origins or urlsplit(origin).netloc != self.headers.get("Host"):
            return self.json(403, {"error": "forbidden"})
        actions = {"/api/wifi/apply": "apply", "/api/wifi/confirm": "confirm", "/api/wifi/rollback": "rollback"}
        action = actions.get(self.path)
        if action is None:
            return self.json(404, {"error": "not_found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 1 <= size <= 4096 or self.headers.get_content_type() != "application/json":
                raise ValueError
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError
            return self.json(200, self.server.state.wifi(action, data))
        except ValueError:
            return self.json(400, {"error": "invalid_config"})
        except PermissionError:
            return self.json(403, {"error": "read_only"})
        except BlockingIOError:
            return self.json(409, {"error": "pending_conflict"})
        except (RouterError, OSError, KeyError):
            return self.json(502, {"error": "router_unavailable"})


def main():
    parser = argparse.ArgumentParser(description="Launch the LanternWrt WebUI")
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument("--router", action="store_true", help="use LANTERN_SSH_TARGET instead of demo data")
    args = parser.parse_args()
    if args.router and not os.environ.get("LANTERN_SSH_TARGET"):
        parser.error("--router requires LANTERN_SSH_TARGET")
    origins = {f"http://127.0.0.1:{args.port}", f"http://localhost:{args.port}"}
    extra = os.environ.get("LANTERN_ORIGIN")
    if extra:
        parsed = urlsplit(extra)
        if (parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path
                or parsed.query or parsed.fragment or parsed.username is not None):
            parser.error("LANTERN_ORIGIN must be an HTTP(S) origin without a path")
        origins.add(extra)
    with ThreadingHTTPServer((args.bind, args.port), Handler) as server:
        server.state = State(not args.router, origins)
        print(f"LanternWrt listening on {args.bind}:{args.port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
