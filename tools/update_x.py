#!/usr/bin/env python3
"""
update_x.py — refresh the "latest post" card data.

Two sources, newest post wins:
  1. X public syndication timeline for @jiansketch (no API key needed) —
     BUT since ~April 2026 it serves months-stale data and 429-blocks most
     requests, so it usually loses.
  2. Bluesky public API for @jiansketch.com (same art, posted daily,
     reliable, no auth) — the workhorse.

Writes:
  data/xpost.js            window.JIAN_XPOST = {text, date, link, media, avatar, user, net}
  assets/img/x_avatar.jpg  (profile avatar, refreshed if changed)

Run it any time:  python tools/update_x.py
Also runs daily via .github/workflows/update-x.yml.
"""
import json
import os
import re
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USER = "jiansketch"
TIMELINE = f"https://syndication.twitter.com/srv/timeline-profile/screen-name/{USER}?dnt=true"
BSKY_HANDLE = "jiansketch.com"
BSKY_FEED = (
    "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed"
    f"?actor={BSKY_HANDLE}&filter=posts_no_replies&limit=20"
)

TWEET_RE = re.compile(
    r'"created_at":"(?P<date>[^"]+)".*?"full_text":"(?P<text>(?:\\.|[^"\\])*)","id_str":"(?P<id>\d+)"',
    re.S,
)
MEDIA_RE = re.compile(r'"media_url_https":"(?P<u>(?:\\.|[^"\\])*)"')
AVATAR_RE = re.compile(r'"profile_image_url_https":"(?P<u>(?:\\.|[^"\\])*)"')


def fetch(url, tries=4):
    import time
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and k < tries - 1:
                time.sleep(6 * (k + 1) ** 2)  # 6s, 24s, 54s
                continue
            raise


def unescape(s):
    return s.encode().decode("unicode_escape")


def latest_from_x(blob):
    """Parse the syndication blob → candidate dict, or None."""
    # only tweets whose permalink belongs to the account (skips retweets/others)
    my_ids = set(re.findall(rf'"permalink":"/{USER}/status/(\d+)"', blob))
    tweets = []
    for m in TWEET_RE.finditer(blob):
        tid = m.group("id")
        if tid not in my_ids:
            continue
        date = m.group("date")
        text = unescape(m.group("text"))
        tweets.append((date, text, tid, m.start()))

    if not tweets:
        print("  x: no tweets parsed — syndication format changed?")
        return None

    from email.utils import parsedate_to_datetime
    tweets.sort(key=lambda t: parsedate_to_datetime(t[0]), reverse=True)
    date, text, tid, pos = tweets[0]

    # media lives in this tweet's own entities block (between created_at and full_text)
    media = ""
    for mm in MEDIA_RE.finditer(blob, pos, pos + 20000):
        media = unescape(mm.group("u"))
        break
    if media:
        media = re.sub(r"\\/", "/", media) + "?name=small"

    avatar_url = ""
    am = AVATAR_RE.search(blob)
    if am:
        avatar_url = unescape(am.group("u")).replace("\\/", "/").replace("_normal", "_200x200")

    # strip trailing t.co media link from text (it's the image itself)
    text = re.sub(r"\s*https://t\.co/\S+\s*$", "", text).strip()

    return {
        "when": parsedate_to_datetime(date),
        "text": text,
        "link": f"https://x.com/{USER}/status/{tid}",
        "media": media,
        "avatar_url": avatar_url,
        "user": USER,
        "net": "x",
    }


def latest_from_bsky():
    """Newest original post (no reposts/replies) from the Bluesky feed, or None."""
    try:
        feed = json.loads(fetch(BSKY_FEED).decode("utf-8"))["feed"]
    except Exception as e:  # noqa: BLE001
        print("  bsky: feed fetch failed:", e)
        return None

    for item in feed:
        if "reason" in item:  # repost of someone/something else
            continue
        post = item.get("post", {})
        rec = post.get("record", {})
        when = rec.get("createdAt", "")
        try:
            when = datetime.fromisoformat(when.replace("Z", "+00:00"))
        except ValueError:
            continue

        # thumbnail: image post → first image, video post → its poster frame
        media = ""
        embed = post.get("embed", {})
        etype = embed.get("$type", "")
        if etype.startswith("app.bsky.embed.images"):
            media = embed.get("images", [{}])[0].get("thumb", "")
        elif etype.startswith("app.bsky.embed.video"):
            media = embed.get("thumbnail", "")
        elif etype.startswith("app.bsky.embed.external"):
            media = embed.get("external", {}).get("thumb", "")

        rkey = post.get("uri", "").rsplit("/", 1)[-1]
        return {
            "when": when,
            "text": rec.get("text", "").strip(),
            "link": f"https://bsky.app/profile/{BSKY_HANDLE}/post/{rkey}",
            "media": media,
            "avatar_url": post.get("author", {}).get("avatar", ""),
            "user": BSKY_HANDLE,
            "net": "bsky",
        }

    print("  bsky: no original posts in feed")
    return None


def main():
    import sys
    blob = None
    if "--from-file" in sys.argv:
        blob = open(sys.argv[sys.argv.index("--from-file") + 1], encoding="utf-8", errors="replace").read()
    else:
        try:
            blob = fetch(TIMELINE).decode("utf-8", errors="replace")
        except (urllib.error.HTTPError, urllib.error.URLError) as e:
            # X rate-limits GitHub's runner IPs most days (daily 429s since
            # Aug 1 2026) — Bluesky carries the card when that happens.
            print(f"  x: timeline fetch blocked ({e})")

    candidates = []
    if blob:
        c = latest_from_x(blob)
        if c:
            candidates.append(c)
    c = latest_from_bsky()
    if c:
        candidates.append(c)

    if not candidates:
        # both sources down: keep the last known post and exit green —
        # a stale card beats a failed workflow.
        if os.path.exists(os.path.join(ROOT, "data", "xpost.js")):
            print("both sources unavailable; keeping existing data/xpost.js")
            return
        raise SystemExit("both sources unavailable and no existing card data")

    best = max(candidates, key=lambda c: c["when"])

    avatar_rel = ""
    if best["avatar_url"]:
        avatar_path = os.path.join(ROOT, "assets", "img", "x_avatar.jpg")
        try:
            data = fetch(best["avatar_url"])
            if not os.path.exists(avatar_path) or open(avatar_path, "rb").read() != data:
                open(avatar_path, "wb").write(data)
            avatar_rel = "assets/img/x_avatar.jpg"
        except Exception as e:  # noqa: BLE001
            print("  avatar fetch failed:", e)
            if os.path.exists(avatar_path):
                avatar_rel = "assets/img/x_avatar.jpg"

    out = {
        "text": best["text"],
        "date": best["when"].astimezone(timezone.utc).strftime("%Y-%m-%d"),
        "link": best["link"],
        "media": best["media"],
        "avatar": avatar_rel,
        "user": best["user"],
        "net": best["net"],
    }
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "xpost.js"), "w", encoding="utf-8") as f:
        f.write("// generated by tools/update_x.py — do not hand-edit\n")
        f.write("window.JIAN_XPOST = ")
        f.write(json.dumps(out, ensure_ascii=False, indent=2))
        f.write(";\n")
    print(f"latest post [{best['net']}] {out['date']}: {best['text'][:60]!r} media={'yes' if best['media'] else 'no'}")


if __name__ == "__main__":
    main()
