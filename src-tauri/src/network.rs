//! Read-only per-interface counters. Not process traffic or Internet throughput.
use std::{io, time::Instant};

#[derive(Debug, Clone)]
pub struct InterfaceCounters {
    pub luid: u64,
    pub name: String,
    pub interface_type: u32,
    pub operational: bool,
    pub received_bytes: u64,
    pub sent_bytes: u64,
}

#[derive(Debug)]
pub struct NetworkCounters {
    pub observed_at: Instant,
    pub interfaces: Vec<InterfaceCounters>,
}

#[cfg(windows)]
pub fn read_network_counters() -> io::Result<NetworkCounters> {
    use windows_sys::Win32::NetworkManagement::{
        IpHelper::{FreeMibTable, GetIfTable2, MIB_IF_TABLE2},
        Ndis::IfOperStatusUp,
    };
    struct Table(*mut MIB_IF_TABLE2);
    impl Drop for Table {
        fn drop(&mut self) {
            // The API owns this allocation; release it even on early returns.
            unsafe { FreeMibTable(self.0.cast()) };
        }
    }
    let mut raw = std::ptr::null_mut();
    // No handle, elevation, packet capture or network mutation is requested.
    let status = unsafe { GetIfTable2(&mut raw) };
    if status != 0 {
        return Err(io::Error::from_raw_os_error(status as i32));
    }
    if raw.is_null() {
        return Err(io::Error::other("interface table missing"));
    }
    let table = Table(raw);
    let count = unsafe { (*table.0).NumEntries as usize };
    // Defensive allocation bound; never silently truncate a returned table.
    if count > 65_536 {
        return Err(io::Error::other("interface table too large"));
    }
    // Use the generated C layout, including padding before the flexible array.
    let rows =
        unsafe { std::slice::from_raw_parts(std::ptr::addr_of!((*table.0).Table).cast(), count) };
    let interfaces = rows
        .iter()
        .map(
            |row: &windows_sys::Win32::NetworkManagement::IpHelper::MIB_IF_ROW2| {
                let length = row
                    .Alias
                    .iter()
                    .position(|value| *value == 0)
                    .unwrap_or(row.Alias.len());
                InterfaceCounters {
                    luid: unsafe { row.InterfaceLuid.Value },
                    name: String::from_utf16_lossy(&row.Alias[..length]),
                    interface_type: row.Type,
                    operational: row.OperStatus == IfOperStatusUp,
                    received_bytes: row.InOctets,
                    sent_bytes: row.OutOctets,
                }
            },
        )
        .collect();
    Ok(NetworkCounters {
        observed_at: Instant::now(),
        interfaces,
    })
}

#[cfg(not(windows))]
pub fn read_network_counters() -> io::Result<NetworkCounters> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "network counters require Windows",
    ))
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    #[test]
    fn reads_interface_counters_without_exposing_addresses() {
        let snapshot = read_network_counters().expect("read-only interface enumeration");
        let identities: std::collections::HashSet<_> =
            snapshot.interfaces.iter().map(|item| item.luid).collect();
        assert_eq!(identities.len(), snapshot.interfaces.len());
        assert!(snapshot
            .interfaces
            .iter()
            .all(|item| item.name.chars().count() <= 257));
        eprintln!("interfaces enumerated: {}", snapshot.interfaces.len());
    }
}
