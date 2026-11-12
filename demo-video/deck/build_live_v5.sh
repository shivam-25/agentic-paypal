#!/bin/bash
# Build the re-recorded live portion (v5) from 4 real Claude-in-Chrome segment
# GIFs that preserve live typing + clicking motion (gif_creator click/action
# overlays baked in). Each segment: scale/pad to 1280x720, add a narrative
# caption bar at y=620, hold the final frame for readability. Then concat with
# the PyUSD explainer + "Live" card. All 1280x720 / 30fps / yuv420p / AAC 48k.
set -e
cd "$(dirname "$0")"
mkdir -p seg_out
C=caps2
SCALE="scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,setpts=PTS-STARTPTS"

seg_one_cap () { # in.gif out.mp4 capPNG hold ss totaldur srctrim
  local IN=$1 OUT=$2 CAP=$3 HOLD=$4 SS=$5 DUR=$6 SRCT=$7
  local ssopt="-ignore_loop 1"
  [ -n "$SS" ] && ssopt="$ssopt -ss $SS"
  [ -n "$SRCT" ] && ssopt="$ssopt -t $SRCT"
  ffmpeg -y $ssopt -i "$IN" -loop 1 -i "$CAP" -f lavfi -t "$DUR" -i anullsrc=channel_layout=stereo:sample_rate=48000 \
    -filter_complex "[0:v]${SCALE},tpad=stop_mode=clone:stop_duration=${HOLD}[b];[b][1:v]overlay=0:620:shortest=1[v];[v]format=yuv420p[vout]" \
    -map "[vout]" -map 2:a -t "$DUR" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -c:a aac -ar 48000 -ac 2 -b:a 160k -movflags +faststart "$OUT" 2>/tmp/ff_$(basename $OUT).log \
    || { echo "FAIL $OUT"; tail -20 /tmp/ff_$(basename $OUT).log; exit 1; }
}

# seg1 wallet set-up: trim source to 7.8s (ends on the "linked" card, before the
# console transition) + 2.0s hold -> 9.8s.
seg_one_cap segs/seg1-walletsetup.gif seg_out/1.mp4 $C/s1.png 2.0 "" 9.8 7.8

# seg2 micro (native ~8.5s) + 2s hold -> 10.5s.
seg_one_cap segs/seg2-micro.gif seg_out/2.mp4 $C/s2.png 2.0 "" 10.5

# seg4 dashboard: loaded portion (ss=2.7, ~3.4s) + 2.5s hold -> 5.9s.
seg_one_cap segs/seg4-dashboard.gif seg_out/4.mp4 $C/s4.png 2.5 2.7 5.9

# seg3 macro + PayPal review (native ~19.9s): 3 timed captions + 1.5s hold.
ffmpeg -y -ignore_loop 1 -i segs/seg3-macro.gif \
  -loop 1 -i $C/s3a.png -loop 1 -i $C/s3b.png -loop 1 -i $C/s3c.png \
  -f lavfi -t 21.4 -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -filter_complex "[0:v]${SCALE},tpad=stop_mode=clone:stop_duration=1.5[b];\
[b][1:v]overlay=0:620:enable='between(t,0,9.5)'[v1];\
[v1][2:v]overlay=0:620:enable='between(t,9.5,13.3)'[v2];\
[v2][3:v]overlay=0:620:shortest=1:enable='between(t,13.3,99)'[v3];\
[v3]format=yuv420p[vout]" \
  -map "[vout]" -map 4:a -t 21.4 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -ar 48000 -ac 2 -b:a 160k -movflags +faststart seg_out/3.mp4 2>/tmp/ff_3.log \
  || { echo "FAIL seg3"; tail -20 /tmp/ff_3.log; exit 1; }

echo "segment durations:"
for f in seg_out/1.mp4 seg_out/2.mp4 seg_out/3.mp4 seg_out/4.mp4; do
  printf "  %s " "$f"; ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"
done

# Concat: explainer -> live card -> seg1 -> seg2 -> seg3 -> seg4.
printf "file 'norm_agentpay-explainer.mp4'\nfile 'live_card.mp4'\nfile 'seg_out/1.mp4'\nfile 'seg_out/2.mp4'\nfile 'seg_out/3.mp4'\nfile 'seg_out/4.mp4'\n" > clist_v5.txt
ffmpeg -y -f concat -safe 0 -i clist_v5.txt -c copy agentic-paypal-full-demo.mp4 2>/tmp/concat_v5.log \
  || { echo "concat FAIL"; tail -20 /tmp/concat_v5.log; exit 1; }
echo "built:"; ls -lh agentic-paypal-full-demo.mp4
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 agentic-paypal-full-demo.mp4)
python3 -c "d=$D; print(f'total: {int(d//60)}:{d%60:05.2f}  (<3min: {d<180})')"
