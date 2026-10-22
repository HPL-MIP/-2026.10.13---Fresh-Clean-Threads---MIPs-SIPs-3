import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const suppliedEndcardPath = "Assets/Histrips Assets/histrips_acslanot_sip_20261016_03_ecomm_product_card_human_none_none.html";

export function getEndcardVideoUrls(sourceHtml) {
  const originals = [
    ...sourceHtml.matchAll(/data:video\/[^;]+;base64,[A-Za-z0-9+/=]+/g),
  ].map((match) => match[0]);

  if (originals.length !== 2) {
    throw new Error(
      `Expected two embedded videos in supplied endcard HTML, found ${originals.length}.`,
    );
  }
  const manifest = JSON.parse(readFileSync(new URL("../src/assets/videos/endcard.json", import.meta.url), "utf8"));
  return ["portrait", "landscape"].map((orientation, index) => {
    const original = Buffer.from(originals[index].split(",")[1], "base64");
    const hash = createHash("sha256").update(original).digest("hex");
    if (manifest[orientation] !== hash) throw new Error("Endcard source changed; run npm run prepare:endcard with FFmpeg available.");
    const video = readFileSync(new URL(`../src/assets/videos/endcard-${orientation}.mp4`, import.meta.url));
    return `data:video/mp4;base64,${video.toString("base64")}`;
  });
}

export function createSanitizedEndcardHtml(sourceHtml) {
  const videoUrls = getEndcardVideoUrls(sourceHtml);

  const videoDeclarations =
    videoUrls[0] === videoUrls[1]
      ? `const sharedVideo=${JSON.stringify(videoUrls[0])};const portraitVideo=sharedVideo;const landscapeVideo=sharedVideo;`
      : `const portraitVideo=${JSON.stringify(videoUrls[0])};const landscapeVideo=${JSON.stringify(videoUrls[1])};`;

  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#000}
body{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center}
#video-container{width:100%;height:100vh;height:100dvh;overflow:hidden}
#sip-video{display:block;width:100%;height:100%;object-fit:cover}
</style>
</head>
<body>
<div id="video-container"><video id="sip-video" preload="auto" muted loop playsinline></video></div>
<script>
(function(){
${videoDeclarations}
const targetAspectRatio=16/9;
const extremeRatioThreshold=1.8;
const video=document.getElementById("sip-video");
const container=document.getElementById("video-container");
let pendingFrame=0;
let lifecyclePaused=true;
function setContainerSize(widthPct,heightPct){container.style.width=widthPct+"%";container.style.height=heightPct+"%"}
function tryPlay(){if(lifecyclePaused||document.hidden)return;try{const attempt=video.play();if(attempt&&typeof attempt.then==="function")attempt.then(function(){if(lifecyclePaused||document.hidden)video.pause()},function(){})}catch(_error){}}
function update(){
  const portrait=window.matchMedia?!window.matchMedia("(orientation: landscape)").matches:window.innerHeight>window.innerWidth;
  const viewport=window.visualViewport;
  const viewportWidth=viewport?viewport.width:window.innerWidth;
  const viewportHeight=viewport?viewport.height:window.innerHeight;
  const longSide=Math.max(viewportWidth,viewportHeight);
  const shortSide=Math.min(viewportWidth,viewportHeight);
  const width=portrait?shortSide:longSide;
  const height=portrait?longSide:shortSide;
  const normalizedRatio=width>height?width/height:height/width;
  setContainerSize(100,100);
  if(normalizedRatio>extremeRatioThreshold){
    if(portrait){setContainerSize(100,(width*targetAspectRatio/height)*100)}
    else{setContainerSize((height*targetAspectRatio/width)*100,100)}
  }
  const nextSource=portrait?portraitVideo:landscapeVideo;
  if(video.getAttribute("src")!==nextSource){video.setAttribute("src",nextSource);video.load()}
  tryPlay();
}
function scheduleUpdate(){if(pendingFrame)return;pendingFrame=requestAnimationFrame(function(){pendingFrame=0;update()})}
window.addEventListener("resize",scheduleUpdate,{passive:true});
window.addEventListener("orientationchange",scheduleUpdate,{passive:true});
if(window.visualViewport)window.visualViewport.addEventListener("resize",scheduleUpdate,{passive:true});
window.addEventListener("message",function(event){
  if(event.source!==window.parent)return;
  const data=event.data;
  if(!data||data.type!=="histrips:endcard-media")return;
  lifecyclePaused=Boolean(data.paused);
  if(lifecyclePaused){video.pause()}else{tryPlay()}
});
document.addEventListener("visibilitychange",function(){if(document.hidden)video.pause();else tryPlay()});
update();
})();
</script>
</body>
</html>`;
}

