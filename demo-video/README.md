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
- `deck/frames/`     — slide PNGs rendered from deck.html (+ dg1..dg4 live-demo frames).
- `deck/shots/`      — real store screenshots used in the live-demo tail (g1..g4).
- `deck/build.sh`    — concats narration + lays slides on a timeline → `agentpay-explainer.mp4`.
- `deck/agentpay-explainer.mp4`     — narrated explainer (~1:19).
- `deck/agentic-paypal-full-demo.mp4` — explainer + "Live" card + live store demo tail (~1:46).
- `rebuild.sh`       — one-command re-render of slides + explainer (`--voice` also redoes narration).

## Scenes ↔ narration
title→s1 (11.1s) · login→s2 (11.2s) · goods→s3 (11.1s) · micro→s4 (13.9s) · macro→s5 (14.1s) ·
close→s6 (15.9s). The live tail = `live` card + `demo` frames `dg1..dg4` (store → micro → macro
approval → settled), built from the real screenshots in `deck/shots/`.

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
4. **Live tail** — recapture the store screenshots into `deck/shots/g1..g4`, render the `demo`
   frames (`dg1..dg4`) and the `live` card, build `tail.mp4`, normalize both to
   1280x720/30fps/48k-stereo, then concat:
   `cd deck && printf "file 'norm_agentpay-explainer.mp4'\nfile 'norm_tail.mp4'\n" > clist.txt`
   `ffmpeg -y -f concat -safe 0 -i clist.txt -c copy agentic-paypal-full-demo.mp4`

Or just run `./rebuild.sh` (add `--voice` to also regenerate narration).

## Security
Rotate the Gemini / PayPal / thirdweb keys after the hackathon. Never commit keys —
`gen_vo.py` reads `GEMINI_API_KEY` from the env only.
