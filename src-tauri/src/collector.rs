use std::{
    collections::HashMap,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use sysinfo::{ProcessesToUpdate, System};

use crate::models::{ProcessSnapshot, SystemSnapshot};

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
fn thread_counts() -> HashMap<u32, usize> {
    use std::{mem::size_of, ptr};
    use windows_sys::Win32::{
        Foundation::{CloseHandle, INVALID_HANDLE_VALUE},
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Thread32First, Thread32Next, THREADENTRY32,
            TH32CS_SNAPTHREAD,
        },
    };

    let mut counts = HashMap::new();
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) };
    if snapshot == INVALID_HANDLE_VALUE {
        return counts;
    }
    let mut entry: THREADENTRY32 = unsafe { std::mem::zeroed() };
    entry.dwSize = size_of::<THREADENTRY32>() as u32;
    let mut has_entry = unsafe { Thread32First(snapshot, ptr::addr_of_mut!(entry)) } != 0;
    while has_entry {
        *counts.entry(entry.th32OwnerProcessID).or_insert(0) += 1;
        has_entry = unsafe { Thread32Next(snapshot, ptr::addr_of_mut!(entry)) } != 0;
    }
    unsafe { CloseHandle(snapshot) };
    counts
}

#[cfg(not(windows))]
fn thread_counts() -> HashMap<u32, usize> {
    HashMap::new()
}

pub struct SystemCollector(pub Mutex<System>);

impl Default for SystemCollector {
    fn default() -> Self {
        Self(Mutex::new(System::new_all()))
    }
}

pub fn sample(collector: &SystemCollector) -> Result<SystemSnapshot, String> {
    let mut system = collector
        .0
        .lock()
        .map_err(|_| "system collector lock poisoned".to_string())?;

    system.refresh_cpu_usage();
    system.refresh_memory();
    system.refresh_processes(ProcessesToUpdate::All, true);
    let threads = thread_counts();

    let mut processes = system
        .processes()
        .iter()
        .map(|(pid, process)| ProcessSnapshot {
            pid: pid.as_u32(),
            parent_pid: process.parent().map(|parent| parent.as_u32()),
            name: process.name().to_string_lossy().into_owned(),
            cpu_percent: process.cpu_usage(),
            memory_bytes: process.memory(),
            started_at: process.start_time(),
            status: process_status(process.cpu_usage()),
            thread_count: threads.get(&pid.as_u32()).copied().unwrap_or(0),
            executable_path: process.exe().map(|path| path.to_string_lossy().into_owned()),
        })
        .collect::<Vec<_>>();

    processes.sort_by(|left, right| {
        right
            .cpu_percent
            .partial_cmp(&left.cpu_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| right.memory_bytes.cmp(&left.memory_bytes))
    });
    processes.truncate(500);

    Ok(SystemSnapshot {
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_millis() as u64,
        cpu_percent: system.global_cpu_usage(),
        memory_used_bytes: system.used_memory(),
        memory_total_bytes: system.total_memory(),
        process_count: system.processes().len(),
        thread_count: threads.values().sum(),
        logical_cpu_count: system.cpus().len(),
        uptime_seconds: System::uptime(),
        processes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_cpu_load_to_stable_lifecycle_status() {
        assert_eq!(process_status(0.0), "idle");
        assert_eq!(process_status(8.0), "active");
        assert_eq!(process_status(50.0), "stressed");
    }

    #[test]
    fn samples_real_system_data() {
        let snapshot = sample(&SystemCollector::default()).expect("system sampling succeeds");
        assert!(snapshot.memory_total_bytes > 0);
        assert!(snapshot.logical_cpu_count > 0);
        assert!(snapshot.process_count > 0);
        assert!(!snapshot.processes.is_empty());
    }
}
