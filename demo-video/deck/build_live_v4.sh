#!/bin/bash
# Build the slowed, captioned live recording (v4) from hand-picked native
# Claude-in-Chrome frames. Adds the wallet set-up beat + the PayPal approval
# screen + PyUSD captions. Caption bars are PNG overlays at y=620 (this ffmpeg
# has no drawtext; the bar also covers the extension button).
# Output matches the deck: 1280x720 / 30fps / yuv420p / AAC 48k stereo.
set -e
cd "$(dirname "$0")"
ffmpeg -y -f concat -safe 0 -i live_list_v4.txt \
  -loop 1 -i caps/bar1.png -loop 1 -i caps/bar2.png -loop 1 -i caps/bar3.png \
  -loop 1 -i caps/bar4.png -loop 1 -i caps/bar5.png -loop 1 -i caps/bar6.png \
  -loop 1 -i caps/bar7.png -loop 1 -i caps/bar8.png -loop 1 -i caps/bar9.png \
  -loop 1 -i caps/bar10.png \
  -f lavfi -t 75 -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -filter_complex "\
[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,setpts=PTS-STARTPTS[base];\
[base][1:v]overlay=0:620:enable='between(t,0.2,6.0)'[v1];\
[v1][2:v]overlay=0:620:enable='between(t,6.0,15.0)'[v2];\
[v2][3:v]overlay=0:620:enable='between(t,15.0,21.0)'[v3];\
[v3][4:v]overlay=0:620:enable='between(t,21.0,30.0)'[v4];\
[v4][5:v]overlay=0:620:enable='between(t,30.0,39.0)'[v5];\
[v5][6:v]overlay=0:620:enable='between(t,39.0,47.0)'[v6];\
[v6][7:v]overlay=0:620:enable='between(t,47.0,51.0)'[v7];\
[v7][8:v]overlay=0:620:enable='between(t,51.0,59.0)'[v8];\
[v8][9:v]overlay=0:620:enable='between(t,59.0,66.0)'[v9];\
[v9][10:v]overlay=0:620:enable='between(t,66.0,75.0)'[v10];\
[v10]format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=74.3:d=0.6[vout]" \
  -map "[vout]" -map "11:a" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 -b:a 160k -movflags +faststart \
  -shortest agentic-paypal-live-v4.mp4 2>err_v4.log || { echo "FAILED"; tail -25 err_v4.log; exit 1; }
echo "built:"; ls -lh agentic-paypal-live-v4.mp4
ffprobe -v error -show_entries stream=width,height,codec_type:format=duration -of default=nw=1 agentic-paypal-live-v4.mp4 2>/dev/null | grep -E "width|height|codec_type|duration"
