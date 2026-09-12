# Theme-aware ambient motion — implementation and QA

Date: 2026-09-12. Branch: `feat/eldritch-ambient-motion`.
Prototype: `http://127.0.0.1:1422/` in an isolated worktree.
Runtime implementation: `105c27b`. Starting frontend baseline: `9d5a42c`; verified integration/native history through `29c2fde` was subsequently merged without modifying the original workspace.

## Scope and coordination

This is a next-version draft, not a replacement for the frozen installers in PR #2. It contains the generated assets from the asset-only PR #3 plus their runtime integration. Do not integrate the same asset handoff twice. The original workspace, release binaries and the independent power-metrics workstream were not modified.

Source of truth: the supplied `克苏鲁皮肤.png` and `默认皮肤.png`, `design/context.md`, the user's requirement for themed peripheral life, and `design/eldritch-ambient-assets-v1.md`.

## Implemented

- Eldritch and Eldritch-derived custom themes load four generated habitats and four generated fauna specimens. Garden keeps its existing assets and flight paths.
- Habitats remain behind process links. Tiny abyssal specimens use slow peripheral currents, gentle banking and restrained membrane stretch; application icons and labels retain higher visual priority.
- The ambient-particle switch now controls all three decorative layers in both themes. Asset arrivals and switch changes fade through the existing frame loop; reversal continues from current opacity. Once invisible, layers stop drawing.
- Ambient particles, habitats and fauna use the persistent scene clock without multiplying time by a reduced-motion flag. Pausing/reducing motion freezes the current pose instead of resetting its phase. Static setting changes render immediately.
- No new dependency, timer, collector request or per-sample image decoding was added. Wallpaper keeps four habitat placements and reduces fauna from four to three.

## Automated verification

`npm run verify` passed: TypeScript check, **99 tests in 21 files**, and the production Vite build. Eleven new cases cover:

- frame-rate-independent opacity response at 30/60/120 Hz, interruption/reversal and exact settled-off state;
- five minutes of sampled fauna trajectories at 320×280, 740×422 and 1920×1080, checking small size, viewport containment and central-brain clearance;
- correct atlas family for Garden, Eldritch and an Eldritch-derived custom theme in all three display modes;
- wallpaper fauna count, paused/static toggle-off, decoded-sprite reuse across resource samples, and unchanged poses across pause/reduced-motion and resume.

Canvas tests use synthetic image-load events to exercise routing and render behavior. They do not validate pixel quality; the real PNGs were separately inspected and browser-rendered.

## Browser conformance

- PASS — Real network resource entries include the two new Eldritch atlas paths; all eight new subjects render in the windowed scene. No checkerboard or quadrant seams were observed.
- PASS — Both themes were visually checked in windowed, settled fullscreen and wallpaper layouts. Fullscreen Canvas bounds matched the 1549×925 viewport after layout settled. The Eldritch window was also checked at the documented 1040×720 minimum; decorative layers remain behind legible metrics and process labels.
- PASS — Chinese and English controls, theme switching, all three selected frame-rate states, Escape return from presentation modes, and the empty-search scene remained usable.
- PASS — A temporary Canvas observer isolated the ambient layers with an empty process search. During a 2.4-second toggle-off capture, 125 observed Canvas frames showed the first habitat's opacity descending through 0.2730, 0.1753, 0.0714, 0.0217, 0.0041 and 0.0007, then zero ambient draws. These are observed transition samples, not an FPS benchmark.
- PASS — While paused, two separated observations had the same last-render timestamp and identical ambient transforms; opening unrelated settings did not wake the Canvas. Turning ambience off while paused removed all eight draws immediately.
- PASS — During a 2.2-second reduced-motion observation, three data-driven Canvas renders all contained eight unchanged ambient poses, rather than continuous idle animation.
- PASS — Browser console inspection found no warnings or errors during this check. Temporary Canvas observation hooks were restored and removed, and the viewport override was reset.

Screenshots of both themes and key states were captured in the development task. The comparison preserves the reference's dark organic environment and subordinate peripheral life; it does not claim pixel-for-pixel reproduction of the original poster composition.

## Limits and follow-up

- This branch has no newly built native installers. The parent integration task verified the inherited native sampling fix (`1621914`, five Rust tests and a 40-second responsive startup smoke), but that is not a native verification of these new assets.
- The browser uses demo data. These checks do not prove Windows wallpaper attachment, energy use, or physical 120 FPS. Shader/GPU profiling and screen-reader testing were not performed.
- The broader motion goal remains open: child-agent embryos still change stage directly and are rendered from the current child list, unlike persistent main process nodes. Smooth child lifecycle/stage transitions should be a separate coordinated change.

## Verdict

READY for a separate draft frontend review. NOT a new native release approval. No blocking mismatch was found within this ambient-integration scope; wider animation work and native packaging remain separately tracked.
