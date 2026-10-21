export const DESIGN = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
} as const;

// Keep the authored portrait game centered at every viewport orientation.
export const SCENE_ORIENTATION: keyof typeof DESIGN = "portrait";

export const Z_INDEX = {
  background: 0,
  platform: 1,
  stage: 2,
  gameObjects: 4,
  hud: 17,
  dimOverlay: 20,
  resultUi: 21,
  inputBlocker: 25,
  cta: 30,
} as const;

export const ROAD_LAYOUT = {
  portrait: { top: 1498, height: 126, floor: 1572 },
  landscape: { top: 710, height: 132, floor: 788 },
} as const;

// Extends the bottom panel upward behind the road to hide transparent seams.
export const BOTTOM_PANEL_OVERLAP = {
  portrait: 40,
  landscape: 80,
} as const;

export const GAMEPLAY = {
  gravity: 3150,
  jumpVelocity: -1800,
  landscapeJumpVelocityMultiplier: 0.88,
  obstacleSpeed: 610,
  landscapeSpeedMultiplier: 1.22,
  // Authored world-space gaps stay consistent in both viewport orientations.
  // Rotation handling anchors the nearest obstacle without stretching gaps.
  obstacleGapMin: 780,
  obstacleGapMax: 1050,
  obstacleSpawnMargin: 100,
  firstObstacleOffset: 220,
  productObstacleIntervalMin: 0,
  productObstacleIntervalMax: 1,
  bikeWidthPortrait: 345,
  bikeWidthLandscape: 250,
  bikeXPortrait: 32,
  bikeXLandscape: 205,
  coneWidthPortrait: 150,
  coneWidthLandscape: 132,
  manholeWidthPortrait: 310,
  manholeWidthLandscape: 265,
  productWidthPortrait: 145,
  productWidthLandscape: 122,
  productLiftPortrait: 90,
  productLiftLandscape: 70,
  collisionRestartDelayMs: 1250,
  collectEffectDurationSeconds: 0.58,
  targetScore: 5,
} as const;

// Moves the complete bike: body, both wheels, effects, and hitboxes.
// These values follow the physical viewport orientation while the game itself
// remains on its authored portrait stage.
export const BIKE_POSITION = {
  portrait: { x: 30, y: 0 },
  landscape: { x: 0, y: 0 },
} as const;

// Fine-tunes each animation frame inside the complete bike group.
export const BIKE_FRAME_ALIGNMENT = {
  frame1: {
    portrait: { x: 0, y: -16 },
    landscape: { x: 0, y: -12 },
  },
  frame2: {
    portrait: { x: -35, y: -16 },
    landscape: { x: -35, y: -12 },
  },
} as const;

export const BIKE_FRAME_TIMING = {
  runningSecondsPerFrame: 0.13,
} as const;

// Group 8352.webp is the stretchable gradient banner background.
export const TAP_BANNER_SIZE = {
  width: 2000,
  height: 376,
} as const;

// The text overlays retain these natural dimensions and are never stretched.
export const TAP_BANNER_TEXT_SIZE = {
  tapToStart: { width: 553, height: 59 },
  tryAgain: { width: 419, height: 59 },
} as const;

// Independent wheel artwork offsets in authored pixels.
// Positive X moves a wheel right; negative X moves it left.
// Positive Y moves a wheel down; negative Y moves it up.
// These controls do not move the bike body, collision box, or gameplay position.
export const BIKE_WHEEL_POSITION = {
  rear: {
    portrait: { x: -70, y: -13 },
    landscape: { x: -50, y: -13 },
  },
  front: {
    portrait: { x: 0, y:-13 },
    landscape: { x: 0, y: -13 },
  },
} as const;

// Positive Y moves the manhole down while keeping its collision area and any
// product placed above it aligned with the artwork.
export const MANHOLE_POSITION = {
  portrait: { y: 40 },
  landscape: { y: 40 },
} as const;

export const PRODUCT_EFFECTS = {
  backgroundBlurPx: 7,
  overlayOpacity: 0.8,
} as const;

export const PRODUCT_SCENE_DURATION_MS = 3_000;

export const LAYOUT = {
  logo: {
    portrait: { left: 385 / 1080, top: 96 / 1920, width: 310 / 1080 },
    landscape: { left: 805 / 1920, top: 25 / 1080, width: 310 / 1920 },
  },
  collectTitle: {
    portrait: { left: 210 / 1080, top: 280 / 1920, width: 661 / 1080 },
    landscape: { left: 630 / 1920, top: 112 / 1080, width: 661 / 1920 },
  },
  collectInstruction: {
    portrait: { left: 103 / 1080, top: 429 / 1920, width: 874 / 1080 },
    landscape: { left: 523 / 1920, top: 190 / 1080, width: 874 / 1920 },
  },
  score: {
    portrait: { left: 290 / 1080, top: 550 / 1920, width: 500 / 1080 },
    landscape: { left: 710 / 1920, top: 265 / 1080, width: 500 / 1920 },
  },
  tap: {
    portrait: { left: -460 / 1080, top: 722 / 1920, width: 2000 / 1080 },
    landscape: {
      left: -100 / 1920,
      top: 340 / 1080,
      width: 2120 / 1920,
      height: 140 / 1080,
    },
  },
  tutorialHand: {
    portrait: { left: 455 / 1080, top: 905 / 1920, width: 170 / 1080 },
    landscape: { left: 875 / 1920, top: 415 / 1080, width: 170 / 1920 },
  },
  cta: {
    portrait: { left: 309 / 1080, top: 1695 / 1920, width: 461 / 1080 },
    landscape: { left: 730 / 1920, top: 890 / 1080, width: 461 / 1920 },
  },
} as const;

export const PRODUCT_LAYOUT = {
  logo: {
    portrait: { left: 385 / 1080, top: 96 / 1920, width: 310 / 1080 },
    landscape: { left: 805 / 1920, top: 46 / 1080, width: 310 / 1920 },
  },
  headline: {
    portrait: { left: 303 / 1080, top: 279 / 1920, width: 474 / 1080 },
    landscape: { left: 723 / 1920, top: 154 / 1080, width: 474 / 1920 },
  },
  description: {
    portrait: { left: 107 / 1080, top: 374 / 1920, width: 866 / 1080 },
    landscape: { left: 527 / 1920, top: 237 / 1080, width: 866 / 1920 },
  },
  product: {
    portrait: { left: 38 / 1080, top: 724 / 1920, width: 1003 / 1080 },
    landscape: { left: 570 / 1920, top: 325 / 1080, width: 780 / 1920 },
  },
  cta: {
    portrait: { left: 309 / 1080, top: 1695 / 1920, width: 461 / 1080 },
    landscape: { left: 730 / 1920, top: 890 / 1080, width: 461 / 1920 },
  },
} as const;
