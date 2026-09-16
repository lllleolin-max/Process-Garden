//! Raw GPU provider observations. Aggregation and device identity validation must
//! precede a UI claim of total GPU utilization or per-process attribution.
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuCounterSnapshot {
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
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unavailable_counter_empty_instances_and_observed_zero_remain_distinct() {
        let sample = GpuCounterSnapshot {
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
