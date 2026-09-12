# Reference Analysis

## Shared product language

Both references use the same durable information architecture: a narrow system overview rail, a large ecosystem canvas, a process inspector, a bottom event timeline, and a compact top bar. The visual hierarchy is therefore a product system rather than two unrelated compositions.

The central ecosystem is the first read. Operational metrics sit in quiet, translucent surfaces with thin borders, while selected-process content uses a stronger edge and local contrast. Bright accents communicate identity and state; backgrounds stay close to black so the data remains visible.

## Garden reference

- Mood: clean bioluminescence, optimistic synthetic ecology, premium developer tooling.
- Palette: acid green core, cyan and blue utilities, violet colonies, amber infrastructure nodes.
- Forms: spherical organisms, leaf/root motifs, fine branching connections, particulate bloom.
- Typography: modern geometric sans for headings and compact sans/mono for metrics.
- Motion implication: breathing cores, growing links, soft particle transfer, gentle orbiting.

## Eldritch reference

- Mood: abyssal, ancient, uncanny, restrained cosmic horror.
- Palette: black-teal field, sea green outlines, cold cyan energy, bruised violet, antique amber.
- Forms: eye-like cores, tentacular branching, deep-sea colonies, carved/organic framing.
- Typography: serif/blackletter display treatment paired with readable sans and mono data text.
- Motion implication: slow tendril drift, watching/blinking focal points, fog and pulse rather than frantic horror effects.

## Structural differences that themes may control

- Core and creature silhouettes.
- Background texture and vignette.
- Particle sprites, connection rendering, ornament density, glow falloff, and motion curves.
- Display typography and decorative labels.
- Theme-specific copy tone in non-critical ambience text.

## Invariants

- Data meanings, component placement, keyboard behavior, status semantics, and chart scales stay identical.
- Gothic typography is never used for dense metrics, process paths, tooltips, or long Chinese text.
- Decoration cannot obscure process labels or reduce contrast.
- Every raster asset has a deterministic Canvas/CSS fallback.

## Initial responsive composition

- Wide desktop: 248 px overview rail, fluid ecosystem canvas, 320 px inspector, 220 px timeline.
- Medium desktop: collapsible overview and inspector drawers; timeline remains docked.
- Fullscreen: ecosystem-first with floating HUD and on-demand inspector.
- Ambient: ecosystem plus at most four edge widgets, adaptive 15/30 FPS, minimal labels.

