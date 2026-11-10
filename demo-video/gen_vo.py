#!/usr/bin/env python3
"""Generate AgentPay narration segments with Gemini TTS. Reads GEMINI_API_KEY from env."""
import os, json, base64, wave, urllib.request, time

KEY = os.environ["GEMINI_API_KEY"]
MODEL = "gemini-2.5-flash-preview-tts"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
VOICE = "Charon"  # calm, clear narrator
OUT = "/tmp/vo"
os.makedirs(OUT, exist_ok=True)

SEGMENTS = [
    ("s1", "Meet AgentPay. It gives an autonomous A.I. agent its own wallet, so it can pay for the services it needs, entirely on its own."),
    ("s2", "First, the human funds the wallet once, using PayPal. You add real dollars through a familiar fiat on-ramp. This is the only step that needs your approval."),
    ("s3", "Those dollars don't stay in PayPal. A treasury bridge converts them into on-chain stablecoin dollars, which land in a wallet managed by thirdweb. Thirdweb holds custody and signs payments for the agent, so the human never touches a private key."),
    ("s4", "Now the agent can spend. Every service is a pay-per-call endpoint guarded by the x4-0-2 protocol. When the agent requests data, the server answers: 4-0-2, Payment Required. The agent's wallet signs a stablecoin payment, settles it gaslessly on Arbitrum, and the server unlocks the content."),
    ("s5", "From a single prompt, the agent checks its balance, browses the marketplace, and buys several services at once. A live Brent crude snapshot, and a momentum signal, each paid on-chain, with no further human approval."),
    ("s6", "Fiat in, through PayPal. Custody and settlement, through thirdweb. Autonomous pay-per-use, through x4-0-2. That is AgentPay. The payment rail for agentic A.I."),
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
