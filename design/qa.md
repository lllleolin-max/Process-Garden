# Design QA — Process Garden v0.1.0

Date: 2026-08-10

## Reference fidelity

- PASS — Garden theme preserves the reference's dark nocturnal canvas, central living core, green/cyan ecology and compact monitoring chrome.
- PASS — Garden v2 strengthens the reference's ecosystem reading with a moss/root/flower central heart, 16 process specimens, layered habitat plates and subtle pollinator motion while keeping labels and metrics dominant.
- PASS — Eldritch theme preserves the near-black abyss, purple/cyan bioluminescence, gothic display type, organic panels and dense peripheral life from the Cthulhu reference.
- PASS — Generated backgrounds, cores, creature atlases, habitat plates, pollinators and agent-growth atlases are separated by theme and contain no baked labels.

## Product behavior

- PASS — Window, fullscreen and WorkerW wallpaper modes remain accessible from the same bottom dock.
- PASS — English/Chinese switching updates interface copy; both themes use complete offline font stacks.
- PASS — Processes are grouped into stable application/resource categories and can be pinned to a visual family from Settings > Ecology.
- PASS — Claude, Codex, Trae and WorkBuddy-style agents render as theme-specific brains; child tasks render as three-stage embryos.
- PASS — Inspector exposes current agent stage and child-task count without implying access to prompt contents.
- PASS — Desktop processes use their EXE-embedded Windows icon in both themes; the Canvas, process dock and Inspector share the same identity. Offline demo fallbacks cover the reference applications.
- PASS — Global 30/60/120 Hz animation settings are display-synchronized and independent from resource sampling.
- PASS — Sampling no longer recreates or clears the Canvas lifecycle. Resource and layout changes interpolate continuously. Garden exits dissolve; Eldritch exits remain visible through anticipation and suction, spiral into a split-jaw deformation of the generated central-core artwork, then disappear under the snapping jaws with recoil and shockwaves.

## Layout and accessibility

- PASS — Primary monitoring view remains legible at 1440×960 and 1280×720; compact layout keeps core controls usable at the documented 1040×720 desktop minimum.
- PASS — Focus-visible states, semantic buttons, labelled controls and reduced-motion handling are present.
- PASS — Decorative Canvas content has an accessible summary; essential process data remains available in Inspector and Timeline.

## Fixes applied during QA

- Reduced ecological node density so generated organisms remain individually readable.
- Removed child-agent tasks from the ordinary node pool and attached them spatially to their parent brain.
- Added one-time black-background alpha conversion for generated sprite atlases.
- Made custom Eldritch-derived themes inherit Eldritch component treatment, not only token colors.
- Added explicit Windows bundle icons and a platform-safe application identifier.
- Replaced the ordinary theme's sparse neon perimeter with a layered miniature habitat and added deterministic two-specimen variation to all eight organism families.
- Added habitat and pollinator render layers that respect the existing ambient-particle and wallpaper performance controls.
- Added a bounded native icon pipeline with path/miss caching, offline brand fallbacks and a final initials fallback.
- Replaced the hidden wallpaper 20 FPS cap with explicit global 30/60/120 Hz frame pacing; added breathing habitat, identity-core and connection motion on a continuous timebase.
- Replaced sample-triggered render-effect teardown with PID-keyed persistent visual nodes, exponential damping and reversible enter/exit transitions.
- Added a tested four-stage Eldritch lifecycle (anticipation, spiral suction, snap bite, recoil) plus foreground jaw occlusion, slime flow and umbilical-cord pulses.

## Verdict

PASS for the enriched v0.1.0 release. Frontend verification passes 37 tests and Rust verification passes 4 tests, including real `explorer.exe` icon extraction. Browser QA confirms all three refresh-rate controls, visible icons in both built-in themes, continuous frame-to-frame motion, no blank frames across repeated sample boundaries, and visible Eldritch jaw-open/suction/bite stages. MSI, NSIS and portable artifacts were regenerated; the portable executable remained alive and responsive through the native smoke test and then closed cleanly.
