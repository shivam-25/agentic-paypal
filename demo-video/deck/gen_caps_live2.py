#!/usr/bin/env python3
"""Narrative caption bars for the re-recorded live segments (wallet set-up,
micro, macro + PayPal review, capture, dashboard). 1280x100 PNGs at y=620."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "caps2")
os.makedirs(OUT, exist_ok=True)
W, H = 1280, 100
BG = (17, 12, 26, 236)
ACCENT = (179, 142, 255)
FG = (236, 232, 245)

CAPS = [
    ("s1", "Set-up", "type your PayPal email, the agent wallet is created & linked, funded in PyUSD"),
    ("s2", "Micro-payment", "the $12 notebook is under your $20 limit, auto-paid from the wallet"),
    ("s3a", "Macro-payment", "the $39 desk lamp is over the limit, so it needs your PayPal approval"),
    ("s3b", "PayPal review", "you review & approve the $39 order in PayPal — ship to John Doe"),
    ("s3c", "Captured", "approved, $39 settled to the merchant via PayPal"),
    ("s4", "Dashboard", "wallet $13.91 USD · PyUSD — macro $39 + auto-pay micro $12, both logged"),
]

def font(sz, bold=False):
    for p in ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf"]:
        try:
            return ImageFont.truetype(p, sz, index=1 if bold and p.endswith("ttc") else 0)
        except Exception:
            continue
    return ImageFont.load_default()

LEAD = font(30, bold=True)
REST = font(27)

for name, lead, rest in CAPS:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 6, W, H], fill=BG)
    d.rectangle([0, 6, W, 9], fill=(179, 142, 255, 255))
    x, y = 40, 34
    d.text((x, y), lead, font=LEAD, fill=ACCENT)
    lw = d.textlength(lead, font=LEAD)
    d.text((x + lw, y + 2), "   —  " + rest, font=REST, fill=FG)
    img.save(os.path.join(OUT, name + ".png"))
    print("wrote", name)
print("done")
