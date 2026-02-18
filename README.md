# nebi-demo

Automated demo video pipeline for [Nebi](https://github.com/nebari-dev/nebi). Starts a local Nebi server, seeds it with sample data, records a full UI walkthrough with Playwright, generates narration with Kokoro TTS, and merges everything into a final video with FFmpeg.

## How it works

The pipeline has three stages:

1. **Audio generation** (`generate_audio.py`) — Kokoro TTS synthesizes narration clips for each scene. Outputs timestamped `.wav` files and a `durations.json` used by the recorder for audio sync.

2. **Recording** (`record.ts`) — Starts a temporary Nebi server (SQLite, in-memory queue), seeds workspaces/users/registries via the API, then drives the UI through 16 scenes with Playwright. Each scene records a timestamp so audio can be aligned later. The `nebi` binary is resolved from `PATH`, `./bin/nebi`, or downloaded from the latest GitHub release.

3. **Conversion** (`convert.sh`) — Takes the raw `.webm` recording, mixes in the narration clips at the correct timestamps using FFmpeg's `adelay` + `amix` filters, and produces the final `.mp4`. Also generates a 5x speed `.gif` for embedding.

## Prerequisites

- Node.js 20+
- [pixi](https://pixi.sh)

FFmpeg and jq are installed automatically by pixi.

## Setup

```
npm install
pixi install
cp .env.example .env
```

The `.env` file is only needed if you want the demo to publish to an OCI registry (Quay.io credentials).

## Usage

Run the full pipeline:

```
pixi run demo
```

Or run individual stages:

```
pixi run audio      # generate TTS narration
pixi run record     # start server + record with Playwright
pixi run convert    # merge audio + produce MP4/GIF
```

For headless recording (no browser window):

```
HEADLESS=1 pixi run demo
```

## Output

Everything goes to `output/`:

| File | Description |
|------|-------------|
| `demo.webm` | Raw Playwright recording |
| `demo.mp4` | Final video with narration |
| `demo.gif` | 5x speed GIF (no audio) |
| `audio/` | Generated TTS clips + `durations.json` |
| `timestamps.json` | Audio placement timestamps for FFmpeg |

## Project structure

| File | Purpose |
|------|---------|
| `record.ts` | Playwright recording script (server lifecycle, data seeding, 16 scene walkthrough) |
| `annotations.ts` | Cursor animation, tooltip overlays, and final screen helpers |
| `generate_audio.py` | Kokoro TTS narration generator |
| `convert.sh` | FFmpeg audio merge + MP4/GIF conversion |
| `pixi.toml` | Python environment (Kokoro, FFmpeg, jq) and task definitions |
| `package.json` | Node dependencies (Playwright, TypeScript) |
