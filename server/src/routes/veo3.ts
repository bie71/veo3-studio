import type { Request, Response } from "express";
import { Router } from "express";
import { buildCinematicPrompt } from "../templates/cinematic.js";
import { extractLastFrame, concatVideos, getDims } from "../services/ffmpeg.js";
import { ensureJob, jobsRoot, lastFramePath, outputPath, segPath, streamToFile, writeBase64DataUrl } from "../services/storage.js";
import { log, err } from "../utils/logger.js";
import { proxyGenerate, buildGenerateBodyFromText, listModels } from "../services/veo3.js";
import type { StoryboardRequest, StoryboardResponse, SegmentResult } from "../types/storyboard.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

export const veo3Router = Router();

function normalizeModel(input?: string): string {
  const m = (input || '').trim();
  if (!m) return 'veo-3.0-fast-generate-001';
  // Map legacy aliases to current model ids
  if (m === 'veo-3.0' || m === 'veo-3') return 'veo-3.0-generate-001';
  if (m === 'veo-3-fast' || m === 'veo-3.0-fast') return 'veo-3.0-fast-generate-001';
  if (m === 'veo-2.0' || m === 'veo-2') return 'veo-2.0-generate-001';
  return m;
}

veo3Router.post("/generate", async (req: Request, res: Response) => {
  try {
    const model = normalizeModel(req.query.model as string);
    const apiKey = (req.header('x-gemini-key') as string) || undefined;
    const body = req.body;

    let payload: any = body;
    if (body && typeof body === "object" && body.prompt && typeof body.prompt === "string") {
      // Build from simplified text shape
      const promptText = buildCinematicPrompt({
        stylePreset: body.stylePreset,
        styleStrength: body.styleStrength,
        matchPrevious: !!body.matchPrevious,
        holdThenMove: !!body.holdThenMove,
        cutaway: !!body.cutaway,
        userBrief: body.prompt,
        removeAudio: !!body.removeAudio,
        aspectRatio: body.aspectRatio || "16:9",
        resolution: body.resolution || "1080p",
        durationSeconds: Math.max(3, Math.min(60, Number(body.durationSeconds) || 5)),
        negativePrompt: body.negativePrompt,
      });
      payload = buildGenerateBodyFromText(promptText, body.referenceImages, {
        removeAudio: !!body.removeAudio,
        durationSeconds: body.durationSeconds,
        aspectRatio: body.aspectRatio,
        resolution: body.resolution,
        stylePreset: body.stylePreset,
        styleStrength: body.styleStrength,
        negativePrompt: body.negativePrompt,
      });
    }

    const upstream = await proxyGenerate(model, payload, apiKey);
    const ct = upstream.headers.get("content-type") || "";
    // Intercept NOT_FOUND to provide a clearer message
    if (upstream.status === 404 && ct.includes('application/json')) {
      const errJson = await upstream.json().catch(()=>({}));
      return res.status(404).json({
        ok: false,
        message: `Model \"${model}\" is not available for your API key or does not support generateContent in v1beta. Use /api/veo3/models to see accessible models or update your key (Veo access required).`,
        error: errJson,
      });
    }
    res.status(upstream.status);
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-store");
    if (ct.includes("application/json")) {
      const data = await upstream.text();
      res.send(data);
    } else {
      (upstream.body as any).pipe(res);
    }
  } catch (e: any) {
    err("/generate error", e);
    res.status(500).json({ ok: false, message: e?.message || "Generate failed" });
  }
});

veo3Router.post("/frame-extract", async (req: Request, res: Response) => {
  try {
    const { videoPath, jobId, segIndex } = req.body || {};
    if (!videoPath) return res.status(400).json({ ok: false, message: "videoPath required" });
    const pngPath = jobId && Number.isInteger(segIndex) ? lastFramePath(jobId, segIndex) : videoPath + ".last.png";
    await extractLastFrame(videoPath, pngPath);
    const b64 = (await readFile(pngPath)).toString("base64");
    res.json({ ok: true, dataUrl: `data:image/png;base64,${b64}`, path: pngPath });
  } catch (e: any) {
    err("/frame-extract error", e);
    res.status(500).json({ ok: false, message: e?.message || "Frame extract failed" });
  }
});

