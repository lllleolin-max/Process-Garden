use serde::Serialize;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PowerSource {
    Battery,
    Intel,
    #[default]
    Unavailable,
}

#[derive(Debug, Clone, Copy, Default, Serialize)]
pub struct PowerReading {
    pub watts: Option<f64>,
    pub source: PowerSource,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSnapshot {
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    pub started_at: u64,
    pub status: &'static str,
    pub thread_count: usize,
    pub executable_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSnapshot {
    pub timestamp: u64,
    pub cpu_percent: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub process_count: usize,
    pub thread_count: usize,
    pub logical_cpu_count: usize,
    pub uptime_seconds: u64,
    pub power: PowerReading,
    pub processes: Vec<ProcessSnapshot>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_frontend_field_names() {
        let value = serde_json::to_value(SystemSnapshot {
            timestamp: 1,
            cpu_percent: 2.0,
            memory_used_bytes: 3,
            memory_total_bytes: 4,
            process_count: 5,
            thread_count: 6,
            logical_cpu_count: 8,
            uptime_seconds: 7,
            power: PowerReading::default(),
            processes: Vec::new(),
        })
        .expect("snapshot serializes");
        assert_eq!(value["logicalCpuCount"], 8);
        assert_eq!(value["memoryUsedBytes"], 3);
        assert!(value["power"]["watts"].is_null());
        assert_eq!(value["power"]["source"], "unavailable");
    }

    #[test]
    fn serializes_power_source_without_changing_its_scope() {
        let reading = serde_json::to_value(PowerReading {
            watts: Some(3.25),
            source: PowerSource::Intel,
        }).expect("power reading serializes");
        assert_eq!(reading["watts"], 3.25);
        assert_eq!(reading["source"], "intel");
    }
}
