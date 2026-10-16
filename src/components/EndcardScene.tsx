import { useEffect, useMemo, useRef, useState } from "react";
import endcardDataUrl from "virtual:sanitized-endcard";

type EndcardSceneProps = {
  paused: boolean;
  onReveal: () => void;
  onCta: () => void;
};

function dateForEndcard() {
  const date = window.getCreativeNow();
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EndcardScene({ paused, onReveal, onCta }: EndcardSceneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const announcedRef = useRef(false);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;
  const [ready, setReady] = useState(false);
  const source = useMemo(
    () => `${endcardDataUrl}#date=${dateForEndcard()}`,
    [],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.data?.type !== "fct-endcard-ready"
      ) {
        return;
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setReady(true));
      });
    };

    window.addEventListener("message", handleMessage);
    const fallback = window.setTimeout(() => setReady(true), 1800);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: paused ? "fct-media-pause" : "fct-media-resume" },
      "*",
    );
  }, [paused, ready]);

  useEffect(() => {
    if (!ready || paused || announcedRef.current) return;
    announcedRef.current = true;
    onRevealRef.current();
  }, [paused, ready]);

  return (
    <section className={`endcard-scene ${ready ? "endcard-scene--ready" : ""}`}>
      <iframe
        ref={iframeRef}
        className="endcard-frame"
        src={source}
        title="Fresh Clean Tees offer"
        tabIndex={-1}
      />
      <button
        className="endcard-click-layer"
        onClick={onCta}
        aria-label="Open the Fresh Clean Tees offer"
      />
    </section>
  );
}
