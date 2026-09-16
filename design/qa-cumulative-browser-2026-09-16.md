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
