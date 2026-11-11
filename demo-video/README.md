# Agentic PayPal demo video

Source + scripts for the narrated Agentic PayPal explainer (log in with PayPal → agent wallet →
buy goods → micro auto-pay / macro PayPal approval), plus the live end-to-end store tail.

## Files
- `gen_vo.py`        — AI narration (Gemini TTS, male "Charon" voice). 6 segments s1..s6.
                       Writes `.wav` + `manifest.json` straight into `vo/`.
- `gen_vo2.py`       — legacy one-off; use `gen_vo.py` for everything.
- `vo/`              — generated narration wavs + `manifest.json` (durations/text).
- `deck/deck.html`   — all slides in one file; scene chosen by `?s=<name>`
                       (title, login, goods, micro, macro, close, live, demo).
- `deck/frames/`     — slide PNGs rendered from deck.html (+ dg1..dg5 live-demo frames).
- `deck/cshots/`     — the live **Agent Console** screenshots used in the demo tail: raw crops
                       `c1_login`..`c5_done` and their padded cards `dimg1`..`dimg5` (fed to `?s=demo`).
- `deck/shots/`      — older store-page screenshots (g1..g4); superseded by `cshots/`.
- `deck/build.sh`    — concats narration + lays slides on a timeline → `agentpay-explainer.mp4`.
- `deck/agentic-paypal-live-e2e.gif` / `.mp4` — the **real end-to-end screen recording** captured
                       with Claude-in-Chrome, driven by prompts like a normal user: landing →
                       store dashboard → console login (wallet linked to the PayPal email) →
                       micro auto-pay → macro PayPal approval → captured → updated dashboard.
- `deck/build_tail.sh` — concats the explainer + "Live" card + the real recording →
                       `agentic-paypal-full-demo.mp4`.
- `deck/agentpay-explainer.mp4`     — narrated explainer (~1:19).
- `deck/agentic-paypal-full-demo.mp4` — explainer + "Live" card + real live recording (~1:55).
- `rebuild.sh`       — one-command re-render of slides + explainer (`--voice` also redoes narration).

## Scenes ↔ narration
title→s1 (11.1s) · login→s2 (11.2s) · goods→s3 (11.1s) · micro→s4 (13.9s) · macro→s5 (14.1s) ·
close→s6 (15.9s). The live tail = `live` card + `demo` frames `dg1..dg5`, captured live from the
**Agent Console** driven by prompts: login → micro auto-pay → macro approval → PayPal → captured.

## Update loop
1. **Narration** — edit the `SEGMENTS` list in `gen_vo.py` (keep "Agentic PayPal"; spell `402` as
   `x4-0-2` and `A.I.` with periods). Voice = `VOICE="Charon"` (male; alts: Puck, Fenrir, Orus).
   Run: `GEMINI_API_KEY='<key>' python3 gen_vo.py` (writes straight into `vo/`).
   It prints each segment's duration — you need these for step 3.
2. **Slides** — edit `deck/deck.html`. Re-render a scene:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
     --window-size=1280,720 --virtual-time-budget=4000 \
     --screenshot=deck/frames/micro.png "file://$PWD/deck/deck.html?s=micro"`
3. **Assemble** — in `deck/build.sh`, the slide `duration` lines (ilist.txt block) must sum to the
   narration length and track the segment each slide narrates. Then `cd deck && ./build.sh`.
4. **Live recording (real, prompt-driven)** — record the browser end-to-end with Claude-in-Chrome
   (or any screen recorder) while driving it like a user: open `/` → `/market` → `/agent`, type
   "log me in with <email>", "buy me a notebook set" (micro auto-pay), "order the desk lamp" (macro
   → approve the $39 in the PayPal sandbox) → "complete the order", then show `/market` updated.
   Save it as `deck/agentic-paypal-live-e2e.gif`, convert to a normalized mp4
   (`agentic-paypal-live-e2e.mp4`, 1280x720/30fps/48k-stereo), then run:
   `cd deck && ./build_tail.sh`  (concats explainer + "Live" card + the recording →
   `agentic-paypal-full-demo.mp4`).
   The older `cshots/` + `dg*` slideshow frames are kept for reference but no longer used.

Or just run `./rebuild.sh` for the explainer (add `--voice` to also regenerate narration), then
`deck/build_tail.sh` for the final concat with the recording.

## Security
Rotate the Gemini / PayPal / thirdweb keys after the hackathon. Never commit keys —
`gen_vo.py` reads `GEMINI_API_KEY` from the env only.
