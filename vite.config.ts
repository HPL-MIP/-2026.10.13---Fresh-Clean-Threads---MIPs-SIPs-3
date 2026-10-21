import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const virtualEndcardId = "virtual:histrips-sample-endcard";
const resolvedVirtualEndcardId = `\0${virtualEndcardId}`;
const projectRoot = dirname(fileURLToPath(import.meta.url));

function createSanitizedEndcardHtml(sourceHtml: string) {
  const videoUrls = [
    ...sourceHtml.matchAll(/data:video\/[^;]+;base64,[A-Za-z0-9+/=]+/g),
  ].map((match) => match[0]);

  if (videoUrls.length !== 2) {
    throw new Error(
      `Expected two embedded videos in sample_endcard.html, found ${videoUrls.length}.`,
    );
  }

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
<div id="video-container"><video id="sip-video" preload="auto" autoplay muted loop playsinline></video></div>
<script>
(function(){
${videoDeclarations}
const targetAspectRatio=16/9;
const extremeRatioThreshold=1.8;
const video=document.getElementById("sip-video");
const container=document.getElementById("video-container");
let pendingFrame=0;
let lifecyclePaused=false;
function setContainerSize(widthPct,heightPct){container.style.width=widthPct+"%";container.style.height=heightPct+"%"}
function tryPlay(){if(lifecyclePaused)return;try{const attempt=video.play();if(attempt&&typeof attempt.catch==="function")attempt.catch(function(){})}catch(_error){}}
function update(){
  const portrait=window.matchMedia?!window.matchMedia("(orientation: landscape)").matches:window.innerHeight>window.innerWidth;
  const longSide=Math.max(window.innerWidth,window.innerHeight);
  const shortSide=Math.min(window.innerWidth,window.innerHeight);
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
window.addEventListener("message",function(event){
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

function sanitizedEndcardPlugin() {
  return {
    name: "sanitized-histrips-endcard",
    resolveId(id: string) {
      return id === virtualEndcardId ? resolvedVirtualEndcardId : null;
    },
    load(id: string) {
      if (id !== resolvedVirtualEndcardId) return null;
      const sourcePath = resolve(
        projectRoot,
        "Assets/Histrips Assets/sample_endcard.html",
      );
      const sourceHtml = readFileSync(sourcePath, "utf8");
      return `export default ${JSON.stringify(createSanitizedEndcardHtml(sourceHtml))};`;
    },
  };
}

export default defineConfig({
  plugins: [sanitizedEndcardPlugin(), react(), viteSingleFile()],
  build: {
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    target: "es2018",
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
});
