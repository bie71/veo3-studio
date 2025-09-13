interface CinematicOptions {
  stylePreset?: string;
  styleStrength?: number;
  matchPrevious?: boolean;
  holdThenMove?: boolean;
  cutaway?: boolean;
  userBrief: string;
  removeAudio: boolean;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  negativePrompt?: string;
}

export function buildCinematicPrompt(opts: CinematicOptions) {
  const {
    stylePreset = "realistic",
    styleStrength = 50,
    matchPrevious,
    holdThenMove,
    cutaway,
    userBrief,
    removeAudio,
    aspectRatio,
    resolution,
    durationSeconds,
    negativePrompt = ""
  } = opts;

  return `You are a cinematic director. Build a short sequence for social video.

STYLE PRESET:
- Target style: ${stylePreset} (blend strength ${styleStrength}/100).
- For “anime”/“cartoon”, emulate generic styles; do not mimic any copyrighted IP/characters.
- Keep frames clean; avoid watermarks, brands, logos.

CONTINUITY:
- ${matchPrevious ? "Match previous segment’s pose/framing, lighting (~5200K), lens look (~35mm)." : ""}
- ${holdThenMove ? "Hold ~0.3s at start, then a subtle camera move (push-in 2–3% or micro-pan)." : ""}
- ${cutaway ? "Insert a brief (0.7–0.9s) cutaway relevant to the scene, then return to main subject." : ""}

SCENE BRIEF:
${userBrief}

AUDIO:
- ${removeAudio ? "Render WITHOUT audio." : "Use Indonesian voiceover; friendly, clear, natural pace. No music."}

DELIVERABLE:
- Aspect: ${aspectRatio} | Resolution: ${resolution} | Codec: H.264
- Duration: ${durationSeconds} seconds
- No on-screen text. Avoid brands/logos. Safety first.

NEGATIVE PROMPT (avoid): ${negativePrompt}`;
}

