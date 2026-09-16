//! Independent admission channel for read-only SCM requests.
use super::ServiceReading;
use crate::provider_worker::{Source, Worker, IDLE_RELEASE, RESPONSE_TIMEOUT};
use std::time::Instant;

#[derive(Clone)]
pub struct ServiceReader {
    worker: Worker<Vec<ServiceReading>>,
}

impl Default for ServiceReader {
    fn default() -> Self {
        Self { worker: Worker::start("services", || NativeSource, IDLE_RELEASE) }
    }
}

impl ServiceReader {
    pub fn sample(&self, session: String) -> Result<Vec<ServiceReading>, String> {
        self.worker.sample(session, RESPONSE_TIMEOUT)
    }
}

struct NativeSource;
impl Source for NativeSource {
    type Output = Vec<ServiceReading>;
    fn sample(&mut self, _session: &str, deadline: Instant) -> Result<Self::Output, String> {
        #[cfg(windows)]
        { super::enumerate(deadline) }
        #[cfg(not(windows))]
        { let _ = deadline; Err("Windows service enumeration unavailable on this platform".into()) }
    }
    // Every enumeration owns and drops its own SCM handle, including failures.
    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{sync::mpsc, time::Duration};

    struct BlockedSource { entered: mpsc::Sender<()>, release: mpsc::Receiver<()> }
    impl Source for BlockedSource {
        type Output = Vec<ServiceReading>;
        fn sample(&mut self, _: &str, _: Instant) -> Result<Self::Output, String> {
            self.entered.send(()).unwrap();
            self.release.recv_timeout(Duration::from_secs(5)).unwrap();
            Ok(vec![])
        }
        fn reset(&mut self) {}
    }

    #[test]
    fn timeout_keeps_admission_held_until_provider_returns() {
        let (entered, events) = mpsc::channel();
        let (release, gate) = mpsc::channel();
        let reader = ServiceReader { worker: Worker::start("services", || BlockedSource { entered, release: gate }, IDLE_RELEASE) };
        let other = reader.clone();
        let request = std::thread::spawn(move || other.worker.sample("first".into(), Duration::from_millis(200)));
        events.recv_timeout(Duration::from_secs(2)).unwrap();
        assert!(reader.sample("overlap".into()).unwrap_err().contains("already in progress"));
        assert!(request.join().unwrap().unwrap_err().contains("timed out"));
        assert!(reader.sample("after-timeout".into()).unwrap_err().contains("already in progress"));
        release.send(()).unwrap();
        drop(reader);
    }

    #[test]
    fn invalid_sessions_do_not_reach_the_provider() {
        let (entered, events) = mpsc::channel();
        let (_release, gate) = mpsc::channel();
        let reader = ServiceReader { worker: Worker::start("services", || BlockedSource { entered, release: gate }, IDLE_RELEASE) };
        assert!(reader.sample(String::new()).unwrap_err().contains("invalid"));
        assert!(reader.sample("bad session".into()).unwrap_err().contains("invalid"));
        assert!(events.try_recv().is_err());
    }

    #[test]
    #[cfg(windows)]
    #[ignore = "explicit read-only service worker probe"]
    fn native_service_worker_probe() {
        let reader = ServiceReader::default();
        let start = Instant::now();
        let rows = reader.sample("native-probe".into()).unwrap();
        assert!(!rows.is_empty());
        println!("service worker returned {} accessible rows in {:?}", rows.len(), start.elapsed());
        assert!(!reader.sample("renewed-session".into()).unwrap().is_empty());
    }
}
