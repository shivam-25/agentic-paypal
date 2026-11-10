#!/bin/bash
set -e
cd "$(dirname "$0")"
VO=../vo
F=frames

# 1) Concatenate narration segments (in order) into one track.
printf "file '%s/s1.wav'\nfile '%s/s2.wav'\nfile '%s/s3.wav'\nfile '%s/s4.wav'\nfile '%s/s5.wav'\nfile '%s/s6.wav'\n" "$VO" "$VO" "$VO" "$VO" "$VO" "$VO" > alist.txt
ffmpeg -y -f concat -safe 0 -i alist.txt -ar 48000 -ac 2 narration.wav 2>/dev/null
ADUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 narration.wav)
echo "narration duration: $ADUR"

# 2) Image timeline (durations sum to ~81.46s = narration). Last slide padded; -shortest trims.
cat > ilist.txt <<EOF
file '$F/title.png'
duration 8.53
file '$F/onramp.png'
duration 5.00
file '$F/d3.png'
duration 5.01
file '$F/custody.png'
duration 15.09
file '$F/x402.png'
duration 20.17
file '$F/d1.png'
duration 4.70
file '$F/d2.png'
duration 4.70
file '$F/d4.png'
duration 4.69
file '$F/arch.png'
duration 6.50
file '$F/close.png'
duration 8.00
file '$F/close.png'
EOF

# 3) Build video from images, mux with narration, fade in/out.
FO=$(echo "$ADUR - 0.8" | bc)
ffmpeg -y -f concat -safe 0 -i ilist.txt -i narration.wav \
  -vf "fps=30,format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st=${FO}:d=0.8" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart -shortest \
  agentpay-explainer.mp4 2>/dev/null
echo "built:"; ls -lh agentpay-explainer.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 agentpay-explainer.mp4
