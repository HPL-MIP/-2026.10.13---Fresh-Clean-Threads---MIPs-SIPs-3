import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSanitizedEndcardHtml, getEndcardVideoUrls, suppliedEndcardPath } from "./endcard.mjs";

const root = process.cwd();
const outputPath = resolve(root, "dist/index.html");
const deliveryName =
  "histrips_acslanot_mip_20261016_03_ecomm_game_unknown_human_none_none.html";
const deliveryPath = resolve(root, "dist", deliveryName);
const maxBytes = 5_000_000;

function fail(message) {
  throw new Error(`[AppLovin build] ${message}`);
}

let html = readFileSync(outputPath, "utf8");

html = html
  .replace(/\s+type=["']module["']/gi, "")
  .replace(/\s+crossorigin(?:=["'][^"']*["'])?/gi, "")
  .replace(/\/\*![\s\S]*?\*\//g, "")
  .replace(/\/\/![^\r\n]*/g, "")
  .replace(/https:\/\//g, "https:\\/\\/")
  .replace(/http:\/\//g, "http:\\/\\/");

writeFileSync(outputPath, html, "utf8");

const bytes = Buffer.byteLength(html);
if (bytes > maxBytes) {
  fail(`${deliveryName} is ${bytes} bytes; the limit is ${maxBytes} bytes.`);
}

const bridgeMatches = html.match(/<script src=["']mraid\.js["']><\/script>/g) ?? [];
if (bridgeMatches.length !== 1) {
  fail(`Expected one mraid.js bridge, found ${bridgeMatches.length}.`);
}

const requiredSourceChecks = [
  "trackMraidReadiness",
  "window.isMraidUsable",
  'mraid.getState() === "loading"',
  'mraid.addEventListener("ready", init)',
  "function handleClickAction()",
  "window.clickTag ||",
  "window.clickTag1 ||",
  "window.clickthrough ||",
  "window.clickThrough ||",
  "mraid.open(clickTarget)",
  "mraid.open()",
  "[Analytics]",
  "viewableChange",
  "exposureChange",
  "audioVolumeChange",
  "gameReady",
  "gameStart",
  "gameEnd",
  "gameClose",
];

for (const check of requiredSourceChecks) {
  if (!html.includes(check)) fail(`Missing required source pattern: ${check}`);
}
if (!/console\.log\([^)]*\[Analytics\]/.test(html)) {
  fail("Analytics console logging is missing from the production bundle.");
}

const bridgeIndex = html.indexOf('<script src="mraid.js"></script>');
const readinessIndex = html.indexOf("trackMraidReadiness", bridgeIndex);
const bundledScriptIndex = html.indexOf("createRoot", bridgeIndex);
if (
  bridgeIndex < 0 ||
  readinessIndex < bridgeIndex ||
  (bundledScriptIndex >= 0 && readinessIndex > bundledScriptIndex)
) {
  fail("The MRAID readiness helper is not immediately ahead of the playable bundle.");
}

if (/<script\b[^>]*(?:type=["']module["']|\bcrossorigin\b)/i.test(html)) {
  fail("Module or crossorigin script attributes remain in the output.");
}
if (/\bwindow\.open\s*\(/.test(html)) {
  fail("A non-MRAID open() path remains in the output.");
}
if (
  /location\.(?:assign|replace)\s*\(/i.test(html) ||
  /location\.href\s*=(?!=)/i.test(html)
) {
  fail("A browser navigation fallback remains in the output.");
}
if (/https?:\/\//i.test(html)) {
  fail("A literal external protocol remains in the output.");
}

const markupOnly = html.replace(
  /(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi,
  "$1$2",
);
const resourceAttributes = [
  ...markupOnly.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi),
].map((match) => match[1]);
for (const resource of resourceAttributes) {
  if (
    resource === "mraid.js" ||
    resource.startsWith("data:") ||
    resource.startsWith("#")
  ) {
    continue;
  }
  fail(`External or separate resource remains: ${resource}`);
}

const cssUrls = [...markupOnly.matchAll(/url\(([^)]+)\)/gi)].map((match) =>
  match[1].replace(/["']/g, "").trim(),
);
for (const resource of cssUrls) {
  if (!resource.startsWith("data:")) {
    fail(`Non-embedded CSS resource remains: ${resource.slice(0, 120)}`);
  }
}

const binaryAssets = [
  "Assets/Histrips Assets/bike_frame_1.webp",
  "Assets/Histrips Assets/bike_frame_2.webp",
  "Assets/Histrips Assets/Collect atleast 5 Products.webp",
  "Assets/Histrips Assets/Collect for Reveal.webp",
  "Assets/Histrips Assets/cone.webp",
  "Assets/Histrips Assets/CTA.webp",
  "Assets/Histrips Assets/EFFECTS.webp",
  "Assets/Histrips Assets/Hand.webp",
  "Assets/Histrips Assets/Inter_bold_72.35.ttf",
  "Assets/Histrips Assets/landscape.webp",
  "Assets/Histrips Assets/Lavender Mouth Tape, Pink Nasal Strips & White Nasal Strips.webp",
  "Assets/Histrips Assets/logo.webp",
  "Assets/Histrips Assets/logo_product_scene.webp",
  "Assets/Histrips Assets/manhole.webp",
  "Assets/Histrips Assets/Poof.webp",
  "Assets/Histrips Assets/portrait.webp",
  "Assets/Histrips Assets/product 1.webp",
  "Assets/Histrips Assets/product 2.webp",
  "Assets/Histrips Assets/product 3.webp",
  "Assets/Histrips Assets/product_main.webp",
  "Assets/Histrips Assets/road_merged_long.webp",
  "Assets/Histrips Assets/Group 8352.webp",
  "Assets/Histrips Assets/TAP TO START.webp",
  "Assets/Histrips Assets/TRY AGAIN.webp",
  "Assets/Histrips Assets/wheel.webp",
  "Assets/Histrips Assets/YOU’VE GOT!.webp",
  "Assets/sfx/Bonus Chime.mp3",
  "Assets/sfx/Fail Sound.mp3",
  "Assets/sfx/Woosh 3.mp3",
  "src/assets/sounds/Bonus Special End Timeline.m4a",
  "src/assets/sounds/RollingBall.optimized.wav",
];

for (const asset of binaryAssets) {
  const assetBytes = readFileSync(resolve(root, asset));
  const encoded = assetBytes.toString("base64");
  if (!html.includes(encoded)) {
    fail(`Asset bytes were not embedded exactly: ${asset}`);
  }
}

for (const mergedSource of [
  "Assets/sfx/Special Chime Cling.mp3",
  "Assets/sfx/end.mp3",
]) {
  const encoded = readFileSync(resolve(root, mergedSource)).toString("base64");
  if (html.includes(encoded)) {
    fail(`Merged completion source was also embedded separately: ${mergedSource}`);
  }
}

const suppliedEndcard = readFileSync(resolve(root, suppliedEndcardPath), "utf8");
const transformedEndcard = createSanitizedEndcardHtml(suppliedEndcard);
const embeddedEndcards = [
  ...html.matchAll(/data:text\/html;base64,([A-Za-z0-9+/=]+)/g),
];
if (embeddedEndcards.length !== 1) {
  fail(`Expected one embedded endcard HTML, found ${embeddedEndcards.length}.`);
}
const endcardBytes = Buffer.from(embeddedEndcards[0][1], "base64");
if (!endcardBytes.equals(Buffer.from(transformedEndcard))) {
  fail("Embedded endcard HTML does not match the transformed supplied source.");
}
if (/mraid|handleClickAction|signalPlayableLifecycle/.test(transformedEndcard)) {
  fail("The embedded endcard duplicates top-level SDK integration.");
}
const suppliedVideoPayloads = getEndcardVideoUrls(suppliedEndcard).map((url) => url.split(",")[1]);
if (suppliedVideoPayloads.length !== 2) {
  fail(
    `Expected two video payloads in supplied endcard HTML, found ${suppliedVideoPayloads.length}.`,
  );
}
for (const payload of new Set(suppliedVideoPayloads)) {
  if (!transformedEndcard.includes(payload)) {
    fail("A supplied endcard video payload is missing from the build.");
  }
}
if (!transformedEndcard.includes("histrips:endcard-media")) {
  fail("The parent-controlled temporary endcard lifecycle channel is missing.");
}

const inlineScripts = [
  ...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi),
  ...transformedEndcard.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi),
];
for (const [index, match] of inlineScripts.entries()) {
  if (!match[1].trim()) continue;
  try {
    new Function(match[1]);
  } catch (error) {
    fail(`Inline script ${index + 1} does not parse: ${error.message}`);
  }
}

if (/\/\*!|\/\/!/.test(html)) {
  fail("Legal or license banner comments remain in the output.");
}

renameSync(outputPath, deliveryPath);
console.log(
  `[AppLovin build] dist/${deliveryName} validated (${bytes.toLocaleString()} bytes).`,
);
