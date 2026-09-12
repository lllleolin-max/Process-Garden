# Theme authoring

The in-app Theme Studio is the recommended path. Choose a base, backdrop family, typography preset, core/signal colors, glow and particle density; the theme is previewed, saved and enabled immediately.

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

To create a package manually, ZIP this file at the archive root as `manifest.json` and rename the archive to `moss-night.pgtheme`. Use the in-app Import action. Never add JavaScript, remote URLs or external paths; v1 intentionally rejects packaged custom assets until their metadata and license pipeline is versioned.

IDs must be 2–49 ASCII letters, numbers, `_` or `-`, beginning with a letter or number. Built-in IDs `garden` and `eldritch` are reserved. Versions use semantic version form.
