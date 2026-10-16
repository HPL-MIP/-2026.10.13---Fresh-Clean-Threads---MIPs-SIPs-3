import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const END_MARKER_ERROR = "Unable to sanitize the supplied endcard";

function replaceSection(
  source: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`${END_MARKER_ERROR}: ${startMarker}`);
  }
  return `${source.slice(0, start)}${replacement}${source.slice(
    end + endMarker.length,
  )}`;
}

function sanitizeEndcard(source: string) {
  let html = source.replace(
    /<script src="mraid\.js"><\/script>\s*<script>[\s\S]*?<\/script>/i,
    "",
  );

  html = html.replace(
    /\s*video\.addEventListener\("playing",[\s\S]*?video\.addEventListener\("ended",[^\n]*\);\s*/,
    "\n",
  );

  html = replaceSection(
    html,
    "// Handles clickthrough only",
    "let lastTapAt = 0;",
    "      // The parent playable owns the only click-through path.\n" +
      "      function handleClickAction() {}\n\n" +
      "      let lastTapAt = 0;",
  );

  html = html.replace(
    "let mraidViewable = true;",
    "let hostViewable = true;",
  );
  html = replaceSection(
    html,
    "// MRAID hosts can keep the document visible",
    "setupMraidViewability();",
    "      // Visibility is relayed by the parent playable.",
  );

  html = replaceSection(
    html,
    "let adRuntimeStarted = false;",
    "initializeMraidRuntime();",
    `      let adRuntimeStarted = false;

      function init() {
        if (adRuntimeStarted) return;
        adRuntimeStarted = true;
        try {
          startAdRuntime();
        } catch (error) {
          console.warn("Unable to start supplied endcard:", error);
        }
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
      } else {
        init();
      }`,
  );

  const mediaAnchor = `      if (!video || !source || !container) {
        throw new Error("Required SIP video elements are unavailable.");
      }`;
  const mediaReplacement = `${mediaAnchor}

      function notifyParentReady() {
        window.parent.postMessage({ type: "fct-endcard-ready" }, "*");
      }

      video.addEventListener("loadeddata", notifyParentReady, { once: true });
      video.addEventListener("playing", notifyParentReady, { once: true });

      window.addEventListener("message", function (event) {
        if (event.source !== window.parent || !event.data) return;
        if (event.data.type === "fct-media-pause") {
          hostViewable = false;
          syncWindowActivityState();
        }
        if (event.data.type === "fct-media-resume") {
          hostViewable = true;
          syncWindowActivityState();
        }
      });`;
  if (!html.includes(mediaAnchor)) {
    throw new Error(`${END_MARKER_ERROR}: media anchor`);
  }
  html = html.replace(mediaAnchor, mediaReplacement);

  html = html.replace(
    "document.visibilityState === \"visible\" && mraidViewable",
    "document.visibilityState === \"visible\" && hostViewable",
  );
  html = html.replace(
    "video.play().catch(() => {});",
    `try {
            const playback = video.play();
            if (playback && typeof playback.catch === "function") {
              playback.catch(function () {});
            }
          } catch (_error) {}`,
  );
  html = html.replace(
    "resolveSipEffectiveDate(Date.now(), dateRecurrence, dateOffsetDays)",
    "resolveSipEffectiveDate(window.getCreativeNow().getTime(), dateRecurrence, dateOffsetDays)",
  );
  html = html.replace(
    "resolveSipDateRangeText(dateRanges, new Date(), dateRangeDefaultText)",
    "resolveSipDateRangeText(dateRanges, window.getCreativeNow(), dateRangeDefaultText)",
  );
  html = html.replace(
    "var now = new Date();",
    "var now = window.getCreativeNow();",
  );
  html = html.replace(
    "       * - Defers all MRAID calls and layout decisions until MRAID is ready.",
    "       * - Defers layout decisions until the document is ready.",
  );

  const dateHelper = `<script>
      window.getCreativeNow = function () {
        var value = new URLSearchParams(window.location.hash.slice(1)).get("date");
        if (value && /^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
          var parts = value.split("-").map(Number);
          var candidate = new Date(0);
          candidate.setFullYear(parts[0], parts[1] - 1, parts[2]);
          candidate.setHours(12, 0, 0, 0);
          if (
            candidate.getFullYear() === parts[0] &&
            candidate.getMonth() === parts[1] - 1 &&
            candidate.getDate() === parts[2]
          ) return candidate;
        }
        return new Date();
      };
    </script>`;
  html = html.replace("</head>", `${dateHelper}\n  </head>`);

  if (/mraid/i.test(html)) {
    throw new Error(`${END_MARKER_ERROR}: nested host integration remains`);
  }
  return html;
}

function sanitizedEndcardPlugin(): Plugin {
  const virtualId = "virtual:sanitized-endcard";
  const resolvedId = `\0${virtualId}`;

  return {
    name: "sanitized-endcard",
    enforce: "pre",
    resolveId(id) {
      return id === virtualId ? resolvedId : null;
    },
    load(id) {
      if (id !== resolvedId) return null;
      const sourcePath = resolve(
        process.cwd(),
        "Assets/freshcleanthreads_acslanot_sip_20261013_03_emily_product_card_human_none_none.html",
      );
      const sanitized = sanitizeEndcard(readFileSync(sourcePath, "utf8"));
      const dataUrl = `data:text/html;base64,${Buffer.from(sanitized).toString(
        "base64",
      )}`;
      return `export default ${JSON.stringify(dataUrl)};`;
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
