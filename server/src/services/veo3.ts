import { GEMINI_API_KEY } from "../env.js";

export interface ReferenceImage { mimeType: string; dataBase64: string }

export async function proxyGenerate(model: string, body: any, apiKey?: string): Promise<Response> {
  const key = (apiKey && apiKey.trim()) || GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res;
}

export function buildGenerateBodyFromText(
  prompt: string,
  referenceImages?: ReferenceImage[],
  opts?: { removeAudio?: boolean; durationSeconds?: number; aspectRatio?: string; resolution?: string; stylePreset?: string; styleStrength?: number; negativePrompt?: string }
) {
  // Minimal content structure for Gemini generateContent
  const parts: any[] = [{ text: prompt }];
  if (referenceImages && referenceImages.length) {
    for (const img of referenceImages) {
      const data = typeof img.dataBase64 === 'string' && img.dataBase64.includes(',')
        ? img.dataBase64.slice(img.dataBase64.indexOf(',') + 1)
        : img.dataBase64;
      parts.push({ inlineData: { mimeType: img.mimeType, data } });
    }
  }
  const body: any = {
    contents: [{ role: "user", parts }],
  };
  // Attach generationConfig hints if needed
  body.generationConfig = {
    // Hints to the backend model; actual schema may vary
    // We pass through as metadata-like hints
    temperature: 0.4,
    topP: 0.9,
    topK: 32,
  };
  // Vendor-specific fields often go in "tools" or "safetySettings"; keep generic
  body.toolConfig = {
    // Pass options so backend can interpret where applicable
    removeAudio: opts?.removeAudio ?? false,
    durationSeconds: opts?.durationSeconds,
    aspectRatio: opts?.aspectRatio,
    resolution: opts?.resolution,
    stylePreset: opts?.stylePreset,
    styleStrength: opts?.styleStrength,
    negativePrompt: opts?.negativePrompt,
  } as any;
  return body;
}
