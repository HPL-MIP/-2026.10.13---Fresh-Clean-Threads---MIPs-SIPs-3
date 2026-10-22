import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createSanitizedEndcardHtml, suppliedEndcardPath } from "./scripts/endcard.mjs";
import { viteSingleFile } from "vite-plugin-singlefile";

const virtualEndcardId = "virtual:histrips-endcard";
const resolvedVirtualEndcardId = `\0${virtualEndcardId}`;
const projectRoot = dirname(fileURLToPath(import.meta.url));

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
        suppliedEndcardPath,
      );
      const sourceHtml = readFileSync(sourcePath, "utf8");
      const html = createSanitizedEndcardHtml(sourceHtml);
      const dataUrl = `data:text/html;base64,${Buffer.from(html).toString("base64")}`;
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
