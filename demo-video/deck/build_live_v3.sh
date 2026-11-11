#!/bin/bash
# Build the slowed, captioned live recording from the 32 native Claude-in-Chrome
# frames (continuous, re-timed). Caption bars are PNG overlays (this ffmpeg has no
# drawtext); the bar also covers the extension's on-page button. Output matches the
# rest of the deck (1280x720 / 30fps / yuv420p / AAC 48k stereo).
set -e
cd "$(dirname "$0")"
ffmpeg -y -f concat -safe 0 -i live_list.txt \
  -loop 1 -i caps/bar1.png -loop 1 -i caps/bar2.png -loop 1 -i caps/bar3.png \
  -loop 1 -i caps/bar4.png -loop 1 -i caps/bar5.png -loop 1 -i caps/bar6.png \
  -loop 1 -i caps/bar7.png -loop 1 -i caps/bar8.png -loop 1 -i caps/bar9.png \
  -f lavfi -t 52.3 -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -filter_complex "\
[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,setpts=PTS-STARTPTS[base];\
[base][1:v]overlay=0:620:enable='between(t,0.2,6.2)'[v1];\
[v1][2:v]overlay=0:620:enable='between(t,6.2,11.7)'[v2];\
[v2][3:v]overlay=0:620:enable='between(t,11.7,19.8)'[v3];\
[v3][4:v]overlay=0:620:enable='between(t,19.8,24.0)'[v4];\
[v4][5:v]overlay=0:620:enable='between(t,24.0,28.0)'[v5];\
[v5][6:v]overlay=0:620:enable='between(t,28.0,34.6)'[v6];\
[v6][7:v]overlay=0:620:enable='between(t,34.6,40.3)'[v7];\
[v7][8:v]overlay=0:620:enable='between(t,40.3,44.3)'[v8];\
[v8][9:v]overlay=0:620:enable='between(t,44.3,52.3)'[v9];\
[v9]format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=51.7:d=0.6[vout]" \
  -map "[vout]" -map "10:a" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 -b:a 160k -movflags +faststart \
  -shortest agentic-paypal-live-v3.mp4 2>err_v3.log || { echo "FAILED"; tail -25 err_v3.log; exit 1; }
echo "built:"; ls -lh agentic-paypal-live-v3.mp4
ffprobe -v error -show_entries stream=width,height,codec_type:format=duration -of default=nw=1 agentic-paypal-live-v3.mp4 2>/dev/null | grep -E "width|height|codec_type|duration"
