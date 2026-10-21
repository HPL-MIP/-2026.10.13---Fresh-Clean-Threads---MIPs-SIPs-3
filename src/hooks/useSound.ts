import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

type CueName =
  | "rolling"
  | "jump"
  | "fail"
  | "collect"
  | "product"
  | "endcard";
type VoicePhase = "idle" | "priming" | "starting" | "playing" | "pending";

type SoundSources = Record<CueName, string>;

type SoundLifecycle = {
  paused: boolean;
  audioVolume: number;
};

type Voice = {
  element: HTMLAudioElement;
  phase: VoicePhase;
  generation: number;
  primed: boolean;
  unsupported: boolean;
  playingObserved: boolean;
  requestedAt: number;
  lastRetryAt: number;
  interactionId: number | null;
  releaseAttempt: boolean;
  cleanup: () => void;
};

type SoundPool = {
  name: CueName;
  loop: boolean;
  volume: number;
  voices: Voice[];
};

export type GameplaySoundGesture = {
  interactionId: number;
  jump: boolean;
};

export type PlayableSoundHandle = {
  beginGameplayGesture: (gesture: GameplaySoundGesture) => void;
  retryGameplayGesture: (interactionId: number) => void;
  endGameplayGesture: (interactionId: number) => void;
  cancelGameplayGesture: (interactionId: number) => void;
  playRolling: () => void;
  stopRolling: () => void;
  playFail: () => void;
  playCollect: () => void;
  playProduct: () => void;
  playEndcard: () => void;
};

const PENDING_FRESHNESS_MS = 5_000;
const MOVE_RETRY_INTERVAL_MS = 180;
const STALLED_START_MS = 2_000;

const POOL_CONFIG: Record<
  CueName,
  { poolSize: number; loop: boolean; volume: number }
> = {
  rolling: { poolSize: 1, loop: true, volume: 0.72 },
  jump: { poolSize: 2, loop: false, volume: 0.2 },
  fail: { poolSize: 1, loop: false, volume: 1 },
  collect: { poolSize: 3, loop: false, volume: 0.95 },
  product: { poolSize: 1, loop: false, volume: 1 },
  endcard: { poolSize: 1, loop: false, volume: 1 },
};

class PlayableAudioManager {
  private readonly pools: Record<CueName, SoundPool>;
  private readonly activeInteractions = new Set<number>();
  private gestureSeen = false;
  private lifecyclePaused: boolean;
  private audioVolume: number;
  private rollingWasActive = false;

  constructor(sources: SoundSources, lifecycle: SoundLifecycle) {
    this.lifecyclePaused = lifecycle.paused;
    this.audioVolume = this.normalizeVolume(lifecycle.audioVolume);
    this.pools = {
      rolling: this.createPool("rolling", sources.rolling),
      jump: this.createPool("jump", sources.jump),
      fail: this.createPool("fail", sources.fail),
      collect: this.createPool("collect", sources.collect),
      product: this.createPool("product", sources.product),
      endcard: this.createPool("endcard", sources.endcard),
    };
  }

  private normalizeVolume(volume: number) {
    return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;
  }

  private createPool(name: CueName, source: string): SoundPool {
    const config = POOL_CONFIG[name];
    const pool: SoundPool = {
      name,
      loop: config.loop,
      volume: config.volume,
      voices: [],
    };

    for (let index = 0; index < config.poolSize; index += 1) {
      const element = new Audio(source);
      element.preload = "auto";
      element.loop = config.loop;
      element.muted = false;
      element.volume = config.volume * this.audioVolume;

      const voice: Voice = {
        element,
        phase: "idle",
        generation: 0,
        primed: false,
        unsupported: false,
        playingObserved: false,
        requestedAt: 0,
        lastRetryAt: 0,
        interactionId: null,
        releaseAttempt: false,
        cleanup: () => undefined,
      };

      const onPlaying = () => {
        if (voice.phase === "priming") {
          this.completePrime(pool, voice, voice.generation);
          return;
        }
        if (voice.phase === "starting" || voice.phase === "pending") {
          voice.playingObserved = true;
          voice.phase = "playing";
        }
      };
      const onEnded = () => this.releaseVoice(pool, voice, true);
      const onError = () => {
        if (voice.phase === "priming") {
          voice.primed = false;
          this.releaseVoice(pool, voice, false);
          return;
        }
        if (voice.phase === "starting" || voice.phase === "pending") {
          if (element.error?.code === 4) {
            voice.unsupported = true;
          }
          this.handleAudibleFailure(pool, voice, voice.generation);
        }
      };

      element.addEventListener("playing", onPlaying);
      element.addEventListener("ended", onEnded);
      element.addEventListener("error", onError);
      voice.cleanup = () => {
        element.removeEventListener("playing", onPlaying);
        element.removeEventListener("ended", onEnded);
        element.removeEventListener("error", onError);
      };

      if (element.readyState === HTMLMediaElement.HAVE_NOTHING) {
        try {
          element.load();
        } catch (_error) {
          // The retained element can still be retried by a native gesture.
        }
      }
      pool.voices.push(voice);
    }

    return pool;
  }

