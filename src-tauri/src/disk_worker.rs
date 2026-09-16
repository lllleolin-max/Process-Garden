//! A single owned disk-provider thread, independent of the system sampling lock.
use crate::disk::DiskReading;
use crate::provider_worker::{Source, Worker, IDLE_RELEASE, RESPONSE_TIMEOUT};
use std::time::{Duration, Instant};

type Reading = Result<Vec<DiskReading>, String>;

#[derive(Clone)]
pub struct DiskReader {
    worker: Worker<Vec<DiskReading>>,
}

impl Default for DiskReader {
    fn default() -> Self {
        Self::start(NativeSource::default, IDLE_RELEASE)
    }
}

impl DiskReader {
    fn start<S: Source<Output = Vec<DiskReading>> + 'static>(
        factory: impl FnOnce() -> S + Send + 'static,
        idle: Duration,
    ) -> Self {
        Self {
            worker: Worker::start("disk", factory, idle),
        }
    }

    pub fn sample(&self, session: String) -> Reading {
        self.worker.sample(session, RESPONSE_TIMEOUT)
    }

    #[cfg(test)]
    fn sample_timeout(&self, session: String, timeout: Duration) -> Reading {
        self.worker.sample(session, timeout)
    }
}

#[cfg(windows)]
#[derive(Default)]
struct NativeSource {
    query: Option<crate::disk::PhysicalDiskQuery>,
    session: String,
    retry_after: Option<Instant>,
}

#[cfg(windows)]
impl Source for NativeSource {
    type Output = Vec<DiskReading>;
    fn sample(&mut self, session: &str, deadline: Instant) -> Reading {
        if self.session != session {
            self.query = None;
            self.session = session.into();
            // Session churn cannot bypass a failed provider's backoff.
        }
        if self.retry_after.is_some_and(|retry| Instant::now() < retry) {
            return Err("disk counters temporarily unavailable".into());
        }
        if self.query.is_none() {
            match crate::disk::PhysicalDiskQuery::open() {
                Ok(query) => {
                    self.query = Some(query);
                    self.retry_after = None;
                }
                Err(status) => {
                    self.retry_after = Some(Instant::now() + Duration::from_secs(5));
                    return Err(format!("disk counters unavailable (0x{status:08x})"));
                }
            }
        }
        if Instant::now() >= deadline {
            return Err("disk request expired during initialization".into());
        }
        self.query
            .as_mut()
            .expect("query initialized")
            .sample()
            .map_err(|status| format!("disk reading unavailable (0x{status:08x})"))
    }
    fn reset(&mut self) {
        self.query = None;
        self.session.clear();
        self.retry_after = None;
    }
}

