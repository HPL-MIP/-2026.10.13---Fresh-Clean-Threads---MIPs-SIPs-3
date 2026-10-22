import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import endcardUrl from "virtual:histrips-endcard";
import { Z_INDEX } from "../constants";

type TemporaryEndcardProps = {
  visible: boolean;
  paused: boolean;
  onCta: () => void;
};

export function TemporaryEndcard({
  visible,
  paused,
  onCta,
}: TemporaryEndcardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const revealFrameRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const syncMedia = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "histrips:endcard-media", paused },
      "*",
    );
  }, [paused]);

  const handleLoad = useCallback(() => {
    syncMedia();
    revealFrameRef.current = requestAnimationFrame(() => {
      revealFrameRef.current = requestAnimationFrame(() => setLoaded(true));
    });
  }, [syncMedia]);

  useEffect(() => {
    syncMedia();
  }, [syncMedia]);

  useEffect(
    () => () => {
      if (revealFrameRef.current !== null) {
        cancelAnimationFrame(revealFrameRef.current);
      }
    },
    [],
  );

  return createPortal(
    <section
      className={`temporary-endcard${
        visible ? " temporary-endcard--visible" : ""
      }${loaded ? " temporary-endcard--loaded" : ""}`}
      style={{ zIndex: Z_INDEX.cta }}
      aria-label="Histrips offer"
    >
      <iframe
        ref={iframeRef}
        className="temporary-endcard__frame"
        src={endcardUrl}
        title="Histrips offer"
        sandbox="allow-scripts"
        allow="autoplay"
        onLoad={handleLoad}
      />
      <button
        className="temporary-endcard__cta"
        type="button"
        onClick={onCta}
        aria-label="Shop now"
      />
    </section>,
    document.body,
  );
}
