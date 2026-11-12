#!/usr/bin/env python3
"""Render v4 caption bars (1280x100 PNGs with alpha) for the live recording.
Each bar sits at y=620 so it also covers the browser-extension button. No drawtext
in this ffmpeg build, so captions are PNG overlays composited with `overlay`."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "caps")
os.makedirs(OUT, exist_ok=True)

W, H = 1280, 100
BG = (17, 12, 26, 235)      # near-opaque dark bar
ACCENT = (179, 142, 255)    # PyUSD/PayPal-ish violet for the lead word
FG = (236, 232, 245)

CAPS = [
    ("bar1", "Agentic PayPal", "an AI agent with a wallet linked to your PayPal, spending PyUSD"),
    ("bar2", "Set-up", "you log in with PayPal, the agent's wallet is created, linked and funded in PyUSD"),
    ("bar3", "You just chat", "the agent browses the store and places the order for you"),
    ("bar4", "Micro-payment", "the $12 notebook is under your $20 limit, auto-paid from the wallet"),
    ("bar5", "Macro-payment", "a $39 desk lamp is over the limit, so it needs your PayPal approval"),
    ("bar6", "PayPal approval", "you approve the $39 charge in PayPal, a real sandbox checkout"),
    ("bar7", "Captured", "approved, the agent completes the payment"),
    ("bar8", "Paid via PayPal", "$39 settled to the merchant, order complete"),
    ("bar9", "Dashboard", "agent wallet balance in USD and PyUSD"),
    ("bar10", "Every order logged", "agent macro $39  +  auto-pay micro $12"),
]

def font(sz, bold=False):
    paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for p in paths:
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
    # rounded-ish full-width bar with a thin top accent line
    d.rectangle([0, 6, W, H], fill=BG)
    d.rectangle([0, 6, W, 9], fill=(179, 142, 255, 255))
    y = 34
    x = 40
    d.text((x, y), lead, font=LEAD, fill=ACCENT)
    lw = d.textlength(lead, font=LEAD)
    d.text((x + lw, y + 2), "   —  " + rest, font=REST, fill=FG)
    img.save(os.path.join(OUT, name + ".png"))
    print("wrote", name)
print("done")
