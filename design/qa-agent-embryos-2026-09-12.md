# Agent embryo motion QA — 2026-09-12

Status: ready for isolated frontend review; not a native release approval.

Branch: `feat/agent-embryo-motion`, stacked on PR #4 / `15dd8a9`. Do not merge it ahead of the ambient branch or overwrite the integration/power worktrees. Separate backportable fixes: `eb616ae` (maw alpha) and `0af5db6` (start-time formatting).

## Design and behavior

The existing generated Garden and Eldritch agent-growth atlases remain the visual source. Garden uses plant embryos and a gentle upward dissolve; Eldritch uses the cybernetic brain/embryo family, a central-mouth birth, slime, pulsing umbilical cords and the shared anticipation/suction/bite/recoil exit. No replacement illustrations were drawn in CSS or added to the asset files.

- Actors persist by PID plus normalized start time. Reordered samples retain sibling slots, and PID reuse does not overwrite a retiring lifetime.
- Growth artwork crossfades on accepted snapshot age, with damped size, orbit and CPU display. New children emerge over 1,450 ms; removed children finish their exit rather than disappearing at a sample boundary.
- Eldritch children drive the central maw, including its final recoil after the child itself is fully occluded. A retiring cord starts at its last live parent position and withdraws progressively toward the central throat.
- Canvas and Inspector share the child's icon cache/fallback identity. Inspector child rows are labelled buttons with a 44 px minimum height. Arrow navigation, selection and search can reach children without removing their parent from the main population.
- At most three child actors per parent, or two in wallpaper mode. Retiring actors hold their slots until they finish; rapid churn cannot accumulate unlimited fading sprites. A newly preferred fourth child may wait for the displaced sibling's exit (up to about 2.33 seconds in Eldritch); its Inspector selection is immediate. Search retains the hosting Agent and prioritizes the matching child.
- Pause preserves partial birth/growth/exit poses, including selection-only changes. Reduced motion settles accepted data/layout changes and has no continuous idle loop. Children use the existing scene clock and global frame cap, without new timers or animation loops.

## Evidence

`npm run verify`: TypeScript, 120 tests in 24 files, and production Vite build passed. New coverage includes identity/reordering, rapid churn, interrupted exits, pause, reduced-motion changes, wallpaper limits, preferred fourth children, tether origin, timestamp normalization and alpha removal. Canvas-path tests verify simultaneous drawing of both growth cells, continued drawing after removal, central-maw activation and child keyboard/search access.

Local browser QA used the actual Vite renderer with reversible same-origin demo fixtures; no native processes were started or killed for this test.

| Check | Observed result |
| --- | --- |
| Eldritch birth | Visible generated embryo, slime and open maw around 464 ms; no actor remount at subsequent samples. |
| Sampled growth | At about 133 ms after crossing the stage threshold, weights were 0.659 / 0.341 / 0 rather than a hard image swap. |
| Pause | The exact recorded frame/pose remained unchanged over a 500 ms idle observation. Selection does not reset a partial pose in the regression test. |
| Garden exit | At about 567 ms the child still existed with opacity 0.641, visibly drifting upward; the final frame removes it. |
| Eldritch exit | Child remained visible during suction; central maw visibly opened in window and wallpaper views. Unit coverage verifies zero-opacity retention through recoil and final removal. |
| Reduced motion | Garden showed a stable planted embryo with zero new idle render frames over 500 ms. Eldritch removed retired children on the changed static sample and used the closed core. |
| Fourth child | Searching `agent-extra` retained `codex`, admitted PID 12014 within the three-actor cap, and clicking its Inspector row opened its own details. |
| Wallpaper | Exactly two child actors retained, including the selected fourth child; labels remained visible. Escape returned to the windowed controls. |
| Language and identity | Chinese/English stage hint and inspection checked. A selected child's start time rendered as 2026, not an erroneously multiplied millisecond timestamp. Unknown fixture executables correctly used initials, not fabricated native icons. |
| Generated maw | Hard black rectangle found during visual QA and fixed in `eb616ae`; see the separate transparency record. |
| Browser cleanup | No warning/error logs at final check. Fixtures/prototype observers restored and page reloaded. Inline screenshots inspected; no screenshot file paths are claimed. |

Windowed screenshots were checked at 1280×720, wallpaper at approximately 1549×925. Existing 30/60/120 frame controls and pacing tests remain intact; 30 and 120 targets were exercised in browser motion scenarios. This is not a hardware-certified 120 FPS measurement.

## Limits and release follow-up

- Growth is an age-based proxy for direct child processes, not an Agent's actual task progress, completion percentage or prompt contents. Both locales now say this explicitly; the final stage is “Mature embryo,” avoiding any implication of task completion. No new Agent API/telemetry integration is claimed.
- Inspector can list more children than the bounded scene represents. This is a deliberate density/performance trade-off, with explicit selection/search priority.
- No new native executable, installer, WorkerW attachment test or live-machine resource measurement was produced on this branch. The integration owner must combine the branches, retain the power task's `formatWatts` addition, run target-branch/native checks, and issue new hashes before release.
- Reference fidelity remains the existing dark botanical/abyssal direction. This pass improves continuity and interaction, not a claim of pixel-perfect reproduction or completion of the broader project goal.
