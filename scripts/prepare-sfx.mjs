import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TARGET_RATE = 22_050;

function readChunks(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Expected a RIFF/WAVE source file.");
  }

  const chunks = new Map();
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    chunks.set(id, buffer.subarray(offset + 8, offset + 8 + size));
    offset += 8 + size + (size % 2);
  }
  return chunks;
}

function decodeSample(data, offset, bits) {
  if (bits === 16) return data.readInt16LE(offset) / 32_768;
  if (bits === 24) return data.readIntLE(offset, 3) / 8_388_608;
  throw new Error(`Unsupported PCM depth: ${bits}`);
}

function convertToMono16(sourcePath, outputPath) {
  const chunks = readChunks(readFileSync(sourcePath));
  const format = chunks.get("fmt ");
  const data = chunks.get("data");
  if (!format || !data) throw new Error(`Missing fmt/data chunk: ${sourcePath}`);

  const channels = format.readUInt16LE(2);
  const sourceRate = format.readUInt32LE(4);
  const blockAlign = format.readUInt16LE(12);
  const bits = format.readUInt16LE(14);
  const bytesPerSample = bits / 8;
  const sourceFrames = Math.floor(data.length / blockAlign);
  const targetFrames = Math.max(1, Math.floor(sourceFrames * TARGET_RATE / sourceRate));
  const targetData = Buffer.alloc(targetFrames * 2);

  const monoAt = (frame) => {
    const clamped = Math.max(0, Math.min(sourceFrames - 1, frame));
    const frameOffset = clamped * blockAlign;
    let sample = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sample += decodeSample(data, frameOffset + channel * bytesPerSample, bits);
    }
    return sample / channels;
  };

  for (let frame = 0; frame < targetFrames; frame += 1) {
    const sourcePosition = frame * sourceRate / TARGET_RATE;
    const leftFrame = Math.floor(sourcePosition);
    const mix = sourcePosition - leftFrame;
    const value = monoAt(leftFrame) * (1 - mix) + monoAt(leftFrame + 1) * mix;
    const pcm = Math.max(-32_768, Math.min(32_767, Math.round(value * 32_767)));
    targetData.writeInt16LE(pcm, frame * 2);
  }

  const output = Buffer.alloc(44 + targetData.length);
  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(TARGET_RATE, 24);
  output.writeUInt32LE(TARGET_RATE * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36, "ascii");
  output.writeUInt32LE(targetData.length, 40);
  targetData.copy(output, 44);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output);
}

const projectRoot = resolve(import.meta.dirname, "..");
convertToMono16(
  resolve(projectRoot, "Assets/sfx/RollingBall.wav"),
  resolve(projectRoot, "src/assets/sounds/RollingBall.optimized.wav"),
);
convertToMono16(
  resolve(projectRoot, "Assets/sfx/Metal Clank.wav"),
  resolve(projectRoot, "src/assets/sounds/Metal Clank.optimized.wav"),
);
