//! Read-only logical-adapter labels. A LUID matches a DXGI adapter, not necessarily
//! one physical node; never assign per-node memory capacity from this description.
use serde::Serialize;
use std::collections::BTreeMap;

pub type DeviceMap = BTreeMap<(u32, u32), DeviceInfo>;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub name: String,
    pub software: bool,
}

fn adapter_name(wide: &[u16]) -> Option<String> {
    let end = wide.iter().position(|unit| *unit == 0)?;
    if end == 0 || end > 127 {
        return None;
    }
    let name = String::from_utf16(&wide[..end]).ok()?;
    let name = name.trim();
    if name.is_empty()
        || name.chars().any(|c| {
            c.is_control() || matches!(c, '\u{202a}'..='\u{202e}' | '\u{2066}'..='\u{2069}')
        })
    {
        return None;
    }
    Some(name.to_owned())
}

#[cfg(windows)]
pub(crate) use native::DeviceCatalog;

#[cfg(windows)]
mod native {
    use super::*;
    use ::windows::Win32::Graphics::Dxgi::{
        CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE, DXGI_ERROR_NOT_FOUND,
    };
    use std::time::{Duration, Instant};

    #[derive(Default)]
    pub(crate) struct DeviceCatalog {
        factory: Option<IDXGIFactory1>,
        devices: DeviceMap,
        retry_after: Option<Instant>,
    }

    impl DeviceCatalog {
        pub(crate) fn devices(&mut self, deadline: Instant) -> &DeviceMap {
            let now = Instant::now();
            if self
                .factory
                .as_ref()
                .is_some_and(|factory| unsafe { factory.IsCurrent().as_bool() })
            {
                return &self.devices;
            }
            // A changed adapter set invalidates names even if rediscovery fails.
            self.factory = None;
            self.devices.clear();
            if now >= deadline || self.retry_after.is_some_and(|retry| now < retry) {
                return &self.devices;
            }
            match enumerate(deadline) {
                Ok((factory, devices)) => {
                    self.factory = Some(factory);
                    self.devices = devices;
                    self.retry_after = None;
                }
                Err(_) => {
                    self.retry_after = Some(Instant::now() + Duration::from_secs(5));
                }
            }
            &self.devices
        }
    }

    fn enumerate(deadline: Instant) -> Result<(IDXGIFactory1, DeviceMap), String> {
        let factory: IDXGIFactory1 = unsafe { CreateDXGIFactory1() }.map_err(|e| e.to_string())?;
        let mut devices = DeviceMap::new();
        for index in 0..=256 {
            if Instant::now() >= deadline {
                return Err("GPU device enumeration expired".into());
            }
            let adapter = match unsafe { factory.EnumAdapters1(index) } {
                Ok(adapter) => adapter,
                Err(error) if error.code() == DXGI_ERROR_NOT_FOUND => {
                    if !unsafe { factory.IsCurrent().as_bool() } {
                        return Err("GPU adapters changed during enumeration".into());
                    }
                    return Ok((factory, devices));
                }
                Err(error) => return Err(error.to_string()),
            };
            if index == 256 {
                return Err("GPU device enumeration limit exceeded".into());
            }
            let description = unsafe { adapter.GetDesc1() }.map_err(|e| e.to_string())?;
            let name =
                adapter_name(&description.Description).ok_or("invalid GPU device description")?;
            let id = (
                description.AdapterLuid.HighPart as u32,
                description.AdapterLuid.LowPart,
            );
            let device = DeviceInfo {
                name,
                software: description.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32 != 0,
            };
            if devices.insert(id, device).is_some() {
                return Err("duplicate GPU adapter LUID".into());
            }
        }
        unreachable!("bounded enumeration returns at limit")
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn unavailable_catalog_drops_stale_names_without_bypassing_backoff_or_deadline() {
            let mut catalog = DeviceCatalog::default();
            catalog.devices.insert(
                (0, 1),
                DeviceInfo {
                    name: "old adapter".into(),
                    software: false,
                },
            );
            catalog.retry_after = Some(Instant::now() + Duration::from_secs(5));
            assert!(catalog
                .devices(Instant::now() + Duration::from_secs(1))
                .is_empty());
            assert!(catalog.factory.is_none());
            assert!(catalog.retry_after.is_some());
            catalog.retry_after = None;
            assert!(catalog.devices(Instant::now()).is_empty());
            assert!(catalog.factory.is_none());
        }
        #[test]
        #[ignore = "explicit read-only DXGI device enumeration probe"]
        fn native_device_catalog_probe() {
            let mut catalog = DeviceCatalog::default();
            let started = Instant::now();
            let devices = catalog.devices(Instant::now() + Duration::from_secs(4));
            assert!(!devices.is_empty());
            let count = devices.len();
            let software = devices.values().filter(|device| device.software).count();
            let first_ms = started.elapsed().as_secs_f64() * 1000.0;
            let started = Instant::now();
            assert_eq!(
                catalog
                    .devices(Instant::now() + Duration::from_secs(4))
                    .len(),
                count
            );
            eprintln!("DXGI device probe: {count} logical adapter descriptions, {software} software; first {first_ms:.3}ms, cached {:.3}ms; no names or identities logged", started.elapsed().as_secs_f64()*1000.0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn names_require_bounded_terminated_utf16_without_control_characters() {
        assert_eq!(
            adapter_name(&"  Vendor GPU ®  \0".encode_utf16().collect::<Vec<_>>()),
            Some("Vendor GPU ®".into())
        );
        assert_eq!(adapter_name(&[65, 66]), None);
        assert_eq!(adapter_name(&[0]), None);
        assert_eq!(adapter_name(&[0xd800, 0]), None);
        assert_eq!(adapter_name(&[65, 10, 66, 0]), None);
        assert_eq!(adapter_name(&[65, 0x202e, 66, 0]), None);
        assert_eq!(adapter_name(&vec![65; 129]), None);
    }
}
