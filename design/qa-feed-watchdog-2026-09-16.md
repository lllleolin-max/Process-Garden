# Pending native sampling watchdog

The native feed now marks an observation as stalled after the larger of five
seconds or three configured sampling intervals. This is a health notification,
not cancellation: the original promise remains the single in-flight request.
No duplicate native command, forced restart or elevation is issued. Late valid
success clears the notice; rejection transitions to the scheduled-retry state.

Watching begins before waiting for a request from an earlier effect, so changing
sampling preferences does not hide an indefinitely pending native command.
Hidden documents clear the watchdog; becoming visible re-arms it when a request
is still pending. Unmount/pause cleanup clears the timer. The existing request
validity guards still prevent late snapshots from crossing effect boundaries.

The notice distinguishes "waiting for the pending request" from "retrying
automatically" in both languages. No false retry is claimed for a pending call.

Regression tests cover threshold timing, one native request, retained snapshot,
late success, effect replacement, timer cleanup and hidden/visible re-arming.
This closes the missing pending-call detection noted in the earlier health QA;
it does not add native cancellation or resolve the outstanding wallpaper and
browser visual-verification gates.
