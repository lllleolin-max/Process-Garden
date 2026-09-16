//! GPU query ownership is independent of CPU, process and physical-disk reads.
use super::grouping::GroupedSnapshot;
use crate::provider_worker::{Source, Worker, IDLE_RELEASE, RESPONSE_TIMEOUT};
use std::time::{Duration, Instant};

type Reading = Result<GroupedSnapshot, String>;

#[derive(Clone)]
pub struct GpuReader {
    worker: Worker<GroupedSnapshot>,
}

impl Default for GpuReader {
    fn default() -> Self {
        Self {
            worker: Worker::start("gpu", NativeSource::default, IDLE_RELEASE),
        }
    }
}

impl GpuReader {
    pub fn sample(&self, session: String) -> Reading {
        self.worker.sample(session, RESPONSE_TIMEOUT)
    }
}

#[cfg(windows)]
#[derive(Default)]
struct NativeSource {
    query: Option<super::GpuQuery>,
    session: String,
    retry_after: Option<Instant>,
}

#[cfg(windows)]
impl Source for NativeSource {
    type Output = GroupedSnapshot;
    fn sample(&mut self, session: &str, deadline: Instant) -> Reading {
        if self.session != session {
            self.query = None;
            self.session = session.into();
            // Reopening a view must not evade provider-failure backoff.
        }
        if self.retry_after.is_some_and(|retry| Instant::now() < retry) {
            return Err("gpu counters temporarily unavailable".into());
        }
        if self.query.is_none() {
            match super::GpuQuery::open() {
                Ok(query) => {
                    self.query = Some(query);
                    self.retry_after = None;
                }
                Err(status) => {
                    self.retry_after = Some(Instant::now() + Duration::from_secs(5));
                    return Err(format!("gpu counters unavailable (0x{status:08x})"));
                }
            }
        }
        if Instant::now() >= deadline {
            return Err("gpu request expired during initialization".into());
        }
        self.query
            .as_mut()
            .expect("query initialized")
            .sample()
            .map(|raw| raw.grouped())
            .map_err(|status| format!("gpu reading unavailable (0x{status:08x})"))
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
    type Output = GroupedSnapshot;
    fn sample(&mut self, _: &str, _: Instant) -> Reading {
        Err("GPU counters unsupported on this platform".into())
    }
    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gpu::GpuCounterSnapshot;
    use std::sync::{atomic::Ordering, mpsc};

    fn empty_snapshot() -> GroupedSnapshot {
        GpuCounterSnapshot {
            rate_baseline: false,
            engine_utilization: None,
            dedicated_bytes: None,
            shared_bytes: None,
        }
        .grouped()
    }

    #[test]
    fn blocked_gpu_does_not_prevent_system_or_other_provider_work() {
        struct Blocked {
            enter: mpsc::Sender<()>,
            release: mpsc::Receiver<()>,
            dropped: mpsc::Sender<()>,
            // Deliberately !Send: exercises thread-local provider construction.
            _local: std::rc::Rc<()>,
        }
        impl Source for Blocked {
            type Output = GroupedSnapshot;
            fn sample(&mut self, _: &str, _: Instant) -> Reading {
                self.enter.send(()).unwrap();
                self.release.recv().unwrap();
                Ok(empty_snapshot())
            }
            fn reset(&mut self) {}
        }
        impl Drop for Blocked {
            fn drop(&mut self) {
                let _ = self.dropped.send(());
            }
        }
        struct Immediate;
        impl Source for Immediate {
            type Output = usize;
            fn sample(&mut self, _: &str, _: Instant) -> Result<usize, String> {
                Ok(42)
            }
            fn reset(&mut self) {}
        }
        let (enter, entered) = mpsc::channel();
        let (release, released) = mpsc::channel();
        let (dropped, drops) = mpsc::channel();
        let gpu = GpuReader {
            worker: Worker::start(
                "gpu",
                move || Blocked {
                    enter,
                    release: released,
                    dropped,
                    _local: std::rc::Rc::new(()),
                },
                IDLE_RELEASE,
            ),
        };
        assert_eq!(
            gpu.sample("bad/session".into()).unwrap_err(),
            "invalid gpu session"
        );
        let clone = gpu.clone();
        let caller = std::thread::spawn(move || {
            clone
                .worker
                .sample("first".into(), Duration::from_millis(200))
        });
        entered.recv_timeout(Duration::from_secs(2)).unwrap();
        assert_eq!(caller.join().unwrap().unwrap_err(), "gpu query timed out");
        assert_eq!(
            gpu.sample("another".into()).unwrap_err(),
            "gpu query already in progress"
        );
        let other = Worker::start("other", || Immediate, IDLE_RELEASE);
        assert_eq!(other.sample("test".into(), RESPONSE_TIMEOUT).unwrap(), 42);
        let collector = crate::collector::SystemCollector::default();
        let system =
            crate::collector::sample(&collector).expect("CPU/process sampling remains independent");
        assert!(system.memory_total_bytes > 0);
        assert!(gpu.worker.busy.load(Ordering::Acquire));
        release.send(()).unwrap();
        drop(gpu);
        drops.recv_timeout(Duration::from_secs(2)).unwrap();
    }

    #[cfg(windows)]
    #[test]
    #[ignore = "explicit read-only GPU worker continuity and renewed-session probe"]
    fn native_gpu_worker_probe() {
        let reader = GpuReader::default();
        let started = Instant::now();
        let first = reader
            .sample("worker-probe".into())
            .expect("initial native GPU response");
        // PDH may withhold the entire rate counter until a second collection.
        // That is an unavailable baseline, not a zero or a worker failure.
        assert!(first.rate_baseline);
        assert!(first
            .adapters
            .iter()
            .flat_map(|adapter| &adapter.engines)
            .all(|engine| engine.observed_percent_sum.is_none()));
        let first_ms = started.elapsed().as_secs_f64() * 1000.0;
        let mut times = Vec::new();
        for _ in 0..4 {
            std::thread::sleep(Duration::from_millis(1100));
            let started = Instant::now();
            let result = reader
                .sample("worker-probe".into())
                .expect("native grouped GPU response");
            times.push(started.elapsed().as_secs_f64() * 1000.0);
            assert!(!result.adapters.is_empty());
            assert!(!result.rate_baseline);
            assert!(result.engine_coverage.available);
            assert_eq!(result.engine_coverage.unmapped_instances, 0);
            assert!(result
                .adapters
                .iter()
                .flat_map(|adapter| &adapter.engines)
                .any(|engine| engine.observed_percent_sum.is_some()));
        }
        let renewed = reader
            .sample("new-session".into())
            .expect("renewed native GPU response");
        assert!(renewed.rate_baseline);
        assert!(renewed
            .adapters
            .iter()
            .flat_map(|adapter| &adapter.engines)
            .all(|engine| engine.observed_percent_sum.is_none()));
        std::thread::sleep(Duration::from_millis(1100));
        let resumed = reader
            .sample("new-session".into())
            .expect("renewed session warms up");
        assert!(resumed.engine_coverage.available);
        assert!(!resumed.rate_baseline);
        assert!(resumed
            .adapters
            .iter()
            .flat_map(|adapter| &adapter.engines)
            .any(|engine| engine.observed_percent_sum.is_some()));
        times.sort_by(f64::total_cmp);
        eprintln!("GPU worker probe: first {:.3}ms; four responses median {:.3}ms/max {:.3}ms including grouping; renewed-session baseline checked; short debug probe, not workload parity",
            first_ms, (times[1]+times[2])/2.0, times[3]);
    }
}
