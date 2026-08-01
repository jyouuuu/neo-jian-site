#!/usr/bin/env python3
"""contact_sheets.py — build labeled review grids of the wall pieces so
NSFW / WIP / duplicates can be eyeballed fast. Output to Windows TEMP."""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:/Users/Justin/Desktop/neo-jian-site"
OUT = r"C:/Users/Justin/AppData/Local/Temp/jian_review"
CELL = 300
COLS = 5
PAD = 26  # label strip under each cell

Image.MAX_IMAGE_PIXELS = 80_000_000


def sheets_for(year):
    src = os.path.join(ROOT, "raw", "art-gallery", year)
    if not os.path.isdir(src):
        return
    files = sorted(os.listdir(src))
    os.makedirs(OUT, exist_ok=True)
    try:
        font = ImageFont.load_default(size=16)
    except TypeError:
        font = ImageFont.load_default()
    per = COLS * 5
    for si in range(0, len(files), per):
        batch = files[si : si + per]
        rows = (len(batch) + COLS - 1) // COLS
        W = COLS * CELL
        H = rows * (CELL + PAD)
        sheet = Image.new("RGB", (W, H), (18, 10, 40))
        d = ImageDraw.Draw(sheet)
        for k, fn in enumerate(batch):
            x = (k % COLS) * CELL
            y = (k // COLS) * (CELL + PAD)
            try:
                with Image.open(os.path.join(src, fn)) as im:
                    im = im.convert("RGB")
                    im.thumbnail((CELL - 8, CELL - 8), Image.BILINEAR)
                    sheet.paste(im, (x + (CELL - im.width) // 2, y + (CELL - im.height) // 2))
            except Exception as e:  # noqa: BLE001
                d.text((x + 6, y + 6), f"[ERR {e}]", fill=(255, 80, 80), font=font)
            d.text((x + 4, y + CELL + 4), fn[:34], fill=(255, 230, 120), font=font)
        out = os.path.join(OUT, f"{year}_sheet{si//per:02d}.png")
        sheet.save(out, optimize=True)
        print(out)


if __name__ == "__main__":
    for y in sys.argv[1:] or ["2025"]:
        sheets_for(y)
