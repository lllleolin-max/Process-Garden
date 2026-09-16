# Interrupted lifecycle clock regression

This is model-level verification, not a native or browser frame-rate measurement. No production behavior or artwork changed.

The new lifecycleClock.test.ts composes the real SceneClock, frame-rate gate, AgentEmbryoScene and Eldritch swallow function. A simulated 120 Hz vsync drives the selectable 30/60/120 Hz canvas rates. Each scenario grows an embryo, starts its exit, hides for one hour during the open-mouth/suction phase, then resumes.

Verified in all three scenarios:

- The first resumed paint preserves the full actor state and swallow pose exactly.
- Background wall time does not consume the actor.
- The remaining paints include full consumption and the shockwave phase.
- Retirement occurs no earlier than the 2250 ms swallow plus 80 ms retention, and no more than one selected frame interval later.

The hide/show clock calls mirror GardenCanvas's visibility handler, but this test does not dispatch real browser visibility events or exercise operating-system suspension. Those runtime checks remain separate acceptance work. It also does not prove sustained 120 FPS, visual fidelity of the mouth artwork, or true agent task telemetry.

Full local verification: typecheck, 194 tests in 36 files, and production build passed. Work remains isolated on perf/scene-asset-preparation; shared theme work and native outputs were not touched.
