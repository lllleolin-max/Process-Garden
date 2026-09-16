//! Read-only SCM enumeration. No service controls or privilege changes.
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceReading {
    pub name: String,
    pub display_name: String,
    pub state: u32,
    pub process_id: Option<u32>,
    pub service_type: u32,
}

fn observed_pid(state: u32, pid: u32) -> Option<u32> {
    // SERVICE_RUNNING / CONTINUE_PENDING / PAUSE_PENDING / PAUSED only.
    (matches!(state, 4..=7) && pid != 0).then_some(pid)
}

#[cfg(windows)]
mod native {
    use super::*;
    use std::{collections::BTreeMap, mem::size_of, ptr, time::Instant};
    use windows_sys::Win32::{Foundation::{GetLastError, ERROR_MORE_DATA}, System::Services::*};

    struct Manager(SC_HANDLE);
    impl Drop for Manager {
        fn drop(&mut self) { unsafe { CloseServiceHandle(self.0); } }
    }

    // String pointers must stay inside the allocated API output buffer. Read
    // through its provenance, not through an unchecked pointer returned by FFI.
    fn string(buffer: &[u64], pointer: *const u16) -> Result<String, String> {
        let base = buffer.as_ptr() as usize;
        let offset = (pointer as usize).checked_sub(base).ok_or("invalid service string")?;
        let bytes = std::mem::size_of_val(buffer);
        if offset >= bytes || offset % 2 != 0 { return Err("invalid service string".into()); }
        let available = ((bytes - offset) / 2).min(4097);
        let source = unsafe { std::slice::from_raw_parts(buffer.as_ptr().cast::<u8>().add(offset).cast::<u16>(), available) };
        let end = source.iter().position(|unit| *unit == 0).ok_or("unterminated service string")?;
        String::from_utf16(&source[..end]).map_err(|_| "invalid service UTF-16".into())
    }

    pub fn enumerate(deadline: Instant) -> Result<Vec<ServiceReading>, String> {
        if Instant::now() >= deadline { return Err("service enumeration expired".into()); }
        let raw = unsafe { OpenSCManagerW(ptr::null(), ptr::null(), SC_MANAGER_ENUMERATE_SERVICE) };
        if raw.is_null() { return Err(format!("service manager unavailable: {}", unsafe { GetLastError() })); }
        let manager = Manager(raw);
        // API maximum is 256 KiB. Resume over pages, never allocate bytesNeeded
        // blindly or mistake ERROR_MORE_DATA for a completed snapshot.
        let mut buffer = vec![0u64; 256 * 1024 / 8];
        let mut resume = 0;
        let mut rows = BTreeMap::new();
        for _ in 0..64 {
            if Instant::now() >= deadline { return Err("service enumeration expired".into()); }
            buffer.fill(0);
            let previous_resume = resume;
            let (mut needed, mut count) = (0, 0);
            let ok = unsafe { EnumServicesStatusExW(manager.0, SC_ENUM_PROCESS_INFO,
                SERVICE_WIN32, SERVICE_STATE_ALL, buffer.as_mut_ptr().cast(),
                std::mem::size_of_val(buffer.as_slice()) as u32, &mut needed, &mut count,
                &mut resume, ptr::null()) };
            let error = if ok == 0 { unsafe { GetLastError() } } else { 0 };
            if ok == 0 && error != ERROR_MORE_DATA { return Err(format!("service enumeration failed: {error}")); }
            if count as usize > std::mem::size_of_val(buffer.as_slice()) / size_of::<ENUM_SERVICE_STATUS_PROCESSW>() {
                return Err("invalid service count".into());
            }
            for index in 0..count as usize {
                let entry = unsafe { &*buffer.as_ptr().cast::<ENUM_SERVICE_STATUS_PROCESSW>().add(index) };
                let name = string(&buffer, entry.lpServiceName)?;
                if name.is_empty() { return Err("empty service identity".into()); }
                let display_name = string(&buffer, entry.lpDisplayName)?;
                let state = entry.ServiceStatusProcess.dwCurrentState;
                let reading = ServiceReading { name: name.clone(), display_name, state,
                    process_id: observed_pid(state, entry.ServiceStatusProcess.dwProcessId),
                    service_type: entry.ServiceStatusProcess.dwServiceType };
                if rows.insert(name.to_lowercase(), reading).is_some() { return Err("service enumeration changed during pagination".into()); }
                if rows.len() > 65536 { return Err("service enumeration limit exceeded".into()); }
            }
            if ok != 0 {
                if Instant::now() >= deadline { return Err("service enumeration expired".into()); }
                return Ok(rows.into_values().collect());
            }
            if resume == previous_resume || count == 0 { return Err("service enumeration made no progress".into()); }
        }
        Err("service enumeration page limit exceeded".into())
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn invalid_string_pointers_are_rejected() {
            let buffer = [0u64; 2];
            assert!(string(&buffer, ptr::null()).is_err());
            assert!(string(&buffer, (buffer.as_ptr() as usize + 1) as *const u16).is_err());
            assert!(string(&buffer, (buffer.as_ptr() as usize + 16) as *const u16).is_err());
            assert_eq!(string(&buffer, buffer.as_ptr().cast()).unwrap(), "");
            let unterminated = [u64::MAX; 2];
            assert!(string(&unterminated, unterminated.as_ptr().cast()).is_err());
        }
        #[test]
        fn expired_requests_do_not_open_the_manager() {
            assert!(enumerate(Instant::now()).is_err());
        }
        #[test]
        #[ignore = "explicit read-only SCM enumeration probe; no service controls"]
        fn native_service_probe() {
            let start = Instant::now();
            let rows = enumerate(start + std::time::Duration::from_secs(5)).unwrap();
            assert!(!rows.is_empty());
            assert!(rows.iter().all(|row| !row.name.is_empty()));
            println!("accessible Win32 services: {}, query duration: {:?}", rows.len(), start.elapsed());
        }
    }
}

#[cfg(windows)]
pub use native::enumerate;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn transient_stopped_unknown_and_zero_pids_are_not_process_targets() {
        for state in [0, 1, 2, 3, 8, u32::MAX] { assert_eq!(observed_pid(state, 42), None); }
        for state in 4..=7 {
            assert_eq!(observed_pid(state, 42), Some(42));
            assert_eq!(observed_pid(state, 0), None);
        }
    }
}