  private applyAudibleState(pool: SoundPool, voice: Voice) {
    voice.element.loop = pool.loop;
    voice.element.volume = pool.volume * this.audioVolume;
    voice.element.muted = false;
  }

  private releaseVoice(pool: SoundPool, voice: Voice, keepPrimed: boolean) {
    voice.generation += 1;
    try {
      voice.element.pause();
      voice.element.currentTime = 0;
    } catch (_error) {
      // Reset failures are harmless; the same retained element is reused.
    }
    voice.element.muted = false;
    voice.element.volume = pool.volume * this.audioVolume;
    voice.phase = "idle";
    voice.primed = keepPrimed && voice.primed;
    voice.playingObserved = false;
    voice.requestedAt = 0;
    voice.lastRetryAt = 0;
    voice.interactionId = null;
    voice.releaseAttempt = false;
  }

  private completePrime(pool: SoundPool, voice: Voice, generation: number) {
    if (voice.generation !== generation || voice.phase !== "priming") return;
    voice.primed = true;
    this.releaseVoice(pool, voice, true);
  }

  private primeVoice(pool: SoundPool, voice: Voice) {
    if (
      this.lifecyclePaused ||
      voice.phase !== "idle" ||
      voice.primed ||
      voice.unsupported
    ) {
      return;
    }

    const generation = voice.generation + 1;
    voice.generation = generation;
    voice.phase = "priming";
    voice.playingObserved = false;
    voice.element.muted = true;
    voice.element.volume = pool.volume * this.audioVolume;
    try {
      voice.element.currentTime = 0;
      const playback = voice.element.play();
      if (playback && typeof playback.then === "function") {
        playback.then(
          () => this.completePrime(pool, voice, generation),
          () => {
            if (voice.generation !== generation || voice.phase !== "priming") {
              return;
            }
            voice.primed = false;
            this.releaseVoice(pool, voice, false);
          },
        );
      }
    } catch (_error) {
      if (voice.generation === generation && voice.phase === "priming") {
        voice.primed = false;
        this.releaseVoice(pool, voice, false);
      }
    }
  }

  private primeFutureVoices() {
    (
      ["jump", "fail", "collect", "product"] as const
    ).forEach((name) => {
      this.pools[name].voices.forEach((voice) =>
        this.primeVoice(this.pools[name], voice),
      );
    });
  }

  private reclaimStalledVoices(pool: SoundPool, now: number) {
    pool.voices.forEach((voice) => {
      if (
        (voice.phase === "starting" || voice.phase === "pending") &&
        voice.requestedAt > 0 &&
        now - voice.requestedAt > PENDING_FRESHNESS_MS
      ) {
        this.releaseVoice(pool, voice, voice.primed);
      }
    });
  }

  private chooseVoice(pool: SoundPool) {
    const now = performance.now();
    this.reclaimStalledVoices(pool, now);

    const idlePrimed = pool.voices.find(
      (voice) => voice.phase === "idle" && voice.primed && !voice.unsupported,
    );
    if (idlePrimed) return idlePrimed;

    const idle = pool.voices.find(
      (voice) => voice.phase === "idle" && !voice.unsupported,
    );
    if (idle) return idle;

    const settlingPrime = pool.voices.find(
      (voice) => voice.phase === "priming" && !voice.unsupported,
    );
    if (settlingPrime) return settlingPrime;

    return pool.voices.find(
      (voice) =>
        voice.phase === "starting" &&
        !voice.playingObserved &&
        now - voice.requestedAt > STALLED_START_MS &&
        !voice.unsupported,
    );
  }

