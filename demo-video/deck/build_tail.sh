#!/bin/bash
# Build the final video: narrated explainer -> "Live" card -> the REAL end-to-end
# screen recording (Claude-in-Chrome, prompt-driven: landing -> store dashboard ->
# console login/wallet link -> micro auto-pay -> macro PayPal approval -> captured
# -> dashboard). The recording lives in agentic-paypal-live-e2e.mp4 (from the
# agentic-paypal-live-e2e.gif screen capture).
set -e
cd "$(dirname "$0")"
F=frames
COMMON="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 -b:a 160k -movflags +faststart"

# 1) "Live" title card (2.5s, silent stereo) at 1280x720/30fps.
ffmpeg -y -loop 1 -t 2.5 -i "$F/live.png" -f lavfi -t 2.5 -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=1.9:d=0.5" \
  $COMMON -shortest live_card.mp4 2>/dev/null

# 2) Normalize the explainer to identical params.
ffmpeg -y -i agentpay-explainer.mp4 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" \
  $COMMON norm_agentpay-explainer.mp4 2>/dev/null

# 3) The real recording is already normalized by its own build step (agentic-paypal-live-e2e.mp4).
#    Concat: explainer -> live card -> live recording (all identical codecs → stream copy).
printf "file 'norm_agentpay-explainer.mp4'\nfile 'live_card.mp4'\nfile 'agentic-paypal-live-e2e.mp4'\n" > clist.txt
ffmpeg -y -f concat -safe 0 -i clist.txt -c copy agentic-paypal-full-demo.mp4 2>/dev/null
echo "built:"; ls -lh agentic-paypal-full-demo.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 agentic-paypal-full-demo.mp4
