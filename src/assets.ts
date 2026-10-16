import ball from "../Assets/ball.webp";
import bottomPlatform from "../Assets/bottom_platform.webp";
import congratulations from "../Assets/CONGRATULATIONS!.webp";
import cta from "../Assets/CTA.webp";
import productTitle from "../Assets/Fall Essentials Crew 6Pack.webp";
import landscapeBackground from "../Assets/landscape.webp";
import logo from "../Assets/LOGO.webp";
import obstacle1 from "../Assets/obstacle1.webp";
import obstacle2 from "../Assets/obstacle2.webp";
import obstacle3 from "../Assets/obstacle3.webp";
import obstacle4 from "../Assets/obstacle4.webp";
import poof from "../Assets/Poof.webp";
import portraitBackground from "../Assets/portrait.webp";
import product from "../Assets/product.webp";
import roboto from "../Assets/Roboto-Regular.ttf";
import scoreboard from "../Assets/ScoreBoard.webp";
import tapToStart from "../Assets/TAP TO START.webp";
import tshirt1 from "../Assets/tshirt1.webp";
import tshirt2 from "../Assets/tshirt2.webp";
import tshirt3 from "../Assets/tshirt3.webp";
import tshirt4 from "../Assets/tshirt4.webp";
import tshirt5 from "../Assets/tshirt5.webp";
import tshirt6 from "../Assets/tshirt6.webp";
import tutorialHand from "../Assets/tutorialhand.webp";
import bonusChime from "../Assets/sfx/Bonus Chime.mp3";
import endChime from "../Assets/sfx/end.mp3";
import failSound from "../Assets/sfx/Fail Sound.mp3";
import specialChime from "../Assets/sfx/Special Chime Cling.mp3";
import metalClank from "./assets/sounds/Metal Clank.optimized.wav";
import rollingBall from "./assets/sounds/RollingBall.optimized.wav";

export const assets = {
  ball,
  bottomPlatform,
  congratulations,
  cta,
  productTitle,
  landscapeBackground,
  logo,
  obstacles: [obstacle1, obstacle2, obstacle3, obstacle4],
  poof,
  portraitBackground,
  product,
  roboto,
  scoreboard,
  tapToStart,
  shirts: [tshirt1, tshirt2, tshirt3, tshirt4, tshirt5, tshirt6],
  sounds: {
    rolling: rollingBall,
    jump: metalClank,
    fail: failSound,
    collect: bonusChime,
    product: specialChime,
    endcard: endChime,
  },
  tutorialHand,
} as const;

export const criticalImageUrls = [
  portraitBackground,
  landscapeBackground,
  bottomPlatform,
  logo,
  scoreboard,
  tapToStart,
  ball,
  poof,
  ...assets.obstacles,
  ...assets.shirts,
  congratulations,
  product,
  productTitle,
  cta,
];
