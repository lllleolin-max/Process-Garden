//! Bounded ownership for potentially slow native providers. Each instance owns
//! one independent thread; provider handles never cross thread boundaries.
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc,
    },
    time::{Duration, Instant},
};

pub(crate) const RESPONSE_TIMEOUT: Duration = Duration::from_secs(4);
pub(crate) const IDLE_RELEASE: Duration = Duration::from_secs(15);

pub(crate) trait Source {
    type Output: Send + 'static;
    fn sample(&mut self, session: &str, deadline: Instant) -> Result<Self::Output, String>;
    fn reset(&mut self);
}

struct Permit(Arc<AtomicBool>);
impl Drop for Permit {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}

struct Request<T> {
    session: String,
    deadline: Instant,
    reply: mpsc::SyncSender<Result<T, String>>,
    // Timeout of the caller must NOT release admission while native work runs.
    permit: Permit,
}

pub(crate) struct Worker<T> {
    sender: Option<mpsc::SyncSender<Request<T>>>,
    pub(crate) busy: Arc<AtomicBool>,
    label: &'static str,
}

impl<T> Clone for Worker<T> {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
            busy: self.busy.clone(),
            label: self.label,
        }
    }
}

impl<T: Send + 'static> Worker<T> {
    pub(crate) fn start<S: Source<Output = T> + 'static>(
        label: &'static str,
        factory: impl FnOnce() -> S + Send + 'static,
        idle: Duration,
    ) -> Self {
        let (sender, receiver) = mpsc::sync_channel::<Request<T>>(1);
        let busy = Arc::new(AtomicBool::new(false));
        let started = std::thread::Builder::new()
            .name(format!("process-garden-{label}"))
            .spawn(move || {
                // S need not be Send: construct, use and drop it on this thread.
                let mut source = factory();
                let mut active = false;
                loop {
                    let request = if active {
                        match receiver.recv_timeout(idle) {
                            Ok(request) => request,
                            Err(mpsc::RecvTimeoutError::Timeout) => {
                                source.reset();
                                active = false;
                                continue;
                            }
                            Err(mpsc::RecvTimeoutError::Disconnected) => break,
                        }
                    } else {
                        match receiver.recv() {
                            Ok(request) => request,
                            Err(_) => break,
                        }
                    };
                    let result = if Instant::now() >= request.deadline {
                        Err(format!("{label} request expired before collection"))
                    } else {
                        active = true;
                        source.sample(&request.session, request.deadline)
                    };
                    // Provider is finished. Admit the next call before publishing
                    // completion; a late response must not block this thread.
                    drop(request.permit);
                    let _ = request.reply.try_send(result);
                }
            });
        Self {
            sender: started.ok().map(|_| sender),
            busy,
            label,
        }
    }

    pub(crate) fn sample(&self, session: String, timeout: Duration) -> Result<T, String> {
        let label = self.label;
        if session.is_empty()
            || session.len() > 128
            || !session
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
        {
            return Err(format!("invalid {label} session"));
        }
        let sender = self
            .sender
            .as_ref()
            .ok_or_else(|| format!("{label} worker unavailable"))?;
        self.busy
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map_err(|_| format!("{label} query already in progress"))?;
        let permit = Permit(self.busy.clone());
        let (reply, response) = mpsc::sync_channel(1);
        sender
            .try_send(Request {
                session,
                deadline: Instant::now() + timeout,
                reply,
                permit,
            })
            .map_err(|_| format!("{label} worker unavailable"))?;
        response
            .recv_timeout(timeout)
            .map_err(|error| match error {
                mpsc::RecvTimeoutError::Timeout => format!("{label} query timed out"),
                mpsc::RecvTimeoutError::Disconnected => format!("{label} worker disconnected"),
            })?
    }
}
