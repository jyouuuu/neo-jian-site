#!/usr/bin/env python3
"""
build_posts.py — the blog pipeline.

WORKFLOW (same as the art pipeline):
  1. Make a folder:  posts/YYYY-MM-DD-my-title/
  2. Write post.txt: first line = title, rest = body.
     Blank line = new paragraph.  @img filename.png  embeds an image inline.
     Any images not mentioned are appended after the body, in filename order.
  3. Drop images next to post.txt (png/jpg/webp/gif).
  4. Run this script.

Outputs:
  assets/posts/<slug>/   optimized webp images (max edge 1600, q82)
  data/posts.js          window.JIAN_POSTS (newest first) + window.JIAN_NOW
  feed.xml               RSS 2.0 feed (absolute https://jiansketch.com URLs)

posts/NOW.txt is optional — one line, shown in the NOW box on home/blog.
"""
import datetime
import html
import json
import os
import re

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "posts")
OUT_IMG = os.path.join(ROOT, "assets", "posts")
DATA = os.path.join(ROOT, "data")
SITE = "https://jiansketch.com"
EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif")
MAX_EDGE = 1600

Image.MAX_IMAGE_PIXELS = 80_000_000

FOLDER_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})-(.+)$")
IMG_RE = re.compile(r"^@img\s+(\S+)\s*$")


def opt_image(src, dst_dir, stem):
    os.makedirs(dst_dir, exist_ok=True)
    ext = os.path.splitext(src)[1].lower()
    if ext == ".gif":
        import shutil
        dst = os.path.join(dst_dir, stem + ".gif")
        if not os.path.exists(dst):
            shutil.copyfile(src, dst)
        return os.path.basename(dst)
    dst = os.path.join(dst_dir, stem + ".webp")
    if not os.path.exists(dst):
        with Image.open(src) as im:
            im = im.convert("RGB")
            if max(im.size) > MAX_EDGE:
                im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            im.save(dst, "WEBP", quality=82, method=6)
    return stem + ".webp"


def parse_post(folder):
    m = FOLDER_RE.match(folder)
    if not m:
        return None
    y, mo, d, slug = m.groups()
    pdir = os.path.join(SRC, folder)
    txt_path = os.path.join(pdir, "post.txt")
    if not os.path.isfile(txt_path):
        return None
    raw = open(txt_path, encoding="utf-8").read().strip("\n").split("\n")
    title = raw[0].strip()
    lines = raw[1:]

    used = set()
    body = []          # list of ("p", text) or ("img", src)
    para = []

    def flush():
        if para:
            body.append(("p", " ".join(x.strip() for x in para).strip()))
            para.clear()

    for line in lines:
        im = IMG_RE.match(line.strip())
        if im:
            flush()
            used.add(im.group(1))
            body.append(("img", im.group(1)))
        elif line.strip() == "":
            flush()
        else:
            para.append(line)
    flush()

    # leftover images, filename order
    imgs = sorted(f for f in os.listdir(pdir) if os.path.splitext(f)[1].lower() in EXTS)
    for f in imgs:
        if f not in used:
            body.append(("img", f))
            used.add(f)

    # optimize all used images
    out_dir = os.path.join(OUT_IMG, folder)
    mapped = []
    for kind, val in body:
        if kind == "img":
            try:
                name = opt_image(os.path.join(pdir, val), out_dir, os.path.splitext(val)[0])
                mapped.append(("img", f"assets/posts/{folder}/{name}"))
            except Exception as e:  # noqa: BLE001
                print(f"  !! {folder}/{val}: {e}")
        else:
            mapped.append(("p", val))

    excerpt = next((v for k, v in mapped if k == "p"), "")
    return {
        "id": "p-" + folder,
        "slug": folder,
        "date": f"{y}-{mo}-{d}",
        "title": title,
        "body": mapped,
        "excerpt": excerpt,
    }


def rss(posts):
    items = []
    for p in posts:
        link = f"{SITE}/blog#{p['id']}"
        desc = html.escape(p["excerpt"])
        dt = datetime.datetime.strptime(p["date"], "%Y-%m-%d")
        pub = dt.strftime("%a, %d %b %Y 09:00:00 +0000")
        items.append(
            f"    <item>\n"
            f"      <title>{html.escape(p['title'])}</title>\n"
            f"      <link>{link}</link>\n"
            f"      <guid isPermaLink=\"true\">{link}</guid>\n"
            f"      <pubDate>{pub}</pubDate>\n"
            f"      <description>{desc}</description>\n"
            f"    </item>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" ?>\n'
        '<rss version="2.0">\n  <channel>\n'
        "    <title>jiansketch.com</title>\n"
        f"    <link>{SITE}/blog</link>\n"
        "    <description>fast food for your eyes — the jiansketch blog</description>\n"
        "    <language>en-us</language>\n"
        + "\n".join(items)
        + "\n  </channel>\n</rss>\n"
    )


def main():
    posts = []
    if os.path.isdir(SRC):
        for folder in sorted(os.listdir(SRC), reverse=True):
            rec = parse_post(folder)
            if rec:
                posts.append(rec)
                print(f"  {rec['date']}  {rec['title']}")

    now = ""
    now_path = os.path.join(SRC, "NOW.txt")
    if os.path.isfile(now_path):
        now = open(now_path, encoding="utf-8").read().strip()

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "posts.js"), "w", encoding="utf-8") as f:
        f.write("// generated by tools/build_posts.py — edit posts/<date-slug>/post.txt instead\n")
        f.write("window.JIAN_POSTS = ")
        f.write(json.dumps(posts, ensure_ascii=False, separators=(",", ":")))
        f.write(";\nwindow.JIAN_NOW = ")
        f.write(json.dumps(now, ensure_ascii=False))
        f.write(";\n")
    with open(os.path.join(ROOT, "feed.xml"), "w", encoding="utf-8") as f:
        f.write(rss(posts))
    print(f"posts: {len(posts)} -> data/posts.js + feed.xml")


if __name__ == "__main__":
    main()
