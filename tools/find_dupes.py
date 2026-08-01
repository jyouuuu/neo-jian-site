#!/usr/bin/env python3
"""
find_dupes.py — detect duplicate and horizontally-flipped wall pieces.

Computes a 16x16 average hash for every image in raw/art-gallery/* and for
its mirror. Reports:
  EXACT  groups sharing the same hash        (duplicates)
  FLIP   pairs where A's flipped hash == B's hash (one is a mirror copy —
         the one whose watermark/signature reads backwards is the bad one)
  NEAR   pairs within hamming distance 5     (near-duplicates: crops/variants)

Print only; nothing is modified.
"""
import itertools
import os

from PIL import Image

ROOT = r"C:/Users/Justin/Desktop/neo-jian-site/raw/art-gallery"
EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif")
NEAR = 5

Image.MAX_IMAGE_PIXELS = 80_000_000


def ahash(img, size=16):
    g = img.convert("L").resize((size, size), Image.LANCZOS)
    px = list(g.getdata())
    avg = sum(px) / len(px)
    bits = 0
    for v in px:
        bits = (bits << 1) | (v > avg)
    return bits


def ham(a, b):
    return bin(a ^ b).count("1")


def main():
    items = []  # (year, stem, path, hash, flip_hash)
    for year in sorted(os.listdir(ROOT)):
        d = os.path.join(ROOT, year)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if os.path.splitext(fn)[1].lower() not in EXTS:
                continue
            p = os.path.join(d, fn)
            try:
                with Image.open(p) as im:
                    h = ahash(im)
                    fh = ahash(im.transpose(Image.FLIP_LEFT_RIGHT))
            except Exception as e:  # noqa: BLE001
                print(f"  !! {p}: {e}")
                continue
            items.append((year, os.path.splitext(fn)[0], p, h, fh))
    print(f"hashed {len(items)} pieces\n")

    # exact dupes
    groups = {}
    for it in items:
        groups.setdefault(it[3], []).append(it)
    print("== EXACT DUPLICATES ==")
    for h, g in groups.items():
        if len(g) > 1:
            print("  " + " | ".join(f"{y}/{s}" for y, s, *_ in g))

    # flip pairs (different pieces, one mirrored) — skip self-match
    print("\n== FLIPPED PAIRS (mirror copies) ==")
    seen = set()
    for a, b in itertools.combinations(items, 2):
        if a[0] == b[0] and a[1] == b[1]:
            continue
        d1 = ham(a[4], b[3])  # a flipped vs b
        if d1 <= 3 and (a[1], b[1]) not in seen:
            seen.add((a[1], b[1]))
            print(f"  {a[0]}/{a[1]}  <->  {b[0]}/{b[1]}   (dist {d1})")

    # near dupes
    print(f"\n== NEAR-DUPLICATES (hamming <= {NEAR}) ==")
    for a, b in itertools.combinations(items, 2):
        if a[3] == b[3]:
            continue
        d = ham(a[3], b[3])
        if d <= NEAR:
            print(f"  {a[0]}/{a[1]}  <->  {b[0]}/{b[1]}   (dist {d})")


if __name__ == "__main__":
    main()
