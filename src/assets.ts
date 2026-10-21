import bikeFrame1 from "../Assets/Histrips Assets/bike_frame_1.webp";
import bikeFrame2 from "../Assets/Histrips Assets/bike_frame_2.webp";
import collectInstruction from "../Assets/Histrips Assets/Collect atleast 5 Products.webp";
import collectTitle from "../Assets/Histrips Assets/Collect for Reveal.webp";
import cone from "../Assets/Histrips Assets/cone.webp";
import cta from "../Assets/Histrips Assets/CTA.webp";
import effects from "../Assets/Histrips Assets/EFFECTS.webp";
import hand from "../Assets/Histrips Assets/Hand.webp";
import landscapeBackground from "../Assets/Histrips Assets/landscape.webp";
import logo from "../Assets/Histrips Assets/logo.webp";
import manhole from "../Assets/Histrips Assets/manhole.webp";
import poof from "../Assets/Histrips Assets/Poof.webp";
import portraitBackground from "../Assets/Histrips Assets/portrait.webp";
import product1 from "../Assets/Histrips Assets/product 1.webp";
import product2 from "../Assets/Histrips Assets/product 2.webp";
import product3 from "../Assets/Histrips Assets/product 3.webp";
import road from "../Assets/Histrips Assets/road_merged_long.webp";
import tapBannerBackground from "../Assets/Histrips Assets/Group 8352.webp";
import tapToStartText from "../Assets/Histrips Assets/TAP TO START.webp";
import tryAgainText from "../Assets/Histrips Assets/TRY AGAIN.webp";
import wheel from "../Assets/Histrips Assets/wheel.webp";
import bonusChime from "../Assets/sfx/Bonus Chime.mp3";
import endChime from "../Assets/sfx/end.mp3";
import failSound from "../Assets/sfx/Fail Sound.mp3";
import specialChime from "../Assets/sfx/Special Chime Cling.mp3";
import jumpWoosh from "../Assets/sfx/Woosh 3.mp3";
import rollingBall from "./assets/sounds/RollingBall.optimized.wav";

export const assets = {
  bikeFrames: [bikeFrame1, bikeFrame2],
  collectInstruction,
  collectTitle,
  cta,
  effects,
  hand,
  landscapeBackground,
  logo,
  obstacles: [cone, manhole],
  poof,
  portraitBackground,
  products: [product1, product2, product3],
  road,
  sounds: {
    rolling: rollingBall,
    jump: jumpWoosh,
    fail: failSound,
    collect: bonusChime,
    product: specialChime,
    endcard: endChime,
  },
  tapBannerBackground,
  tapToStartText,
  tryAgainText,
  wheel,
} as const;

export const criticalImageUrls = [
  portraitBackground,
  landscapeBackground,
  logo,
  collectTitle,
  collectInstruction,
  tapBannerBackground,
  tapToStartText,
  tryAgainText,
  bikeFrame1,
  bikeFrame2,
  wheel,
  cone,
  manhole,
  product1,
  product2,
  product3,
  road,
  effects,
  hand,
  poof,
  cta,
];
