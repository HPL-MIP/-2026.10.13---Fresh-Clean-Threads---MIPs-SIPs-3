import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { assets } from "../assets";
import { GAMEPLAY, LAYOUT, SCORE_TEXT_POSITION } from "../constants";
import type { ResponsiveState } from "../hooks/useResponsive";
import type { PlayableSoundHandle } from "../hooks/useSound";

type GameSceneProps = {
  layout: ResponsiveState;
  interactive: boolean;
  paused: boolean;
  sounds: PlayableSoundHandle;
  onChallengeStart: () => void;
  onChallengeSolved: () => void;
  onCollect: () => void;
  onCollision: () => void;
  onCta: () => void;
};

type Obstacle = {
  x: number;
  width: number;
  height: number;
  imageIndex: number;
};

type Collectible = {
  shirtIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Poof = {
  x: number;
  y: number;
  age: number;
};

type World = {
  running: boolean;
  score: number;
  ballY: number;
  ballVelocity: number;
  ballRotation: number;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  poofs: Poof[];
  shirtQueue: number[];
  spawnDistance: number;
  obstaclesUntilShirt: number;
};

const OBSTACLE_HEIGHTS = [185, 17, 124, 224];
const MIN_SPAWN_OBSTACLE_HEIGHT = 100;
const SPAWNABLE_OBSTACLE_INDICES = OBSTACLE_HEIGHTS.flatMap(
  (height, imageIndex) =>
    height >= MIN_SPAWN_OBSTACLE_HEIGHT ? [imageIndex] : [],
);

function shuffledShirts() {
  const values = [0, 1, 2, 3, 4, 5];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [values[index], values[next]] = [values[next], values[index]];
  }
  return values;
}

function randomShirtObstacleInterval() {
  return (
    GAMEPLAY.shirtObstacleIntervalMin +
    Math.floor(
      Math.random() *
        (GAMEPLAY.shirtObstacleIntervalMax -
          GAMEPLAY.shirtObstacleIntervalMin +
          1),
    )
  );
}

