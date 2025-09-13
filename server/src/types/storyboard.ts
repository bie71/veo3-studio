export type Aspect = "16:9" | "9:16";
export type Resolution = "720p" | "1080p";
export type VOmode = "veo" | "tts" | "none";
export type StylePreset = "realistic" | "anime" | "cartoon" | "3d";

export interface StoryboardRequest {
  model?: string; // default "veo-3.0"
  jobId?: string;
  global: {
    aspectRatio: Aspect;
    resolution: Resolution;
    removeAudio: boolean; // false = audio on
    videoCodec: "H264";
    fps?: number; // default 30
    seed?: number;
    stylePreset?: StylePreset;
    styleStrength?: number; // 0..100
    negativePrompt?: string;
  };
  voiceover?: {
    mode: VOmode; // optional future use
    language?: string; // default "id-ID"
    voice?: string; // e.g. "id-ID-Standard-A"
    scripts?: string[]; // per segment (optional)
  };
  segments: Array<{
    id: number;
    durationSeconds: number; // 3..60
    prompt?: string; // human text (if no rawBody)
    rawBody?: any; // full generateContent body passthrough
    usePrevLastFrame?: boolean;
    referenceImages?: Array<{ mimeType: string; dataBase64: string }>;
  }>;
}

export interface SegmentResult {
  id: number;
  ok: boolean;
  message?: string;
  videoUrl?: string;
  lastFrameUrl?: string;
}

export interface StoryboardResponse {
  results: SegmentResult[];
  final?: { ok: boolean; videoUrl?: string; message?: string };
}

