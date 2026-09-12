# Font inventory

All packages are `@fontsource` 5.3.0 and are bundled by Vite. No runtime CDN or system-font assumption is required. The complete Fontsource Unicode partitions are shipped for Noto SC; Latin families include their supplied Latin/Latin-ext and related partitions.

| Family | Role | Theme | Language coverage | Upstream | License |
|---|---|---|---|---|---|
| Inter Variable | body/data | both | Latin, Greek, Cyrillic, Vietnamese | rsms/inter | SIL OFL 1.1 |
| Space Grotesk Variable | display | Garden | Latin, Vietnamese | Florian Karsten / Google Fonts | SIL OFL 1.1 |
| JetBrains Mono Variable | PID/metrics/code | both | Latin, Greek, Cyrillic, Vietnamese | JetBrains | SIL OFL 1.1 |
| Grenze Gotisch 600 | short display only | Eldritch | Latin, Latin-ext, Vietnamese | Omnibus-Type | SIL OFL 1.1 |
| Spectral 400/600 | editorial ambience | Eldritch | Latin, Greek, Cyrillic, Vietnamese | Production Type / Google Fonts | SIL OFL 1.1 |
| Noto Sans SC 400/500/600 | CJK body/data fallback | both | Simplified Chinese partitions plus Latin/Greek/Cyrillic | Google Noto | SIL OFL 1.1 |
| Noto Serif SC 600 | CJK display fallback | Eldritch | Simplified Chinese partitions plus Latin/Greek/Cyrillic | Google Noto | SIL OFL 1.1 |

CSS uses `font-display: swap` as supplied by Fontsource, then reliable `Segoe UI`/sans-serif fallbacks. Gothic type is restricted to short brand/display labels; dense metrics, paths, tooltips and tables remain Inter/Noto Sans/JetBrains Mono.

The glyph QA corpus includes Chinese and English UI catalogs, numbers, units, full-width punctuation and mixed process examples such as `系统进程_测试.exe`, `编译器—worker_Ω`, `PID 65535 · 12.5% · 1.5 GB`. Catalog parity and rendered browser QA are release gates. Full SIL OFL text and attribution are archived in `THIRD_PARTY_NOTICES.md` and the dependency packages.
