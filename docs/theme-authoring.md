# Theme authoring

See the [11/12-file asset checklist and modular capture contract](theme-lifecycle-assets.md). The editor provides the same checklist and a capture motion selector.

The in-app Theme Studio is the recommended path. Choose a base, backdrop family, typography preset, core/signal colors, glow and particle density; the theme is previewed, saved and enabled immediately.

For custom artwork, open **Add theme → AI prompts & custom artwork** (also available from Settings → Theme authoring). Describe the desired world, copy the generated prompt into an image AI, and upload the resulting PNGs into their named slots. The prompt adapts to the selected behavior family. You can replace one image or the entire set; empty slots inherit built-in artwork. Inspect the thumbnails and backdrop/core preview, then Save. Chinese theme names are supported. Export packages include uploaded images; imports present a review step before installing or replacing an existing ID. The app itself does not call an external AI or upload your images.

See the [Chinese prompt kit](ai-theme-prompt-kit.zh-CN.md) for an offline copy of the workflow. The app generates the v2 image manifest automatically; users do not need to write JSON or rename source files.

## Minimal manifest

```json
{
  "schemaVersion": 1,
  "id": "moss-night",
  "name": { "en-US": "Moss Night", "zh-CN": "苔藓之夜" },
  "version": "1.0.0",
  "author": "Local user",
  "basedOn": "garden",
  "colors": {
    "background": "#050a09",
    "backgroundElevated": "#08110f",
    "panel": "rgba(8, 20, 17, 0.76)",
    "panelStrong": "rgba(10, 25, 21, 0.94)",
    "border": "rgba(125, 219, 178, 0.17)",
    "borderStrong": "rgba(119, 238, 166, 0.42)",
    "text": "#e8f4ee",
    "textMuted": "#8fa59b",
    "primary": "#72ef9b",
    "secondary": "#36cfe4",
    "tertiary": "#9872f3",
    "warning": "#f0ae4f",
    "danger": "#f15e78",
    "success": "#69ed8d"
  },
  "typography": {
    "display": "Space Grotesk Variable",
    "body": "Inter Variable",
    "editorial": "Inter Variable",
    "mono": "JetBrains Mono Variable",
    "cjkDisplay": "Noto Sans SC",
    "cjkBody": "Noto Sans SC"
  },
  "effects": { "glow": 0.82, "particles": 0.7, "vignette": 0.62, "grain": 0.08 },
  "motion": { "drift": 0.72, "pulse": 0.8, "tendril": 0.62 }
}
```

To create a parameter-only package manually, ZIP this file at the archive root as `manifest.json` and rename the archive to `moss-night.pgtheme`. Use the in-app Import action. v1 rejects packaged images. Use the artwork slots and app export for a v2 image package. Never add JavaScript, remote URLs or external paths.

IDs must be 2–49 ASCII letters, numbers, `_` or `-`, beginning with a letter or number. Built-in IDs `garden`, `eldritch` and `cyberpunk` are reserved. Versions use semantic version form.
