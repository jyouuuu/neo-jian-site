"""Counted short links for the bios: jiansketch.com/club, /shop, /vgen ... (Nov 13 2026).

(Justin: "help me build click through rate for all my links and who is actually clicking on sites, why they are
clicking, what posts are getting them to click and most importantly what they are clicking".)

Every bio pointed straight at Patreon, the shop or VGen, so nothing counted a tap. Each link below is a tiny page that
counts ONE visit in the site's Google Analytics (property G-NRPNK1EVQ2, the same one as the shop) and then sends the
person on. The Post Scheduler's "Link clicks" page reads those counts back.

What the page works out before it sends the visit, in this order:
  1. an explicit tag on the link:  jiansketch.com/shop?bsky   (Bluesky's app sends no referrer, so it needs one)
  2. Instagram's own tags (it adds utm_source=ig to every bio link by itself)
  3. the app's browser (Instagram, TikTok, Facebook, Threads, X, Discord, Reddit, Snapchat say so in their user agent)
  4. the referrer (t.co is X, youtube.com is YouTube, ...)
  5. otherwise "direct"
It sends that as utm_source, utm_medium=link, utm_campaign=links, utm_content=<slug> on the counted page view, and adds
the same tags to the destination, so the shop's own Analytics knows which profile sent the person in.

Run it after changing LINKS:  python tools/make_links.py   (writes the pages, data/links.json and the privacy note).
Safe to run again.
"""
import html
import json
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
GA_ID = "G-NRPNK1EVQ2"
UPDATED = "2026-11-13"

# slug, where it goes, what the page says while it opens, short name of the destination (the Post Scheduler shows it)
LINKS = [
    ("club", "https://www.patreon.com/jiansketch", "the Sticker Club on Patreon", "Patreon"),
    ("patreon", "https://www.patreon.com/jiansketch", "Patreon", "Patreon"),
    ("shop", "https://jiansketch.bigcartel.com/", "the shop", "Shop"),
    ("vgen", "https://vgen.co/jiansketch", "commissions on VGen", "VGen"),
    ("youtube", "https://www.youtube.com/@jiansketch", "YouTube", "YouTube"),
    ("x", "https://x.com/jiansketch", "X", "X"),
]

# short tags a link can carry (?bsky), for apps that hide where a tap came from
TAGS = {"bsky": "bluesky", "bs": "bluesky", "x": "x", "ig": "instagram", "tt": "tiktok", "yt": "youtube", "fb": "facebook",
        "th": "threads", "dc": "discord", "rd": "reddit", "em": "email", "qr": "qr"}

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>jiansketch · {name}</title>
<!-- counted short link (Nov 13 2026), made by tools/make_links.py: one visit in Google Analytics, then on to
     {dest}. Explained on /privacy. Do not edit by hand, run the script. -->
