#!/usr/bin/env python3
"""Generate Agentic PayPal narration segments with Gemini TTS. Reads GEMINI_API_KEY from env.
Writes .wav + manifest.json straight into ./vo next to this script."""
import os, json, base64, wave, urllib.request, time

KEY = os.environ["GEMINI_API_KEY"]
MODEL = "gemini-2.5-flash-preview-tts"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
VOICE = "Charon"  # calm, clear narrator
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vo")
os.makedirs(OUT, exist_ok=True)

SEGMENTS = [
    ("s1", "Meet Agentic PayPal. It gives an autonomous A.I. agent a wallet linked to your PayPal account, so it can buy the things you need — on its own."),
    ("s2", "First, you log in with PayPal. The email on your PayPal account becomes the identity your agent's wallet is linked to. You fund it once, in dollars, and the agent is ready to spend."),
    ("s3", "PayPal is a merchant business, so Agentic PayPal is built for buying goods. Ask the agent for something, and it browses the store and places the order, paying in U.S. dollars."),
    ("s4", "But not every purchase is equal, so you set a limit. A small, everyday purchase inside your limit is paid instantly from the wallet, with no interruption. This is the micro payment. Pre-approved."),
    ("s5", "A larger purchase needs your sign-off. The agent hands you a PayPal approval, you confirm, and only then does the order settle. This is the macro payment. Post-approval. You stay in control of the big spends."),
    ("s6", "And it works both ways. You can buy from the store yourself, or hand the agent a goal and let it choose, with every order logged. Dollars in, through PayPal. Goods out, autonomously. That is Agentic PayPal. PayPal for the agentic economy."),
]

def tts(text):
    body = {
        "contents": [{"parts": [{"text": "Read in a clear, confident, upbeat narrator voice: " + text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }
    req = urllib.request.Request(
        URL, data=json.dumps(body).encode(),
        headers={"x-goog-api-key": KEY, "Content-Type": "application/json"},
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
            p = d["candidates"][0]["content"]["parts"][0]["inlineData"]
            return base64.b64decode(p["data"])
        except Exception as e:
            print(f"  retry {attempt}: {e}")
            time.sleep(4)
    raise RuntimeError("TTS failed")

manifest = []
for sid, text in SEGMENTS:
    print("generating", sid)
    pcm = tts(text)
    path = f"{OUT}/{sid}.wav"
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(pcm)
    dur = len(pcm) / 2 / 24000.0
    manifest.append({"id": sid, "wav": path, "dur": round(dur, 3), "text": text})
    print(f"  {sid}: {dur:.2f}s")
    time.sleep(1)

json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=2)
print("TOTAL:", round(sum(m["dur"] for m in manifest), 2), "s")
