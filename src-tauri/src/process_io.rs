//! Rate calculation for explicitly successful native process I/O observations.
//! These are process I/O bytes, not a claim of physical-disk throughput.

use std::time::{Duration, Instant};

#[derive(Clone, Copy, Debug)]
pub struct IoCounterSample {
    pub pid: u32,
    /// Exact native creation-time ticks, read from the queried process handle.
    pub creation_ticks: u64,
    pub observed_at: Instant,
    pub read_bytes: u64,
    pub written_bytes: u64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct IoRates {
    pub read_bytes_per_second: f64,
    pub written_bytes_per_second: f64,
}

/// One selected process at a time; no unbounded PID cache or per-process scan.
pub struct IoRateTracker {
    previous: Option<IoCounterSample>,
    max_gap: Duration,
}

impl IoRateTracker {
    pub fn new(max_gap: Duration) -> Self {
        Self { previous: None, max_gap }
    }

    /// Pass None for any failed, unavailable or identity-invalid observation.
    /// The first successful sample after a break establishes a new baseline.
    pub fn observe(&mut self, sample: Option<IoCounterSample>) -> Option<IoRates> {
        let Some(current) = sample else {
            self.previous = None;
            return None;
        };
        let previous = self.previous.replace(current)?;
        if current.pid != previous.pid || current.creation_ticks != previous.creation_ticks {
            return None;
        }
        let elapsed = current.observed_at.checked_duration_since(previous.observed_at)?;
        if elapsed.is_zero() || elapsed > self.max_gap { return None; }
        // Subtract u64 counters before conversion: totals can exceed f64's
        // exact integer range even when the interval delta is only one byte.
        let read = current.read_bytes.checked_sub(previous.read_bytes)?;
        let written = current.written_bytes.checked_sub(previous.written_bytes)?;
        Some(IoRates {
            read_bytes_per_second: read as f64 / elapsed.as_secs_f64(),
            written_bytes_per_second: written as f64 / elapsed.as_secs_f64(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(at: Instant, read: u64, written: u64) -> IoCounterSample {
        IoCounterSample { pid: 42, creation_ticks: 123, observed_at: at, read_bytes: read, written_bytes: written }
    }

    #[test]
    fn uses_measured_elapsed_time_not_configured_interval() {
        let at = Instant::now();
        let mut tracker = IoRateTracker::new(Duration::from_secs(5));
        assert_eq!(tracker.observe(Some(sample(at, 9_000, 8_000))), None);
        assert_eq!(tracker.observe(Some(sample(at + Duration::from_millis(2500), 9_500, 9_000))),
            Some(IoRates { read_bytes_per_second: 200.0, written_bytes_per_second: 400.0 }));
    }

    #[test]
    fn failures_break_the_baseline_but_observed_idle_is_zero() {
        let at = Instant::now();
        let mut tracker = IoRateTracker::new(Duration::from_secs(5));
        tracker.observe(Some(sample(at, 100, 200)));
        assert_eq!(tracker.observe(None), None);
        assert_eq!(tracker.observe(Some(sample(at + Duration::from_secs(1), 999, 999))), None);
        assert_eq!(tracker.observe(Some(sample(at + Duration::from_secs(2), 999, 999))),
            Some(IoRates { read_bytes_per_second: 0.0, written_bytes_per_second: 0.0 }));
    }

    #[test]
    fn pid_reuse_and_selection_changes_start_new_baselines() {
        for same_pid in [true, false] {
            let at = Instant::now();
            let mut tracker = IoRateTracker::new(Duration::from_secs(5));
            tracker.observe(Some(sample(at, 100, 200)));
            let mut changed = sample(at + Duration::from_secs(1), 1000, 2000);
            if same_pid { changed.creation_ticks += 1; } else { changed.pid += 1; }
            assert_eq!(tracker.observe(Some(changed)), None);
            changed.observed_at += Duration::from_secs(1);
            changed.read_bytes += 7;
            assert_eq!(tracker.observe(Some(changed)).unwrap().read_bytes_per_second, 7.0);
        }
    }

    #[test]
    fn long_gaps_and_counter_rollbacks_do_not_create_spikes() {
        let at = Instant::now();
        let mut tracker = IoRateTracker::new(Duration::from_secs(5));
        tracker.observe(Some(sample(at, 100, 200)));
        assert_eq!(tracker.observe(Some(sample(at + Duration::from_secs(20), 10_000, 20_000))), None);
        assert_eq!(tracker.observe(Some(sample(at + Duration::from_secs(21), 1, 2))), None);
        assert_eq!(tracker.observe(Some(sample(at + Duration::from_secs(22), 2, 3))),
            Some(IoRates { read_bytes_per_second: 1.0, written_bytes_per_second: 1.0 }));
    }

    #[test]
    fn equal_or_reversed_times_never_divide_by_zero_or_replay_a_delta() {
        let at = Instant::now();
        let mut tracker = IoRateTracker::new(Duration::from_secs(5));
        tracker.observe(Some(sample(at + Duration::from_secs(1), 100, 100)));
        assert_eq!(tracker.observe(Some(sample(at + Duration::from_secs(1), 200, 200))), None);
        assert_eq!(tracker.observe(Some(sample(at, 300, 300))), None);
    }

    #[test]
    fn preserves_small_deltas_above_javascript_integer_precision() {
        let at = Instant::now();
        let mut tracker = IoRateTracker::new(Duration::from_secs(5));
        tracker.observe(Some(sample(at, u64::MAX - 1, u64::MAX - 3)));
        assert_eq!(tracker.observe(Some(sample(at + Duration::from_secs(1), u64::MAX, u64::MAX))),
            Some(IoRates { read_bytes_per_second: 1.0, written_bytes_per_second: 3.0 }));
    }
}
