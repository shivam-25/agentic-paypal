# AgentPay demo video

Source + scripts for the narrated AgentPay explainer (PayPal on-ramp → on-chain USD in a
secure wallet → x402 pay-per-call), plus the live end-to-end tail.

## Files
- `gen_vo.py`        — AI narration (Gemini TTS, male "Charon" voice). 6 segments s1..s6.
- `gen_vo2.py`       — one-off that re-did s3/s4/s6; use `gen_vo.py` for everything.
- `vo/`              — generated narration wavs + `manifest.json` (durations/text).
- `deck/deck.html`   — all slides in one file; scene chosen by `?s=<name>`
                       (title, onramp, custody, x402, arch, close, live, demo).
- `deck/frames/`     — slide PNGs rendered from deck.html.
- `deck/shots/`      — screenshots used in the demo montage scene.
- `deck/build.sh`    — concats narration + lays slides on a timeline → `agentpay-explainer.mp4`.
- `deck/agentpay-explainer.mp4` — narrated explainer (~1:21).
- `deck/agentpay-full.mp4`      — explainer + "Live · unedited" card + live demo tail (~2:11).
- `rebuild.sh`       — one-command re-render of slides + explainer (`--voice` also redoes narration).

## Update loop
1. **Narration** — edit the `SEGMENTS` list in `gen_vo.py`.
   Spell `402` as `x4-0-2` and `A.I.` with periods; keep "secure wallet"/"USD" (no vendor names).
   Voice = `VOICE="Charon"` (male; alts: Puck, Fenrir, Orus).
   Run: `GEMINI_API_KEY='<key>' python3 gen_vo.py && cp /tmp/vo/*.wav vo/`
   It prints each segment's duration — you need these for step 3.
2. **Slides** — edit `deck/deck.html`. Re-render a scene:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
     --window-size=1280,720 --virtual-time-budget=4000 \
     --screenshot=deck/frames/x402.png "file://$PWD/deck/deck.html?s=x402"`
3. **Assemble** — in `deck/build.sh`, the slide `duration` lines (ilist.txt block) must sum to the
   narration length and track the segment each slide narrates. Then `cd deck && ./build.sh`.
4. **Live tail** — normalize explainer + card + live recording to 1280x720/30fps/48k-stereo, then:
   `cd deck && printf "file 'norm_explainer.mp4'\nfile 'norm_card.mp4'\nfile 'norm_tail.mp4'\n" > clist.txt`
   `ffmpeg -y -f concat -safe 0 -i clist.txt -c copy agentpay-full.mp4`

Or just run `./rebuild.sh` (add `--voice` to also regenerate narration).

## Security
Rotate the Gemini / PayPal / thirdweb keys after the hackathon. Never commit keys —
`gen_vo.py` reads `GEMINI_API_KEY` from the env only.
