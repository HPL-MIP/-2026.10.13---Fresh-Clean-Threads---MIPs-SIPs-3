import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trackEvent } from "./analytics";
import { assets } from "./assets";
import { GameScene } from "./components/GameScene";
import { ProductScene } from "./components/ProductScene";
import { TemporaryEndcard } from "./components/TemporaryEndcard";
import {
  BOTTOM_PANEL_OVERLAP,
  GAME_COMPLETE_HOLD_MS,
  PRODUCT_EFFECTS,
  PRODUCT_SCENE_DURATION_MS,
  ROAD_LAYOUT,
  Z_INDEX,
} from "./constants";
import { useResponsive } from "./hooks/useResponsive";
import { useSound } from "./hooks/useSound";
import {
  notifyGameEnd,
  notifyGameReady,
  notifyGameStart,
  triggerCTA,
  useMraidLifecycle,
} from "./networks";

type Scene = "game" | "completion" | "product" | "endcard";

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
    if (scene !== "completion") return;
    const timeout = window.setTimeout(() => {
      setScene("product");
    }, GAME_COMPLETE_HOLD_MS);
    return () => window.clearTimeout(timeout);
  }, [scene]);

  useEffect(() => {
    if (scene !== "product") return;
    const timeout = window.setTimeout(() => {
      setScene("endcard");
    }, PRODUCT_SCENE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [scene]);

  useEffect(() => {
    if (
      scene !== "endcard" ||
      lifecycle.paused ||
      endcardAnnouncedRef.current
    ) {
      return;
    }
    endcardAnnouncedRef.current = true;
    trackEvent("ENDCARD_SHOWN");
  }, [lifecycle.paused, scene]);

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
    setScene("completion");
  };

  const handleCollision = () => {
    sounds.stopRolling();
    sounds.playFail();
  };

  const handleCollect = (completesGame: boolean) => {
    if (completesGame) {
      sounds.playCompletion();
      return;
    }
    sounds.playCollect();
  };

  const stageStyle = {
    width: `${layout.logicalW}px`,
    height: `${layout.logicalH}px`,
    transform: `translate3d(${layout.offsetX}px, ${layout.offsetY}px, 0) scale(${layout.scale})`,
  };
  const road = ROAD_LAYOUT[layout.orientation];
  const roadTop = layout.offsetY + road.top * layout.scale;
  const roadHeight = road.height * layout.scale;
  const panelOverlap =
    BOTTOM_PANEL_OVERLAP[layout.viewportOrientation] * layout.scale;

  const appStyle = {
    "--panel-top": `${roadTop + roadHeight - panelOverlap}px`,
    "--product-background-blur": `${PRODUCT_EFFECTS.backgroundBlurPx}px`,
    "--product-background-inset": `${-PRODUCT_EFFECTS.backgroundBlurPx * 2}px`,
    "--product-stage-blur": `${PRODUCT_EFFECTS.backgroundBlurPx / layout.scale}px`,
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
      className={`app${
        scene === "product" || scene === "endcard" ? " app--product" : ""
      }`}
      data-orientation={layout.viewportOrientation}
      style={appStyle}
    >
      <img
        className="viewport-background"
        src={
          layout.viewportOrientation === "portrait"
            ? assets.portraitBackground
            : assets.landscapeBackground
        }
        alt=""
        draggable={false}
        aria-hidden="true"
      />
      <div className="viewport-bottom-panel" aria-hidden="true" />
      <div
        className={`design-stage design-stage--${
          scene === "game" || scene === "completion" ? "game" : "product"
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
          onCollect={handleCollect}
          onCollision={handleCollision}
          onCta={triggerCTA}
        />
        {(scene === "product" || scene === "endcard") && (
          <ProductScene layout={layout} onCta={triggerCTA} />
        )}
      </div>
      {(scene === "product" || scene === "endcard") && (
        <TemporaryEndcard
          visible={scene === "endcard"}
          paused={lifecycle.paused || scene !== "endcard"}
          onCta={triggerCTA}
        />
      )}
    </main>
  );
}
