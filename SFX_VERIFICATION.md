# SFX verification record

- Project/build: Histrips bike runner, local build on 2026-10-21.
- Guidance: `IOS_SFX_GUIDELINES.md`; persistent pools, native gameplay input, and MRAID lifecycle state remain centralized.
- Implementation inspected: `src/hooks/useSound.ts`, `src/App.tsx`, `src/components/GameScene.tsx`, and `src/networks.ts`.
- Cue mapping: first-action jump = optimized `Metal Clank.wav` at `0.20` playback gain; cone/manhole collision = `Fail Sound.mp3`; product pickup/effect = `Bonus Chime.mp3`; visible Scene 6 reveal = `Special Chime Cling.mp3`.
- Asset preparation: the exact reusable audio instances are created before gameplay input. The jump WAV remains an embedded 22.05 kHz mono 16-bit PCM copy; supplied MP3 payloads are imported directly.
- Pool ownership: two jump voices, one fail voice, three collection voices, and one product-reveal voice. All are created before gameplay input.
- Native input: capture-phase Touch Events on iPhone, iPadOS desktop mode, iPad, iPod, and Android; capture-phase Pointer Events on desktop. The first jump request happens synchronously in the accepted gameplay gesture, and release recovery runs before its interaction token ends.
- Lifecycle: detached pool instances pause on document/MRAID hidden, unviewable, or unexposed state; SDK volume is applied only through numeric lifecycle values. One-shots are not replayed after visibility restoration.
- Automated checks: `npm run build` passed TypeScript, Vite single-file generation, self-containment validation, MRAID validation, exact embedded-asset checks, and the decimal 5,000,000-byte limit.
- Desktop Chromium visual/audio playback: the local headless browsers produced blank diagnostic captures in this environment, so browser playback was not established by those captures.
- Safari/WebKit, AppLovin preview, physical iPhone/iPad, and Android WebView checks: unverified; no device or host preview was available. Verify the first tap, quick release, repeated jumps, collision, overlapping pickups, product reveal, SDK mute/volume, and hide/show behavior on the delivered build.
- Diagnostics: no SFX diagnostic instrumentation was requested or added.
