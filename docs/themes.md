# Theme contract

Theme manifests use `schemaVersion: 1` for tokens or `schemaVersion: 2` for tokens plus custom PNG artwork. Process meanings, layout, keyboard behavior, i18n keys and metric scales remain invariant.

Required roles:

- `colors`: background, surfaces, borders, text and semantic accents.
- `typography`: display, body, editorial, mono, CJK display and CJK body.
- `effects`: glow, particles, vignette and grain in the inclusive range 0–1.
- `motion`: drift, pulse and tendril multipliers in the inclusive range 0–2.
- `basedOn`: optional `garden`, `eldritch`, `cyberpunk` or `crimson` visual asset family.

The four built-in directions are botanical Garden, blue/teal Deep Sea Cthulhu, engineered Neon Matrix, and black/red eye-led Crimson Gaze (`crimson`). Each has independently generated silhouettes and materials. Current artwork and exact generation records live in `public/assets/generated/refined/GENERATION.json`. Crimson has its own ten PNGs, including eye awakening stages, ocular capture parts, celestial bodies and a dilated devouring core. Both Cthulhu families support `maw`; custom themes can inherit either independently.

The runtime accepts only local built-in font family names and constrained CSS color forms. Remote URLs, arbitrary CSS, unknown keys and non-finite or out-of-range values are rejected.

`.pgtheme` is a ZIP container. v1 includes one UTF-8 `manifest.json`. v2 includes the PNG files declared in `assets`, mapping roles to `assets/<sha256>.png`, and/or a `captureStyle` override (`vine`, `tentacle`, `cable`, `beam`). Supported roles are background, core, process1–process4, habitat, pollinator, agent, celestial, capture and maw. Empty roles inherit the selected built-in family. All families can use custom variant atlases 3 and 4; maw is used by the deep-sea and crimson families. See the [complete asset and lifecycle contract](theme-lifecycle-assets.md).

Packages are capped at 66 MiB, decompressed images at 64 MiB total and 8 MiB each, and manifests at 256 KiB. PNG headers and actual browser decoding are checked before import; SHA-256 filenames are verified. Image sides are 64–4096px with at most 9,437,184 pixels. Backgrounds must have a landscape ratio of 1.3–2.4; other images must be even-sided squares. Atlases use equal 2×2 quadrants in reading order. Custom sprites, including celestial images, support pure black matte or real alpha.

Absolute/traversal paths, duplicate entries, scripts, unsupported formats and undeclared or missing files are rejected. Import stages a preview before replacing any theme. PNG blobs are saved in local IndexedDB before the manifest is committed to localStorage and activated. A storage failure or cancelled operation leaves the previous theme active. Images are resolved to local blob URLs at runtime, never remote URLs. Exports include the artwork, so packages can move between installations.

The machine-readable schema is [schemas/theme-manifest.schema.json](../schemas/theme-manifest.schema.json).

Unreferenced stored images (including cancelled imports and deleted themes) are reclaimed on the next application startup. Export a theme before deleting it if you need a backup.

## Crimson gaze

The built-in crimson core reuses its generated artwork for pointer tracking: the main iris and five crown eyes deform inside fixed eye borders. The pointer is tracked across the app viewport; leaving the window or losing focus recenters the gaze. Pause freezes the pose; reduced motion updates directly without interpolation. The open-maw animation retains priority. Custom core replacements keep their own artwork intact because their eye coordinates are unknown. No new asset slot is required.
