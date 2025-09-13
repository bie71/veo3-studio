import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { log } from "../utils/logger.js";

export function runFfmpeg(args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    ff.stdout.on("data", (d) => log("ffmpeg:", d.toString()));
    ff.stderr.on("data", (d) => log("ffmpeg:", d.toString()));
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

export async function extractLastFrame(input: string, outPng: string): Promise<void> {
  // Grab one frame ~0.1s before end as a safe heuristic
  await runFfmpeg(["-sseof", "-0.1", "-i", input, "-frames:v", "1", outPng]);
}

export function getDims(aspect: "16:9" | "9:16", resolution: "720p" | "1080p"): { w: number; h: number } {
  if (aspect === "16:9") {
    return resolution === "1080p" ? { w: 1920, h: 1080 } : { w: 1280, h: 720 };
  } else {
    return resolution === "1080p" ? { w: 1080, h: 1920 } : { w: 720, h: 1280 };
  }
}

export async function concatVideos(
  inputs: string[],
  outFile: string,
  aspect: "16:9" | "9:16",
  resolution: "720p" | "1080p",
  fps: number
): Promise<void> {
  const { w, h } = getDims(aspect, resolution);
  const listFile = join(tmpdir(), `concat_${Date.now()}.txt`);
  const listContent = inputs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(listFile, listContent, "utf8");
  // Re-encode on concat to ensure uniform params
  await runFfmpeg([
    "-f", "concat",
    "-safe", "0",
    "-i", listFile,
    "-vf",
    `fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-r", String(fps),
    outFile,
  ]);
}

