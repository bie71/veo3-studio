import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join, dirname, resolve } from "node:path";

export function jobsRoot() {
  return resolve(process.cwd(), "jobs");
}

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function ensureJob(jobId: string) {
  const dir = join(jobsRoot(), jobId);
  await ensureDir(dir);
  return dir;
}

export function segPath(jobId: string, idx: number) {
  return join(jobsRoot(), jobId, `seg_${idx}.mp4`);
}

export function lastFramePath(jobId: string, idx: number) {
  return join(jobsRoot(), jobId, `seg_${idx}_last.png`);
}

export function outputPath(jobId: string) {
  return join(jobsRoot(), jobId, `output.mp4`);
}

export async function streamToFile(res: Response, filePath: string): Promise<void> {
  await ensureDir(dirname(filePath));
  const ws = createWriteStream(filePath);
  const body = res.body as any; // Node.js ReadableStream
  await new Promise<void>((resolve, reject) => {
    body.pipeTo?.(
      // @ts-ignore for web stream, fallback below
      new WritableStream({
        write(chunk: Uint8Array) {
          ws.write(Buffer.from(chunk));
        },
        close() {
          ws.end();
          resolve();
        },
        abort(err: any) {
          ws.destroy(err);
          reject(err);
        },
      })
    ).catch(async () => {
      // Fallback for Node streams
      (res as any).body.on("data", (chunk: Buffer) => ws.write(chunk));
      (res as any).body.on("end", () => {
        ws.end();
        resolve();
      });
      (res as any).body.on("error", (e: any) => {
        ws.destroy(e);
        reject(e);
      });
    });
  });
}

export async function writeBase64DataUrl(path: string, base64: string) {
  const comma = base64.indexOf(",");
  const data = comma >= 0 ? base64.slice(comma + 1) : base64;
  await ensureDir(dirname(path));
  await writeFile(path, Buffer.from(data, "base64"));
}