<meta name="robots" content="noindex" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
<link rel="icon" type="image/png" href="/assets/img/favicon.png" />
<meta property="og:title" content="jiansketch · {name}" />
<meta property="og:description" content="Fast food for your eyes" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://jiansketch.com/{slug}" />
<meta property="og:image" content="https://jiansketch.com/assets/img/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://www.googletagmanager.com" />
<link rel="preconnect" href="https://www.google-analytics.com" />
<noscript><meta http-equiv="refresh" content="0;url={dest_attr}" /></noscript>
<style>
  html, body {{ margin: 0; height: 100%; background: #000; color: #fff; }}
  body {{ display: grid; place-items: center; font: 600 17px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }}
  a {{ color: #ff2ea6; }}
</style>
<script>
(function () {{
  var SLUG = {slug_js}, DEST = {dest_js}, GA = {ga_js};
  var TAGS = {tags_js};
  var q = new URLSearchParams(location.search), ua = navigator.userAgent || "", ref = "";
  try {{ ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\\./, "") : ""; }} catch (e) {{}}
  function endsWith(host, d) {{ return host === d || host.slice(-(d.length + 1)) === "." + d; }}
  var src = "";
  q.forEach(function (v, k) {{ if (!src && !v && TAGS[k]) src = TAGS[k]; }});
  if (!src && TAGS[q.get("src") || ""]) src = TAGS[q.get("src")];
  if (!src && q.get("utm_source")) src = q.get("utm_source").toLowerCase() === "ig" ? "instagram" : q.get("utm_source").toLowerCase();
  if (!src) {{
    var apps = [[/Instagram/, "instagram"], [/musical_ly|BytedanceWebview|TikTok|trill_/, "tiktok"], [/FBAN|FBAV|FB_IAB|FBIOS/, "facebook"],
                [/Barcelona/, "threads"], [/Twitter/, "x"], [/Discord/, "discord"], [/Reddit/, "reddit"], [/Snapchat/, "snapchat"]];
    for (var i = 0; i < apps.length && !src; i++) if (apps[i][0].test(ua)) src = apps[i][1];
  }}
  if (!src && ref) {{
    var sites = [["t.co", "x"], ["x.com", "x"], ["twitter.com", "x"], ["instagram.com", "instagram"], ["tiktok.com", "tiktok"],
                 ["youtube.com", "youtube"], ["youtu.be", "youtube"], ["bsky.app", "bluesky"], ["facebook.com", "facebook"],
                 ["threads.net", "threads"], ["threads.com", "threads"], ["discord.com", "discord"], ["reddit.com", "reddit"],
                 ["patreon.com", "patreon"], ["vgen.co", "vgen"], ["jiansketch.com", "site"], ["jiansketch.bigcartel.com", "shop"]];
    for (var j = 0; j < sites.length && !src; j++) if (endsWith(ref, sites[j][0])) src = sites[j][1];
    if (!src && /(^|\\.)google\\./.test(ref)) src = "google";
    if (!src) src = ref.slice(0, 60);
  }}
  src = (src || "direct").replace(/[^a-z0-9._-]/gi, "").slice(0, 60) || "direct";
  var tags = "utm_source=" + encodeURIComponent(src) + "&utm_medium=link&utm_campaign=links&utm_content=" + SLUG;
  var out = DEST + (DEST.indexOf("?") < 0 ? "?" : "&") + tags, gone = false;
  function go() {{ if (!gone) {{ gone = true; location.replace(out); }} }}
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {{ dataLayer.push(arguments); }};
  gtag("js", new Date());
  var here = "https://jiansketch.com/" + SLUG + "?" + tags;
  gtag("config", GA, {{ send_page_view: false, page_location: here }});
  gtag("event", "page_view", {{ page_location: here, page_title: "link " + SLUG, transport_type: "beacon",
                               event_callback: go, event_timeout: 1200 }});
  var s = document.createElement("script");
  s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA; s.onerror = go;
  document.head.appendChild(s);
  setTimeout(go, 2000);
}})();
</script>
</head>
<body>
<p>Opening <a href="{dest_attr}">{name_html}</a></p>
</body>
</html>
"""

PRIVACY_MARK = "<!-- short links (Nov 13 2026) -->"
PRIVACY_NOTE = f"""        {PRIVACY_MARK}
        <h3>Short links</h3>
        <p>Links like jiansketch.com/shop and jiansketch.com/club are how I count which of my profiles send people to the shop, Patreon, VGen and YouTube. On the way through, the page counts one visit in Google Analytics (which link it was, the app or site it was tapped in, and the rough location and device Analytics works out by itself), then sends you on. It does not see what you do on the next site.</p>
"""


def page(slug, dest, name):
    js = lambda v: json.dumps(v, ensure_ascii=False)  # noqa: E731
    return PAGE.format(slug=slug, name=html.escape(name), name_html=html.escape(name), dest=dest,
                       dest_attr=html.escape(dest, quote=True), slug_js=js(slug), dest_js=js(dest), ga_js=js(GA_ID),
                       tags_js=js(TAGS))


def main():
    for slug, dest, name, _goes in LINKS:
        (SITE / f"{slug}.html").write_text(page(slug, dest, name), encoding="utf-8", newline="\n")
        print("wrote", f"{slug}.html")
    data = {"updated": UPDATED, "ga": GA_ID, "tags": TAGS,
            "links": [{"slug": s, "url": f"https://jiansketch.com/{s}", "dest": d, "name": n, "goes": g} for s, d, n, g in LINKS]}
    (SITE / "data" / "links.json").write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print("wrote data/links.json")
    priv = SITE / "privacy.html"
    text = priv.read_bytes().decode("utf-8")  # bytes, so the file keeps its own line endings
    if PRIVACY_MARK not in text:
        anchor = "        <h3>Commission requests</h3>"
        if anchor not in text:
            raise SystemExit("privacy.html changed shape: add the short links note by hand")
        nl = "\r\n" if "\r\n" in text else "\n"
        text = text.replace(anchor, PRIVACY_NOTE.replace("\n", nl) + nl + anchor, 1)
        priv.write_bytes(text.encode("utf-8"))
        print("added the short links note to privacy.html")
    else:
        print("privacy.html already has the note")


if __name__ == "__main__":
    main()
