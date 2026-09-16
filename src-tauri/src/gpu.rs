//! Raw GPU provider observations. Aggregation and device identity validation must
//! precede a UI claim of total GPU utilization or per-process attribution.
use serde::Serialize;
use std::collections::BTreeMap;

pub mod grouping;
pub mod devices;
pub mod worker;

/// Session-local provider identity, not a durable hardware identifier.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct AdapterIdentity {
    pub luid_high: u32,
    pub luid_low: u32,
    pub physical_index: u32,
}

#[derive(Debug, PartialEq, Eq)]
pub struct EngineIdentity {
    pub adapter: AdapterIdentity,
    pub process_id: u32,
    pub engine_id: u32,
    pub engine_type: Option<String>,
}

fn decimal(value: &str) -> Option<u32> {
    (!value.is_empty() && value.bytes().all(|byte| byte.is_ascii_digit()))
        .then(|| value.parse().ok())
        .flatten()
}

fn hex_component(value: &str) -> Option<u32> {
    let value = value.strip_prefix("0x")?;
    (!value.is_empty() && value.len() <= 8 && value.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .then(|| u32::from_str_radix(value, 16).ok())
        .flatten()
}

/// Accept only the observed provider grammar. Unknown/aggregate names stay unmapped.
pub fn parse_adapter_identity(name: &str) -> Option<AdapterIdentity> {
    let (luid, physical) = name.strip_prefix("luid_")?.split_once("_phys_")?;
    let (high, low) = luid.split_once('_')?;
    Some(AdapterIdentity {
        luid_high: hex_component(high)?,
        luid_low: hex_component(low)?,
        physical_index: decimal(physical)?,
    })
}

pub fn parse_engine_identity(name: &str) -> Option<EngineIdentity> {
    if name.len() > 1024 {
        return None;
    }
    let (pid, rest) = name.strip_prefix("pid_")?.split_once("_luid_")?;
    let (adapter, rest) = rest.split_once("_eng_")?;
    let (engine, kind) = rest.split_once("_engtype_")?;
    if !kind
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
    {
        return None;
    }
    Some(EngineIdentity {
        adapter: parse_adapter_identity(&format!("luid_{adapter}"))?,
        process_id: decimal(pid)?,
        engine_id: decimal(engine)?,
        engine_type: (!kind.is_empty()).then(|| kind.to_owned()),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuCounterSnapshot {
    pub rate_baseline: bool,
    pub engine_utilization: Option<BTreeMap<String, Option<f64>>>,
    pub dedicated_bytes: Option<BTreeMap<String, Option<f64>>>,
    pub shared_bytes: Option<BTreeMap<String, Option<f64>>>,
}

#[cfg(windows)]
pub use windows::GpuQuery;

#[cfg(windows)]
mod windows {
    use super::GpuCounterSnapshot;
    use crate::performance_counters::read_values;
    use std::{
        ptr,
        time::{Duration, Instant},
    };
    use windows_sys::Win32::System::Performance::*;

    const PATHS: [&str; 3] = [
        r"\GPU Engine(*)\Utilization Percentage",
        r"\GPU Adapter Memory(*)\Dedicated Usage",
        r"\GPU Adapter Memory(*)\Shared Usage",
    ];

    pub struct GpuQuery {
        query: PDH_HQUERY,
        counters: [Option<PDH_HCOUNTER>; 3],
        previous: Option<Instant>,
    }
    impl Drop for GpuQuery {
        fn drop(&mut self) {
            unsafe {
                PdhCloseQuery(self.query);
            }
        }
    }
    impl GpuQuery {
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

        pub fn sample(&mut self) -> Result<GpuCounterSnapshot, u32> {
            let status = unsafe { PdhCollectQueryData(self.query) };
            if status != 0 {
                self.previous = None;
                return Err(status);
            }
            let now = Instant::now();
            let continuous = self
                .previous
                .and_then(|previous| now.checked_duration_since(previous))
                .is_some_and(|elapsed| !elapsed.is_zero() && elapsed <= Duration::from_secs(15));
            self.previous = Some(now);
            let mut readings = self.counters.map(|counter| {
                counter
                    .map(read_values)
                    .unwrap_or(Err(PDH_CSTATUS_NO_COUNTER))
            });
            if readings.iter().all(Result::is_err) {
                return Err(*readings[0].as_ref().unwrap_err());
            }
            if !continuous {
                if let Ok(engines) = &mut readings[0] {
                    for value in engines.values_mut() {
                        *value = None;
                    }
                }
            }
            let [engine_utilization, dedicated_bytes, shared_bytes] = readings;
            // Memory counters are instantaneous usage gauges, not rates; no
            // fabricated baseline zero and no sum across adapters or processes.
            Ok(GpuCounterSnapshot {
                rate_baseline: !continuous,
                engine_utilization: engine_utilization.ok(),
                dedicated_bytes: dedicated_bytes.ok(),
                shared_bytes: shared_bytes.ok(),
            })
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        #[ignore = "explicit read-only GPU provider availability probe"]
        fn native_gpu_counter_probe() {
            let started = Instant::now();
            let mut query = GpuQuery::open().expect("GPU counters available on this host");
            let open_ms = started.elapsed().as_secs_f64() * 1000.0;
            if let Ok(first) = query.sample() {
                if let Some(engines) = first.engine_utilization {
                    assert!(engines.values().all(Option::is_none));
                }
            }
            std::thread::sleep(Duration::from_millis(1100));
            let started = Instant::now();
            let result = query.sample().expect("second GPU counter sample");
            let engines = result
                .engine_utilization
                .as_ref()
                .expect("engine counter available");
            assert!(!engines.is_empty());
            assert!(engines.values().any(Option::is_some));
            for table in [
                &result.engine_utilization,
                &result.dedicated_bytes,
                &result.shared_bytes,
            ]
            .into_iter()
            .flatten()
            {
                assert!(table
                    .values()
                    .flatten()
                    .all(|value| value.is_finite() && *value >= 0.0));
            }
            eprintln!("GPU probe: {} engine instances, {} dedicated-memory instances, {} shared-memory instances; open {:.3}ms, collect+format {:.3}ms; no aggregation performed",
                engines.len(), result.dedicated_bytes.as_ref().map_or(0, |rows| rows.len()),
                result.shared_bytes.as_ref().map_or(0, |rows| rows.len()), open_ms, started.elapsed().as_secs_f64() * 1000.0);
            let unmapped_engines = engines
                .keys()
                .filter(|name| super::super::parse_engine_identity(name).is_none())
                .count();
            let unmapped_memory = [&result.dedicated_bytes, &result.shared_bytes]
                .into_iter()
                .flatten()
                .flat_map(|rows| rows.keys())
                .filter(|name| super::super::parse_adapter_identity(name).is_none())
                .count();
            eprintln!("GPU identity probe: {unmapped_engines} unmapped engine instances; {unmapped_memory} unmapped memory instances; no identities logged");
            assert_eq!(unmapped_engines, 0, "host engine grammar requires review");
            assert_eq!(unmapped_memory, 0, "host memory grammar requires review");
            let grouped = result.grouped();
            let groups: Vec<_> = grouped
                .adapters
                .iter()
                .flat_map(|adapter| &adapter.engines)
                .collect();
            assert_eq!(
                groups
                    .iter()
                    .map(|engine| engine.sample_count)
                    .sum::<usize>(),
                engines.len()
            );
            assert_eq!(
                groups
                    .iter()
                    .map(|engine| engine.duplicate_samples)
                    .sum::<usize>(),
                0
            );
            assert!(groups.iter().all(|engine| !engine.type_conflict));
            eprintln!("GPU grouping probe: {} provider adapter identities, {} engine groups, {} unavailable sums, {} out-of-range sums; not hardware enumeration or Task Manager parity",
                grouped.adapters.len(), groups.len(), groups.iter().filter(|engine| engine.observed_percent_sum.is_none()).count(),
                groups.iter().filter(|engine| engine.sum_out_of_range).count());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn identities_preserve_adapter_physical_engine_and_process_scope() {
        let engine = parse_engine_identity(
            "pid_42_luid_0x00000000_0x0000aBcD_phys_1_eng_2_engtype_Video_Decode",
        )
        .unwrap();
        assert_eq!(
            engine.adapter,
            AdapterIdentity {
                luid_high: 0,
                luid_low: 0xabcd,
                physical_index: 1
            }
        );
        assert_eq!(engine.process_id, 42);
        assert_eq!(engine.engine_id, 2);
        assert_eq!(engine.engine_type.as_deref(), Some("Video_Decode"));
        assert_eq!(
            parse_engine_identity("pid_42_luid_0x0_0x1_phys_0_eng_0_engtype_")
                .unwrap()
                .engine_type,
            None
        );
        assert_eq!(
            parse_adapter_identity("luid_0x0_0xABCD_phys_1"),
            Some(engine.adapter)
        );
    }

    #[test]
    fn malformed_aggregate_and_duplicate_suffixes_are_not_device_identities() {
        for name in [
            "_Total",
            "luid_0x0_0x1_phys_0#1",
            "luid_0x100000000_0x1_phys_0",
            "luid_0x0_0x1_phys_4294967296",
            "luid_0x0_0x1_phys_+1",
            "luid_0x_0x1_phys_0",
        ] {
            assert!(parse_adapter_identity(name).is_none(), "{name}");
        }
        let valid = "pid_42_luid_0x0_0x1_phys_0_eng_0_engtype_3D";
        for name in [
            "_Total".to_owned(),
            format!("{valid}#1"),
            valid.replace("pid_42", "pid_-1"),
            valid.replace("eng_0", "eng_4294967296"),
            valid.replace("engtype_3D", "engtype_3D/invalid"),
        ] {
            assert!(parse_engine_identity(&name).is_none(), "{name}");
        }
    }
    #[test]
    fn unavailable_counter_empty_instances_and_observed_zero_remain_distinct() {
        let sample = GpuCounterSnapshot {
            rate_baseline: false,
            engine_utilization: None,
            dedicated_bytes: Some(BTreeMap::new()),
            shared_bytes: Some(BTreeMap::from([("fixture".into(), Some(0.0))])),
        };
        let json = serde_json::to_value(sample).unwrap();
        assert!(json["engineUtilization"].is_null());
        assert_eq!(json["dedicatedBytes"], serde_json::json!({}));
        assert_eq!(json["sharedBytes"]["fixture"], 0.0);
    }
}
