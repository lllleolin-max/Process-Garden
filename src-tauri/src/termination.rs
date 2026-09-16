//! Terminate only the process inspected on the same Windows handle.
//! Never elevate, run shell commands, or recursively terminate a process tree.

#[cfg(windows)]
pub fn terminate(pid: u32, started_at: u64, executable_path: &str) -> Result<(), String> {
    use windows_sys::Win32::{
        Foundation::{CloseHandle, FILETIME, HANDLE, WAIT_OBJECT_0},
        System::Threading::{OpenProcess, GetProcessTimes, IsProcessCritical, QueryFullProcessImageNameW, TerminateProcess, WaitForSingleObject, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE, PROCESS_SYNCHRONIZE},
    };
    if pid <= 4 || pid == std::process::id() { return Err("protected".into()); }
    if started_at == 0 || executable_path.is_empty() { return Err("identity".into()); }
    struct ProcessHandle(HANDLE);
    impl Drop for ProcessHandle { fn drop(&mut self) { unsafe { CloseHandle(self.0); } } }
    let handle = ProcessHandle(unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_TERMINATE | PROCESS_SYNCHRONIZE, 0, pid) });
    if handle.0.is_null() { return Err("denied".into()); }
    let mut critical = 0;
    if unsafe { IsProcessCritical(handle.0, &mut critical) } == 0 { return Err("denied".into()); }
    if critical != 0 { return Err("protected".into()); }
    let mut creation: FILETIME = unsafe { std::mem::zeroed() };
    let mut exit = creation;
    let mut kernel = creation;
    let mut user = creation;
    if unsafe { GetProcessTimes(handle.0, &mut creation, &mut exit, &mut kernel, &mut user) } == 0 { return Err("identity".into()); }
    let ticks = (u64::from(creation.dwHighDateTime) << 32) | u64::from(creation.dwLowDateTime);
    let seconds = ticks.saturating_sub(116_444_736_000_000_000) / 10_000_000;
    if seconds != started_at { return Err("stale".into()); }
    let mut path = vec![0u16; 32768];
    let mut length = path.len() as u32;
    if unsafe { QueryFullProcessImageNameW(handle.0, 0, path.as_mut_ptr(), &mut length) } == 0 { return Err("identity".into()); }
    let actual = String::from_utf16_lossy(&path[..length as usize]);
    if !actual.eq_ignore_ascii_case(executable_path) { return Err("stale".into()); }
    let name = actual.rsplit(['\\', '/']).next().unwrap_or("").to_ascii_lowercase();
    if ["explorer.exe", "msedgewebview2.exe", "process-garden.exe", "process_garden.exe"].contains(&name.as_str()) { return Err("protected".into()); }
    if unsafe { TerminateProcess(handle.0, 1) } == 0 { return Err("denied".into()); }
    if unsafe { WaitForSingleObject(handle.0, 3000) } != WAIT_OBJECT_0 { return Err("timeout".into()); }
    Ok(())
}

#[cfg(not(windows))]
pub fn terminate(_pid: u32, _started_at: u64, _executable_path: &str) -> Result<(), String> { Err("unsupported".into()) }

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    #[test]
    fn rejects_self_system_and_unknown_identity() {
        assert_eq!(terminate(std::process::id(), 1, "self"), Err("protected".into()));
        assert_eq!(terminate(4, 1, "system"), Err("protected".into()));
        assert_eq!(terminate(12345, 0, ""), Err("identity".into()));
    }

    #[test]
    fn rejects_stale_identity_then_ends_only_its_disposable_child() {
        use std::os::windows::process::CommandExt;
        let mut child = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", "Start-Sleep -Seconds 60"])
            .creation_flags(0x08000000).spawn().expect("test child");
        let result = (|| {
            let system = sysinfo::System::new_all();
            let process = system.process(sysinfo::Pid::from_u32(child.id())).expect("child in process table");
            let path = process.exe().expect("child executable").to_string_lossy().into_owned();
            assert_eq!(terminate(child.id(), process.start_time() + 1, &path), Err("stale".into()));
            assert!(child.try_wait().unwrap().is_none());
            terminate(child.id(), process.start_time(), &path)
        })();
        let _ = child.kill();
        let _ = child.wait();
        assert_eq!(result, Ok(()));
    }
}
