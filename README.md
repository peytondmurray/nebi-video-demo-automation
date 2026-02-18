# nebi-demo

Automated demo recording for [Nebi](https://github.com/nebari-dev/nebi) — produces a narrated screen recording with Playwright, Kokoro TTS, and FFmpeg.

## Prerequisites

- Node.js 20+
- [pixi](https://pixi.sh) (for Python/TTS environment)
- ffmpeg
- jq

## Setup

```bash
npm install
pixi install
cp .env.example .env   # fill in Quay.io credentials if needed
```

## Usage

Full pipeline (generate audio, record demo, convert to MP4/GIF):

```bash
npm run demo
```

Or run each step individually:

```bash
pixi run python generate_audio.py   # generate TTS narration clips
npx tsx record.ts                    # start server, seed data, record with Playwright
bash convert.sh                      # merge audio + convert to MP4 and GIF
```

The `nebi` binary is resolved automatically: PATH → `./bin/nebi` → downloaded from the latest GitHub release.

## Output

All output goes to `output/`:

- `demo.webm` — raw Playwright recording
- `demo.mp4` — final video with narration
- `demo.gif` — 5x speed GIF (no audio)
- `audio/` — generated TTS clips
