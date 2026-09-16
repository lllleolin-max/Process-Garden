# Native process CPU scale — 2026-09-16

## Evidence and correction

The pinned sysinfo 0.36.1 implementation in `src/windows/process.rs`,
`compute_cpu_usage`, multiplies process CPU-time / global CPU-time by the
logical CPU count and 100. The public `Process::cpu_usage` documentation also
specifies division by CPU count when a 0–100 whole-machine percentage is wanted.
The collector previously forwarded this core-relative value directly, while
system CPU used `global_cpu_usage` on a whole-machine scale.

The collector now divides process CPU by the enumerated logical CPU count once,
clamps to 0–100, and uses this same value for lifecycle status and sorting.
A defensive minimum divisor of one prevents division by zero; it is not proof
that CPU enumeration succeeded. Demo telemetry is unchanged. No frontend second
normalization was introduced.

## Verification

- Unit cases: one busy core on eight CPUs = 12.5%; all eight = 100%; zero,
  single-core, zero-count fallback, negative and oversized inputs.
- Native snapshot test checks every returned process against the retained
  collector's raw reading and verifies its status and percentage range.
- Run with isolated Cargo target `ProcessGarden/cargo-target-coverage`, without
  launching or replacing the shared app or changing termination behavior.

## Limits

This corrects the measurement scale, not exact Task Manager parity. Sampling
windows, CPU frequency/utility accounting, processor groups on large machines,
permissions and first-refresh baselines still need separate validation. A sum
of process readings is not asserted equal to global CPU. Missing native CPU
availability is still not represented independently by the existing schema.
