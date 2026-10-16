import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trackEvent } from "./analytics";
import { assets } from "./assets";
import { GameScene } from "./components/GameScene";
import { EndcardScene } from "./components/EndcardScene";
import { ProductScene } from "./components/ProductScene";
import { GAMEPLAY, PRODUCT_EFFECTS, Z_INDEX } from "./constants";
import { useResponsive } from "./hooks/useResponsive";
import { useSound } from "./hooks/useSound";
import {
  notifyGameEnd,
  notifyGameReady,
  notifyGameStart,
  triggerCTA,
  useMraidLifecycle,
} from "./networks";

type Scene = "game" | "product" | "endcard";

export default function App() {
  const layout = useResponsive();
  const lifecycle = useMraidLifecycle();
  const sounds = useSound(assets.sounds, {
    paused: lifecycle.paused,
    audioVolume: lifecycle.audioVolume,
  });
  const [scene, setScene] = useState<Scene>("game");
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const productAnnouncedRef = useRef(false);
  const endcardAnnouncedRef = useRef(false);

  useEffect(() => {
    trackEvent("LOADED");
    trackEvent("DISPLAYED");
    notifyGameReady();
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleDebugKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "0" || event.repeat) return;
      sounds.stopRolling();
      setScene("product");
    };

    window.addEventListener("keydown", handleDebugKeyDown);
    return () => window.removeEventListener("keydown", handleDebugKeyDown);
  }, [sounds]);

  useEffect(() => {
    if (
      scene !== "product" ||
      lifecycle.paused ||
      productAnnouncedRef.current
    ) {
      return;
    }
    productAnnouncedRef.current = true;
    sounds.playProduct();
  }, [lifecycle.paused, scene, sounds]);

  useEffect(() => {
    if (scene !== "product") return;
    const timeout = window.setTimeout(() => {
      setScene("endcard");
    }, GAMEPLAY.productDurationMs);
    return () => window.clearTimeout(timeout);
  }, [scene]);

  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    notifyGameStart();
    trackEvent("CHALLENGE_STARTED");
  };

  const handleSolved = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    sounds.stopRolling();
    notifyGameEnd();
    trackEvent("CHALLENGE_SOLVED");
    setScene("product");
  };

  const handleEndcardReveal = () => {
    if (endcardAnnouncedRef.current) return;
    endcardAnnouncedRef.current = true;
    trackEvent("ENDCARD_SHOWN");
    sounds.playEndcard();
  };

  const handleCollision = () => {
    sounds.stopRolling();
    sounds.playFail();
  };

  const stageStyle = {
    width: `${layout.logicalW}px`,
    height: `${layout.logicalH}px`,
    transform: `translate3d(${layout.offsetX}px, ${layout.offsetY}px, 0) scale(${layout.scale})`,
  };

  const platformFloorRatio =
    layout.orientation === "portrait"
      ? GAMEPLAY.floorRatioPortrait
      : GAMEPLAY.floorRatioLandscape;

  const appStyle = {
    "--stage-width": `${layout.logicalW * layout.scale}px`,
    "--stage-height": `${layout.logicalH * layout.scale}px`,
    "--platform-height": `${
      layout.logicalH *
      (1 - platformFloorRatio) *
      layout.scale
    }px`,
    "--product-background-blur": `${PRODUCT_EFFECTS.backgroundBlurPx}px`,
    "--product-stage-blur": `${
      PRODUCT_EFFECTS.backgroundBlurPx / layout.scale
    }px`,
    "--product-overlay-opacity": PRODUCT_EFFECTS.overlayOpacity,
    "--z-background": Z_INDEX.background,
    "--z-platform": Z_INDEX.platform,
    "--z-stage": Z_INDEX.stage,
    "--z-game": Z_INDEX.gameObjects,
    "--z-hud": Z_INDEX.hud,
    "--z-dim": Z_INDEX.dimOverlay,
    "--z-result": Z_INDEX.resultUi,
    "--z-input": Z_INDEX.inputBlocker,
    "--z-cta": Z_INDEX.cta,
  } as CSSProperties;

  return (
    <main
      className={`app${scene === "game" ? "" : " app--product"}`}
      data-orientation={layout.viewportOrientation}
      style={appStyle}
    >
      <img
        className={`viewport-background viewport-background--${layout.viewportOrientation}`}
        src={
          layout.viewportOrientation === "portrait"
            ? assets.portraitBackground
            : assets.landscapeBackground
        }
        alt=""
        draggable={false}
        aria-hidden="true"
      />
      <div
        className={`design-stage${
          scene === "game" ? " design-stage--game" : " design-stage--product"
        }`}
        style={stageStyle}
      >
        <GameScene
          layout={layout}
          interactive={scene === "game"}
          paused={lifecycle.paused || scene !== "game"}
          sounds={sounds}
          onChallengeStart={handleStart}
          onChallengeSolved={handleSolved}
          onCollect={sounds.playCollect}
          onCollision={handleCollision}
          onCta={triggerCTA}
        />
        {(scene === "product" || scene === "endcard") && (
          <ProductScene layout={layout} onCta={triggerCTA} />
        )}
      </div>
      {scene === "game" && (
        <div className="viewport-platform" aria-hidden="true" />
      )}
      {scene === "endcard" && (
        <EndcardScene
          paused={lifecycle.paused}
          onReveal={handleEndcardReveal}
          onCta={triggerCTA}
        />
      )}
    </main>
  );
}
