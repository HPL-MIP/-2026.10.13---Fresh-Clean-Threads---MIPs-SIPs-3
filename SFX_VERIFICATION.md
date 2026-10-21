# SFX verification record

- Project/build: Histrips bike runner, local build on 2026-10-21.
- Guidance: `IOS_SFX_GUIDELINES.md`; persistent pools, native gameplay input, and MRAID lifecycle state remain centralized.
- Implementation inspected: `src/hooks/useSound.ts`, `src/App.tsx`, `src/components/GameScene.tsx`, and `src/networks.ts`.
- Cue mapping: first-action jump = `Woosh 3.mp3` at `0.20` playback gain; cone/manhole collision = `Fail Sound.mp3`; pickups 1-4 = `Bonus Chime.mp3`; pickup 5 = one `Bonus Special End Timeline.m4a` request with Bonus at collection, Special Chime at +1000 ms when the product scene fades in, and `end.mp3` at +4000 ms when the endcard fades in.
- Asset preparation: the exact reusable audio instances are created before gameplay input. `scripts/build-completion-timeline.mjs` mixes the three preserved 44.1 kHz stereo sources without normalization and produces one 160 kbps AAC-LC timeline. Special Chime and `end.mp3` are not embedded separately.
- Rebuild command: `npm run build:completion-sfx` with FFmpeg on `PATH`, or with `HISTRIPS_FFMPEG_PATH` pointing to the local executable.
- Pool ownership: one rolling voice, two jump voices, one fail voice, three standalone collection voices, and one merged completion voice. All are created before gameplay input.
- Native input: capture-phase Touch Events on iPhone, iPadOS desktop mode, iPad, iPod, and Android; capture-phase Pointer Events on desktop. The first jump request happens synchronously in the accepted gameplay gesture, and release recovery runs before its interaction token ends.
- Lifecycle: detached pool instances pause on document/MRAID hidden, unviewable, or unexposed state; SDK volume is applied only through numeric lifecycle values. One-shots are not replayed after visibility restoration.
- Automated checks: `npm run build` passed TypeScript, Vite single-file generation, self-containment validation, MRAID validation, exact embedded-asset checks, and the decimal 5,000,000-byte limit.
- Desktop Chromium visual/audio playback: the local headless browsers produced blank diagnostic captures in this environment, so browser playback was not established by those captures.
- Safari/WebKit, AppLovin preview, physical iPhone/iPad, and Android WebView checks: unverified; no device or host preview was available. Verify the first tap, quick release, repeated jumps, collision, overlapping pickups, product reveal, SDK mute/volume, and hide/show behavior on the delivered build.
- Diagnostics: no SFX diagnostic instrumentation was requested or added.