  private beginAudible(
    pool: SoundPool,
    voice: Voice,
    interactionId: number | null,
    resetPosition: boolean,
    releaseAttempt: boolean,
    preserveRequestTime = false,
  ) {
    if (this.lifecyclePaused || voice.unsupported) return;

    const generation = voice.generation + 1;
    voice.generation = generation;
    voice.phase = "starting";
    voice.playingObserved = false;
    voice.interactionId = interactionId;
    voice.releaseAttempt = releaseAttempt;
    if (!preserveRequestTime || voice.requestedAt <= 0) {
      voice.requestedAt = performance.now();
    }
    voice.lastRetryAt = performance.now();
    this.applyAudibleState(pool, voice);

    try {
      if (resetPosition) voice.element.currentTime = 0;
      const playback = voice.element.play();
      if (playback && typeof playback.then === "function") {
        playback.then(
          () => {
            if (voice.generation !== generation) return;
            if (this.lifecyclePaused) {
              this.releaseVoice(pool, voice, voice.primed);
            }
          },
          () => this.handleAudibleFailure(pool, voice, generation),
        );
      }
    } catch (_error) {
      this.handleAudibleFailure(pool, voice, generation);
    }
  }

  private handleAudibleFailure(
    pool: SoundPool,
    voice: Voice,
    generation: number,
  ) {
    if (voice.generation !== generation) return;
    voice.primed = false;

    const requestIsFresh =
      voice.requestedAt > 0 &&
      performance.now() - voice.requestedAt <= PENDING_FRESHNESS_MS;
    const interactionIsActive =
      voice.interactionId !== null &&
      this.activeInteractions.has(voice.interactionId);
    const delayedCueCanWait =
      voice.interactionId === null && !voice.releaseAttempt;

    if (
      !this.lifecyclePaused &&
      !voice.unsupported &&
      requestIsFresh &&
      (interactionIsActive || delayedCueCanWait)
    ) {
      voice.phase = "pending";
      return;
    }

    this.releaseVoice(pool, voice, false);
  }

  private requestCue(name: CueName, interactionId: number | null) {
    if (!this.gestureSeen || this.lifecyclePaused) return;
    const pool = this.pools[name];

    if (pool.loop) {
      const activeVoice = pool.voices.find(
        (voice) =>
          voice.phase === "playing" ||
          (voice.phase === "starting" && !voice.releaseAttempt),
      );
      if (activeVoice) return;

      const pendingVoice = pool.voices.find(
        (voice) => voice.phase === "pending" && !voice.unsupported,
      );
      if (pendingVoice) {
        this.beginAudible(pool, pendingVoice, interactionId, false, false, true);
        this.rollingWasActive = false;
        return;
      }
    }

    const voice = this.chooseVoice(pool);
    if (!voice) return;
    this.beginAudible(pool, voice, interactionId, true, false);
    if (pool.loop) this.rollingWasActive = false;
  }

  private retryVoice(pool: SoundPool, voice: Voice, boundary: boolean) {
    const now = performance.now();
    if (
      voice.requestedAt <= 0 ||
      now - voice.requestedAt > PENDING_FRESHNESS_MS ||
      this.lifecyclePaused
    ) {
      this.releaseVoice(pool, voice, voice.primed);
      return;
    }

    if (!boundary && now - voice.lastRetryAt < MOVE_RETRY_INTERVAL_MS) return;
    if (voice.playingObserved || voice.unsupported) return;

    this.beginAudible(
      pool,
      voice,
      voice.interactionId,
      false,
      boundary,
      true,
    );
  }

  beginGameplayGesture({ interactionId, jump }: GameplaySoundGesture) {
    if (this.lifecyclePaused) return;
    this.gestureSeen = true;
    this.activeInteractions.add(interactionId);

    if (jump) this.requestCue("jump", interactionId);

    Object.values(this.pools).forEach((pool) => {
      pool.voices.forEach((voice) => {
        if (voice.phase === "pending" && voice.interactionId === null) {
          voice.interactionId = interactionId;
          this.retryVoice(pool, voice, false);
        }
      });
    });
    this.primeFutureVoices();
  }

  retryGameplayGesture(interactionId: number) {
    if (!this.activeInteractions.has(interactionId) || this.lifecyclePaused) return;
    Object.values(this.pools).forEach((pool) => {
      pool.voices.forEach((voice) => {
        if (
          voice.interactionId === interactionId &&
          (voice.phase === "pending" ||
            (voice.phase === "starting" && !voice.playingObserved))
        ) {
          this.retryVoice(pool, voice, false);
        }
      });
    });
  }

