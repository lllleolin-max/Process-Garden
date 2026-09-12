# Generated maw transparency — 2026-09-12

Scope: a frontend-only rendering fix. The original ImageGen PNG is unchanged. Installer verification after the backport is recorded in `release/README.md`.

## Reproduction and cause

In Eldritch, remove a visible process or Agent child and inspect the open-mouth phase, especially around 650–1,000 ms. The v3 maw was drawn directly from its black-background PNG using `screen` compositing. Black is neutral over an already painted pixel, but an opaque black source can still cover the CSS background wherever the Canvas destination is transparent. This made the entire rectangular image boundary visible around the mouth.

## Fix

- Convert the black matte to alpha once when the image loads, then retain the decoded Canvas in the existing core cache.
- Reuse the same matte conversion for process/ambient atlases, preserving any existing source transparency. Celestial assets still use their existing preserve-alpha path.
- Keep the generated teeth, saliva and body colors. The throat occlusion remains deliberate; the rectangular background does not.
- No extra frame loop, per-sample pixel processing, replacement art or dependency.

## Evidence

- Before: the 1280×720 local browser view showed a hard black rectangle around the open maw at about 633 ms into a child exit.
- After: actual Canvas draws used a 1254×1254 cached maw. Its top-left, top-right and bottom-left source alpha samples were all 0. The windowed view and wallpaper screenshot at about 1,000 ms showed continuous background outside the organism, without the rectangle.
- Garden retained its own core and plant embryo art; the Eldritch maw was not introduced into that theme. Reduced-motion Eldritch returned to a stable closed-core frame, and reduced-motion Garden also showed no rectangular matte. Both themes were inspected on their existing generated backgrounds.
- Two pure alpha tests cover opaque black, feathered dark edges, unchanged bright RGB, and preservation of transparent/partially transparent source pixels.
- Visual evidence was inspected inline through the local browser; no screenshot files are claimed by this record. Temporary pose/pixel observation hooks and test data were removed and the page reloaded.

The fix is split from Agent lifecycle work so the integration owner can backport it independently. Temporary-index `git apply --cached --3way --check` succeeded cleanly against both `1621914` and `29c2fde`, without modifying either checkout. A plain context-only patch does not apply because ambient-loading context differs, so use the independent commit's normal three-way cherry-pick. It needs no Agent lifecycle or ambient-runtime code. Run target-branch verification and native smoke tests after a backport; this browser check does not approve a new installer.