veo3Router.post("/segments", async (req: Request, res: Response) => {
  const body = req.body as StoryboardRequest;
  const apiKey = (req.header('x-gemini-key') as string) || undefined;
  const model = normalizeModel(body.model);
  const jobId = body.jobId || `job_${Date.now()}`;
  const fps = body.global.fps || 30;
  await ensureJob(jobId);
  const results: SegmentResult[] = [];
  let prevLastFrameDataUrl: string | null = null;

  for (let i = 0; i < body.segments.length; i++) {
    const seg = body.segments[i];
    try {
      const segOut = segPath(jobId, seg.id);
      // Build payload
      let payload: any;
      if (seg.rawBody) {
        payload = seg.rawBody;
        // Inject references if provided
        if (seg.referenceImages && Array.isArray(seg.referenceImages) && payload?.contents?.[0]?.parts) {
          for (const img of seg.referenceImages) {
            payload.contents[0].parts.push({ inlineData: { mimeType: img.mimeType, data: img.dataBase64 } });
          }
        }
      } else {
        const promptText = buildCinematicPrompt({
          stylePreset: body.global.stylePreset,
          styleStrength: body.global.styleStrength,
          matchPrevious: !!seg.usePrevLastFrame,
          holdThenMove: true,
          cutaway: true,
          userBrief: seg.prompt || "",
          removeAudio: !!body.global.removeAudio,
          aspectRatio: body.global.aspectRatio,
          resolution: body.global.resolution,
          durationSeconds: seg.durationSeconds,
          negativePrompt: body.global.negativePrompt,
        });
        const refs = [...(seg.referenceImages || [])];
        if (seg.usePrevLastFrame && prevLastFrameDataUrl) {
          refs.unshift({ mimeType: "image/png", dataBase64: prevLastFrameDataUrl });
        }
        payload = buildGenerateBodyFromText(promptText, refs, {
          removeAudio: !!body.global.removeAudio,
          durationSeconds: seg.durationSeconds,
          aspectRatio: body.global.aspectRatio,
          resolution: body.global.resolution,
          stylePreset: body.global.stylePreset,
          styleStrength: body.global.styleStrength,
          negativePrompt: body.global.negativePrompt,
        });
      }

      const upstream = await proxyGenerate(model, payload, apiKey);
      const ct = upstream.headers.get("content-type") || "";
      let savedPath: string | undefined;
      if (ct.includes("application/json")) {
        const json = await upstream.json();
        // Attempt to find media URL in common fields
        const url: string | undefined = json?.videoUrl || json?.url || json?.resultUrl || json?.candidates?.[0]?.content?.parts?.find((p: any) => p.fileData?.fileUri)?.fileData?.fileUri;
        if (!url) throw new Error("No media URL in response");
        const media = await fetch(url);
        if (!media.ok) throw new Error(`Fetch media failed: ${media.status}`);
        await streamToFile(media as any, segOut);
        savedPath = segOut;
      } else {
        await streamToFile(upstream as any, segOut);
        savedPath = segOut;
      }

      // Extract last frame and store dataUrl for next iteration
      const pngPath = lastFramePath(jobId, seg.id);
      await extractLastFrame(segOut, pngPath);
      const b64 = (await readFile(pngPath)).toString("base64");
      prevLastFrameDataUrl = `data:image/png;base64,${b64}`;

      results.push({ id: seg.id, ok: true, videoUrl: `/jobs/${jobId}/seg_${seg.id}.mp4`, lastFrameUrl: `/jobs/${jobId}/seg_${seg.id}_last.png` });
    } catch (e: any) {
      err("segment error", e);
      results.push({ id: seg.id, ok: false, message: e?.message || "Segment failed" });
    }
  }

  const resp: StoryboardResponse = { results };
  res.json({ jobId, ...resp });
});

// List models accessible to the provided API key
veo3Router.get('/models', async (req: Request, res: Response) => {
  try {
    const apiKey = (req.header('x-gemini-key') as string) || undefined;
    const data = await listModels(apiKey);
    res.json(data);
  } catch (e: any) {
    err('models error', e);
    res.status(500).json({ ok: false, message: e?.message || 'List models failed' });
  }
});

veo3Router.post("/concat", async (req: Request, res: Response) => {
  try {
    const { jobId, aspectRatio, resolution, fps, segments } = req.body || {};
    if (!jobId || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ ok: false, message: "jobId and segments[] required" });
    }
    const out = outputPath(jobId);
    await concatVideos(segments, out, aspectRatio || "16:9", resolution || "1080p", Number(fps || 30));
    res.json({ ok: true, url: `/jobs/${jobId}/output.mp4` });
  } catch (e: any) {
    err("concat error", e);
    res.status(500).json({ ok: false, message: e?.message || "Concat failed" });
  }
});
