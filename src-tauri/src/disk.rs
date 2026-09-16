//! PhysicalDisk performance counters, not volume capacity or process I/O.
//! Counter instance names are local/session-scoped, not durable device identities.
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskReading {
    pub id: String,
    pub read_bytes_per_second: Option<f64>,
    pub write_bytes_per_second: Option<f64>,
    pub active_percent: Option<f64>,
}

fn valid_value(status: u32, value: f64) -> Option<f64> {
    // PDH_CSTATUS_VALID_DATA (0) or PDH_CSTATUS_NEW_DATA (1).
    ((status == 0 || status == 1) && value.is_finite() && value >= 0.0).then_some(value)
}

fn active_from_idle(idle: Option<f64>) -> Option<f64> {
    idle.filter(|value| value.is_finite() && (0.0..=100.0).contains(value))
        .map(|value| 100.0 - value)
}

#[cfg(windows)]
pub use windows::PhysicalDiskQuery;

#[cfg(windows)]
mod windows {
    use super::{active_from_idle, valid_value, DiskReading};
    use std::{
        collections::{BTreeMap, BTreeSet},
        mem::{align_of, size_of},
        ptr,
        time::{Duration, Instant},
    };
    use windows_sys::Win32::System::Performance::*;

    const MAX_BUFFER: usize = 4 * 1024 * 1024;
    // Present in the installed SDK's pdh.h; omitted by windows-sys 0.61.
    const FMT_NOCAP100: u32 = 0x0000_8000;
    const PATHS: [&str; 3] = [
        r"\PhysicalDisk(*)\Disk Read Bytes/sec",
        r"\PhysicalDisk(*)\Disk Write Bytes/sec",
        r"\PhysicalDisk(*)\% Idle Time",
    ];

    pub struct PhysicalDiskQuery {
        query: PDH_HQUERY,
        counters: [Option<PDH_HCOUNTER>; 3],
        previous: Option<Instant>,
    }

    impl Drop for PhysicalDiskQuery {
        fn drop(&mut self) {
            // Closing the owning query also closes every added counter.
            unsafe {
                PdhCloseQuery(self.query);
            }
        }
    }

    impl PhysicalDiskQuery {
        /// Local machine only. No counter registration/repair, privilege elevation,
        /// remote access, disk writes or IOCTL_DISK_PERFORMANCE enable/disable calls.
        pub fn open() -> Result<Self, u32> {
            let mut query = ptr::null_mut();
            let status = unsafe { PdhOpenQueryW(ptr::null(), 0, &mut query) };
            if status != 0 {
                return Err(status);
            }
            if query.is_null() {
                return Err(PDH_INVALID_HANDLE);
            }
            let mut result = Self {
                query,
                counters: [None; 3],
                previous: None,
            };
            let mut last_error = PDH_CSTATUS_NO_COUNTER;
            for (index, path) in PATHS.iter().enumerate() {
                let wide: Vec<_> = path.encode_utf16().chain(Some(0)).collect();
                let mut counter = ptr::null_mut();
                let status =
                    unsafe { PdhAddEnglishCounterW(query, wide.as_ptr(), 0, &mut counter) };
                if status == 0 && !counter.is_null() {
                    result.counters[index] = Some(counter);
                } else {
                    last_error = if status == 0 {
                        PDH_INVALID_HANDLE
                    } else {
                        status
                    };
                }
            }
            if result.counters.iter().all(Option::is_none) {
                return Err(last_error);
            }
            Ok(result)
        }

