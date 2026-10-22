import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { suppliedEndcardPath } from "./endcard.mjs";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, suppliedEndcardPath), "utf8");
const videos = [...source.matchAll(/data:video\/[^;]+;base64,([A-Za-z0-9+/=]+)/g)];
if (videos.length !== 2) throw new Error("Expected portrait and landscape videos.");
const localFfmpeg = resolve(root, "node_modules/ffmpeg-static/ffmpeg.exe");
const ffmpeg = process.env.HISTRIPS_FFMPEG_PATH || (existsSync(localFfmpeg) ? localFfmpeg : "ffmpeg");
const output = resolve(root, "src/assets/videos");
mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "histrips-endcard-"));
const manifest = {};
try {
  for (const [index, orientation] of ["portrait", "landscape"].entries()) {
    const bytes = Buffer.from(videos[index][1], "base64");
    const input = join(temporary, `${orientation}.mp4`);
    writeFileSync(input, bytes);
    const destination = join(output, `endcard-${orientation}.mp4`);
    const result = spawnSync(ffmpeg, [
      "-y", "-hide_banner", "-loglevel", "error", "-i", input,
      "-vf", "scale=trunc(iw*min(1\\,640/max(iw\\,ih))/2)*2:trunc(ih*min(1\\,640/max(iw\\,ih))/2)*2",
      "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "26",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", destination,
    ], { encoding: "utf8", windowsHide: true });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
    manifest[orientation] = createHash("sha256").update(bytes).digest("hex");
    console.log(`[Endcard] ${orientation}: ${bytes.length} -> ${readFileSync(destination).length} bytes`);
  }
  writeFileSync(join(output, "endcard.json"), `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  const target = resolve(temporary);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("histrips-endcard-")) {
    throw new Error("Unexpected temporary output path.");
  }
  rmSync(target, { recursive: true, force: true });
}
