import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const targetPath = resolve("src/assets/sounds/RollingBall.optimized.wav");
const targetSampleRate = 16_000;
const input = readFileSync(targetPath);
const fmtOffset = input.indexOf(Buffer.from("fmt "));
const dataOffset = input.indexOf(Buffer.from("data"));

if (fmtOffset < 0 || dataOffset < 0) {
  throw new Error("RollingBall.optimized.wav is missing a WAV fmt or data chunk.");
}

const audioFormat = input.readUInt16LE(fmtOffset + 8);
const channels = input.readUInt16LE(fmtOffset + 10);
const inputSampleRate = input.readUInt32LE(fmtOffset + 12);
const bitsPerSample = input.readUInt16LE(fmtOffset + 22);

if (audioFormat !== 1 || channels !== 1 || bitsPerSample !== 16) {
  throw new Error(
    "Expected RollingBall.optimized.wav to be 16-bit mono PCM before resampling.",
  );
}

if (inputSampleRate === targetSampleRate) {
  console.log(`[SFX] RollingBall already prepared at ${targetSampleRate} Hz.`);
  process.exit(0);
}

const inputDataSize = input.readUInt32LE(dataOffset + 4);
const inputSampleCount = Math.floor(inputDataSize / 2);
const outputSampleCount = Math.floor(
  (inputSampleCount * targetSampleRate) / inputSampleRate,
);
const outputDataSize = outputSampleCount * 2;
const output = Buffer.alloc(44 + outputDataSize);

output.write("RIFF", 0);
output.writeUInt32LE(36 + outputDataSize, 4);
output.write("WAVE", 8);
output.write("fmt ", 12);
output.writeUInt32LE(16, 16);
output.writeUInt16LE(1, 20);
output.writeUInt16LE(1, 22);
output.writeUInt32LE(targetSampleRate, 24);
output.writeUInt32LE(targetSampleRate * 2, 28);
output.writeUInt16LE(2, 32);
output.writeUInt16LE(16, 34);
output.write("data", 36);
output.writeUInt32LE(outputDataSize, 40);

for (let index = 0; index < outputSampleCount; index += 1) {
  const sourcePosition = (index * inputSampleRate) / targetSampleRate;
  const sourceIndex = Math.floor(sourcePosition);
  const fraction = sourcePosition - sourceIndex;
  const first = input.readInt16LE(dataOffset + 8 + sourceIndex * 2);
  const secondIndex = Math.min(sourceIndex + 1, inputSampleCount - 1);
  const second = input.readInt16LE(dataOffset + 8 + secondIndex * 2);
  const sample = Math.round(first + (second - first) * fraction);
  output.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), 44 + index * 2);
}

writeFileSync(targetPath, output);
console.log(
  `[SFX] Prepared RollingBall at ${targetSampleRate} Hz (${output.length} bytes).`,
);
