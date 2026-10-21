import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(
  root,
  "src/assets/sounds/Bonus Special End Timeline.m4a",
);

// These offsets mirror the visible scene flow in App.tsx:
// fifth pickup -> 1 second frozen game -> 3 second product scene -> endcard.
const productSceneOffsetMs = 1_000;
const endcardOffsetMs = 4_000;

const sources = {
  bonus: resolve(root, "Assets/sfx/Bonus Chime.mp3"),
  special: resolve(root, "Assets/sfx/Special Chime Cling.mp3"),
  end: resolve(root, "Assets/sfx/end.mp3"),
};

for (const [name, source] of Object.entries(sources)) {
  if (!existsSync(source)) {
    throw new Error(`Missing ${name} source: ${source}`);
  }
}

const localFfmpeg = resolve(root, "node_modules/ffmpeg-static/ffmpeg.exe");
const ffmpegPath =
  process.env.HISTRIPS_FFMPEG_PATH ||
  (existsSync(localFfmpeg) ? localFfmpeg : "ffmpeg");

mkdirSync(dirname(outputPath), { recursive: true });

const filter = [
  "[0:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=0|0[bonus]",
  `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${productSceneOffsetMs}|${productSceneOffsetMs}[special]`,
  `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${endcardOffsetMs}|${endcardOffsetMs}[end]`,
  "[bonus][special][end]amix=inputs=3:duration=longest:dropout_transition=0:normalize=0[out]",
].join(";");

const result = spawnSync(
  ffmpegPath,
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    sources.bonus,
    "-i",
    sources.special,
    "-i",
    sources.end,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-c:a",
    "aac",
    "-profile:a",
    "aac_low",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    outputPath,
  ],
  { encoding: "utf8", windowsHide: true },
);

if (result.error) {
  throw new Error(
    `Unable to launch FFmpeg. Set HISTRIPS_FFMPEG_PATH to ffmpeg.exe. ${result.error.message}`,
  );
}

if (result.status !== 0) {
  throw new Error(result.stderr || `FFmpeg exited with code ${result.status}.`);
}

const size = statSync(outputPath).size;
console.log(
  `[SFX] Built 44.1 kHz stereo completion timeline: Bonus +0 ms, Special +${productSceneOffsetMs} ms, End +${endcardOffsetMs} ms (${size} bytes).`,
);
