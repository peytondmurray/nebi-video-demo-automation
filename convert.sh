#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$DIR/output"
WEBM="$OUTPUT/demo.webm"
MP4_SILENT="$OUTPUT/demo_silent.mp4"
MP4="$OUTPUT/demo.mp4"
GIF="$OUTPUT/demo.gif"
PALETTE="$OUTPUT/palette.png"
AUDIO_DIR="$OUTPUT/audio"
TIMESTAMPS="$OUTPUT/timestamps.json"

if [ ! -f "$WEBM" ]; then
  echo "Error: $WEBM not found. Run 'npm run demo' first."
  exit 1
fi

command -v ffmpeg >/dev/null 2>&1 || { echo "Error: ffmpeg is required but not installed."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Error: jq is required but not installed."; exit 1; }

echo "Converting WebM → MP4 (silent)..."
ffmpeg -y -i "$WEBM" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -an "$MP4_SILENT"
echo "  → $MP4_SILENT ($(du -h "$MP4_SILENT" | cut -f1))"

# ── Merge audio narration ────────────────────────────────────────────────
if [ -f "$TIMESTAMPS" ] && [ -d "$AUDIO_DIR" ]; then
  echo "Merging audio narration..."

  NUM_CLIPS=$(jq 'length' "$TIMESTAMPS")

  if [ "$NUM_CLIPS" -gt 0 ]; then
    # Collect valid audio inputs
    ARGS=(-y -i "$MP4_SILENT")
    FILTER=""
    MIX_INPUTS=""
    CLIP_IDX=0

    for i in $(seq 0 $((NUM_CLIPS - 1))); do
      AUDIO_FILE=$(jq -r ".[$i].audio" "$TIMESTAMPS")
      START_MS=$(jq -r ".[$i].start_ms" "$TIMESTAMPS")
      WAV_PATH="$AUDIO_DIR/$AUDIO_FILE"

      if [ ! -f "$WAV_PATH" ]; then
        echo "  Warning: $WAV_PATH not found, skipping"
        continue
      fi

      ARGS+=(-i "$WAV_PATH")
      INPUT_IDX=$((CLIP_IDX + 1))
      FILTER="${FILTER}[${INPUT_IDX}:a]adelay=${START_MS}|${START_MS}[a${CLIP_IDX}];"
      MIX_INPUTS="${MIX_INPUTS}[a${CLIP_IDX}]"
      CLIP_IDX=$((CLIP_IDX + 1))
    done

    if [ "$CLIP_IDX" -gt 0 ]; then
      FILTER="${FILTER}${MIX_INPUTS}amix=inputs=${CLIP_IDX}:duration=longest:normalize=0[aout]"

      # Write filter to temp file to avoid shell quoting issues
      FILTER_FILE=$(mktemp)
      echo "$FILTER" > "$FILTER_FILE"

      echo "  Mixing $CLIP_IDX audio clips..."
      ffmpeg "${ARGS[@]}" \
        -filter_complex_script "$FILTER_FILE" \
        -map 0:v -map "[aout]" \
        -c:v copy -c:a aac -b:a 128k \
        "$MP4"

      rm -f "$FILTER_FILE"
      echo "  → $MP4 ($(du -h "$MP4" | cut -f1))"
    else
      echo "  No valid audio clips found, using silent video"
      cp "$MP4_SILENT" "$MP4"
    fi
  else
    echo "  No timestamps found, using silent video"
    cp "$MP4_SILENT" "$MP4"
  fi

  rm -f "$MP4_SILENT"
else
  echo "No audio/timestamps found, using silent video"
  mv "$MP4_SILENT" "$MP4"
fi

# GIF is sped up 5x since there's no audio
GIF_SPEED="setpts=PTS/5,"

echo "Generating GIF palette..."
ffmpeg -y -i "$MP4" -vf "${GIF_SPEED}fps=12,scale=1920:-1:flags=lanczos,palettegen=stats_mode=diff" "$PALETTE"

echo "Converting MP4 → GIF (5x speed)..."
ffmpeg -y -i "$MP4" -i "$PALETTE" -lavfi "${GIF_SPEED}fps=12,scale=1920:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "$GIF"
echo "  → $GIF ($(du -h "$GIF" | cut -f1))"

rm -f "$PALETTE"
echo "Done!"
