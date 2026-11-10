#!/usr/bin/env python3
"""Regenerate the 3 narration segments that mentioned thirdweb/USDC. Reads GEMINI_API_KEY from env."""
import os, json, base64, wave, urllib.request, time

KEY = os.environ["GEMINI_API_KEY"]
MODEL = "gemini-2.5-flash-preview-tts"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
VOICE = "Charon"
OUT = "/tmp/vo"

SEGMENTS = [
    ("s3", "Those dollars don't stay in PayPal. A treasury bridge moves them on-chain as digital U.S. dollars, into a secure wallet that the agent controls. The wallet holds the funds and signs every payment, so the human never touches a private key."),
    ("s4", "Now the agent can spend. Every service is a pay-per-call endpoint guarded by the x4-0-2 protocol. When the agent requests data, the server answers: 4-0-2, Payment Required. The agent's wallet signs a U.S. dollar payment, settles it instantly on-chain, and the server unlocks the content."),
    ("s6", "Dollars in, through PayPal. Held and settled on-chain as U.S. dollars. Autonomous pay-per-use, through x4-0-2. That is AgentPay. The payment rail for agentic A.I."),
]

def tts(text):
    body = {
        "contents": [{"parts": [{"text": "Read in a clear, confident, upbeat narrator voice: " + text}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}},
    }
    req = urllib.request.Request(URL, data=json.dumps(body).encode(),
        headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
            return base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
        except Exception as e:
            print("  retry", attempt, e); time.sleep(5)
    raise RuntimeError("TTS failed")

man = json.load(open(f"{OUT}/manifest.json"))
by = {m["id"]: m for m in man}
for sid, text in SEGMENTS:
    print("regenerating", sid)
    pcm = tts(text)
    with wave.open(f"{OUT}/{sid}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    dur = round(len(pcm)/2/24000.0, 3)
    by[sid]["dur"] = dur; by[sid]["text"] = text
    print(f"  {sid}: {dur}s"); time.sleep(2)

json.dump(list(by.values()), open(f"{OUT}/manifest.json", "w"), indent=2)
print("DURS:", {m["id"]: m["dur"] for m in by.values()})
print("TOTAL:", round(sum(m["dur"] for m in by.values()), 2))
