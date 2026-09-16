//! Provider-scoped observations, not a validated Task Manager utilization total.
use super::{parse_adapter_identity, parse_engine_identity, AdapterIdentity, GpuCounterSnapshot};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CounterCoverage {
    pub available: bool,
    pub unmapped_instances: usize,
    pub aggregate_instances: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupedSnapshot {
    pub adapters: Vec<AdapterObservation>,
    pub engine_coverage: CounterCoverage,
    pub dedicated_coverage: CounterCoverage,
    pub shared_coverage: CounterCoverage,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdapterObservation {
    pub id: String,
    pub engines: Vec<EngineObservation>,
    pub dedicated: MemoryObservation,
    pub shared: MemoryObservation,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineObservation {
    pub id: u32,
    pub engine_type: Option<String>,
    pub type_conflict: bool,
    pub sample_count: usize,
    pub invalid_samples: usize,
    pub duplicate_samples: usize,
    pub sum_out_of_range: bool,
    /// Sum only within this physical engine; never summed across engines.
    /// None if coverage/identity/value is ambiguous. No clamping or zero fill.
    pub observed_percent_sum: Option<f64>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryObservation {
    pub bytes: Option<f64>,
    pub sample_count: usize,
    pub invalid_samples: usize,
}

#[derive(Default)]
struct EngineBuilder {
    types: BTreeSet<String>,
    pids: BTreeSet<u32>,
    samples: usize,
    invalid: usize,
    duplicates: usize,
    sum: f64,
}

#[derive(Default)]
struct AdapterBuilder {
    engines: BTreeMap<u32, EngineBuilder>,
    dedicated: MemoryObservation,
    shared: MemoryObservation,
}

fn nonnegative(value: Option<f64>) -> Option<f64> {
    value.filter(|value| value.is_finite() && *value >= 0.0)
}

fn memory_rows(
    rows: &Option<BTreeMap<String, Option<f64>>>,
    adapters: &mut BTreeMap<AdapterIdentity, AdapterBuilder>,
    dedicated: bool,
) -> CounterCoverage {
    let mut coverage = CounterCoverage {
        available: rows.is_some(),
        ..Default::default()
    };
    for (name, value) in rows.iter().flatten() {
        if name == "_Total" {
            coverage.aggregate_instances += 1;
        } else if let Some(identity) = parse_adapter_identity(name) {
            let adapter = adapters.entry(identity).or_default();
            let memory = if dedicated {
                &mut adapter.dedicated
            } else {
                &mut adapter.shared
            };
            memory.sample_count += 1;
            let valid = nonnegative(*value);
            memory.invalid_samples += usize::from(valid.is_none());
            // Normalized aliases are ambiguous even if their values happen to agree.
            memory.bytes = if memory.sample_count == 1 {
                valid
            } else {
                None
            };
        } else {
            coverage.unmapped_instances += 1;
        }
    }
    coverage
}

impl GpuCounterSnapshot {
    pub fn grouped(&self) -> GroupedSnapshot {
        let mut adapters: BTreeMap<AdapterIdentity, AdapterBuilder> = BTreeMap::new();
        let mut engine_coverage = CounterCoverage {
            available: self.engine_utilization.is_some(),
            ..Default::default()
        };
        for (name, value) in self.engine_utilization.iter().flatten() {
            if name == "_Total" {
                engine_coverage.aggregate_instances += 1;
                continue;
            }
            let Some(identity) = parse_engine_identity(name) else {
                engine_coverage.unmapped_instances += 1;
                continue;
            };
            let engine = adapters
                .entry(identity.adapter)
                .or_default()
                .engines
                .entry(identity.engine_id)
                .or_default();
            engine.samples += 1;
            engine.duplicates += usize::from(!engine.pids.insert(identity.process_id));
            if let Some(kind) = identity.engine_type {
                engine.types.insert(kind);
            }
            match nonnegative(*value).filter(|value| *value <= 100.0) {
                Some(value) => engine.sum += value,
                None => engine.invalid += 1,
            }
        }
        let dedicated_coverage = memory_rows(&self.dedicated_bytes, &mut adapters, true);
        let shared_coverage = memory_rows(&self.shared_bytes, &mut adapters, false);
        let adapters = adapters
            .into_iter()
            .map(|(identity, adapter)| {
                let engines = adapter
                    .engines
                    .into_iter()
                    .map(|(id, engine)| {
                        let conflict = engine.types.len() > 1;
                        let valid = engine.invalid == 0
                            && engine.duplicates == 0
                            && !conflict
                            && engine.sum.is_finite()
                            && engine.sum <= 100.0
                            && engine_coverage.unmapped_instances == 0;
                        EngineObservation {
                            id,
                            engine_type: if conflict {
                                None
                            } else {
                                engine.types.into_iter().next()
                            },
                            type_conflict: conflict,
                            sample_count: engine.samples,
                            invalid_samples: engine.invalid,
                            duplicate_samples: engine.duplicates,
                            sum_out_of_range: !engine.sum.is_finite() || engine.sum > 100.0,
                            observed_percent_sum: valid.then_some(engine.sum),
                        }
                    })
                    .collect();
                AdapterObservation {
                    id: format!(
                        "luid_{:08x}_{:08x}_phys_{}",
                        identity.luid_high, identity.luid_low, identity.physical_index
                    ),
                    engines,
                    dedicated: adapter.dedicated,
                    shared: adapter.shared,
                }
            })
            .collect();
        GroupedSnapshot {
            adapters,
            engine_coverage,
            dedicated_coverage,
            shared_coverage,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn engine(pid: u32, phys: u32, id: u32, kind: &str) -> String {
        format!("pid_{pid}_luid_0x0_0x1_phys_{phys}_eng_{id}_engtype_{kind}")
    }
    fn snapshot(rows: Vec<(String, Option<f64>)>) -> GpuCounterSnapshot {
        GpuCounterSnapshot {
            engine_utilization: Some(rows.into_iter().collect()),
            dedicated_bytes: None,
            shared_bytes: None,
        }
    }
    #[test]
    fn isolates_physical_engines_and_keeps_zero_and_unknown_types() {
        let grouped = snapshot(vec![
            (engine(1, 0, 0, "3D"), Some(20.0)),
            (engine(2, 0, 0, "3D"), Some(30.0)),
            (engine(1, 0, 1, ""), Some(80.0)),
            (engine(1, 1, 0, "Copy"), Some(0.0)),
        ])
        .grouped();
        assert_eq!(grouped.adapters.len(), 2);
        let engines = &grouped.adapters[0].engines;
        assert_eq!(engines[0].observed_percent_sum, Some(50.0));
        assert_eq!(engines[1].observed_percent_sum, Some(80.0));
        assert_eq!(engines[1].engine_type, None);
        assert_eq!(
            grouped.adapters[1].engines[0].observed_percent_sum,
            Some(0.0)
        );
        assert!(!grouped.dedicated_coverage.available);
    }
    #[test]
    fn incomplete_invalid_overrange_and_conflicting_engines_are_not_zero_or_clamped() {
        for values in [
            (Some(20.0), None),
            (Some(60.0), Some(60.0)),
            (Some(f64::NAN), Some(0.0)),
            (Some(-1.0), Some(0.0)),
            (Some(f64::INFINITY), Some(0.0)),
            (Some(101.0), Some(0.0)),
        ] {
            let grouped = snapshot(vec![
                (engine(1, 0, 0, "3D"), values.0),
                (engine(2, 0, 0, "3D"), values.1),
            ])
            .grouped();
            assert_eq!(grouped.adapters[0].engines[0].observed_percent_sum, None);
        }
        let grouped = snapshot(vec![
            (engine(1, 0, 0, "3D"), Some(10.0)),
            (engine(2, 0, 0, "Copy"), Some(10.0)),
        ])
        .grouped();
        assert!(grouped.adapters[0].engines[0].type_conflict);
        assert_eq!(grouped.adapters[0].engines[0].observed_percent_sum, None);
    }
    #[test]
    fn normalized_alias_duplicates_cannot_double_count() {
        let key = engine(1, 0, 0, "3D");
        let grouped = snapshot(vec![
            (key.clone(), Some(10.0)),
            (key.replace("0x1", "0x00000001"), Some(10.0)),
        ])
        .grouped();
        let row = &grouped.adapters[0].engines[0];
        assert_eq!(row.duplicate_samples, 1);
        assert_eq!(row.observed_percent_sum, None);
    }
    #[test]
    fn full_luid_components_separate_adapters_and_bad_memory_is_unknown() {
        let key = engine(1, 0, 0, "3D");
        let mut raw = snapshot(vec![
            (key.clone(), Some(1.0)),
            (key.replace("0x0_0x1", "0x1_0x1"), Some(2.0)),
            (key.replace("0x0_0x1", "0x0_0x2"), Some(3.0)),
        ]);
        raw.shared_bytes = Some(BTreeMap::from([
            ("luid_0x0_0x1_phys_0".into(), Some(-1.0)),
            ("_Total".into(), Some(0.0)),
            ("unknown".into(), None),
        ]));
        let grouped = raw.grouped();
        assert_eq!(grouped.adapters.len(), 3);
        assert_eq!(grouped.adapters[0].shared.bytes, None);
        assert_eq!(grouped.adapters[0].shared.invalid_samples, 1);
        assert_eq!(grouped.shared_coverage.aggregate_instances, 1);
        assert_eq!(grouped.shared_coverage.unmapped_instances, 1);
        assert_eq!(
            grouped.adapters[2].engines[0].observed_percent_sum,
            Some(2.0)
        );
    }
    #[test]
    fn unmapped_instances_invalidate_sums_but_aggregate_rows_are_not_devices() {
        let grouped = snapshot(vec![
            (engine(1, 0, 0, "3D"), Some(0.0)),
            ("unknown".into(), Some(50.0)),
            ("_Total".into(), Some(50.0)),
        ])
        .grouped();
        assert_eq!(grouped.adapters.len(), 1);
        assert_eq!(grouped.engine_coverage.unmapped_instances, 1);
        assert_eq!(grouped.engine_coverage.aggregate_instances, 1);
        assert_eq!(grouped.adapters[0].engines[0].observed_percent_sum, None);
    }
    #[test]
    fn memory_only_adapters_and_counter_availability_are_preserved() {
        let mut raw = snapshot(vec![]);
        raw.engine_utilization = None;
        raw.dedicated_bytes = Some(BTreeMap::from([("luid_0x0_0x1_phys_0".into(), Some(0.0))]));
        raw.shared_bytes = Some(BTreeMap::new());
        let grouped = raw.grouped();
        assert!(!grouped.engine_coverage.available);
        assert!(grouped.shared_coverage.available);
        assert!(grouped.adapters[0].engines.is_empty());
        assert_eq!(grouped.adapters[0].dedicated.bytes, Some(0.0));
        assert_eq!(grouped.adapters[0].shared.bytes, None);
        raw.dedicated_bytes
            .as_mut()
            .unwrap()
            .insert("luid_0x0_0x00000001_phys_0".into(), Some(0.0));
        let grouped = raw.grouped();
        assert_eq!(grouped.adapters[0].dedicated.sample_count, 2);
        assert_eq!(grouped.adapters[0].dedicated.bytes, None);
        let json = serde_json::to_value(grouped).unwrap();
        assert!(json["adapters"][0]["dedicated"]["bytes"].is_null());
        assert!(!json.to_string().contains("processId"));
    }
}
