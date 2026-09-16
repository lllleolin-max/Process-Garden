# Wallpaper acquisition status

WallpaperHud now mounts the same health notice in its existing brand slot.
While unhealthy, the brand icon/name/green dot are replaced by the status, not
covered with an unrelated central overlay. Existing CPU/memory/power/process
metrics remain in their separate HUD grid column. The notice is bounded to its
column and uses the existing elevated theme surface for legibility.

FeedHealthNotice is presentation-aware: the TopBar instance returns null in
wallpaper mode and the wallpaper instance returns null otherwise. Only one
status region is exposed. Wallpaper's passive notice has tabindex -1 and does
not turn the desktop background into a keyboard stop or enable pointer capture.
Windowed/fullscreen retain the keyboard-accessible header notice.

`npm run verify` passes 234 tests in 46 files, typecheck and production build.
The new regression mounts both presentations and transitions windowed →
wallpaper → fullscreen, checking one status region and focus eligibility.

Scope: CSS/DOM integration is tested; native WorkerW embedding and browser
visual clearance against long HUD metric strings still require runtime QA.
Do not infer native wallpaper acceptance from component tests.

Integration conflict scope in App.tsx: one import and one insertion into the
existing WallpaperHud brand element. Preserve the other task's unrelated app,
theme and process-operation changes when applying these hunks.
