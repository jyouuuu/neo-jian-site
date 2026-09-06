"""Local preview server for jiansketch.com with the same URL rule as GitHub Pages:
/about serves about.html, / serves index.html. (Sep 5 2026, Justin: "drop the
.html in the url for each page" -- python -m http.server can't do the fallback,
so every local preview goes through this.)   usage: python tools/serve.py [port]"""
import http.server, os, socketserver, sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p) and not os.path.splitext(p)[1] and os.path.isfile(p + ".html"):
            return p + ".html"
        return p

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    os.chdir(SITE)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), CleanURLHandler) as httpd:
        print("serving %s on http://localhost:%d" % (SITE, PORT))
        httpd.serve_forever()