  endGameplayGesture(interactionId: number) {
    if (!this.activeInteractions.has(interactionId)) return;

    Object.values(this.pools).forEach((pool) => {
      pool.voices.forEach((voice) => {
        if (
          voice.interactionId === interactionId &&
          (voice.phase === "pending" ||
            (voice.phase === "starting" && !voice.playingObserved))
        ) {
          this.retryVoice(pool, voice, true);
        }
      });
    });

    this.activeInteractions.delete(interactionId);
    Object.values(this.pools).forEach((pool) => {
      pool.voices.forEach((voice) => {
        if (voice.interactionId !== interactionId) return;
        if (voice.phase === "pending") {
          this.releaseVoice(pool, voice, false);
          return;
        }
        voice.interactionId = null;
      });
    });
  }

  cancelGameplayGesture(interactionId: number) {
    this.activeInteractions.delete(interactionId);
    Object.values(this.pools).forEach((pool) => {
      pool.voices.forEach((voice) => {
        if (voice.interactionId !== interactionId) return;
        if (pool.loop && voice.phase === "playing") {
          voice.interactionId = null;
          return;
        }
        this.releaseVoice(pool, voice, voice.primed);
      });
    });
  }

  playRolling() {
    this.requestCue("rolling", null);
  }

  stopRolling() {
    this.rollingWasActive = false;
    this.pools.rolling.voices.forEach((voice) =>
      this.releaseVoice(this.pools.rolling, voice, voice.primed),
    );
  }

  playFail() {
    this.requestCue("fail", null);
  }

  playCollect() {
    this.requestCue("collect", null);
  }

  playProduct() {
    this.requestCue("product", null);
  }

  playEndcard() {
    this.requestCue("endcard", null);
  }

  setLifecycle(lifecycle: SoundLifecycle) {
    const nextPaused = lifecycle.paused;
    const nextVolume = this.normalizeVolume(lifecycle.audioVolume);
    this.audioVolume = nextVolume;

    Object.values(this.pools).forEach((pool) => {
      pool.voices.forEach((voice) => {
        voice.element.volume = pool.volume * nextVolume;
      });
    });

    if (nextPaused === this.lifecyclePaused) return;
    this.lifecyclePaused = nextPaused;

    if (nextPaused) {
      this.rollingWasActive = this.pools.rolling.voices.some(
        (voice) => voice.phase !== "idle",
      );
      Object.values(this.pools).forEach((pool) => {
        pool.voices.forEach((voice) =>
          this.releaseVoice(pool, voice, voice.primed),
        );
      });
      return;
    }

    if (this.rollingWasActive && this.activeInteractions.size > 0) {
      const [interactionId] = this.activeInteractions;
      this.requestCue("rolling", interactionId ?? null);
    }
  }

  dispose() {
    this.activeInteractions.clear();
    Object.values(this.pools).forEach((pool) => {
      pool.voices.forEach((voice) => {
        voice.cleanup();
        voice.generation += 1;
        try {
          voice.element.pause();
          voice.element.removeAttribute("src");
          voice.element.load();
        } catch (_error) {
          // Teardown is best effort.
        }
      });
    });
  }
}

export function useSound(
  sources: SoundSources,
  lifecycle: SoundLifecycle,
): PlayableSoundHandle {
  const managerRef = useRef<PlayableAudioManager | null>(null);

  useLayoutEffect(() => {
    const manager = new PlayableAudioManager(sources, lifecycle);
    managerRef.current = manager;
    return () => {
      manager.dispose();
      if (managerRef.current === manager) managerRef.current = null;
    };
  }, [
    sources.collect,
    sources.endcard,
    sources.fail,
    sources.jump,
    sources.product,
    sources.rolling,
  ]);

  useEffect(() => {
    managerRef.current?.setLifecycle(lifecycle);
  }, [lifecycle.audioVolume, lifecycle.paused]);

  return useMemo(
    () => ({
      beginGameplayGesture: (gesture) =>
        managerRef.current?.beginGameplayGesture(gesture),
      retryGameplayGesture: (interactionId) =>
        managerRef.current?.retryGameplayGesture(interactionId),
      endGameplayGesture: (interactionId) =>
        managerRef.current?.endGameplayGesture(interactionId),
      cancelGameplayGesture: (interactionId) =>
        managerRef.current?.cancelGameplayGesture(interactionId),
      playRolling: () => managerRef.current?.playRolling(),
      stopRolling: () => managerRef.current?.stopRolling(),
      playFail: () => managerRef.current?.playFail(),
      playCollect: () => managerRef.current?.playCollect(),
      playProduct: () => managerRef.current?.playProduct(),
      playEndcard: () => managerRef.current?.playEndcard(),
    }),
    [],
  );
}
