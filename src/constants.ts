export const DESIGN = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
} as const;

// Keep the authored portrait scene centered at every viewport orientation.
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

export const GAMEPLAY = {
  gravity: 3150,
  jumpVelocity: -1290,
  landscapeJumpVelocityMultiplier: 1,
  landscapeObstacleHeightMultiplier: 1,
  obstacleSpeed: 610,
  obstacleGapMin: 780,
  obstacleGapMax: 1020,
  firstObstacleOffset: 240,
  shirtObstacleIntervalMin: 1,
  shirtObstacleIntervalMax: 2,
  floorRatioPortrait: 0.792,
  floorRatioLandscape: 0.79,
  ballSizePortrait: 172,
  ballSizeLandscape: 150,
  // Ball position controls. Positive Y moves it down; negative Y moves it up.
  ballXPortrait:60,
  ballYOffsetPortrait: 15,
  ballXLandscape: 250,
  ballYOffsetLandscape: 15,
  obstacleWidthPortrait: 66,
  obstacleWidthLandscape: 58,
  shirtWidthPortrait: 184,
  shirtWidthLandscape: 148,
  collisionBallInsetXRatio: 0.24,
  collisionBallInsetYRatio: 0.2,
  collisionObstacleInsetXRatio: 0.2,
  collisionObstacleTopInsetRatio: 0.08,
  collisionRestartDelayMs: 1000,
  productDurationMs: 2000,
} as const;

export const PRODUCT_EFFECTS = {
  backgroundBlurPx: 3,
  overlayOpacity: 0.8,
} as const;

// Score text position controls in authored pixels.
// Positive X moves right; negative X moves left.
// Positive Y moves down; negative Y moves up.
export const SCORE_TEXT_POSITION = {
  portrait: { x: -15, y: 0 },
  landscape: { x: -150, y: 0 },
} as const;

export const LAYOUT = {
  logo: {
    portrait: { left: 262 / 1080, top: 84 / 1920, width: 557 / 1080 },
    landscape: { left: 94 / 1920, top: 62 / 1080, width: 520 / 1920 },
  },
  score: {
    portrait: { left: 697 / 1080, top: 213 / 1920, width: 315 / 1080 },
    landscape: { left: 1480 / 1920, top: 70 / 1080, width: 315 / 1920 },
  },
  tap: {
    portrait: { left: 131 / 1080, top: 914 / 1920, width: 818 / 1080 },
    landscape: { left: 590 / 1920, top: 394 / 1080, width: 740 / 1920 },
  },
  hand: {
    portrait: { left: 475 / 1080, top: 1052 / 1920, width: 135 / 1080 },
    landscape: { left: 892 / 1920, top: 505 / 1080, width: 122 / 1920 },
  },
  cta: {
    portrait: { left: 309 / 1080, top: 1680 / 1920, width: 462 / 1080 },
    landscape: { left: 785 / 1920, top: 870 / 1080, width: 350 / 1920 },
  },
} as const;

export const PRODUCT_LAYOUT = {
  congratulations: {
    portrait: { left: 54 / 1080, top: 242 / 1920, width: 972 / 1080 },
    landscape: { left: 650 / 1920, top: 124 / 1080, width: 820 / 1920 },
  },
  product: {
    portrait: { left: 139 / 1080, top: 424 / 1920, width: 838 / 1080 },
    landscape: { left: 590 / 1920, top: 215 / 1080, width: 730 / 1920 },
  },
  title: {
    portrait: { left: 48 / 1080, top: 1548 / 1920, width: 985 / 1080 },
    landscape: { left: 635 / 1920, top: 825 / 1080, width: 650 / 1920 },
  },
  cta: {
    portrait: { left: 309 / 1080, top: 1680 / 1920, width: 462 / 1080 },
    landscape: { left: 1490 / 1920, top: 790 / 1080, width: 350 / 1920 },
  },
} as const;
