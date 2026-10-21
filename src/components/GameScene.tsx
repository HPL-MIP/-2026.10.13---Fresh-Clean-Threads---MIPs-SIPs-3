import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { assets } from "../assets";
import {
  BIKE_FRAME_ALIGNMENT,
  BIKE_FRAME_TIMING,
  BIKE_POSITION,
  BIKE_SCALE,
  BIKE_WHEEL_POSITION,
  GAMEPLAY,
  LAYOUT,
  MANHOLE_POSITION,
  ROAD_LAYOUT,
  TAP_BANNER_SIZE,
  TAP_BANNER_TEXT_SIZE,
} from "../constants";
import type { ResponsiveState } from "../hooks/useResponsive";
import type { PlayableSoundHandle } from "../hooks/useSound";

type GameSceneProps = {
  layout: ResponsiveState;
  interactive: boolean;
  paused: boolean;
  sounds: PlayableSoundHandle;
  onChallengeStart: () => void;
  onChallengeSolved: () => void;
  onCollect: (completesGame: boolean) => void;
  onCollision: () => void;
  onCta: () => void;
};

type Mode = "intro" | "running" | "crashed" | "complete";

type Obstacle = {
  kind: 0 | 1;
  x: number;
  width: number;
  height: number;
};

type Collectible = {
  productIndex: number;
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
  status: Mode;
  score: number;
  bikeY: number;
  bikeVelocity: number;
  wheelRotation: number;
  frameClock: number;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  collectEffects: number[];
  poof: Poof | null;
  roadOffset: number;
  spawnDistance: number;
  nextObstacleGap: number;
  obstaclesUntilProduct: number;
};

const BIKE_BASE_WIDTH = 345;
const BIKE_BASE_HEIGHT = 379;
const WHEEL_BASE_SIZE = 157;
const REAR_WHEEL_BASE_X = 14;
const FRONT_WHEEL_BASE_X = 195;
const WHEEL_BASE_Y = 244;
const PRODUCT_ASPECTS = [139 / 171, 117 / 157, 159 / 196];
const OBSTACLE_ASPECTS = [203 / 188, 345 / 213];
const ROAD_ASPECT = 2172 / 180;

