//! Rate calculation for explicitly successful native process I/O observations.
//! These are process I/O bytes, not a claim of physical-disk throughput.

use std::time::{Duration, Instant};

/// Read-only, on-demand observation. The optional exact creation token comes
/// from a previous observation, never from rounding FILETIME through JavaScript.
#[cfg(windows)]
pub fn read_process_io(pid: u32, expected_creation_ticks: Option<u64>) -> std::io::Result<IoCounterSample> {
    use windows_sys::Win32::{
        Foundation::{CloseHandle, FILETIME, HANDLE},
        System::Threading::{GetProcessIoCounters, GetProcessTimes, OpenProcess, IO_COUNTERS, PROCESS_QUERY_LIMITED_INFORMATION},
    };
    struct ProcessHandle(HANDLE);
    impl Drop for ProcessHandle {
        fn drop(&mut self) { unsafe { CloseHandle(self.0); } }
    }
    // No VM reads, mutation rights, privilege changes or elevation fallback.
    let raw = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if raw.is_null() { return Err(std::io::Error::last_os_error()); }
    let handle = ProcessHandle(raw);
    let mut creation = FILETIME::default();
    let mut exit = FILETIME::default();
    let mut kernel = FILETIME::default();
    let mut user = FILETIME::default();
    if unsafe { GetProcessTimes(handle.0, &mut creation, &mut exit, &mut kernel, &mut user) } == 0 {
        return Err(std::io::Error::last_os_error());
    }
    let creation_ticks = ((creation.dwHighDateTime as u64) << 32) | creation.dwLowDateTime as u64;
    if expected_creation_ticks.is_some_and(|expected| expected != creation_ticks) {
        return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "process lifetime changed"));
    }
    let mut counters = IO_COUNTERS::default();
    if unsafe { GetProcessIoCounters(handle.0, &mut counters) } == 0 {
        return Err(std::io::Error::last_os_error());
    }
    Ok(IoCounterSample {
        pid, creation_ticks, observed_at: Instant::now(),
        read_bytes: counters.ReadTransferCount,
        written_bytes: counters.WriteTransferCount,
    })
}

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

    #[cfg(windows)]
    #[test]
    fn reads_own_process_with_an_exact_lifetime_and_rejects_mismatches() {
        let pid = std::process::id();
        let first = read_process_io(pid, None).expect("own process is queryable");
        assert_eq!(first.pid, pid);
        assert!(first.creation_ticks > 0);
        let next = read_process_io(pid, Some(first.creation_ticks)).expect("same lifetime");
        assert!(next.read_bytes >= first.read_bytes);
        assert!(next.written_bytes >= first.written_bytes);
        assert!(next.observed_at >= first.observed_at);
        let wrong = read_process_io(pid, Some(first.creation_ticks + 1)).unwrap_err();
        assert_eq!(wrong.kind(), std::io::ErrorKind::InvalidData);
        assert!(read_process_io(0, None).is_err(), "an invalid query must not become an idle sample");
    }

    #[cfg(windows)]
    #[test]
    #[ignore = "manual controlled own-process IO and host-dependent query profile; run alone"]
    fn controlled_file_io_and_query_cost() {
        use std::{fs::OpenOptions, io::{Read, Seek, SeekFrom, Write}, os::windows::fs::OpenOptionsExt};
        use windows_sys::Win32::Storage::FileSystem::FILE_FLAG_DELETE_ON_CLOSE;
        let pid = std::process::id();
        let nonce = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let path = std::env::temp_dir().join(format!("process-garden-io-test-{pid}-{nonce}.tmp"));
        // Never truncate existing files; Windows deletes only this newly
        // created fixture when its handle closes, including during unwinding.
        let mut file = OpenOptions::new().read(true).write(true).create_new(true)
            .custom_flags(FILE_FLAG_DELETE_ON_CLOSE).open(&path).expect("create dedicated fixture");
        let payload = vec![0x5a; 256 * 1024];
        let before = read_process_io(pid, None).unwrap();
        file.write_all(&payload).unwrap();
        file.sync_all().unwrap();
        let after_write = read_process_io(pid, Some(before.creation_ticks)).unwrap();
        assert!(after_write.written_bytes - before.written_bytes >= payload.len() as u64);
        file.seek(SeekFrom::Start(0)).unwrap();
        let mut received = vec![0; payload.len()];
        file.read_exact(&mut received).unwrap();
        let after_read = read_process_io(pid, Some(before.creation_ticks)).unwrap();
        assert_eq!(received, payload);
        assert!(after_read.read_bytes - after_write.read_bytes >= payload.len() as u64);
        drop(file);
        assert!(!path.exists(), "dedicated fixture was deleted on close");

        let mut durations = Vec::with_capacity(128);
        for _ in 0..128 {
            let start = Instant::now();
            read_process_io(pid, Some(before.creation_ticks)).unwrap();
            durations.push(start.elapsed().as_secs_f64() * 1000.0);
        }
        durations.sort_by(f64::total_cmp);
        println!("own_process_io: read_delta={}B write_delta={}B samples=128 query_ms median={:.4} p95={:.4}",
            after_read.read_bytes - after_write.read_bytes,
            after_write.written_bytes - before.written_bytes, durations[64], durations[121]);
    }

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
