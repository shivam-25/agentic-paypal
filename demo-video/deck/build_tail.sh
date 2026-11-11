#!/bin/bash
# Build the live prompt-driven demo tail and concat it onto the explainer.
#   live card -> dg1..dg5 (Agent Console beats: login, micro, macro, approve, done)
# Produces: tail.mp4, norm_*.mp4, agentic-paypal-full-demo.mp4
set -e
cd "$(dirname "$0")"
F=frames

# 1) Tail timeline — the "Live" card then the five console beats (hard cuts, like build.sh).
cat > tlist.txt <<EOF
file '$F/live.png'
duration 2.6
file '$F/dg1.png'
duration 3.8
file '$F/dg2.png'
duration 3.8
file '$F/dg3.png'
duration 3.8
file '$F/dg4.png'
duration 3.8
file '$F/dg5.png'
duration 4.4
file '$F/dg5.png'
EOF

# 2) Render the tail with a silent 48k stereo track (so concat matches the explainer's audio).
TDUR=22.0
ffmpeg -y -f concat -safe 0 -i tlist.txt \
  -f lavfi -t $TDUR -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -vf "fps=30,format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=21.2:d=0.8" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart -shortest \
  tail.mp4 2>/dev/null
echo "built tail.mp4:"; ffprobe -v error -show_entries format=duration -of csv=p=0 tail.mp4

# 3) Normalize both clips to identical params, then concat without re-encoding.
norm() { ffmpeg -y -i "$1" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" \
  -c:v libx264 -preset medium -crf 18 -c:a aac -ar 48000 -ac 2 -b:a 160k "$2" 2>/dev/null; }
norm agentpay-explainer.mp4 norm_agentpay-explainer.mp4
norm tail.mp4 norm_tail.mp4

printf "file 'norm_agentpay-explainer.mp4'\nfile 'norm_tail.mp4'\n" > clist.txt
ffmpeg -y -f concat -safe 0 -i clist.txt -c copy agentic-paypal-full-demo.mp4 2>/dev/null
echo "built:"; ls -lh agentic-paypal-full-demo.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 agentic-paypal-full-demo.mp4