function randomProductInterval() {
  return (
    GAMEPLAY.productObstacleIntervalMin +
    Math.floor(
      Math.random() *
        (GAMEPLAY.productObstacleIntervalMax -
          GAMEPLAY.productObstacleIntervalMin +
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

function layoutStyle(item: {
  left: number;
  top: number;
  width: number;
  height?: number;
}): CSSProperties {
  return {
    left: `${item.left * 100}%`,
    top: `${item.top * 100}%`,
    width: `${item.width * 100}%`,
    ...(item.height === undefined
      ? {}
      : { height: `${item.height * 100}%`, objectFit: "cover" }),
  };
}

function getFloorY(layout: ResponsiveState) {
  return ROAD_LAYOUT[layout.orientation].floor;
}

function getBikeGeometry(layout: ResponsiveState) {
  const baseWidth =
    layout.orientation === "portrait"
      ? GAMEPLAY.bikeWidthPortrait
      : GAMEPLAY.bikeWidthLandscape;
  const width = baseWidth * BIKE_SCALE[layout.viewportOrientation];
  const geometryScale = width / BIKE_BASE_WIDTH;
  const bodyHeight = BIKE_BASE_HEIGHT * geometryScale;
  const wheelSize = WHEEL_BASE_SIZE * geometryScale;
  const wheelY = WHEEL_BASE_Y * geometryScale;

  return {
    width,
    bodyHeight,
    wheelSize,
    wheelY,
    rearWheelX: REAR_WHEEL_BASE_X * geometryScale,
    frontWheelX: FRONT_WHEEL_BASE_X * geometryScale,
    totalHeight: Math.max(bodyHeight, wheelY + wheelSize),
  };
}

function getBikeX(layout: ResponsiveState) {
  return layout.orientation === "portrait"
    ? GAMEPLAY.bikeXPortrait
    : GAMEPLAY.bikeXLandscape;
}

function getObstacleMetrics(layout: ResponsiveState, kind: 0 | 1) {
  const portrait = layout.orientation === "portrait";
  const width =
    kind === 0
      ? portrait
        ? GAMEPLAY.coneWidthPortrait
        : GAMEPLAY.coneWidthLandscape
      : portrait
        ? GAMEPLAY.manholeWidthPortrait
        : GAMEPLAY.manholeWidthLandscape;
  return { width, height: width / OBSTACLE_ASPECTS[kind] };
}

function getObstacleYShift(layout: ResponsiveState, kind: 0 | 1) {
  return kind === 1 ? MANHOLE_POSITION[layout.viewportOrientation].y : 0;
}

function getCanvasMetrics(layout: ResponsiveState) {
  return {
    bleedLeft: layout.offsetX / layout.scale,
    logicalWidth: layout.viewW / layout.scale,
  };
}

function getViewportRightX(layout: ResponsiveState) {
  return (layout.viewW - layout.offsetX) / layout.scale;
}

function getRandomObstacleGap() {
  return (
    GAMEPLAY.obstacleGapMin +
    Math.random() * (GAMEPLAY.obstacleGapMax - GAMEPLAY.obstacleGapMin)
  );
}

function getSpawnX(layout: ResponsiveState) {
  return getViewportRightX(layout) + GAMEPLAY.obstacleSpawnMargin;
}

function addObstacle(world: World, layout: ResponsiveState, obstacleX: number) {
  const portrait = layout.orientation === "portrait";
  const kind = (Math.random() < 0.54 ? 0 : 1) as 0 | 1;
  const obstacle = getObstacleMetrics(layout, kind);
  const obstacleYShift = getObstacleYShift(layout, kind);
  const floor = getFloorY(layout);

  world.obstacles.push({
    kind,
    x: obstacleX,
    width: obstacle.width,
    height: obstacle.height,
  });

  world.obstaclesUntilProduct -= 1;
  if (world.obstaclesUntilProduct <= 0) {
    const productIndex = Math.floor(Math.random() * 3);
    const productWidth = portrait
      ? GAMEPLAY.productWidthPortrait
      : GAMEPLAY.productWidthLandscape;
    const productHeight = productWidth / PRODUCT_ASPECTS[productIndex];
    const productLift =
      layout.viewportOrientation === "portrait"
        ? GAMEPLAY.productLiftPortrait
        : GAMEPLAY.productLiftLandscape;
    const productObstacleLift =
      layout.viewportOrientation === "portrait"
        ? GAMEPLAY.productObstacleLiftPortrait
        : GAMEPLAY.productObstacleLiftLandscape;
    const onObstacle = Math.random() < 0.68;

    world.collectibles.push({
      productIndex,
      x: onObstacle
        ? obstacleX + obstacle.width / 2 - productWidth / 2
        : obstacleX + obstacle.width + (portrait ? 220 : 270),
      y: onObstacle
        ? floor -
          obstacle.height -
          productHeight -
          30 -
          productObstacleLift +
          obstacleYShift
        : floor - productHeight - 30 - productLift,
      width: productWidth,
      height: productHeight,
    });
    world.obstaclesUntilProduct = randomProductInterval();
  }

  world.nextObstacleGap = getRandomObstacleGap();
}

function drawRotatedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  rotation: number,
) {
  context.save();
  context.translate(x + size / 2, y + size / 2);
  context.rotate(rotation);
  context.drawImage(image, -size / 2, -size / 2, size, size);
  context.restore();
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
  const [mode, setMode] = useState<Mode>("intro");
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
      bikeFrames: assets.bikeFrames.map(createImage),
      wheel: createImage(assets.wheel),
      obstacles: assets.obstacles.map(createImage),
      products: assets.products.map(createImage),
      effects: createImage(assets.effects),
      poof: createImage(assets.poof),
      road: createImage(assets.road),
    }),
    [],
  );

  const worldRef = useRef<World>({
    status: "intro",
    score: 0,
    bikeY: 0,
    bikeVelocity: 0,
    wheelRotation: 0,
    frameClock: 0,
    obstacles: [],
    collectibles: [],
    collectEffects: [],
    poof: null,
    roadOffset: 0,
    spawnDistance: GAMEPLAY.firstObstacleOffset,
    nextObstacleGap: GAMEPLAY.obstacleGapMin,
    obstaclesUntilProduct: 0,
  });
  const collisionResetTimerRef = useRef<number | null>(null);
  const layoutRef = useRef(layout);
  const pausedRef = useRef(paused);
  const interactiveRef = useRef(interactive);
  const orientationRef = useRef(layout.orientation);
  const horizontalLayoutRef = useRef({
    viewW: layout.viewW,
    viewH: layout.viewH,
    offsetX: layout.offsetX,
    scale: layout.scale,
    orientation: layout.orientation,
    viewportOrientation: layout.viewportOrientation,
  });
  layoutRef.current = layout;
  pausedRef.current = paused;
  interactiveRef.current = interactive;

  const resetWorld = () => {
    if (collisionResetTimerRef.current !== null) {
      window.clearTimeout(collisionResetTimerRef.current);
      collisionResetTimerRef.current = null;
    }

    const current = layoutRef.current;
    const bike = getBikeGeometry(current);
    worldRef.current = {
      status: "intro",
      score: 0,
      bikeY: getFloorY(current) - bike.totalHeight,
      bikeVelocity: 0,
      wheelRotation: 0,
      frameClock: 0,
      obstacles: [],
      collectibles: [],
      collectEffects: [],
      poof: null,
      roadOffset: 0,
      spawnDistance: GAMEPLAY.firstObstacleOffset,
      nextObstacleGap: getRandomObstacleGap(),
      obstaclesUntilProduct: 0,
    };
    setScore(0);
    setMode("intro");
  };

  useEffect(() => {
    resetWorld();
    return () => {
      if (collisionResetTimerRef.current !== null) {
        window.clearTimeout(collisionResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (orientationRef.current === layout.orientation) return;
    orientationRef.current = layout.orientation;
    resetWorld();
  }, [layout.orientation]);

  useLayoutEffect(() => {
    const previous = horizontalLayoutRef.current;
    const current = layout;
    const changed =
      previous.viewW !== current.viewW ||
      previous.viewH !== current.viewH ||
      previous.offsetX !== current.offsetX ||
      previous.scale !== current.scale ||
      previous.orientation !== current.orientation ||
      previous.viewportOrientation !== current.viewportOrientation;

    if (changed && previous.scale > 0 && current.scale > 0) {
      const scaleRatio = previous.scale / current.scale;
      const previousBikeX =
        (previous.orientation === "portrait"
          ? GAMEPLAY.bikeXPortrait
          : GAMEPLAY.bikeXLandscape) +
        BIKE_POSITION[previous.viewportOrientation].x;
      const previousBikeWidth =
        (previous.orientation === "portrait"
          ? GAMEPLAY.bikeWidthPortrait
          : GAMEPLAY.bikeWidthLandscape) *
        BIKE_SCALE[previous.viewportOrientation];
      const currentBikeX =
        getBikeX(current) + BIKE_POSITION[current.viewportOrientation].x;
      const currentBikeWidth = getBikeGeometry(current).width;
      const previousBikeFront = previousBikeX + previousBikeWidth;
      const currentBikeFront = currentBikeX + currentBikeWidth;
      const world = worldRef.current;
      const nextObstacle = world.obstacles.reduce<Obstacle | null>(
        (nearest, obstacle) =>
          obstacle.x + obstacle.width >= previousBikeFront &&
          (!nearest || obstacle.x < nearest.x)
            ? obstacle
            : nearest,
        null,
      );

      if (nextObstacle) {
        const anchoredX =
          currentBikeFront +
          (nextObstacle.x - previousBikeFront) * scaleRatio;
        const shiftX = anchoredX - nextObstacle.x;

        world.obstacles.forEach((obstacle) => {
          obstacle.x += shiftX;
        });
        world.collectibles.forEach((collectible) => {
          collectible.x += shiftX;
        });
        if (world.poof) world.poof.x += shiftX;
      }

      if (world.status === "running") {
        const spawnBoundary = getSpawnX(current);
        let latestObstacle = world.obstacles.reduce<Obstacle | null>(
          (latest, obstacle) =>
            !latest || obstacle.x > latest.x ? obstacle : latest,
          null,
        );
        let nextSpawnX = latestObstacle
          ? latestObstacle.x + world.nextObstacleGap
          : spawnBoundary;
        let fillCount = 0;

        // A landscape viewport exposes world space that was outside the prior
        // portrait view. Fill that continuation before paint so later objects
        // never pop into an already-visible area after repeated rotations.
        while (latestObstacle && nextSpawnX <= spawnBoundary && fillCount < 8) {
          addObstacle(world, current, nextSpawnX);
          latestObstacle = world.obstacles[world.obstacles.length - 1];
          nextSpawnX = latestObstacle.x + world.nextObstacleGap;
          fillCount += 1;
        }

        world.spawnDistance = latestObstacle
          ? Math.max(0, nextSpawnX - spawnBoundary)
          : world.spawnDistance;
      }
    }

    horizontalLayoutRef.current = {
      viewW: current.viewW,
      viewH: current.viewH,
      offsetX: current.offsetX,
      scale: current.scale,
      orientation: current.orientation,
      viewportOrientation: current.viewportOrientation,
    };
  }, [
    layout.offsetX,
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
    canvas.height = Math.round(layout.logicalH * layout.scale * layout.dpr);
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
      if (!interactiveRef.current || pausedRef.current) return false;
      const world = worldRef.current;
      if (world.status === "crashed" || world.status === "complete") {
        return false;
      }

      event.preventDefault();
      const current = layoutRef.current;
      const bike = getBikeGeometry(current);
      const restingBikeY = getFloorY(current) - bike.totalHeight;
      const onGround = world.bikeY >= restingBikeY - 2;

      callbackRef.current.sounds.beginGameplayGesture({
        interactionId,
        jump: onGround,
      });

      if (world.status === "intro") {
        world.status = "running";
        world.spawnDistance = GAMEPLAY.firstObstacleOffset;
        world.nextObstacleGap = getRandomObstacleGap();
        setMode("running");
        callbackRef.current.onChallengeStart();
      }

      if (onGround) {
        world.bikeY = restingBikeY;
        world.bikeVelocity =
          GAMEPLAY.jumpVelocity *
          (current.orientation === "landscape"
            ? GAMEPLAY.landscapeJumpVelocityMultiplier
            : 1);
      }
      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (activePointerId !== null) return;
      const interactionId = nextInteractionId++;
      if (!activate(event, interactionId)) return;
      activePointerId = event.pointerId;
      activeInteractionId = interactionId;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (
        event.pointerId === activePointerId &&
        activeInteractionId !== null
      ) {
        callbackRef.current.sounds.retryGameplayGesture(activeInteractionId);
      }
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
      const interactionId = nextInteractionId++;
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

    input.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointermove", onPointerMove, { capture: true });
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
      window.removeEventListener("pointerup", onPointerUp, { capture: true });
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
      const { bleedLeft, logicalWidth } = getCanvasMetrics(current);
      const viewportLeftX = -bleedLeft;
      const floor = getFloorY(current);
      const bike = getBikeGeometry(current);
      const bikeX = getBikeX(current);
      const bikePosition = BIKE_POSITION[current.viewportOrientation];
      const bikeScale = BIKE_SCALE[current.viewportOrientation];
      const bikeDrawX = bikeX + bikePosition.x;
      const bikeDrawY = world.bikeY + bikePosition.y;
      const restingBikeY = floor - bike.totalHeight;
      const speed =
        GAMEPLAY.obstacleSpeed *
        (portrait ? 1 : GAMEPLAY.landscapeSpeedMultiplier);
      const delta = Math.min(0.034, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (world.status === "running" && !pausedRef.current) {
        const wasAirborne =
          world.bikeY < restingBikeY - 2 || world.bikeVelocity !== 0;
        world.bikeVelocity += GAMEPLAY.gravity * delta;
        world.bikeY += world.bikeVelocity * delta;
        world.wheelRotation += delta * 9.5;
        world.frameClock += delta;
        if (world.bikeY >= restingBikeY) {
          world.bikeY = restingBikeY;
          world.bikeVelocity = 0;
          if (wasAirborne) callbackRef.current.sounds.playRolling();
        }

        const travel = speed * delta;
        const roadTileWidth = ROAD_LAYOUT[current.orientation].height * ROAD_ASPECT;
        world.roadOffset = (world.roadOffset + travel) % roadTileWidth;
        world.spawnDistance -= travel;
        world.obstacles.forEach((obstacle) => {
          obstacle.x -= travel;
        });
        world.collectibles.forEach((collectible) => {
          collectible.x -= travel;
        });
        world.collectEffects = world.collectEffects
          .map((age) => age + delta)
          .filter((age) => age < GAMEPLAY.collectEffectDurationSeconds);

        if (world.spawnDistance <= 0) {
          const latestObstacle = world.obstacles.reduce<Obstacle | null>(
            (latest, candidate) =>
              !latest || candidate.x > latest.x ? candidate : latest,
            null,
          );
          const spawnBoundary = getSpawnX(current);
          const obstacleX = latestObstacle
            ? Math.max(
                latestObstacle.x + world.nextObstacleGap,
                spawnBoundary,
              )
            : spawnBoundary;
          addObstacle(world, current, obstacleX);
          world.spawnDistance = world.nextObstacleGap;
        }

        const bikeCollisionHitbox = {
          x: bikeDrawX + bike.width * 0.1,
          y: bikeDrawY + bike.totalHeight * 0.22,
          width: bike.width * 0.78,
          height: bike.totalHeight * 0.76,
        };
        const bikeCollectionHitbox = {
          x: bikeDrawX + bike.width * 0.05,
          y: bikeDrawY + bike.totalHeight * 0.02,
          width: bike.width * 0.9,
          height: bike.totalHeight * 0.94,
        };

        const hitObstacle = world.obstacles.find((obstacle) => {
          const manhole = obstacle.kind === 1;
          const yShift = getObstacleYShift(current, obstacle.kind);
          const insetX = manhole ? 0.08 : 0.22;
          const topInset = manhole ? 0.58 : 0.08;
          return intersects(bikeCollisionHitbox, {
            x: obstacle.x + obstacle.width * insetX,
            y:
              floor -
              obstacle.height +
              obstacle.height * topInset +
              yShift,
            width: obstacle.width * (1 - insetX * 2),
            height: obstacle.height * (1 - topInset),
          });
        });

        if (hitObstacle) {
          world.status = "crashed";
          world.poof = {
            x: bikeDrawX + bike.width * 0.82,
            y: floor - (portrait ? 112 : 94),
            age: 0,
          };
          callbackRef.current.onCollision();
          setMode("crashed");
          collisionResetTimerRef.current = window.setTimeout(() => {
            collisionResetTimerRef.current = null;
            resetWorld();
          }, GAMEPLAY.collisionRestartDelayMs);
        } else {
          const retained: Collectible[] = [];
          for (const collectible of world.collectibles) {
            const collected = intersects(bikeCollectionHitbox, {
              x: collectible.x + collectible.width * 0.12,
              y: collectible.y + collectible.height * 0.08,
              width: collectible.width * 0.76,
              height: collectible.height * 0.84,
            });

            if (collected) {
              world.collectEffects.push(0);
              const completesGame =
                world.score + 1 >= GAMEPLAY.targetScore;
              callbackRef.current.onCollect(completesGame);
              world.score += 1;
              setScore(world.score);
              if (world.score >= GAMEPLAY.targetScore) {
                world.status = "complete";
                setMode("complete");
                callbackRef.current.onChallengeSolved();
                break;
              }
            } else if (collectible.x + collectible.width >= viewportLeftX) {
              retained.push(collectible);
            }
          }
          world.collectibles = retained;
        }

        world.obstacles = world.obstacles.filter(
          (obstacle) => obstacle.x + obstacle.width >= viewportLeftX,
        );
      }

      if (world.poof && !pausedRef.current) world.poof.age += delta;

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

      const road = ROAD_LAYOUT[current.orientation];
      const roadTileWidth = road.height * ROAD_ASPECT;
      const roadStartX = viewportLeftX - world.roadOffset - roadTileWidth;
      const viewportRightX = viewportLeftX + logicalWidth;
      for (
        let roadX = roadStartX;
        roadX < viewportRightX + roadTileWidth;
        roadX += roadTileWidth
      ) {
        context.drawImage(
          images.road,
          roadX,
          road.top,
          roadTileWidth,
          road.height,
        );
      }

      world.obstacles.forEach((obstacle) => {
        const yShift = getObstacleYShift(current, obstacle.kind);
        context.drawImage(
          images.obstacles[obstacle.kind],
          obstacle.x,
          floor - obstacle.height + yShift,
          obstacle.width,
          obstacle.height,
        );
      });
      world.collectibles.forEach((collectible) => {
        context.drawImage(
          images.products[collectible.productIndex],
          collectible.x,
          collectible.y,
          collectible.width,
          collectible.height,
        );
      });

      world.collectEffects.forEach((age) => {
        const progress = age / GAMEPLAY.collectEffectDurationSeconds;
        const width =
          (portrait ? 500 : 420) *
          bikeScale *
          (0.8 + progress * 0.28);
        const height = width * (559 / 486);
        context.save();
        context.globalAlpha = Math.max(0, 1 - progress * 0.72);
        context.drawImage(
          images.effects,
          bikeDrawX + bike.width / 2 - width / 2,
          bikeDrawY + bike.totalHeight / 2 - height / 2,
          width,
          height,
        );
        context.restore();
      });

      const rearWheelPosition =
        BIKE_WHEEL_POSITION.rear[current.viewportOrientation];
      const frontWheelPosition =
        BIKE_WHEEL_POSITION.front[current.viewportOrientation];
      drawRotatedImage(
        context,
        images.wheel,
        bikeDrawX + bike.rearWheelX + rearWheelPosition.x * bikeScale,
        bikeDrawY + bike.wheelY + rearWheelPosition.y * bikeScale,
        bike.wheelSize,
        world.wheelRotation,
      );
      drawRotatedImage(
        context,
        images.wheel,
        bikeDrawX + bike.frontWheelX + frontWheelPosition.x * bikeScale,
        bikeDrawY + bike.wheelY + frontWheelPosition.y * bikeScale,
        bike.wheelSize,
        world.wheelRotation,
      );
      const frameIndex =
        world.status === "running" || world.status === "complete"
          ? Math.floor(
              world.frameClock / BIKE_FRAME_TIMING.runningSecondsPerFrame,
            ) % 2
          : 0;
      const framePosition =
        BIKE_FRAME_ALIGNMENT[frameIndex === 0 ? "frame1" : "frame2"][
          current.viewportOrientation
        ];
      context.drawImage(
        images.bikeFrames[frameIndex],
        bikeDrawX + framePosition.x * bikeScale,
        bikeDrawY + framePosition.y * bikeScale,
        bike.width,
        bike.bodyHeight,
      );

      if (world.poof) {
        const pulse = 1 + Math.min(world.poof.age, 0.2) * 0.7;
        const width = (portrait ? 250 : 205) * pulse;
        const height = width * (173 / 231);
        context.drawImage(
          images.poof,
          world.poof.x - width / 2,
          world.poof.y - height / 2,
          width,
          height,
        );
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    animationFrame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [images]);

  const authored = {
    logo: LAYOUT.logo[layout.orientation],
    collectTitle: LAYOUT.collectTitle[layout.orientation],
    collectInstruction: LAYOUT.collectInstruction[layout.orientation],
    score: LAYOUT.score[layout.orientation],
    tap: LAYOUT.tap[layout.orientation],
    tutorialHand: LAYOUT.tutorialHand[layout.orientation],
    cta: LAYOUT.cta[layout.orientation],
  };
  const canvasMetrics = getCanvasMetrics(layout);
  const tapBannerHeight =
    layout.logicalW *
    authored.tap.width *
    (TAP_BANNER_SIZE.height / TAP_BANNER_SIZE.width);
  const tapBannerStyle =
    layout.viewportOrientation === "landscape"
      ? {
          left: `${-layout.offsetX / layout.scale}px`,
          top: `${authored.tap.top * 100}%`,
          width: `${layout.viewW / layout.scale}px`,
          height: `${tapBannerHeight}px`,
          objectFit: "fill" as const,
        }
      : layoutStyle(authored.tap);
  const tapTextSize =
    mode === "crashed"
      ? TAP_BANNER_TEXT_SIZE.tryAgain
      : TAP_BANNER_TEXT_SIZE.tapToStart;
  const tapBannerTextStyle = {
    left: `${(layout.logicalW - tapTextSize.width) / 2}px`,
    top: `${
      authored.tap.top * layout.logicalH +
      (tapBannerHeight - tapTextSize.height) / 2
    }px`,
    width: `${tapTextSize.width}px`,
    height: `${tapTextSize.height}px`,
  } as const;
  const inputStyle = {
    left: `${-layout.offsetX / layout.scale}px`,
    top: `${-layout.offsetY / layout.scale}px`,
    width: `${layout.viewW / layout.scale}px`,
    height: `${layout.viewH / layout.scale}px`,
    pointerEvents: interactive ? "auto" : "none",
  } as const;
  const scoreLabel = `${score} ${score === 1 ? "Point" : "Points"}`;

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
        alt="Histrips"
        style={layoutStyle(authored.logo)}
      />
      <img
        className="collect-title"
        src={assets.collectTitle}
        alt="Collect for Reveal"
        style={layoutStyle(authored.collectTitle)}
      />
      <img
        className="collect-instruction"
        src={assets.collectInstruction}
        alt="Collect at least 5 Products"
        style={layoutStyle(authored.collectInstruction)}
      />
      <div className="score-text" style={layoutStyle(authored.score)}>
        {scoreLabel}
      </div>
      <div
        className={`tutorial ${
          mode === "intro" || mode === "crashed" ? "tutorial--visible" : ""
        }`}
        aria-hidden={mode !== "intro" && mode !== "crashed"}
      >
        <img
          className="tap-banner-background"
          src={assets.tapBannerBackground}
          alt=""
          draggable={false}
          style={tapBannerStyle}
        />
        <img
          className="tap-banner-text"
          src={mode === "crashed" ? assets.tryAgainText : assets.tapToStartText}
          alt={mode === "crashed" ? "Try Again" : "Tap to Start"}
          draggable={false}
          style={tapBannerTextStyle}
        />
        {mode === "intro" && (
          <img
            className="tutorial-hand"
            src={assets.hand}
            alt=""
            draggable={false}
            style={layoutStyle(authored.tutorialHand)}
          />
        )}
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
          style={layoutStyle(authored.cta)}
          onClick={onCta}
          aria-label="Shop now"
        >
          <img src={assets.cta} alt="Shop now" />
        </button>
      )}
    </>
  );
}
