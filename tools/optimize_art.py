#!/usr/bin/env python3
"""
optimize_art.py — jiansketch-site
Reads the raw neocities download in ./raw and produces the web-ready set:

  art/full/<year>/<name>.webp    long edge max 2200px, q85 (gifs copied as-is)
  art/thumbs/<year>/<name>.webp  480px center-crop square, q80
  data/art.js                    window.JIAN_ART manifest (newest first)

Re-run any time; it skips files that already exist.
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # jiansketch-site/
RAW = os.path.join(ROOT, "raw", "art-gallery")
OUT_FULL = os.path.join(ROOT, "art", "full")
OUT_THUMB = os.path.join(ROOT, "art", "thumbs")
DATA = os.path.join(ROOT, "data")

FULL_EDGE = 2200
THUMB_EDGE = 480
YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "grunge", "tt"]

Image.MAX_IMAGE_PIXELS = 80_000_000

# July 2026 review — not explicit, but suggestive (bikini/pinup/cleavage-heavy).
# Hidden when the visitor flips the SUGGESTIVE toggle off. Keys: "<year>/<stem>".
# Aug 2026 — Justin's WALL REVIEW pass: everything he marked _suggestive.
SUGGESTIVE = {
    "2025/brazil", "2025/doki", "2025/sqqq", "2025/squi2", "2025/venom2",
    "2025/burn", "2025/bunny_magic", "2025/kikuri", "2025/book", "2025/blud",
    "2025/gift1", "2025/mag", "2025/kik", "2025/kikkk", "2025/lineeeee",
    "2025/oc", "2025/SGSTICKER", "2025/SQUIRREL_STICKER", "2025/magiksquirrel",
    "2024/12", "2024/38", "2024/75", "2024/76", "2024/84", "2024/96",
    "2024/101", "2024/104", "2024/118",
    # WALL REVIEW marks (Aug 2026)
    "2024/128", "2024/17", "2024/63", "2024/9", "2024/91",
    "2025/gift", "2025/grill", "2025/meiow", "2025/skully_ly_001",
    "2025/sqauirbvc", "2025/vale", "2025/witches_final", "2025/ws_sketch",
}


def out_year(y):
    return "PROJ" if y in ("grunge", "tt") else y


def process(year, fname):
    src = os.path.join(RAW, year, fname)
    stem, ext = os.path.splitext(fname)
    ext = ext.lower()
    label = f"{out_year(year)}/{stem}" if year in ("grunge", "tt") else f"{year}/{stem}"

    full_rel = f"art/full/{out_year(year)}/{stem}.webp"
    thumb_rel = f"art/thumbs/{out_year(year)}/{stem}.webp"
    full_abs = os.path.join(ROOT, full_rel)
    thumb_abs = os.path.join(ROOT, thumb_rel)
    os.makedirs(os.path.dirname(full_abs), exist_ok=True)
    os.makedirs(os.path.dirname(thumb_abs), exist_ok=True)

    animated = ext == ".gif"
    if animated:
        # keep the animation — copy bytes, reference the gif directly
        import shutil

        full_rel = f"art/full/{out_year(year)}/{stem}.gif"
        full_abs = os.path.join(ROOT, full_rel)
        if not os.path.exists(full_abs):
            shutil.copyfile(src, full_abs)

    w = h = None
    try:
        with Image.open(src) as im:
            w, h = im.size
            if not os.path.exists(full_abs) and not animated:
                im2 = im.convert("RGB")
                if max(im2.size) > FULL_EDGE:
                    im2.thumbnail((FULL_EDGE, FULL_EDGE), Image.LANCZOS)
                im2.save(full_abs, "WEBP", quality=85, method=6)
            if not os.path.exists(thumb_abs):
                im3 = im.convert("RGB")
                # center-crop square
                side = min(im3.size)
                left = (im3.width - side) // 2
                top = (im3.height - side) // 2
                im3 = im3.crop((left, top, left + side, top + side))
                im3 = im3.resize((THUMB_EDGE, THUMB_EDGE), Image.LANCZOS)
                im3.save(thumb_abs, "WEBP", quality=80, method=6)
    except Exception as e:  # noqa: BLE001
        print(f"  !! {label}: {e}", file=sys.stderr)
        return None

    rec = {"t": thumb_rel, "f": full_rel, "y": out_year(year), "n": stem, "w": w, "h": h,
           "sug": 1 if f"{out_year(year)}/{stem}" in SUGGESTIVE else 0}
    if year in ("grunge", "tt"):
        rec["p"] = year  # which project — wall.js splits PROJ into sub-grids
    return rec


def sort_key(p):
    # newest era first; numeric stems descending, named stems alphabetical.
    # PROJ sorts grunge first, then tt, each in source order (numbered stems).
    year_order = {"2026": 0, "2025": 1, "2024": 2, "2023": 3, "2022": 4, "2021": 5, "2020": 6, "PROJ": 7}
    if p["y"] == "PROJ":
        return (7, {"grunge": 0, "tt": 1}.get(p.get("p"), 2), p["n"])
    try:
        num = -int(p["n"])
        name = ""
    except ValueError:
        num = 0
        name = p["n"]
    return (year_order.get(p["y"], 9), num, name)


def main():
    pieces = []
    for year in YEARS:
        d = os.path.join(RAW, year)
        if not os.path.isdir(d):
            print(f"  .. skipping {year} (no folder)")
            continue
        for fname in sorted(os.listdir(d)):
            if os.path.splitext(fname)[1].lower() not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
                continue
            rec = process(year, fname)
            if rec:
                pieces.append(rec)
        print(f"  {year}: done")

    # newest year first, then descending piece number
    pieces.sort(key=sort_key)

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "art.js"), "w", encoding="utf-8") as f:
        f.write("// generated by tools/optimize_art.py — do not hand-edit\n")
        f.write("window.JIAN_ART = ")
        f.write(json.dumps(pieces, separators=(",", ":")))
        f.write(";\n")
    print(f"manifest: {len(pieces)} pieces -> data/art.js")


if __name__ == "__main__":
    main()
