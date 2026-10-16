import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const outputPath = resolve(root, "dist/index.html");
const deliveryName =
  "freshcleanthreads_acslanot_mip_20261013_03_ecomm_game_unknown_human_none_none.html";
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
  "URLSearchParams",
  "getCreativeNow",
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

const htmlDataMatches = [
  ...html.matchAll(/data:text\/html;base64,([A-Za-z0-9+/=]+)/g),
];
if (htmlDataMatches.length !== 1) {
  fail(`Expected one embedded HTML endcard, found ${htmlDataMatches.length}.`);
}

const embeddedEndcard = Buffer.from(htmlDataMatches[0][1], "base64").toString(
  "utf8",
);
if (!embeddedEndcard.startsWith("<!doctype html>")) {
  fail("The embedded endcard is not valid HTML content.");
}
if (/mraid/i.test(embeddedEndcard)) {
  fail("The embedded endcard still contains nested MRAID integration.");
}
if (/<script\b[^>]*\bsrc=/i.test(embeddedEndcard)) {
  fail("The embedded endcard contains an external script reference.");
}
if (/https?:\/\//i.test(embeddedEndcard)) {
  fail("The embedded endcard contains a literal external protocol.");
}
if ((embeddedEndcard.match(/<video\b/gi) ?? []).length !== 1) {
  fail("The embedded endcard video surface is missing or duplicated.");
}
if (!embeddedEndcard.includes("fct-endcard-ready")) {
  fail("The embedded endcard is missing its decoded-frame readiness signal.");
}

const markupOnly = html.replace(
  /(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi,
  "$1$2",
);
const resourceAttributes = [
  ...markupOnly.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi),
].map((match) => match[1]);
for (const resource of resourceAttributes) {
  if (resource === "mraid.js" || resource.startsWith("data:") || resource.startsWith("#")) {
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
  "ball.webp",
  "bottom_platform.webp",
  "CONGRATULATIONS!.webp",
  "CTA.webp",
  "Fall Essentials Crew 6Pack.webp",
  "landscape.webp",
  "LOGO.webp",
  "obstacle1.webp",
  "obstacle2.webp",
  "obstacle3.webp",
  "obstacle4.webp",
  "Poof.webp",
  "portrait.webp",
  "product.webp",
  "Roboto-Regular.ttf",
  "ScoreBoard.webp",
  "TAP TO START.webp",
  "tshirt1.webp",
  "tshirt2.webp",
  "tshirt3.webp",
  "tshirt4.webp",
  "tshirt5.webp",
  "tshirt6.webp",
  "tutorialhand.webp",
];

for (const asset of binaryAssets) {
  const bytes = readFileSync(resolve(root, "Assets", asset));
  const encoded = bytes.toString("base64");
  if (!html.includes(encoded)) {
    fail(`Asset bytes were not embedded exactly: ${asset}`);
  }
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
for (const [index, match] of inlineScripts.entries()) {
  if (!match[1].trim()) continue;
  try {
    // Syntax validation only; the creative is not executed during packaging.
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