        pub fn sample(&mut self) -> Result<Vec<DiskReading>, u32> {
            let status = unsafe { PdhCollectQueryData(self.query) };
            if status != 0 {
                self.previous = None;
                return Err(status);
            }
            let now = Instant::now();
            let contiguous = self
                .previous
                .and_then(|previous| now.checked_duration_since(previous))
                .is_some_and(|elapsed| !elapsed.is_zero() && elapsed <= Duration::from_secs(15));
            self.previous = Some(now);
            let values: Vec<_> = self
                .counters
                .iter()
                .map(|counter| {
                    counter
                        .map(read_values)
                        .unwrap_or(Err(PDH_CSTATUS_NO_COUNTER))
                })
                .collect();
            if values.iter().all(Result::is_err) {
                return Err(*values[0].as_ref().unwrap_err());
            }
            let ids: BTreeSet<_> = values
                .iter()
                .filter_map(|value| value.as_ref().ok())
                .flat_map(|rows| rows.keys().cloned())
                .filter(|id| id != "_Total")
                .collect();
            Ok(ids
                .into_iter()
                .map(|id| {
                    let value = |index: usize| {
                        if contiguous {
                            values[index]
                                .as_ref()
                                .ok()
                                .and_then(|rows| rows.get(&id))
                                .copied()
                                .flatten()
                        } else {
                            None
                        }
                    };
                    DiskReading {
                        read_bytes_per_second: value(0),
                        write_bytes_per_second: value(1),
                        active_percent: active_from_idle(value(2)),
                        id,
                    }
                })
                .collect())
        }
    }

    fn read_values(counter: PDH_HCOUNTER) -> Result<BTreeMap<String, Option<f64>>, u32> {
        // Re-query size on races; PDH says a nonzero undersized buffer's returned
        // size is not reliable. Limit both allocation and retries.
        for _ in 0..3 {
            let mut bytes = 0;
            let mut count = 0;
            let status = unsafe {
                PdhGetFormattedCounterArrayW(
                    counter,
                    PDH_FMT_DOUBLE | FMT_NOCAP100,
                    &mut bytes,
                    &mut count,
                    ptr::null_mut(),
                )
            };
            if status == 0 && bytes == 0 && count == 0 {
                return Ok(BTreeMap::new());
            }
            if status != PDH_MORE_DATA {
                return Err(if status == 0 { PDH_INVALID_DATA } else { status });
            }
            let size = bytes as usize;
            if size == 0 || size > MAX_BUFFER {
                return Err(PDH_INVALID_DATA);
            }
            // u64 allocation supplies at least the required struct alignment.
            assert!(align_of::<PDH_FMT_COUNTERVALUE_ITEM_W>() <= align_of::<u64>());
            let mut buffer = vec![0u64; size.div_ceil(size_of::<u64>())];
            let status = unsafe {
                PdhGetFormattedCounterArrayW(
                    counter,
                    PDH_FMT_DOUBLE | FMT_NOCAP100,
                    &mut bytes,
                    &mut count,
                    buffer.as_mut_ptr().cast(),
                )
            };
            if status == PDH_MORE_DATA {
                continue;
            }
            if status != 0 {
                return Err(status);
            }
            if bytes as usize > size
                || (count as usize)
                    .checked_mul(size_of::<PDH_FMT_COUNTERVALUE_ITEM_W>())
                    .is_none_or(|table_size| table_size > bytes as usize)
            {
                return Err(PDH_INVALID_DATA);
            }
            // API success plus validated byte/count bounds justify this table view.
            let rows = unsafe {
                std::slice::from_raw_parts(
                    buffer.as_ptr().cast::<PDH_FMT_COUNTERVALUE_ITEM_W>(),
                    count as usize,
                )
            };
            let mut result = BTreeMap::new();
            for row in rows {
                let name = bounded_name(&buffer, bytes as usize, row.szName)?;
                let value = valid_value(row.FmtValue.CStatus, unsafe {
                    row.FmtValue.Anonymous.doubleValue
                });
                if result.insert(name, value).is_some() {
                    return Err(PDH_INVALID_DATA);
                }
            }
            return Ok(result);
        }
        Err(PDH_MORE_DATA)
    }

