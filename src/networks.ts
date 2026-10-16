import { useSyncExternalStore } from "react";
import { trackEvent } from "./analytics";

export type LifecycleState = {
  documentHidden: boolean;
  mraidHidden: boolean;
  exposed: boolean;
  viewable: boolean;
  audioVolume: number;
  paused: boolean;
};

const listeners = new Set<() => void>();
let initialized = false;
let snapshot: LifecycleState = {
  documentHidden: typeof document !== "undefined" && document.hidden,
  mraidHidden: false,
  exposed: true,
  viewable: true,
  audioVolume: 1,
  paused: false,
};

function publish(patch: Partial<LifecycleState>) {
  const next = { ...snapshot, ...patch };
  next.paused =
    next.documentHidden || next.mraidHidden || !next.exposed || !next.viewable;

  if (
    next.documentHidden === snapshot.documentHidden &&
    next.mraidHidden === snapshot.mraidHidden &&
    next.exposed === snapshot.exposed &&
    next.viewable === snapshot.viewable &&
    next.audioVolume === snapshot.audioVolume &&
    next.paused === snapshot.paused
  ) {
    return;
  }

  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLifecycleState() {
  return snapshot;
}

export function bindLifecycle(listener: (state: LifecycleState) => void) {
  const notify = () => listener(snapshot);
  notify();
  return subscribe(notify);
}

function addMraidListener(
  event: string,
  handler: (...args: unknown[]) => void,
) {
  const mraid = window.mraid;
  if (!mraid || typeof mraid.addEventListener !== "function") return;
  try {
    mraid.addEventListener(event, handler);
  } catch (error) {
    console.warn(`[MRAID] Unable to bind ${event}`, error);
  }
}

export async function initMraid() {
  if (window.__creativeBootPromise) {
    await window.__creativeBootPromise;
  }
  if (initialized) return snapshot;
  initialized = true;

  const mraid = window.mraid;
  if (mraid && typeof mraid.isViewable === "function") {
    try {
      publish({ viewable: Boolean(mraid.isViewable()) });
    } catch (error) {
      publish({ viewable: true });
    }
  }

  addMraidListener("error", (message, action) => {
    console.warn("[MRAID error]", message, action);
  });
  addMraidListener("stateChange", (state) => {
    publish({ mraidHidden: state === "hidden" });
  });
  addMraidListener("exposureChange", (percentage) => {
    if (typeof percentage === "number") {
      publish({ exposed: percentage > 0 });
    }
  });
  addMraidListener("viewableChange", (viewable) => {
    publish({ viewable: Boolean(viewable) });
  });
  addMraidListener("audioVolumeChange", (percentage) => {
    if (typeof percentage === "number") {
      publish({ audioVolume: Math.max(0, Math.min(1, percentage / 100)) });
    }
  });

  document.addEventListener("visibilitychange", () => {
    publish({ documentHidden: document.hidden });
  });

  return snapshot;
}

export function useMraidLifecycle() {
  return useSyncExternalStore(subscribe, getLifecycleState, getLifecycleState);
}

function callLifecycle(name: "gameReady" | "gameStart" | "gameEnd" | "gameClose") {
  const callback = window[name];
  if (typeof callback !== "function") return;
  try {
    callback();
  } catch (error) {
    console.warn(`[Lifecycle] ${name} failed`, error);
  }
}

export const notifyGameReady = () => callLifecycle("gameReady");
export const notifyGameStart = () => callLifecycle("gameStart");
export const notifyGameEnd = () => callLifecycle("gameEnd");
export const notifyGameClose = () => callLifecycle("gameClose");

export function triggerCTA() {
  notifyGameClose();
  trackEvent("CTA_CLICKED");

  if (typeof window.handleClickAction === "function") {
    window.handleClickAction();
    return;
  }

  const mraid = window.mraid || {};
  const clickTarget =
    window.clickTag ||
    window.clickTag1 ||
    window.clickthrough ||
    window.clickThrough ||
    "";

  if (
    typeof mraid.open === "function" &&
    typeof window.isMraidUsable === "function" &&
    window.isMraidUsable(mraid)
  ) {
    try {
      if (clickTarget) {
        mraid.open(clickTarget);
      } else {
        mraid.open();
      }
    } catch (error) {
      return;
    }
  }
}
