# VEO3 Studio (Web + Server)

Monorepo containing:
- `web` – Vite + React + Tailwind frontend with Studio and Prompt Generator.
- `server` – Node + Express backend proxy for Veo 3, plus segment rendering and concat.

## Setup

1) Prerequisites
- Node.js 18+
- FFmpeg in PATH (required for frame-extract and concat)

2) Configure env
- Copy `.env.example` to `server/.env` or project root and set `GEMINI_API_KEY`.

3) Install deps (run in each folder)
```
cd server && npm install
cd ../web && npm install
```

4) Run
- Server: `cd server && npm run dev` (starts on http://localhost:5174)
- Web: `cd web && npm run dev` (http://localhost:5173, proxies `/api` to server)

## API
- `POST /api/veo3/generate?model=veo-3.0` – Proxy to Veo 3. Accepts raw `generateContent` JSON or simplified `{ prompt, referenceImages, ... }` and streams JSON or MP4.
- `POST /api/veo3/segments` – Accepts StoryboardRequest, renders each segment sequentially, saves `jobs/<jobId>/seg_<id>.mp4`, extracts last frame PNG.
- `POST /api/veo3/concat` – Normalizes via re-encode and concatenates to `jobs/<jobId>/output.mp4`.
- `POST /api/veo3/frame-extract` – Extracts last frame (base64) for a given segment.

## Notes
- Never expose `GEMINI_API_KEY` in frontend; backend injects it into upstream calls.
- Some Veo 3 responses return JSON with media links. The server attempts to download and save when needed.
- For consistent VO, integrate TTS separately, then mux audio with ffmpeg (optional).

