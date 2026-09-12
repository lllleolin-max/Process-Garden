# Motion and image-generation work — 2026-09-12

Status: integration in progress. Concurrent edits were observed in GardenCanvas, Sparkline, the sampling hook and settings. Do not treat previous release binaries as containing these changes. Full visual QA and packaging are pending.

## Generated production assets

- `public/assets/generated/shared/celestial-atlas-v1.png`: four celestial specimens in a 2×2 atlas, ordered Garden sun, Garden moon, Eldritch sun, Eldritch moon. Preserve original alpha when slicing in Canvas.
- `public/assets/generated/eldritch/cores/eldritch-core-maw-v3.png`: generated devouring pose, black background for screen compositing. The mouth cavity is occluded at runtime before generated teeth and saliva render above the process sprites.
- `eldritch-core-maw-v2.png` is an intermediate generation with an opaque checkerboard background; it is NOT a production asset and is not referenced by the renderer.

Tool: built-in ImageGen. No system/process data was transmitted. Source character: existing generated `eldritch-core-main-v1.png`.

## Prompts

Celestial atlas: Production square 2×2 sprite atlas on transparent alpha, four isolated specimens centered in their quadrants, no labels or grid. Top left golden botanical sun with a textured glass core and stamen-like corona; top right opalescent silver-blue cratered crescent moon with pale cyan wisps; bottom left dark obsidian occult sun with amber tentacle filaments and bronze detail; bottom right violet scarred crescent with cyan veins and curling tendrils. Detailed painterly 3D game sprites, sharp silhouettes and restrained bloom.

Maw pose: Preserve the existing symmetrical teal cyber-organic core, bronze inlay, peripheral tentacles, frontal framing and centered silhouette. Replace the giant central eye with an exaggerated fully open dark-crimson maw, fleshy ridged lips, irregular ivory hooked teeth, deep throat and wet emerald saliva. Mouth occupies over half of the body. No text or flat placeholder teeth.

Corrective edit: Preserve the exact creature, teeth, mouth and composition. Replace all baked gray/white checkerboard with solid RGB 0,0,0 for screen compositing. No floor, gray halo or checkerboard. Only change background.

## Code work in this pass

- Correct early-vsync frame pacing so an accepted early frame consumes its deadline.
- Add SceneClock to exclude paused and hidden time from lifecycle progression.
- Add population hysteresis to avoid minor ranking fluctuations triggering repeated entries/exits.
- Preserve visual nodes across theme effect changes.
- Integrate generated celestial sprites and devouring pose.
- Preserve the closing/recoil lifecycle after a swallowed organism becomes invisible.
- Separate shockwave radius progression from its opacity envelope.
- Use stable PID-based cord bends and smoothly damp hover emphasis.
- Replace expensive per-node Canvas opacity filters with composited alpha and resolve Canvas fonts to actual font-family names.

## Outstanding verification

The most recent typecheck reported SettingsDrawer.tsx and TopBar.tsx testing a void display-mode result for truthiness. These files were being edited concurrently; no overwrite or release packaging was attempted after detecting this conflict. Re-run typecheck and tests after coordinating the writer, then verify the generated maw, both wallpaper themes, pause/resume, reduced motion and all frame-rate settings in the browser before packaging.
