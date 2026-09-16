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

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterfaceRates {
    // String avoids loss of a 64-bit LUID in JavaScript numbers.
    pub id: String,
    pub name: String,
    pub interface_type: u32,
    pub operational: bool,
    pub received_bytes_per_second: Option<f64>,
    pub sent_bytes_per_second: Option<f64>,
}

#[derive(Default)]
pub struct NetworkRateTracker {
    previous: Option<NetworkCounters>,
}

impl NetworkRateTracker {
    /// None is a failed query, not an idle network. It invalidates all baselines.
    pub fn observe(&mut self, sample: Option<NetworkCounters>) -> Option<Vec<InterfaceRates>> {
        let Some(sample) = sample else {
            self.previous = None;
            return None;
        };
        let mut identities = std::collections::HashSet::new();
        if sample
            .interfaces
            .iter()
            .any(|row| !identities.insert(row.luid))
        {
            self.previous = None;
            return None;
        }
        let elapsed = self
            .previous
            .as_ref()
            .and_then(|old| sample.observed_at.checked_duration_since(old.observed_at))
            .filter(|duration| {
                !duration.is_zero() && *duration <= std::time::Duration::from_secs(15)
            });
        let old: std::collections::HashMap<_, _> = self
            .previous
            .as_ref()
            .map(|old| old.interfaces.iter().map(|row| (row.luid, row)).collect())
            .unwrap_or_default();
        let rates = sample
            .interfaces
            .iter()
            .map(|row| {
                let delta = elapsed.and_then(|elapsed| {
                    let before = old.get(&row.luid)?;
                    if !before.operational
                        || !row.operational
                        || before.interface_type != row.interface_type
                    {
                        return None;
                    }
                    // Subtract integers before converting, preserving small deltas above 2^53.
                    let received = row.received_bytes.checked_sub(before.received_bytes)?;
                    let sent = row.sent_bytes.checked_sub(before.sent_bytes)?;
                    Some((
                        received as f64 / elapsed.as_secs_f64(),
                        sent as f64 / elapsed.as_secs_f64(),
                    ))
                });
                InterfaceRates {
                    id: row.luid.to_string(),
                    name: row.name.clone(),
                    interface_type: row.interface_type,
                    operational: row.operational,
                    received_bytes_per_second: delta.map(|pair| pair.0),
                    sent_bytes_per_second: delta.map(|pair| pair.1),
                }
            })
            .collect();
        // Replacing the snapshot discards removed adapters; storage cannot grow
        // across unplug/replug cycles. Renames preserve identity and continuity.
        self.previous = Some(sample);
        Some(rates)
    }
}

#[cfg(test)]
mod rate_tests {
    use super::*;
    use std::time::Duration;
    fn sample(at: Instant, bytes: u64) -> NetworkCounters {
        NetworkCounters {
            observed_at: at,
            interfaces: vec![InterfaceCounters {
                luid: u64::MAX,
                name: "adapter".into(),
                interface_type: 6,
                operational: true,
                received_bytes: bytes,
                sent_bytes: bytes,
            }],
        }
    }
    #[test]
    fn uses_actual_elapsed_time_and_preserves_large_counter_deltas() {
        let now = Instant::now();
        let mut tracker = NetworkRateTracker::default();
        assert!(
            tracker.observe(Some(sample(now, u64::MAX - 10))).unwrap()[0]
                .received_bytes_per_second
                .is_none()
        );
        let rates = tracker
            .observe(Some(sample(now + Duration::from_secs(2), u64::MAX - 8)))
            .unwrap();
        assert_eq!(rates[0].received_bytes_per_second, Some(1.0));
        assert_eq!(rates[0].id, u64::MAX.to_string());
        let idle = tracker
            .observe(Some(sample(now + Duration::from_secs(3), u64::MAX - 8)))
            .unwrap();
        assert_eq!(idle[0].sent_bytes_per_second, Some(0.0));
    }
    #[test]
    fn failure_and_counter_reset_require_new_baselines() {
        let now = Instant::now();
        let mut tracker = NetworkRateTracker::default();
        tracker.observe(Some(sample(now, 100)));
        assert!(tracker.observe(None).is_none());
        assert!(tracker
            .observe(Some(sample(now + Duration::from_secs(1), 200)))
            .unwrap()[0]
            .received_bytes_per_second
            .is_none());
        assert!(tracker
            .observe(Some(sample(now + Duration::from_secs(2), 1)))
            .unwrap()[0]
            .received_bytes_per_second
            .is_none());
        assert_eq!(
            tracker
                .observe(Some(sample(now + Duration::from_secs(3), 4)))
                .unwrap()[0]
                .received_bytes_per_second,
            Some(3.0)
        );
    }
    #[test]
    fn rejects_zero_backwards_and_long_intervals() {
        let now = Instant::now();
        for next in [
            now,
            now - Duration::from_secs(1),
            now + Duration::from_secs(16),
        ] {
            let mut tracker = NetworkRateTracker::default();
            tracker.observe(Some(sample(now, 10)));
            assert!(tracker.observe(Some(sample(next, 20))).unwrap()[0]
                .received_bytes_per_second
                .is_none());
        }
    }
    #[test]
    fn reconnect_and_removed_adapters_do_not_bridge_history() {
        let now = Instant::now();
        let mut tracker = NetworkRateTracker::default();
        tracker.observe(Some(sample(now, 10)));
        let mut down = sample(now + Duration::from_secs(1), 20);
        down.interfaces[0].operational = false;
        assert!(tracker.observe(Some(down)).unwrap()[0]
            .received_bytes_per_second
            .is_none());
        assert!(tracker
            .observe(Some(sample(now + Duration::from_secs(2), 30)))
            .unwrap()[0]
            .received_bytes_per_second
            .is_none());
        tracker.observe(Some(NetworkCounters {
            observed_at: now + Duration::from_secs(3),
            interfaces: vec![],
        }));
        assert!(tracker
            .observe(Some(sample(now + Duration::from_secs(4), 40)))
            .unwrap()[0]
            .received_bytes_per_second
            .is_none());
        let mut duplicate = sample(now + Duration::from_secs(5), 50);
        duplicate.interfaces.push(duplicate.interfaces[0].clone());
        assert!(tracker.observe(Some(duplicate)).is_none());
    }
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

    #[test]
    #[ignore = "manual read-only host overhead measurement"]
    fn measure_interface_query_overhead() {
        let mut timings = Vec::new();
        let mut tracker = NetworkRateTracker::default();
        let mut count = 0;
        for _ in 0..64 {
            let start = Instant::now();
            let sample = read_network_counters().expect("interface query succeeds");
            count = sample.interfaces.len();
            let rows = tracker.observe(Some(sample)).expect("unique interface identities");
            assert_eq!(rows.len(), count);
            assert!(rows.iter().all(|row| [row.received_bytes_per_second, row.sent_bytes_per_second]
                .into_iter().flatten().all(|rate| rate.is_finite() && rate >= 0.0)));
            timings.push(start.elapsed().as_secs_f64() * 1000.0);
        }
        timings.sort_by(f64::total_cmp);
        eprintln!("network interfaces={count}; query+rates ms: median={:.3}, p95={:.3}; 64 local debug samples", timings[32], timings[60]);
    }
}