#[cfg(not(windows))]
#[derive(Default)]
struct NativeSource;
#[cfg(not(windows))]
impl Source for NativeSource {
    type Output = Vec<DiskReading>;
    fn sample(&mut self, _: &str, _: Instant) -> Reading {
        Err("physical disk counters unsupported on this platform".into())
    }
    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        mpsc, Arc,
    };

    struct FakeSource {
        entered: mpsc::Sender<String>,
        release: mpsc::Receiver<()>,
        reset: mpsc::Sender<()>,
        dropped: mpsc::Sender<()>,
        calls: Arc<AtomicUsize>,
    }
    impl Source for FakeSource {
        type Output = Vec<DiskReading>;
        fn sample(&mut self, session: &str, _: Instant) -> Reading {
            self.calls.fetch_add(1, Ordering::SeqCst);
            self.entered.send(session.to_owned()).unwrap();
            self.release.recv().unwrap();
            Ok(vec![])
        }
        fn reset(&mut self) {
            let _ = self.reset.send(());
        }
    }
    impl Drop for FakeSource {
        fn drop(&mut self) {
            let _ = self.dropped.send(());
        }
    }

    fn fixture(
        idle: Duration,
    ) -> (
        DiskReader,
        mpsc::Receiver<String>,
        mpsc::Sender<()>,
        mpsc::Receiver<()>,
        mpsc::Receiver<()>,
        Arc<AtomicUsize>,
    ) {
        let (entered, entrances) = mpsc::channel();
        let (release, released) = mpsc::channel();
        let (reset, resets) = mpsc::channel();
        let (dropped, drops) = mpsc::channel();
        let calls = Arc::new(AtomicUsize::new(0));
        let counter = calls.clone();
        let reader = DiskReader::start(
            move || FakeSource {
                entered,
                release: released,
                reset,
                dropped,
                calls: counter,
            },
            idle,
        );
        (reader, entrances, release, resets, drops, calls)
    }

    #[test]
    fn timeout_does_not_spawn_or_queue_another_provider_call() {
        let (reader, entered, release, _, dropped, calls) = fixture(Duration::from_secs(15));
        let first = reader.clone();
        let caller = std::thread::spawn(move || {
            first.sample_timeout("first".into(), Duration::from_millis(200))
        });
        assert_eq!(
            entered.recv_timeout(Duration::from_secs(2)).unwrap(),
            "first"
        );
        assert_eq!(
            reader.sample("second".into()).unwrap_err(),
            "disk query already in progress"
        );
        assert_eq!(caller.join().unwrap().unwrap_err(), "disk query timed out");
        assert_eq!(
            reader.sample("second".into()).unwrap_err(),
            "disk query already in progress"
        );
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        release.send(()).unwrap();
        drop(reader);
        dropped
            .recv_timeout(Duration::from_secs(2))
            .expect("worker exits after outstanding read finishes");
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn idle_releases_source_and_clones_share_the_single_worker() {
        let (reader, entered, release, resets, dropped, calls) = fixture(Duration::from_millis(20));
        assert!(
            entered.try_recv().is_err(),
            "no automatic disk query at startup"
        );
        for session in ["first", "second"] {
            let clone = reader.clone();
            let owned = session.to_owned();
            let caller = std::thread::spawn(move || clone.sample(owned));
            assert_eq!(
                entered.recv_timeout(Duration::from_secs(2)).unwrap(),
                session
            );
            release.send(()).unwrap();
            assert!(caller.join().unwrap().unwrap().is_empty());
            resets
                .recv_timeout(Duration::from_secs(2))
                .expect("idle source reset");
        }
        assert_eq!(calls.load(Ordering::SeqCst), 2);
        drop(reader);
        dropped
            .recv_timeout(Duration::from_secs(2))
            .expect("channel closes when all readers drop");
    }

    #[test]
    fn invalid_sessions_do_not_touch_the_provider() {
        let (reader, entered, _, _, dropped, calls) = fixture(Duration::from_secs(15));
        for session in [
            String::new(),
            "x".repeat(129),
            "bad/session".into(),
            "含中文".into(),
        ] {
            assert_eq!(reader.sample(session).unwrap_err(), "invalid disk session");
        }
        assert!(entered.try_recv().is_err());
        assert_eq!(calls.load(Ordering::SeqCst), 0);
        drop(reader);
        dropped.recv_timeout(Duration::from_secs(2)).unwrap();
    }

    #[test]
    fn completed_responses_release_admission_before_the_next_call() {
        struct Immediate;
        impl Source for Immediate {
            type Output = Vec<DiskReading>;
            fn sample(&mut self, _: &str, _: Instant) -> Reading {
                Ok(vec![])
            }
            fn reset(&mut self) {}
        }
        let reader = DiskReader::start(|| Immediate, Duration::from_secs(15));
        for _ in 0..100 {
            assert!(reader.sample("same-session".into()).unwrap().is_empty());
            assert!(!reader.worker.busy.load(Ordering::Acquire));
        }
    }

    #[test]
    fn blocked_disk_provider_does_not_prevent_real_system_sampling() {
        let (reader, entered, release, _, dropped, _) = fixture(Duration::from_secs(15));
        let client = reader.clone();
        let caller = std::thread::spawn(move || {
            client.sample_timeout("blocked".into(), Duration::from_secs(10))
        });
        entered
            .recv_timeout(Duration::from_secs(2))
            .expect("disk provider entered and waiting on release");
        let collector = crate::collector::SystemCollector::default();
        let snapshot = crate::collector::sample(&collector)
            .expect("system sample completes while disk provider is still blocked");
        assert!(snapshot.memory_total_bytes > 0);
        assert!(snapshot.logical_cpu_count > 0);
        assert!(reader.worker.busy.load(Ordering::Acquire));
        release.send(()).unwrap();
        assert!(caller.join().unwrap().unwrap().is_empty());
        drop(reader);
        dropped.recv_timeout(Duration::from_secs(2)).unwrap();
    }

    #[cfg(windows)]
    #[test]
    #[ignore = "explicit read-only multi-sample native disk continuity probe"]
    fn native_disk_worker_continuity_probe() {
        let reader = DiskReader::default();
        let _ = reader.sample("continuity-probe".into());
        let mut durations = Vec::new();
        for _ in 0..8 {
            std::thread::sleep(Duration::from_millis(1100));
            let started = Instant::now();
            let rows = reader
                .sample("continuity-probe".into())
                .expect("continuing native disk sample");
            durations.push(started.elapsed().as_secs_f64() * 1000.0);
            assert!(!rows.is_empty());
            assert!(rows
                .iter()
                .any(|row| row.read_bytes_per_second.is_some()
                    && row.write_bytes_per_second.is_some()));
        }
        // A new observation session must not reuse the old rate baseline.
        if let Ok(rows) = reader.sample("new-session".into()) {
            assert!(rows.iter().all(|row| row.read_bytes_per_second.is_none()
                && row.write_bytes_per_second.is_none()
                && row.active_percent.is_none()));
        }
        durations.sort_by(f64::total_cmp);
        eprintln!("disk continuity probe: 8 consecutive samples, median {:.3}ms, max {:.3}ms (debug; short probe, not long-run acceptance)",
            (durations[3] + durations[4]) / 2.0, durations[7]);
    }

    #[test]
    fn expired_queued_work_is_discarded_before_touching_the_source() {
        let (ready, begun) = mpsc::channel();
        let (release, released) = mpsc::channel();
        let (dropped, drops) = mpsc::channel();
        let calls = Arc::new(AtomicUsize::new(0));
        let counter = calls.clone();
        struct CountSource(Arc<AtomicUsize>, mpsc::Sender<()>);
        impl Drop for CountSource {
            fn drop(&mut self) {
                let _ = self.1.send(());
            }
        }
        impl Source for CountSource {
            type Output = Vec<DiskReading>;
            fn sample(&mut self, _: &str, _: Instant) -> Reading {
                self.0.fetch_add(1, Ordering::SeqCst);
                Ok(vec![])
            }
            fn reset(&mut self) {}
        }
        let reader = DiskReader::start(
            move || {
                ready.send(()).unwrap();
                released.recv().unwrap();
                CountSource(counter, dropped)
            },
            Duration::from_secs(15),
        );
        begun.recv_timeout(Duration::from_secs(2)).unwrap();
        assert_eq!(
            reader
                .sample_timeout("expired".into(), Duration::from_millis(10))
                .unwrap_err(),
            "disk query timed out"
        );
        assert!(reader.worker.busy.load(Ordering::Acquire));
        release.send(()).unwrap();
        // A channel barrier on the worker's ownership teardown avoids guessing
        // how long scheduling the expired request should take.
        let busy = reader.worker.busy.clone();
        drop(reader);
        drops.recv_timeout(Duration::from_secs(2)).unwrap();
        assert!(!busy.load(Ordering::Acquire));
        assert_eq!(calls.load(Ordering::SeqCst), 0);
    }

    #[cfg(windows)]
    #[test]
    #[ignore = "explicit read-only native disk worker probe"]
    fn native_disk_worker_probe() {
        let reader = DiskReader::default();
        let started = Instant::now();
        let first = reader.sample("native-probe".into());
        let first_ms = started.elapsed().as_secs_f64() * 1000.0;
        if let Ok(rows) = first {
            assert!(rows
                .iter()
                .all(|row| row.read_bytes_per_second.is_none()
                    && row.write_bytes_per_second.is_none()));
        }
        std::thread::sleep(Duration::from_millis(1100));
        let started = Instant::now();
        let rows = reader
            .sample("native-probe".into())
            .expect("worker returns native readings");
        assert!(!rows.is_empty());
        assert!(
            rows.iter()
                .any(|row| row.read_bytes_per_second.is_some()
                    && row.write_bytes_per_second.is_some())
        );
        eprintln!(
            "disk worker probe: {} instances; first response {:.3}ms; second response {:.3}ms",
            rows.len(),
            first_ms,
            started.elapsed().as_secs_f64() * 1000.0
        );
    }
}
