# SFX verification record

- Project/build: Fresh Clean Threads runner, local build on 2026-10-16.
- Guidance: `IOS_SFX_GUIDELINES.md`; reusable persistent-pool behavior was also reviewed from prior AppLovin React playable work.
- Implementation inspected: `src/hooks/useSound.ts`, `src/App.tsx`, `src/components/GameScene.tsx`, `src/components/EndcardScene.tsx`, and `src/networks.ts`.
- Cue mapping: grounded rolling loop = `RollingBall.wav` (stopped for the full airborne arc and restarted on landing); ground jump = `Metal Clank.wav` at `0.20` playback gain; obstacle collision = `Fail Sound.mp3`; shirt/poof = `Bonus Chime.mp3`; visible product scene = `Special Chime Cling.mp3`; ready and visible endcard = `end.mp3`.
- Asset preparation: supplied originals are preserved. The two WAV files are embedded as generated 22.05 kHz mono 16-bit PCM copies to keep the single-file AppLovin build under 5 MB. The three supplied MP3 payloads are imported directly.
- Pool ownership: one persistent rolling voice, two jump voices, one fail voice, three collection voices, one product voice, and one endcard voice. All are created before gameplay input.
- Native input: capture-phase Touch Events on iPhone, iPadOS desktop mode, iPad, iPod, and Android; capture-phase Pointer Events on desktop. Release recovery runs before the accepted interaction token ends.
- Lifecycle: detached pool instances pause on document/MRAID hidden, unviewable, or unexposed state; SDK volume is applied only through the numeric lifecycle value. One-shots are not replayed after visibility restoration.
- Automated checks: `npm run build` passed TypeScript, Vite single-file generation, self-containment validation, MRAID validation, and the 5,000,000-byte limit. This does not establish physical-device audibility.
- Desktop Chromium audible playback: not run in this environment.
- Safari/WebKit and AppLovin preview: not run in this environment.
- Physical iPhone/iPad and Android WebView checks: unverified; no device was available. Verify first tap, quick release, repeat jumps, collection/product/endcard delayed cues, overlap, mute/volume, and hide/show behavior on the delivered build.
- Diagnostics: not applicable; no SFX diagnostic instrumentation was requested or added.
