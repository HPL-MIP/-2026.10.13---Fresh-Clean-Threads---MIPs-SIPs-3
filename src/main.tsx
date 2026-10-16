import { createRoot } from "react-dom/client";
import App from "./App";
import { trackEvent } from "./analytics";
import { criticalImageUrls } from "./assets";
import { initMraid } from "./networks";
import "./styles.css";

function waitForDom() {
  if (document.readyState !== "loading") return Promise.resolve();
  return new Promise<void>((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

async function preloadImage(url: string) {
  const image = new Image();
  image.src = url;
  try {
    if (typeof image.decode === "function") {
      await image.decode();
    } else {
      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }
  } catch (error) {
    await new Promise<void>((resolve) => {
      if (image.complete) resolve();
      else {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      }
    });
  }
}

async function boot() {
  await waitForDom();
  await initMraid();
  trackEvent("LOADING");
  await Promise.all(criticalImageUrls.map(preloadImage));

  let rootElement = document.getElementById("root");
  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.appendChild(rootElement);
  }

  createRoot(rootElement).render(<App />);
}

void boot();
