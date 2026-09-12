# Localization

Supported locales are `en-US` and `zh-CN`; unsupported system locales fall back to English. The selected locale is persisted locally and applied consistently to all display modes.

User-visible component text uses i18next keys. Key names are semantic and stable (`settings.privacyText`, not a copy-derived name). Shared actions live under `common`; accessibility labels under `a11y`; domain surfaces own their namespace.

Numbers, percentages, bytes, dates and durations are formatted through `src/i18n/formatters.ts` with `Intl`. Translation interpolation uses `{{variable}}` in both catalogs. CI tests require identical key sets, identical interpolation variables and nonblank values.

Chinese body and data text uses bundled Noto Sans SC. Eldritch display text switches to Noto Serif SC for Chinese rather than asking a Latin Gothic face to synthesize missing glyphs.
