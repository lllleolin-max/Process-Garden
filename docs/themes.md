# Theme contract

Theme manifests use `schemaVersion: 1`. Theme selection changes visual tokens only; process meanings, layout, keyboard behavior, i18n keys and metric scales remain invariant.

Required roles:

- `colors`: background, surfaces, borders, text and semantic accents.
- `typography`: display, body, editorial, mono, CJK display and CJK body.
- `effects`: glow, particles, vignette and grain in the inclusive range 0–1.
- `motion`: drift, pulse and tendril multipliers in the inclusive range 0–2.
- `basedOn`: optional `garden` or `eldritch` visual asset family.

The runtime accepts only local built-in font family names and constrained CSS color forms. Remote URLs, arbitrary CSS, unknown keys and non-finite or out-of-range values are rejected.

`.pgtheme` is a ZIP container. The current v1 writer includes one UTF-8 `manifest.json`. Package size is capped at 2 MiB; manifest decompression is capped at 256 KiB. Absolute/traversal paths, scripts and undeclared files are rejected before installation. Installation writes the validated manifest to local storage before changing active state, so storage failure leaves the previous theme intact.

The machine-readable schema is [schemas/theme-manifest.schema.json](../schemas/theme-manifest.schema.json).
