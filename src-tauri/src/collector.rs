use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use sysinfo::{CpuRefreshKind, ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System, UpdateKind};

use crate::models::{ProcessSnapshot, SystemSnapshot};
use crate::power::PowerSampler;

fn process_refresh_kind() -> ProcessRefreshKind {
    ProcessRefreshKind::nothing()
        .with_cpu()
        .with_memory()
        .with_exe(UpdateKind::OnlyIfNotSet)
}

// sysinfo 0.36 reports process CPU in logical-core units (one busy core =
// 100%). Expose the same whole-machine scale as global_cpu_usage instead.
fn machine_cpu_percent(core_percent: f32, logical_cpu_count: usize) -> f32 {
    (core_percent / logical_cpu_count.max(1) as f32).clamp(0.0, 100.0)
}

fn process_status(cpu_percent: f32) -> &'static str {
    if cpu_percent > 35.0 {
        "stressed"
    } else if cpu_percent < 0.1 {
        "idle"
    } else {
        "active"
    }
}

#[cfg(windows)]
fn thread_counts() -> Option<HashMap<u32, usize>> {
    use std::{mem::size_of, ptr};
    use windows_sys::Win32::{
        Foundation::{CloseHandle, GetLastError, ERROR_NO_MORE_FILES, INVALID_HANDLE_VALUE},
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Thread32First, Thread32Next, THREADENTRY32,
            TH32CS_SNAPTHREAD,
        },
    };

    let mut counts = HashMap::new();
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) };
    if snapshot == INVALID_HANDLE_VALUE {
        return None;
    }
    let mut entry: THREADENTRY32 = unsafe { std::mem::zeroed() };
    entry.dwSize = size_of::<THREADENTRY32>() as u32;
    let mut has_entry = unsafe { Thread32First(snapshot, ptr::addr_of_mut!(entry)) } != 0;
    while has_entry {
        if (entry.dwSize as usize) < std::mem::offset_of!(THREADENTRY32, th32OwnerProcessID) + size_of::<u32>() {
            unsafe { CloseHandle(snapshot) };
            return None;
        }
        *counts.entry(entry.th32OwnerProcessID).or_insert(0) += 1;
        entry.dwSize = size_of::<THREADENTRY32>() as u32;
        has_entry = unsafe { Thread32Next(snapshot, ptr::addr_of_mut!(entry)) } != 0;
    }
    // Capture immediately: CloseHandle must not replace the enumeration error.
    let complete = unsafe { GetLastError() } == ERROR_NO_MORE_FILES;
    unsafe { CloseHandle(snapshot) };
    complete.then_some(counts)
}

#[cfg(not(windows))]
fn thread_counts() -> Option<HashMap<u32, usize>> {
    None
}

#[derive(Clone)]
pub struct SystemCollector {
    system: Arc<Mutex<System>>,
    power: Arc<Mutex<PowerSampler>>,
}

impl Default for SystemCollector {
    fn default() -> Self {
        Self {
            // Do not ask sysinfo to collect unused environment/command-line
            // metadata at startup. Use the same narrow process profile on refresh.
            system: Arc::new(Mutex::new(System::new_with_specifics(
                RefreshKind::nothing()
                    .with_cpu(CpuRefreshKind::nothing().with_cpu_usage())
                    .with_processes(process_refresh_kind()),
            ))),
            power: Arc::new(Mutex::new(PowerSampler::default())),
        }
    }
}

pub fn sample(collector: &SystemCollector) -> Result<SystemSnapshot, String> {
    sample_observed(collector, |_| {})
}

