# Cumulative browser QA — in progress

Prototype: http://127.0.0.1:1431/ (isolated asset-motion worktree, head 37de7c0).
Source: user requirements for bilingual UI, continuous sampling transitions and
complete process inspection; existing design/qa.md acceptance gates.
Observed viewport: 1280 x 720, Chinese Garden, browser demo data only.

PASS: rendered overview includes resource curves, organisms, application badges
and Inspector. Opening the process list focuses its filter. Typing `codex` shows
one matching row, preserves focus/input, and presents the incomplete-demo-table
warning. Filtered dialog fits inside the observed viewport. Browser warning/error
log query returned no entries at this checkpoint.

FIX (medium): overview header's Chinese demo observation label wraps vertically
into two lines within the pause/status control. Expected: readable single-line
status within the header, consistent with compact toolbar controls. Actual:
`演` and `示` stacked in the observed screenshot. Inspect control flex shrinking,
minimum width and wrapping, then recheck both languages/themes.

NOT VERIFIED: Eldritch follow-up, live frame pacing, actual native sampling,
wallpaper, missing/error states, reference-art fidelity and manual screen-reader
access. A still image cannot establish absence of sampling flicker.

Verdict: NOT READY for cumulative visual sign-off. This is a partial runtime
checkpoint, not a replacement for earlier native/high-density outstanding gates.

## Toolbar fix follow-up

Scoped status/text toolbar controls to flex-shrink:0 and white-space:nowrap.
Browser screenshot recheck at 1280x720 Chinese Garden confirms single-line demo
labels and remaining toolbar buttons visible. DOM computed metrics: live/status
button 73x34 px; source button 64x34 px; both nowrap and flex-shrink 0. The specific
wrapping defect above is resolved at this viewport. Other language/theme/width
combinations and the outstanding motion/native gates still need verification.

## English Eldritch follow-up

At 1280x720 switched the UI to English and selected Eldritch. The loading state
retained the previous scene while showing Preparing theme artwork; after that
indicator disappeared, the captured scene showed Eldritch creatures/core and
Gothic headings. The English Demo toolbar label remained single-line, with all
controls visible. Opened the process dialog: the existing codex filter persisted,
received focus, showed its matching row, English incomplete-data warning, and
visible pagination controls. The dialog fit within the viewport.

Restored Chinese Garden via UI and closed this test tab. These observations
resolve the English/Eldritch layout follow-up only at this viewport, not frame
pacing, narrow-width accessibility, native sampling or reference-art parity.
