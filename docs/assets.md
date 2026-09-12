# Generated Asset Inventory

All image-generation inputs use only the two author-provided visual references and product art direction. No local process names, paths, metrics, files, or user system data are sent to image generation.

| Asset | Theme | Purpose | Modes | Source | Integrated |
|---|---|---|---|---|---|
| `garden-canvas-bg-v1.png` | Garden | Low-contrast bioluminescent perimeter background | Window / Fullscreen / Wallpaper | Built-in image generation, reference-guided | Yes |
| `garden-canvas-bg-v2.png` | Garden | Layered miniature night-garden habitat with moss, ferns, water, flowers and dew | Window / Fullscreen / Wallpaper | Image2, reference-guided | Yes |
| `eldritch-canvas-bg-v1.png` | Eldritch | Abyssal organic perimeter background | Window / Fullscreen / Wallpaper | Built-in image generation, reference-guided | Yes |
| `garden-core-main-v1.png` | Garden | Screen-blended central ecosystem organism | Window / Fullscreen / Wallpaper | Built-in image generation, reference-guided | Yes |
| `garden-core-main-v2.png` | Garden | Moss/root terrarium heart with seed, fungi and flowers | Window / Fullscreen / Wallpaper | Image2, reference-guided | Yes |
| `eldritch-core-main-v1.png` | Eldritch | Screen-blended abyssal eye organism | Window / Fullscreen / Wallpaper | Built-in image generation, reference-guided | Yes |
| `eldritch-process-atlas-v1.png` | Eldritch | Watcher, neural cluster, larva and construct families | All visual modes | Image2, reference-guided | Yes |
| `eldritch-process-atlas-v2.png` | Eldritch | Spore, tendril, signal wisp and nautilus families | All visual modes | Image2, reference-guided | Yes |
| `garden-process-atlas-v2.png` | Garden | Spore, root-knot, signal wisp and seed-shell families | All visual modes | Image2, reference-guided | Yes |
| `garden-process-atlas-v1.png` | Garden | Leaf watcher, fern neural tree, seedling larva and bark construct | All visual modes | Image2, reference-guided | Yes |
| `garden-process-atlas-v3.png` | Garden | Alternate lily, mushroom, snail and moss-stone specimens | All visual modes | Image2, reference-guided | Yes |
| `garden-process-atlas-v4.png` | Garden | Alternate puffball, vine, firefly-dandelion and lotus-shell specimens | All visual modes | Image2, reference-guided | Yes |
| `garden-habitat-atlas-v1.png` | Garden | Moss log, fern flowers, dew pond and mycelium-stone habitat props | Window / Fullscreen / Wallpaper | Image2, reference-guided | Yes |
| `garden-pollinator-atlas-v1.png` | Garden | Butterfly, dragonfly, jewel beetle and firefly-moth ambient fauna | Window / Fullscreen / Wallpaper | Image2, reference-guided | Yes |
| `eldritch-agent-growth-atlas-v1.png` | Eldritch | Cyber-brain Agent core plus three task-embryo stages | All visual modes | Image2, reference-guided | Yes |
| `garden-agent-growth-atlas-v1.png` | Garden | Neural flower Agent core plus three task-growth stages | All visual modes | Image2, reference-guided | Yes |

## Integration rules

- Background plates are subordinate to data and use a dark overlay.
- Core sprites use screen compositing over deterministic procedural rings.
- Pure-black atlas backgrounds are converted to alpha once and cached in Canvas; this avoids visible sprite rectangles without runtime network work.
- Garden families draw from two stable specimens per semantic family. The deterministic name/PID seed prevents the even PID pattern common on Windows from collapsing every process onto the same variant.
- Garden habitat props render below process links at reduced opacity; pollinators render as small ambient movers above the ecology. Both are disabled with ambient particles and reduced in wallpaper mode.
- Automatic classification picks a stable visual family, while per-application user overrides select the same semantic family across both themes.
- Canvas/CSS procedural fallbacks remain available if an image fails to load.
- Generated images contain no UI text, logo, fake process data, or fake metrics.
- Custom themes inherit the visual asset family declared by `basedOn` until a validated local asset role is supplied.

## Prompt records

### Garden background

Dark wide bioluminescent digital ecology, edge-weighted root filaments and spores, clean central negative space, no UI/text/subjects.

### Garden background v2

Wide miniature night garden with moss terraces, ferns, dew, clover, tiny flowers, roots, fireflies and a shallow water pocket. Rich perimeter and lower-edge habitat, calm dark central field, no UI or central subject.

### Eldritch background

Dark wide abyssal organic frame, distant tendrils and eye-shaped edge motifs, clean central negative space, no UI/text/monster portrait.

### Garden core

Centered spherical seed-and-root organism with luminous leaf nucleus on pure black, designed for screen blending.

### Garden core v2

Centered moss-covered root-ball terrarium with a luminous seed, mushrooms, fern curls, small wildflowers, dew and mycelial tendrils on pure black.

### Eldritch core

Centered refined deep-sea organism with vertical eye nucleus and restrained tendrils on pure black, no gore, designed for screen blending.

### Eldritch peripheral atlas v1

Four isolated species in a 2×2 atlas on pure black: emerald cyclopean jellyfish, violet brain-coral polyp, cyan multi-eyed larva and amber biomechanical cephalopod construct.

### Eldritch peripheral atlas v2

Four new isolated species on pure black: eye-spore colony, circular tentacle sigil, violet signal wisp and rust/teal abyssal nautilus.

### Garden peripheral atlas v2

Four new isolated species on pure black: translucent seed-cup colony, circular root knot, violet fiber-optic dandelion wisp and amber seed-shell construct.

### Garden process atlases v1, v3 and v4

Sixteen total specimens across eight semantic families: leaf rosette and water lily watchers; fern-neural and mushroom-colony neural forms; seedling caterpillar and glass snail larvae; bark beetle and moss-stone constructs; cup fungi and puffball spores; root knot and leaf-vine tendrils; filament wisp and firefly-dandelion signals; seed-shell and lotus-pod shell creatures.

### Garden habitat and pollinator atlases

Four low-profile habitat props (moss log, fern/wildflowers, dew pond, mycelium stones) plus four ambient micro-fauna (leaf butterfly, dew dragonfly, amber jewel beetle, violet-green firefly moth), all isolated on pure black.

### Agent growth atlases

Each theme has a four-cell atlas. Eldritch uses a dark brass cyber-neural brain followed by seeded, forming and near-hatching abyssal embryos. Garden uses a mycelial neural flower followed by seed, curled sprout and opening bud stages. All cells are isolated on pure black with no text, logos or UI.
