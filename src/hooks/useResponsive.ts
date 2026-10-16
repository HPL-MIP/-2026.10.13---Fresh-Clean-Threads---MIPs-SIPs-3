import { useEffect, useMemo, useState } from "react";
import { DESIGN, SCENE_ORIENTATION } from "../constants";

export type ResponsiveState = {
  viewW: number;
  viewH: number;
  dpr: number;
  orientation: "portrait" | "landscape";
  viewportOrientation: "portrait" | "landscape";
  logicalW: number;
  logicalH: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  sx: (value: number) => number;
  sy: (value: number) => number;
  sd: (value: number) => number;
};

function readViewport() {
  const viewport = window.visualViewport;
  return {
    viewW: Math.max(1, viewport?.width ?? window.innerWidth),
    viewH: Math.max(1, viewport?.height ?? window.innerHeight),
    dpr: Math.max(1, window.devicePixelRatio || 1),
  };
}

export function useResponsive(): ResponsiveState {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    let frame = 0;
    const timers = new Set<number>();

    const commit = () => {
      frame = 0;
      setViewport(readViewport());
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(commit);
    };
    const settle = () => {
      schedule();
      [100, 300, 600].forEach((delay) => {
        const timer = window.setTimeout(schedule, delay);
        timers.add(timer);
      });
    };

    window.addEventListener("resize", settle, { passive: true });
    window.addEventListener("orientationchange", settle, { passive: true });
    window.visualViewport?.addEventListener("resize", settle, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    settle();

    return () => {
      window.removeEventListener("resize", settle);
      window.removeEventListener("orientationchange", settle);
      window.visualViewport?.removeEventListener("resize", settle);
      window.visualViewport?.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return useMemo(() => {
    const orientation = SCENE_ORIENTATION;
    const viewportOrientation =
      viewport.viewH >= viewport.viewW ? "portrait" : "landscape";
    const design = DESIGN[orientation];
    const scale = Math.min(
      viewport.viewW / design.width,
      viewport.viewH / design.height,
    );
    const offsetX = (viewport.viewW - design.width * scale) / 2;
    const offsetY = (viewport.viewH - design.height * scale) / 2;

    document.documentElement.style.setProperty("--vw", `${viewport.viewW}px`);
    document.documentElement.style.setProperty("--vh", `${viewport.viewH}px`);
    document.documentElement.style.setProperty("--dpr", `${viewport.dpr}`);
    document.documentElement.style.setProperty("--scale", `${scale}`);
    document.documentElement.style.setProperty("--offset-x", `${offsetX}px`);
    document.documentElement.style.setProperty("--offset-y", `${offsetY}px`);

    return {
      ...viewport,
      orientation,
      viewportOrientation,
      logicalW: design.width,
      logicalH: design.height,
      scale,
      offsetX,
      offsetY,
      sx: (value: number) => offsetX + value * scale,
      sy: (value: number) => offsetY + value * scale,
      sd: (value: number) => value * scale,
    };
  }, [viewport]);
}