    fn bounded_name(buffer: &[u64], bytes: usize, name: *const u16) -> Result<String, u32> {
        let start = buffer.as_ptr() as usize;
        let offset = (name as usize).checked_sub(start).ok_or(PDH_INVALID_DATA)?;
        if bytes > std::mem::size_of_val(buffer) || offset >= bytes || offset % 2 != 0 {
            return Err(PDH_INVALID_DATA);
        }
        let available = ((bytes - offset) / 2).min(1024);
        let units = unsafe { std::slice::from_raw_parts(name, available) };
        let end = units
            .iter()
            .position(|&unit| unit == 0)
            .filter(|&end| end > 0)
            .ok_or(PDH_INVALID_DATA)?;
        String::from_utf16(&units[..end]).map_err(|_| PDH_INVALID_DATA)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn names_must_be_bounded_terminated_utf16() {
            let buffer = [0x0000_0063_0062_0061u64];
            assert_eq!(
                bounded_name(&buffer, 8, buffer.as_ptr().cast()).unwrap(),
                "abc"
            );
            assert!(bounded_name(&buffer, 6, buffer.as_ptr().cast()).is_err());
            assert!(bounded_name(&buffer, 8, ptr::null()).is_err());
            assert!(bounded_name(&buffer, 9, buffer.as_ptr().cast()).is_err());
            assert!(bounded_name(&buffer, 8, unsafe {
                buffer.as_ptr().cast::<u8>().add(1).cast()
            })
            .is_err());
        }

        #[test]
        #[ignore = "explicit read-only native PDH probe; requires available physical disk counters"]
        fn native_physical_disk_probe() {
            let open_started = Instant::now();
            let mut query =
                PhysicalDiskQuery::open().expect("local disk performance counters open");
            let open_ms = open_started.elapsed().as_secs_f64() * 1000.0;
            let first = query.sample();
            if let Ok(rows) = first {
                assert!(rows.iter().all(|row| row.read_bytes_per_second.is_none()
                    && row.write_bytes_per_second.is_none()
                    && row.active_percent.is_none()));
            }
            std::thread::sleep(Duration::from_millis(1100));
            let started = Instant::now();
            let rows = query.sample().expect("second local disk sample");
            assert!(!rows.is_empty(), "probe requires a physical disk");
            assert!(rows.iter().all(|row| row.id != "_Total"));
            assert!(rows
                .iter()
                .any(|row| row.read_bytes_per_second.is_some()
                    && row.write_bytes_per_second.is_some()));
            for row in &rows {
                for value in [row.read_bytes_per_second, row.write_bytes_per_second]
                    .into_iter()
                    .flatten()
                {
                    assert!(value.is_finite() && value >= 0.0);
                }
                if let Some(value) = row.active_percent {
                    assert!((0.0..=100.0).contains(&value));
                }
            }
            eprintln!(
                "disk probe: {} instances; open {:.3}ms; second collect+format {:.3}ms",
                rows.len(),
                open_ms,
                started.elapsed().as_secs_f64() * 1000.0
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn missing_invalid_and_idle_are_distinct() {
        assert_eq!(valid_value(0, 0.0), Some(0.0));
        assert_eq!(valid_value(1, 1_000_000.0), Some(1_000_000.0));
        assert_eq!(valid_value(2, 0.0), None);
        for value in [f64::NAN, f64::INFINITY, -1.0] {
            assert_eq!(valid_value(0, value), None);
        }
        assert_eq!(active_from_idle(Some(100.0)), Some(0.0));
        assert_eq!(active_from_idle(Some(0.0)), Some(100.0));
        for value in [None, Some(-1.0), Some(100.1), Some(f64::NAN)] {
            assert_eq!(active_from_idle(value), None);
        }
        let row = DiskReading {
            id: "test".into(),
            read_bytes_per_second: None,
            write_bytes_per_second: Some(0.0),
            active_percent: None,
        };
        let json = serde_json::to_value(row).unwrap();
        assert!(json["readBytesPerSecond"].is_null());
        assert_eq!(json["writeBytesPerSecond"], 0.0);
    }
}
