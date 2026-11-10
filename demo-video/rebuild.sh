#!/bin/bash
# Rebuild the AgentPay explainer video end-to-end.
#   ./rebuild.sh            -> re-render slides + rebuild explainer (uses existing narration)
#   ./rebuild.sh --voice    -> ALSO regenerate the AI narration (needs GEMINI_API_KEY)
# Final concat with the live-demo tail is manual (see README.md step 4).
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# 1) (optional) regenerate narration with Gemini TTS
if [ "$1" = "--voice" ]; then
  : "${GEMINI_API_KEY:?set GEMINI_API_KEY to regenerate the voice}"
  python3 gen_vo.py
  cp /tmp/vo/*.wav vo/
  echo ">> narration regenerated — update the duration lines in deck/build.sh to match"
fi

# 2) re-render every slide scene to a PNG frame
mkdir -p deck/frames
for s in title onramp custody x402 arch close; do
  "$CHROME" --headless=new --window-size=1280,720 --virtual-time-budget=4000 \
    --screenshot="deck/frames/$s.png" "file://$PWD/deck/deck.html?s=$s"
done
# demo montage frames (side-caption + screenshot)
# NOTE: d1..d4 use ?s=demo with ?img=&step=&cap= params — re-render those by hand if you change shots.

# 3) assemble explainer
( cd deck && ./build.sh )
echo ">> done: deck/agentpay-explainer.mp4"
