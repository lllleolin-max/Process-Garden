# Eldritch ambient assets v1

Date: 2026-09-12
Status: integrated and browser-tested on the next-version branch; not included in the frozen release installers.
Asset handoff branch: `feat/eldritch-ambient-assets`. Runtime branch: `feat/eldritch-ambient-motion`.

The user requested that peripheral elements have corresponding Eldritch skins. At the asset-handoff baseline the renderer only loaded Garden habitat and pollinator atlases. These two new generated atlases provide the missing theme-specific subjects while retaining the existing four-cell loader and bounded ambient-motion model.

## Files and provenance

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `public/assets/generated/eldritch/habitats/eldritch-habitat-atlas-v1.png` | 1565928 | `D657D56C968642C7FA31E39FCB4EECCB66092EA80729C5C835BF925530E963E6` |
| `public/assets/generated/eldritch/pollinators/eldritch-pollinator-atlas-v1.png` | 1342694 | `57823C8B222EEBF6207F33485391396CDA386BF2F79B16B717154B84646953DC` |

Both were generated with built-in ImageGen. The provided Eldritch reference and existing generated Garden atlas were supporting style/composition references, not edit targets. No live system information or credentials were sent. Original outputs were retained in the tool's generated-images directory; production copies are included in this branch.

Each atlas is 1254×1254, with four 627×627 cells. Background is black for the existing black-to-alpha conversion and screen compositing, not a claim of original transparent alpha. Do not load with the celestial atlas's `preserveAlpha=true` option.

## Cell mapping

| Quadrant | Habitat | Ambient fauna |
| --- | --- | --- |
| Top left | Teal coral-encrusted arch and eye tendrils | Emerald cyclopean manta |
| Top right | Violet tube-polyps and cyan sea ferns | Cyan glass nautilus larva |
| Bottom left | Emerald tidal pool with eye spores | Amber biomechanical scarab |
| Bottom right | Bronze ring relic, shells and neural roots | Violet moth-jellyfish |

## Pixel and visual inspection

A full-resolution read-only scan treated alpha > 8 and max(R,G,B) > 10 as visible. All eight cells contain substantial visible content, and all have zero visible pixels in the outer four-pixel strip. Minimum content margins are 44/48/38/40 pixels for habitats and 39/53/44/18 pixels for fauna (quadrant order above). These measured margins are smaller than the requested 12% in some cells, but no subjects or glow edges touch the crop boundary. No checkerboard, labels, grid or baked UI was observed.

Combined PNG size: 2,908,622 bytes (about 2.77 MiB). Decoded full-resolution bitmap content is about 12 MiB for both atlases before any browser overhead; load/process once through the existing cache, never per sample or frame. This is a size estimate, not an application performance benchmark.

## Integration contract for the next version

The following contract was implemented in the isolated runtime branch with the integration task's agreement:

1. In the Eldritch asset branch, load the habitat and pollinator paths above through the existing four-cell black-to-alpha loader. Keep the Garden paths unchanged.
2. Remove the Garden-only gate from habitat/pollinator rendering once theme-specific sprites are loaded. Derived Eldritch themes inherit the same mapping through `basedOn`.
3. Keep habitat layers below process links and preserve restrained opacity. Ambient fauna remain small and lower priority than process icons and labels.
4. Respect the particles/ambient toggle for both layers. Use the existing scene clock for breath/float; pause, hidden-tab suspension and reduced motion must cover every new layer.
5. Preserve wallpaper population reduction and the selected global frame-rate target; no new timers, render loops or sample-driven image decoding.
6. Verify both themes, all three display modes, pause/resume, reduced motion and ambient-toggle-off in the integrated browser build. Check the tiny specimens at actual 24–36 px size and confirm labels stay readable.

Runtime verification and its limits are recorded in [ambient motion QA](qa-ambient-2026-09-12.md). The original asset-only PR remains a provenance handoff; the runtime successor includes these same assets. Neither workstream changes the original workspace's `dist`, installers or frozen release.

## Generation prompts

### Habitats

Use case: stylized-concept. Make a NEW production square 2x2 sprite atlas for Process Garden Eldritch theme. Input 1 is supporting visual style/reference mood, input 2 is supporting atlas composition/scale; neither is an edit target. Four isolated low-profile abyssal habitat props centered inside exact equal quadrants, solid PURE BLACK RGB 0,0,0 background everywhere, no checkerboard, no floor, no text, no tile separators. Top left: a small broken dark stone arch encrusted in teal brain coral and curled miniature eye tendrils. Top right: a delicate cluster of violet translucent alien tube-polyps and curling cyan sea ferns growing on dark stone. Bottom left: a shallow obsidian tidal pool, bioluminescent emerald liquid, tiny eye-shaped spores and a few purple tentacle roots hugging its rim. Bottom right: a small relic cluster of ancient bronze mechanical rings and ribbed abyssal shells woven with fine teal neural roots and amber bulbs. Same high-detail painterly 3D material quality as reference, wet obsidian/bronze/coral, teal and violet dominant with restrained amber accents, strong but delicate silhouette, subdued glows. Every entire prop fully fits inside its quadrant with AT LEAST 12 percent black margin on EVERY side, don't crop any tendril. Preserve a clean wide black gutter across the exact center horizontal and vertical lines. Used as small ambient background props behind actual monitored process sprites, no giant centerpiece.

### Ambient fauna

Use case: stylized-concept. Make a NEW production square 2x2 sprite atlas of four tiny flying/swimming ambient Eldritch fauna for Process Garden. Input 1 is supporting visual style/reference mood, input 2 is supporting composition, not an edit target. Four SEPARATE creature specimens centered in exact equal quadrants, pure solid BLACK RGB 0,0,0 background with absolutely no checkerboard, labels, UI or ground. Top left: emerald translucent abyssal manta ray with fine wing veins, one tiny cyclopean eye and curling short tail. Top right: cyan glass nautilus larva with fan-like membranes and delicate trailing antennae. Bottom left: amber bronze biomechanical scarab with subtle shell engravings, one luminous ocular gem and hovering fins. Bottom right: violet moth-jellyfish hybrid with translucent membranous wings, tiny teal eye lights and three wispy tentacles. High-end detailed painterly 3D game sprites matching existing dark cosmic ecology; graceful small silhouettes, no aggressive main boss, no cartoon triangles, no human features. All four specimens fully contained with generous black margins at least 12 percent per quadrant edge and clean exact-center black gutters; no cropped antennae. These are small ambient orbiters animated slowly over a dark scene; each specimen must read at 24-36 pixels.