// A monomorphized no-op observer keeps production free of clocks/logging;
// manual profiling exercises this same pipeline instead of a duplicate collector.
fn sample_observed(collector: &SystemCollector, mut observe: impl FnMut(&'static str)) -> Result<SystemSnapshot, String> {
    let mut system = collector
        .system
        .lock()
        .map_err(|_| "system collector lock poisoned".to_string())?;
    observe("lock");

    system.refresh_cpu_usage();
    system.refresh_memory();
    observe("system_cpu_memory");
    system.refresh_processes_specifics(ProcessesToUpdate::All, true, process_refresh_kind());
    observe("process_refresh");
    let threads = thread_counts();
    observe("thread_enumeration");
    let logical_cpu_count = system.cpus().len();

    let mut processes = system
        .processes()
        .iter()
        .map(|(pid, process)| {
            let cpu_percent = machine_cpu_percent(process.cpu_usage(), logical_cpu_count);
            ProcessSnapshot {
                pid: pid.as_u32(),
                parent_pid: process.parent().map(|parent| parent.as_u32()),
                name: process.name().to_string_lossy().into_owned(),
                cpu_percent,
                memory_bytes: process.memory(),
                started_at: process.start_time(),
                status: process_status(cpu_percent),
                thread_count: threads.as_ref().and_then(|counts| counts.get(&pid.as_u32()).copied()),
                executable_path: process.exe().map(|path| path.to_string_lossy().into_owned()),
            }
        })
        .collect::<Vec<_>>();

    processes.sort_by(|left, right| {
        right
            .cpu_percent
            .partial_cmp(&left.cpu_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| right.memory_bytes.cmp(&left.memory_bytes))
    });
    // Keep the complete enumerated table. Presentation limits belong to the
    // ecological view / paginated process explorer, never to native telemetry.
    observe("records_and_sort");

    let power = collector.power.lock().map(|mut sampler| sampler.sample()).unwrap_or_default();
    observe("power");

    Ok(SystemSnapshot {
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_millis() as u64,
        cpu_percent: system.global_cpu_usage(),
        memory_used_bytes: system.used_memory(),
        memory_total_bytes: system.total_memory(),
        process_count: system.processes().len(),
        thread_count: threads.as_ref().map(|counts| counts.values().sum()),
        logical_cpu_count,
        uptime_seconds: System::uptime(),
        power,
        processes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn process_profile_excludes_unused_sensitive_metadata() {
        let profile = process_refresh_kind();
        assert!(profile.cpu());
        assert!(profile.memory());
        assert_eq!(profile.exe(), UpdateKind::OnlyIfNotSet);
        assert_eq!(profile.cmd(), UpdateKind::Never);
        assert_eq!(profile.environ(), UpdateKind::Never);
        assert_eq!(profile.cwd(), UpdateKind::Never);
        assert_eq!(profile.root(), UpdateKind::Never);
        assert!(!profile.disk_usage());
    }

    #[cfg(windows)]
    #[test]
    fn real_thread_enumeration_has_a_complete_nonempty_result() {
        let counts = thread_counts().expect("normal host thread enumeration completes");
        assert!(!counts.is_empty());
        assert!(counts.values().all(|count| *count > 0));
        assert!(counts.values().sum::<usize>() >= counts.len());
        println!("Thread enumeration: {} process entries, {} threads", counts.len(), counts.values().sum::<usize>());
    }

    #[test]
    fn process_cpu_uses_whole_machine_capacity() {
        assert_eq!(machine_cpu_percent(100.0, 8), 12.5);
        assert_eq!(machine_cpu_percent(800.0, 8), 100.0);
        assert_eq!(machine_cpu_percent(0.0, 8), 0.0);
        assert_eq!(machine_cpu_percent(50.0, 1), 50.0);
        assert_eq!(machine_cpu_percent(50.0, 0), 50.0);
        assert_eq!(machine_cpu_percent(900.0, 8), 100.0);
        assert_eq!(machine_cpu_percent(-1.0, 8), 0.0);
        assert_eq!(process_status(machine_cpu_percent(100.0, 8)), "active");
    }

    #[test]
    fn maps_cpu_load_to_stable_lifecycle_status() {
        assert_eq!(process_status(0.0), "idle");
        assert_eq!(process_status(8.0), "active");
        assert_eq!(process_status(50.0), "stressed");
    }

    #[test]
    fn cloned_collectors_share_the_same_sampling_state() {
        let collector = SystemCollector {
            system: Arc::new(Mutex::new(System::new())),
            power: Arc::new(Mutex::new(PowerSampler::default())),
        };
        let worker_collector = collector.clone();
        assert!(Arc::ptr_eq(&collector.system, &worker_collector.system));
        assert!(Arc::ptr_eq(&collector.power, &worker_collector.power));

        // A worker clone must synchronize against the same process history and
        // CPU baseline, rather than refreshing an independent System instance.
        let _sampling = collector.system.lock().expect("collector lock is available");
        assert!(matches!(worker_collector.system.try_lock(), Err(std::sync::TryLockError::WouldBlock)));
    }

    #[test]
    fn samples_real_system_data() {
        let collector = SystemCollector::default();
        let snapshot = sample(&collector).expect("system sampling succeeds");
        assert!(snapshot.memory_total_bytes > 0);
        assert!(snapshot.logical_cpu_count > 0);
        assert!(snapshot.process_count > 0);
        assert!(!snapshot.processes.is_empty());
        assert_eq!(snapshot.processes.len(), snapshot.process_count);
        let system = collector.system.lock().expect("collector lock is available");
        for process in &snapshot.processes {
            let raw = &system.processes()[&sysinfo::Pid::from_u32(process.pid)];
            assert!(raw.cmd().is_empty(), "unused command lines must not be collected");
            assert!(raw.environ().is_empty(), "unused environments must not be collected");
            let expected_cpu = machine_cpu_percent(raw.cpu_usage(), snapshot.logical_cpu_count);
            assert_eq!(process.cpu_percent, expected_cpu);
            assert_eq!(process.status, process_status(expected_cpu));
            assert!((0.0..=100.0).contains(&process.cpu_percent));
        }
        let mut expected = system.processes().keys().map(|pid| pid.as_u32()).collect::<Vec<_>>();
        let mut returned = snapshot.processes.iter().map(|process| process.pid).collect::<Vec<_>>();
        expected.sort_unstable();
        returned.sort_unstable();
        assert_eq!(returned, expected, "every enumerated PID must reach the frontend");
        println!("Native coverage: {} enumerated, {} returned", expected.len(), returned.len());
    }

    #[test]
    #[ignore = "manual host-dependent sampling profile; not a CI performance threshold"]
    fn profile_native_sampling_cost() {
        use std::time::{Duration, Instant};
        let started = Instant::now();
        let collector = SystemCollector::default();
        let initialization_ms = started.elapsed().as_secs_f64() * 1000.0;
        sample(&collector).expect("warm-up succeeds");
        let mut collect_ms = Vec::new();
        let mut serialize_ms = Vec::new();
        let mut sizes = Vec::new();
        let mut process_counts = Vec::new();
        let mut stages: std::collections::BTreeMap<&str, Vec<f64>> = std::collections::BTreeMap::new();
        for _ in 0..24 {
            std::thread::sleep(Duration::from_millis(250));
            let started = Instant::now();
            let mut checkpoint = started;
            let snapshot = sample_observed(&collector, |stage| {
                let now = Instant::now();
                stages.entry(stage).or_default().push(now.duration_since(checkpoint).as_secs_f64() * 1000.0);
                checkpoint = Instant::now();
            }).expect("profile sample succeeds");
            collect_ms.push(started.elapsed().as_secs_f64() * 1000.0);
            assert_eq!(snapshot.processes.len(), snapshot.process_count);
            process_counts.push(snapshot.process_count);
            let started = Instant::now();
            let payload = serde_json::to_vec(&snapshot).expect("snapshot serializes");
            serialize_ms.push(started.elapsed().as_secs_f64() * 1000.0);
            sizes.push(payload.len());
        }
        collect_ms.sort_by(f64::total_cmp);
        serialize_ms.sort_by(f64::total_cmp);
        let profile = if cfg!(debug_assertions) { "debug" } else { "release" };
        println!("profile={profile}; samples=24; idle_between_ms=250; initialization_ms={initialization_ms:.3}");
        println!("collect_ms median={:.3} p95={:.3} max={:.3}", (collect_ms[11] + collect_ms[12]) / 2.0, collect_ms[22], collect_ms[23]);
        println!("serialize_ms median={:.3} p95={:.3} max={:.3}", (serialize_ms[11] + serialize_ms[12]) / 2.0, serialize_ms[22], serialize_ms[23]);
        println!("processes min={} max={}; json_bytes min={} max={}", process_counts.iter().min().unwrap(), process_counts.iter().max().unwrap(), sizes.iter().min().unwrap(), sizes.iter().max().unwrap());
        for (stage, mut values) in stages {
            values.sort_by(f64::total_cmp);
            println!("stage={stage} median_ms={:.3} p95_ms={:.3} max_ms={:.3}", (values[11] + values[12]) / 2.0, values[22], values[23]);
        }
    }

    #[cfg(windows)]
    #[test]
    #[ignore = "manual comparison of native thread-count APIs"]
    fn compare_thread_count_sources() {
        use std::{mem::size_of, time::Instant};
        use windows_sys::Win32::{
            Foundation::{CloseHandle, GetLastError, ERROR_NO_MORE_FILES, INVALID_HANDLE_VALUE},
            System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS},
        };
        let mut process_times = Vec::new();
        let mut thread_times = Vec::new();
        let mut shared = 0;
        let mut equal = 0;
        let mut own_equal = 0;
        let mut missing_from_process = 0;
        for iteration in 0..20 {
            let read_process_counts = || {
                let started = Instant::now();
                let handle = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
                assert_ne!(handle, INVALID_HANDLE_VALUE);
                let mut entry: PROCESSENTRY32W = unsafe { std::mem::zeroed() };
                entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;
                let mut counts = HashMap::new();
                let mut present = unsafe { Process32FirstW(handle, &mut entry) } != 0;
                while present {
                    counts.insert(entry.th32ProcessID, entry.cntThreads as usize);
                    present = unsafe { Process32NextW(handle, &mut entry) } != 0;
                }
                let complete = unsafe { GetLastError() } == ERROR_NO_MORE_FILES;
                unsafe { CloseHandle(handle) };
                assert!(complete);
                (counts, started.elapsed().as_secs_f64() * 1000.0)
            };
            let read_thread_counts = || {
                let started = Instant::now();
                let counts = thread_counts().expect("thread walk completes");
                (counts, started.elapsed().as_secs_f64() * 1000.0)
            };
            // Alternate order; separate snapshots can legitimately differ under churn.
            let ((processes, process_ms), (threads, thread_ms)) = if iteration % 2 == 0 {
                let processes = read_process_counts();
                (processes, read_thread_counts())
            } else {
                let threads = read_thread_counts();
                (read_process_counts(), threads)
            };
            process_times.push(process_ms);
            thread_times.push(thread_ms);
            for (pid, count) in &threads {
                if let Some(other) = processes.get(pid) {
                    shared += 1;
                    equal += usize::from(count == other);
                } else { missing_from_process += 1; }
            }
            let own_pid = std::process::id();
            let own_process_count = processes.get(&own_pid).expect("current process in process snapshot");
            let own_thread_count = threads.get(&own_pid).expect("current process in thread snapshot");
            own_equal += usize::from(own_process_count == own_thread_count);
        }
        for (name, mut values) in [("process_snapshot", process_times), ("thread_walk", thread_times)] {
            values.sort_by(f64::total_cmp);
            println!("source={name} median_ms={:.3} p95_ms={:.3}", (values[9] + values[10]) / 2.0, values[18]);
        }
        println!("shared_records={shared} equal_counts={equal} current_process_equal_samples={own_equal}/20 thread_pids_missing_from_process={missing_from_process}");
    }
}