function createImage(url: string) {
  const image = new Image();
  image.src = url;
  return image;
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function layoutStyle(
  item: { left: number; top: number; width: number },
): React.CSSProperties {
  return {
    left: `${item.left * 100}%`,
    top: `${item.top * 100}%`,
    width: `${item.width * 100}%`,
  };
}

function getFloorY(layout: ResponsiveState) {
  const authoredFloorRatio =
    layout.orientation === "portrait"
      ? GAMEPLAY.floorRatioPortrait
      : GAMEPLAY.floorRatioLandscape;
  const authoredPlatformHeight =
    layout.logicalH * (1 - authoredFloorRatio);

  return (
    (layout.viewH - layout.offsetY) / layout.scale - authoredPlatformHeight
  );
}

function getBallYOffset(portrait: boolean) {
  return portrait
    ? GAMEPLAY.ballYOffsetPortrait
    : GAMEPLAY.ballYOffsetLandscape;
}

function getCanvasMetrics(layout: ResponsiveState) {
  return {
    bleedLeft: layout.offsetX / layout.scale,
    logicalWidth: layout.viewW / layout.scale,
  };
}

function getObstacleSpawnX(
  layout: ResponsiveState,
  obstacleWidth: number,
) {
  const viewportRightX =
    (layout.viewW - layout.offsetX) / layout.scale;
  return viewportRightX - obstacleWidth / 2;
}

export function GameScene({
  layout,
  interactive,
  paused,
  sounds,
  onChallengeStart,
  onChallengeSolved,
  onCollect,
  onCollision,
  onCta,
}: GameSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<
    "intro" | "running" | "crashed" | "complete"
  >("intro");
  const callbackRef = useRef({
    onChallengeStart,
    onChallengeSolved,
    onCollect,
    onCollision,
    sounds,
  });
  callbackRef.current = {
    onChallengeStart,
    onChallengeSolved,
    onCollect,
    onCollision,
    sounds,
  };

  const images = useMemo(
    () => ({
      ball: createImage(assets.ball),
      obstacles: assets.obstacles.map(createImage),
      shirts: assets.shirts.map(createImage),
      poof: createImage(assets.poof),
    }),
    [],
  );

  const worldRef = useRef<World>({
    running: false,
    score: 0,
    ballY: 0,
    ballVelocity: 0,
    ballRotation: 0,
    obstacles: [],
    collectibles: [],
    poofs: [],
    shirtQueue: shuffledShirts(),
    spawnDistance: 0,
    obstaclesUntilShirt: randomShirtObstacleInterval(),
  });
  const floorRef = useRef<number | null>(null);
  const collisionLockedRef = useRef(false);
  const collisionResetTimerRef = useRef<number | null>(null);
  const layoutRef = useRef(layout);
  const pausedRef = useRef(paused);
  const interactiveRef = useRef(interactive);
  layoutRef.current = layout;
  pausedRef.current = paused;
  interactiveRef.current = interactive;

  const resetWorld = () => {
    if (collisionResetTimerRef.current !== null) {
      window.clearTimeout(collisionResetTimerRef.current);
      collisionResetTimerRef.current = null;
    }
    collisionLockedRef.current = false;

    const current = layoutRef.current;
    const portrait = current.orientation === "portrait";
    const floor = getFloorY(current);
    const ballSize = portrait
      ? GAMEPLAY.ballSizePortrait
      : GAMEPLAY.ballSizeLandscape;
    const ballYOffset = getBallYOffset(portrait);
    floorRef.current = floor;
    worldRef.current = {
      running: false,
      score: 0,
      ballY: floor - ballSize + ballYOffset,
      ballVelocity: 0,
      ballRotation: 0,
      obstacles: [],
      collectibles: [],
      poofs: [],
      shirtQueue: shuffledShirts(),
      spawnDistance: 0,
      obstaclesUntilShirt: randomShirtObstacleInterval(),
    };
    setScore(0);
    setMode("intro");
  };

  useEffect(
    () => () => {
      if (collisionResetTimerRef.current !== null) {
        window.clearTimeout(collisionResetTimerRef.current);
        collisionResetTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const nextFloor = getFloorY(layout);
    const previousFloor = floorRef.current;

    if (previousFloor === null) {
      resetWorld();
      return;
    }

    floorRef.current = nextFloor;
    const floorDelta = nextFloor - previousFloor;
    const world = worldRef.current;
    if (Math.abs(floorDelta) >= 0.01) {
      world.ballY += floorDelta;
      world.collectibles.forEach((collectible) => {
        collectible.y += floorDelta;
      });
      world.poofs.forEach((poof) => {
        poof.y += floorDelta;
      });
    }

    const obstacleWidth =
      layout.orientation === "portrait"
        ? GAMEPLAY.obstacleWidthPortrait
        : GAMEPLAY.obstacleWidthLandscape;
    const nextSpawnX = getObstacleSpawnX(layout, obstacleWidth);
    const rightmostObstacleX = world.obstacles.reduce(
      (rightmost, obstacle) => Math.max(rightmost, obstacle.x),
      Number.NEGATIVE_INFINITY,
    );

    if (Number.isFinite(rightmostObstacleX)) {
      const safeRemainingDistance =
        rightmostObstacleX + GAMEPLAY.obstacleGapMin - nextSpawnX;
      world.spawnDistance = Math.max(
        world.spawnDistance,
        safeRemainingDistance,
      );
    }
  }, [
    layout.logicalH,
    layout.logicalW,
    layout.offsetX,
    layout.offsetY,
    layout.orientation,
    layout.scale,
    layout.viewH,
    layout.viewW,
    layout.viewportOrientation,
  ]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.round(layout.viewW * layout.dpr);
    canvas.height = Math.round(
      layout.logicalH * layout.scale * layout.dpr,
    );
  }, [layout.dpr, layout.logicalH, layout.scale, layout.viewW]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    let nextInteractionId = 1;
    let activeInteractionId: number | null = null;
    let activePointerId: number | null = null;
    let activeTouchId: number | null = null;
    const mobileUserAgent = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent,
    );
    const ipadDesktopMode =
      navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const useTouchEvents =
      (mobileUserAgent || ipadDesktopMode) &&
      "ontouchstart" in window &&
      navigator.maxTouchPoints > 0;

    const activate = (event: Event, interactionId: number) => {
      if (
        !interactiveRef.current ||
        pausedRef.current ||
        collisionLockedRef.current
      ) {
        return false;
      }
      event.preventDefault();
      const current = layoutRef.current;
      const portrait = current.orientation === "portrait";
      const floor = getFloorY(current);
      const ballSize = portrait
        ? GAMEPLAY.ballSizePortrait
        : GAMEPLAY.ballSizeLandscape;
      const restingBallY = floor - ballSize + getBallYOffset(portrait);
      const world = worldRef.current;
      const startsGame = !world.running && world.score < 6;

      if (!world.running && !startsGame) return false;

      const onGround = world.ballY >= restingBallY - 2;
      if (onGround) callbackRef.current.sounds.stopRolling();
      callbackRef.current.sounds.beginGameplayGesture({
        interactionId,
        jump: onGround,
      });

      if (!world.running) {
        world.running = true;
        world.obstacles = [];
        world.collectibles = [];
        world.spawnDistance = 0;
        setMode("running");
        callbackRef.current.onChallengeStart();
      }

      if (onGround) {
        world.ballY = restingBallY;
        world.ballVelocity =
          GAMEPLAY.jumpVelocity *
          (current.viewportOrientation === "landscape"
            ? GAMEPLAY.landscapeJumpVelocityMultiplier
            : 1);
      }
      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (activePointerId !== null) return;
      const interactionId = nextInteractionId;
      nextInteractionId += 1;
      if (!activate(event, interactionId)) return;
      activePointerId = event.pointerId;
      activeInteractionId = interactionId;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (
        event.pointerId !== activePointerId ||
        activeInteractionId === null
      ) {
        return;
      }
      callbackRef.current.sounds.retryGameplayGesture(activeInteractionId);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (
        event.pointerId !== activePointerId ||
        activeInteractionId === null
      ) {
        return;
      }
      callbackRef.current.sounds.endGameplayGesture(activeInteractionId);
      activePointerId = null;
      activeInteractionId = null;
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (
        event.pointerId !== activePointerId ||
        activeInteractionId === null
      ) {
        return;
      }
      callbackRef.current.sounds.cancelGameplayGesture(activeInteractionId);
      activePointerId = null;
      activeInteractionId = null;
    };
    const onTouchStart = (event: TouchEvent) => {
      if (activeTouchId !== null || event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      const interactionId = nextInteractionId;
      nextInteractionId += 1;
      if (!activate(event, interactionId)) return;
      activeTouchId = touch.identifier;
      activeInteractionId = interactionId;
    };
    const touchMatches = (event: TouchEvent) =>
      Array.from(event.changedTouches).some(
        (touch) => touch.identifier === activeTouchId,
      );
    const onTouchMove = (event: TouchEvent) => {
      if (
        activeTouchId === null ||
        activeInteractionId === null ||
        !Array.from(event.touches).some(
          (touch) => touch.identifier === activeTouchId,
        )
      ) {
        return;
      }
      callbackRef.current.sounds.retryGameplayGesture(activeInteractionId);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (
        activeTouchId === null ||
        activeInteractionId === null ||
        !touchMatches(event)
      ) {
        return;
      }
      callbackRef.current.sounds.endGameplayGesture(activeInteractionId);
      activeTouchId = null;
      activeInteractionId = null;
    };
    const onTouchCancel = (event: TouchEvent) => {
      if (
        activeTouchId === null ||
        activeInteractionId === null ||
        !touchMatches(event)
      ) {
        return;
      }
      callbackRef.current.sounds.cancelGameplayGesture(activeInteractionId);
      activeTouchId = null;
      activeInteractionId = null;
    };
    const onWindowBlur = () => {
      if (activeInteractionId !== null) {
        callbackRef.current.sounds.cancelGameplayGesture(activeInteractionId);
      }
      activePointerId = null;
      activeTouchId = null;
      activeInteractionId = null;
    };

    window.addEventListener("blur", onWindowBlur);

    if (useTouchEvents) {
      input.addEventListener("touchstart", onTouchStart, {
        capture: true,
        passive: false,
      });
      window.addEventListener("touchmove", onTouchMove, {
        capture: true,
        passive: false,
      });
      window.addEventListener("touchend", onTouchEnd, {
        capture: true,
        passive: false,
      });
      window.addEventListener("touchcancel", onTouchCancel, {
        capture: true,
        passive: false,
      });
      return () => {
        onWindowBlur();
        window.removeEventListener("blur", onWindowBlur);
        input.removeEventListener("touchstart", onTouchStart, {
          capture: true,
        });
        window.removeEventListener("touchmove", onTouchMove, {
          capture: true,
        });
        window.removeEventListener("touchend", onTouchEnd, {
          capture: true,
        });
        window.removeEventListener("touchcancel", onTouchCancel, {
          capture: true,
        });
      };
    }

    input.addEventListener("pointerdown", onPointerDown, {
      capture: true,
    });
    window.addEventListener("pointermove", onPointerMove, {
      capture: true,
    });
    window.addEventListener("pointerup", onPointerUp, { capture: true });
    window.addEventListener("pointercancel", onPointerCancel, {
      capture: true,
    });
    return () => {
      onWindowBlur();
      window.removeEventListener("blur", onWindowBlur);
      input.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
      window.removeEventListener("pointermove", onPointerMove, {
        capture: true,
      });
      window.removeEventListener("pointerup", onPointerUp, {
        capture: true,
      });
      window.removeEventListener("pointercancel", onPointerCancel, {
        capture: true,
      });
    };
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const current = layoutRef.current;
      const world = worldRef.current;
      const portrait = current.orientation === "portrait";
      const height = current.logicalH;
      const { bleedLeft } = getCanvasMetrics(current);
      const viewportLeftX = -bleedLeft;
      const floor = getFloorY(current);
      const ballSize = portrait
        ? GAMEPLAY.ballSizePortrait
        : GAMEPLAY.ballSizeLandscape;
      const restingBallY = floor - ballSize + getBallYOffset(portrait);
      const ballX = portrait
        ? GAMEPLAY.ballXPortrait
        : GAMEPLAY.ballXLandscape;
      const obstacleWidth = portrait
        ? GAMEPLAY.obstacleWidthPortrait
        : GAMEPLAY.obstacleWidthLandscape;
      const shirtWidth = portrait
        ? GAMEPLAY.shirtWidthPortrait
        : GAMEPLAY.shirtWidthLandscape;
      const shirtHeight = shirtWidth * 1.1;
      const speed = portrait
        ? GAMEPLAY.obstacleSpeed
        : GAMEPLAY.obstacleSpeed * 1.28;
      const delta = Math.min(0.034, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (world.running && !pausedRef.current) {
        const wasAirborne =
          world.ballY < restingBallY - 2 || world.ballVelocity !== 0;
        world.ballVelocity += GAMEPLAY.gravity * delta;
        world.ballY += world.ballVelocity * delta;
        world.ballRotation += delta * 3.8;
        if (world.ballY >= restingBallY) {
          world.ballY = restingBallY;
          world.ballVelocity = 0;
          if (wasAirborne) callbackRef.current.sounds.playRolling();
        }

        const travel = speed * delta;
        world.spawnDistance -= travel;
        world.obstacles.forEach((obstacle) => {
          obstacle.x -= travel;
        });
        world.collectibles.forEach((collectible) => {
          collectible.x -= travel;
        });
        world.poofs.forEach((poof) => {
          poof.x -= travel;
          poof.age += delta;
        });

        if (world.spawnDistance <= 0) {
          const imageIndex =
            SPAWNABLE_OBSTACLE_INDICES[
              Math.floor(Math.random() * SPAWNABLE_OBSTACLE_INDICES.length)
            ];
          const heightScale =
            (portrait ? 1 : 0.78) *
            (current.viewportOrientation === "landscape"
              ? GAMEPLAY.landscapeObstacleHeightMultiplier
              : 1);
          const obstacleHeight = OBSTACLE_HEIGHTS[imageIndex] * heightScale;
          const obstacleX = getObstacleSpawnX(current, obstacleWidth);
          world.obstacles.push({
            x: obstacleX,
            width: obstacleWidth,
            height: obstacleHeight,
            imageIndex,
          });

          world.obstaclesUntilShirt -= 1;
          if (world.obstaclesUntilShirt <= 0 && world.shirtQueue.length) {
            const shirtIndex = world.shirtQueue.shift();
            if (typeof shirtIndex === "number") {
              const onObstacle = Math.random() > 0.42;
              world.collectibles.push({
                shirtIndex,
                x: onObstacle
                  ? obstacleX + obstacleWidth / 2 - shirtWidth / 2
                  : obstacleX + 300,
                y: onObstacle
                  ? floor - obstacleHeight - shirtHeight - 34
                  : floor - shirtHeight - 44,
                width: shirtWidth,
                height: shirtHeight,
              });
            }
            world.obstaclesUntilShirt = randomShirtObstacleInterval();
          }

          world.spawnDistance =
            GAMEPLAY.obstacleGapMin +
            Math.random() *
              (GAMEPLAY.obstacleGapMax - GAMEPLAY.obstacleGapMin);
        }

        const ballCollisionHitbox = {
          x: ballX + ballSize * GAMEPLAY.collisionBallInsetXRatio,
          y: world.ballY + ballSize * GAMEPLAY.collisionBallInsetYRatio,
          width: ballSize * (1 - GAMEPLAY.collisionBallInsetXRatio * 2),
          height: ballSize * (1 - GAMEPLAY.collisionBallInsetYRatio * 2),
        };
        const ballCollectionHitbox = {
          x: ballX + ballSize * 0.2,
          y: world.ballY + ballSize * 0.17,
          width: ballSize * 0.6,
          height: ballSize * 0.68,
        };

        const hitObstacle = world.obstacles.some((obstacle) =>
          intersects(ballCollisionHitbox, {
            x:
              obstacle.x +
              obstacle.width * GAMEPLAY.collisionObstacleInsetXRatio,
            y:
              floor -
              obstacle.height +
              obstacle.height * GAMEPLAY.collisionObstacleTopInsetRatio,
            width:
              obstacle.width *
              (1 - GAMEPLAY.collisionObstacleInsetXRatio * 2),
            height:
              obstacle.height *
              (1 - GAMEPLAY.collisionObstacleTopInsetRatio),
          }),
        );

        if (hitObstacle) {
          world.running = false;
          callbackRef.current.onCollision();
          collisionLockedRef.current = true;
          setMode("crashed");
          if (collisionResetTimerRef.current !== null) {
            window.clearTimeout(collisionResetTimerRef.current);
          }
          collisionResetTimerRef.current = window.setTimeout(() => {
            collisionResetTimerRef.current = null;
            resetWorld();
          }, GAMEPLAY.collisionRestartDelayMs);
        } else {
          const retained: Collectible[] = [];
          for (const collectible of world.collectibles) {
            const collected = intersects(ballCollectionHitbox, {
              x: collectible.x + collectible.width * 0.17,
              y: collectible.y + collectible.height * 0.12,
              width: collectible.width * 0.66,
              height: collectible.height * 0.76,
            });

            if (collected) {
              world.poofs.push({
                x: collectible.x + collectible.width / 2,
                y: collectible.y + collectible.height / 2,
                age: 0,
              });
              callbackRef.current.onCollect();
              world.score += 1;
              setScore(world.score);
              if (world.score === 6) {
                world.running = false;
                setMode("complete");
                callbackRef.current.onChallengeSolved();
                break;
              }
            } else if (
              collectible.x + collectible.width < viewportLeftX
            ) {
              world.shirtQueue.push(collectible.shirtIndex);
            } else {
              retained.push(collectible);
            }
          }
          world.collectibles = retained;
        }

        world.obstacles = world.obstacles.filter(
          (obstacle) =>
            obstacle.x + obstacle.width >= viewportLeftX,
        );
        world.poofs = world.poofs.filter((poof) => poof.age < 0.48);
      }

      const renderScale = current.scale * current.dpr;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(
        renderScale,
        0,
        0,
        renderScale,
        bleedLeft * renderScale,
        0,
      );

      world.obstacles.forEach((obstacle) => {
        context.drawImage(
          images.obstacles[obstacle.imageIndex],
          obstacle.x,
          floor - obstacle.height,
          obstacle.width,
          obstacle.height,
        );
      });
      world.collectibles.forEach((collectible) => {
        context.drawImage(
          images.shirts[collectible.shirtIndex],
          collectible.x,
          collectible.y,
          collectible.width,
          collectible.height,
        );
      });
      world.poofs.forEach((poof) => {
        const progress = poof.age / 0.48;
        const size = (portrait ? 240 : 190) * (0.72 + progress * 0.4);
        context.save();
        context.globalAlpha = Math.max(0, 1 - progress);
        context.drawImage(
          images.poof,
          poof.x - size / 2,
          poof.y - size / 2,
          size,
          size * 0.75,
        );
        context.restore();
      });

      context.save();
      context.translate(ballX + ballSize / 2, world.ballY + ballSize / 2);
      context.rotate(world.ballRotation);
      context.drawImage(
        images.ball,
        -ballSize / 2,
        -ballSize / 2,
        ballSize,
        ballSize,
      );
      context.restore();

      animationFrame = window.requestAnimationFrame(draw);
    };

    animationFrame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [images]);

  const authored = LAYOUT["logo"][layout.orientation];
  const scoreLayout = LAYOUT.score[layout.orientation];
  const scoreTextPosition = SCORE_TEXT_POSITION[layout.orientation];
  const tapLayout = LAYOUT.tap[layout.orientation];
  const handLayout = LAYOUT.hand[layout.orientation];
  const ctaLayout = LAYOUT.cta[layout.orientation];
  const canvasMetrics = getCanvasMetrics(layout);
  const inputStyle = {
    left: `${-layout.offsetX / layout.scale}px`,
    top: `${-layout.offsetY / layout.scale}px`,
    width: `${layout.viewW / layout.scale}px`,
    height: `${layout.viewH / layout.scale}px`,
    pointerEvents: interactive ? "auto" : "none",
  } as const;

  return (
    <>
      <canvas
        className="game-canvas"
        ref={canvasRef}
        aria-hidden="true"
        style={{
          left: `${-canvasMetrics.bleedLeft}px`,
          width: `${canvasMetrics.logicalWidth}px`,
        }}
      />
      <img
        className="hud-logo"
        src={assets.logo}
        alt="Fresh Clean Tees"
        style={layoutStyle(authored)}
      />
      <div className="scoreboard" style={layoutStyle(scoreLayout)}>
        <img src={assets.scoreboard} alt="" />
        <span
          style={{
            left: `calc(46.5% + ${scoreTextPosition.x}px)`,
            top: `calc(50% + ${scoreTextPosition.y}px)`,
          }}
        >
          {score} out of 6
        </span>
      </div>
      <div
        className={`tutorial ${mode === "intro" ? "tutorial--visible" : ""}`}
        aria-hidden={mode !== "intro"}
      >
        <img
          className="tap-to-start"
          src={assets.tapToStart}
          alt="Tap to start"
          style={layoutStyle(tapLayout)}
        />
        <img
          className="tutorial-hand"
          src={assets.tutorialHand}
          alt=""
          style={layoutStyle(handLayout)}
        />
      </div>
      <div
        ref={inputRef}
        className="game-input"
        aria-label="Tap to jump"
        role="button"
        style={inputStyle}
      />
      {interactive && (
        <button
          className="game-cta"
          style={layoutStyle(ctaLayout)}
          onClick={onCta}
          aria-label="Shop now"
        >
          <img src={assets.cta} alt="Shop now" />
        </button>
      )}
    </>
  );
}
