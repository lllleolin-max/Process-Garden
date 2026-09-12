use crate::models::PowerReading;

#[cfg(windows)]
pub use windows::PowerSampler;

#[cfg(not(windows))]
#[derive(Default)]
pub struct PowerSampler;

#[cfg(not(windows))]
impl PowerSampler {
    pub fn sample(&mut self) -> PowerReading {
        PowerReading::default()
    }
}

#[cfg(windows)]
mod windows {
    use super::PowerReading;
    use crate::models::PowerSource;
    use std::{
        ffi::c_void,
        mem, ptr,
        time::{Duration, Instant},
    };
    use windows_sys::Win32::{
        Foundation::{FreeLibrary, HMODULE},
        System::{
            LibraryLoader::{GetProcAddress, LoadLibraryExW, LOAD_LIBRARY_SEARCH_SYSTEM32},
            Power::{CallNtPowerInformation, SystemBatteryState, SYSTEM_BATTERY_STATE},
        },
    };

    const RETRY_INTERVAL: Duration = Duration::from_secs(60);
    const MAX_SAMPLE_GAP: Duration = Duration::from_secs(30);
    const MAX_HANDLES: usize = 16;
    const PACKAGE_DOMAIN: u32 = 2;

    #[derive(Default)]
    pub struct PowerSampler {
        intel: Option<IntelSampler>,
        retry_at: Option<Instant>,
    }

    impl PowerSampler {
        pub fn sample(&mut self) -> PowerReading {
            if let Some(watts) = read_battery() {
                if let Some(intel) = &mut self.intel {
                    for domain in &mut intel.domains {
                        domain.previous = None;
                    }
                    intel.last_sample = None;
                }
                return PowerReading {
                    watts: Some(watts),
                    source: PowerSource::Battery,
                };
            }

            let now = Instant::now();
            if self.intel.is_none() && self.retry_at.is_none_or(|retry| now >= retry) {
                self.intel = IntelSampler::open();
                self.retry_at = Some(now + RETRY_INTERVAL);
            }
            match self.intel.as_mut().map(|sampler| sampler.sample(now)) {
                Some(Ok(Some(watts))) => PowerReading {
                    watts: Some(watts),
                    source: PowerSource::Intel,
                },
                Some(Err(())) => {
                    self.intel = None;
                    self.retry_at = Some(now + RETRY_INTERVAL);
                    PowerReading::default()
                }
                _ => PowerReading::default(),
            }
        }
    }

    fn read_battery() -> Option<f64> {
        let mut state = SYSTEM_BATTERY_STATE::default();
        // Read-only information level, with no input policy or configuration.
        let status = unsafe {
            CallNtPowerInformation(
                SystemBatteryState,
                ptr::null(),
                0,
                ptr::addr_of_mut!(state).cast(),
                mem::size_of_val(&state) as u32,
            )
        };
        (status == 0).then(|| battery_watts(&state)).flatten()
    }

    fn battery_watts(state: &SYSTEM_BATTERY_STATE) -> Option<f64> {
        // An AC-connected battery can supplement its charger: that discharge
        // alone would under-report system use. Charging power is not system use.
        if !state.BatteryPresent || state.AcOnLine || state.Charging || !state.Discharging {
            return None;
        }
        // Microsoft specifies a signed LONG despite the DWORD field in the ABI.
        // https://learn.microsoft.com/windows/win32/api/winnt/ns-winnt-system_battery_state
        let rate = state.Rate as i32;
        if rate >= 0 || rate == -1 || rate == i32::MIN {
            return None;
        }
        Some(-f64::from(rate) / 1_000.0)
    }

    type Handle = *mut c_void;
    type Init = unsafe extern "C" fn(u32) -> u32;
    type DriverGet = unsafe extern "C" fn(*mut u32, *mut Handle) -> u32;
    type Enumerate = unsafe extern "C" fn(Handle, *mut u32, *mut Handle) -> u32;
    type GetProperties = unsafe extern "C" fn(Handle, *mut PowerProperties) -> u32;
    type GetEnergy = unsafe extern "C" fn(Handle, *mut EnergyCounter) -> u32;

    // Minimal ABI declarations from the oneAPI Level Zero Sysman specification:
    // https://oneapi-src.github.io/level-zero-spec/level-zero/latest/sysman/api/apis/power.html
    // https://oneapi-src.github.io/level-zero-spec/level-zero/latest/sysman/api/extensions/power.html
    #[repr(C)]
    #[derive(Default)]
    struct PowerProperties {
        stype: u32,
        next: *mut c_void,
        on_subdevice: u8,
        subdevice_id: u32,
        can_control: u8,
        energy_threshold_supported: u8,
        default_limit: i32,
        min_limit: i32,
        max_limit: i32,
    }

    #[repr(C)]
    #[derive(Default)]
    struct PowerPropertiesExt {
        stype: u32,
        next: *mut c_void,
        domain: u32,
        default_limit: *mut c_void,
    }

    #[repr(C)]
    #[derive(Clone, Copy, Debug, Default)]
    struct EnergyCounter {
        energy: u64,
        timestamp: u64,
    }

    fn counter_watts(previous: EnergyCounter, current: EnergyCounter) -> Option<f64> {
        let elapsed = current.timestamp.checked_sub(previous.timestamp)?;
        let energy = current.energy.checked_sub(previous.energy)?;
        if previous.timestamp == 0 || elapsed == 0 || elapsed > MAX_SAMPLE_GAP.as_micros() as u64 {
            return None;
        }
        // Both are micro-units, so microjoules / microseconds already gives W.
        Some(energy as f64 / elapsed as f64)
    }

    struct Library(HMODULE);

    impl Drop for Library {
        fn drop(&mut self) {
            unsafe { FreeLibrary(self.0) };
        }
    }

    struct Domain {
        handle: Handle,
        previous: Option<EnergyCounter>,
    }

    struct IntelSampler {
        _library: Library,
        get_energy: GetEnergy,
        domains: Vec<Domain>,
        last_sample: Option<Instant>,
    }

    // The module and driver handles are process-wide. Sysman permits these calls
    // from different threads; SystemCollector serializes them behind its mutex.
    unsafe impl Send for IntelSampler {}

    fn enumerate_handles(
        mut enumerate: impl FnMut(*mut u32, *mut Handle) -> u32,
    ) -> Option<Vec<Handle>> {
        let mut count = 0;
        if enumerate(&mut count, ptr::null_mut()) != 0 || count as usize > MAX_HANDLES {
            return None;
        }
        if count == 0 {
            return Some(Vec::new());
        }
        let capacity = count as usize;
        let mut handles = vec![ptr::null_mut(); capacity];
        if enumerate(&mut count, handles.as_mut_ptr()) != 0 || count as usize > capacity {
            return None;
        }
        handles.truncate(count as usize);
        (!handles.iter().any(|handle| handle.is_null())).then_some(handles)
    }

    impl IntelSampler {
        fn open() -> Option<Self> {
            let filename: Vec<u16> = "ze_loader.dll\0".encode_utf16().collect();
            // Never search the working directory, PATH, or theme folders for DLLs.
            let module = unsafe {
                LoadLibraryExW(
                    filename.as_ptr(),
                    ptr::null_mut(),
                    LOAD_LIBRARY_SEARCH_SYSTEM32,
                )
            };
            if module.is_null() {
                return None;
            }
            let library = Library(module);
            macro_rules! symbol {
                ($name:literal, $signature:ty) => {
                    mem::transmute::<unsafe extern "system" fn() -> isize, $signature>(
                        GetProcAddress(library.0, concat!($name, "\0").as_ptr())?,
                    )
                };
            }
            // ZE_APICALL is __cdecl; GetProcAddress's generic pointer is cast to
            // each exact Level Zero C signature before it is called.
            let (init, drivers, devices, powers, properties, get_energy) = unsafe {
                (
                    symbol!("zesInit", Init),
                    symbol!("zesDriverGet", DriverGet),
                    symbol!("zesDeviceGet", Enumerate),
                    symbol!("zesDeviceEnumPowerDomains", Enumerate),
                    symbol!("zesPowerGetProperties", GetProperties),
                    symbol!("zesPowerGetEnergyCounter", GetEnergy),
                )
            };
            if unsafe { init(0) } != 0 {
                return None;
            }
            let driver_handles =
                enumerate_handles(|count, handles| unsafe { drivers(count, handles) })?;
            let mut domains = Vec::new();
            for driver in driver_handles {
                for device in
                    enumerate_handles(|count, handles| unsafe { devices(driver, count, handles) })?
                {
                    let mut package = None;
                    for power in enumerate_handles(|count, handles| unsafe {
                        powers(device, count, handles)
                    })? {
                        let mut ext = PowerPropertiesExt {
                            stype: 0x28,
                            ..Default::default()
                        };
                        let mut props = PowerProperties {
                            stype: 0xd,
                            next: ptr::addr_of_mut!(ext).cast(),
                            ..Default::default()
                        };
                        if unsafe { properties(power, &mut props) } == 0
                            && props.on_subdevice == 0
                            && ext.domain == PACKAGE_DOMAIN
                        {
                            // Do not sum overlapping package/card/subdevice sensors.
                            if package.replace(power).is_some() {
                                return None;
                            }
                        }
                    }
                    // A missing device sensor makes a multi-device total incomplete.
                    domains.push(Domain {
                        handle: package?,
                        previous: None,
                    });
                    if domains.len() > MAX_HANDLES {
                        return None;
                    }
                }
            }
            if domains.is_empty() {
                return None;
            }
            Some(Self {
                _library: library,
                get_energy,
                domains,
                last_sample: None,
            })
        }

        fn sample(&mut self, now: Instant) -> Result<Option<f64>, ()> {
            if self
                .last_sample
                .is_some_and(|previous| now.duration_since(previous) > MAX_SAMPLE_GAP)
            {
                for domain in &mut self.domains {
                    domain.previous = None;
                }
            }
            self.last_sample = Some(now);
            let mut total = Some(0.0);
            for domain in &mut self.domains {
                let mut current = EnergyCounter::default();
                if unsafe { (self.get_energy)(domain.handle, &mut current) } != 0 {
                    return Err(());
                }
                let watts = domain
                    .previous
                    .replace(current)
                    .and_then(|previous| counter_watts(previous, current));
                total = total.zip(watts).map(|(sum, watts)| sum + watts);
            }
            Ok(total)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn sysman_abi_matches_c_headers() {
            let pointer_size = mem::size_of::<Handle>();
            assert_eq!(mem::size_of::<PowerProperties>(), 24 + pointer_size * 2);
            assert_eq!(mem::offset_of!(PowerProperties, next), pointer_size);
            assert_eq!(
                mem::offset_of!(PowerProperties, on_subdevice),
                pointer_size * 2
            );
            assert_eq!(
                mem::offset_of!(PowerProperties, subdevice_id),
                pointer_size * 2 + 4
            );
            assert_eq!(
                mem::offset_of!(PowerProperties, can_control),
                pointer_size * 2 + 8
            );
            assert_eq!(
                mem::offset_of!(PowerProperties, energy_threshold_supported),
                pointer_size * 2 + 9
            );
            assert_eq!(
                mem::offset_of!(PowerProperties, default_limit),
                pointer_size * 2 + 12
            );
            assert_eq!(mem::size_of::<PowerPropertiesExt>(), pointer_size * 4);
            assert_eq!(
                mem::offset_of!(PowerPropertiesExt, domain),
                pointer_size * 2
            );
            assert_eq!(mem::size_of::<EnergyCounter>(), 16);
        }

        #[test]
        fn battery_discharge_uses_signed_milliwatts() {
            let state = SYSTEM_BATTERY_STATE {
                BatteryPresent: true,
                Discharging: true,
                Rate: (-18_250_i32) as u32,
                ..Default::default()
            };
            assert_eq!(battery_watts(&state), Some(18.25));
        }

        #[test]
        fn battery_does_not_report_charging_hybrid_or_unknown_power() {
            let mut state = SYSTEM_BATTERY_STATE {
                BatteryPresent: true,
                Discharging: true,
                Rate: (-18_250_i32) as u32,
                ..Default::default()
            };
            state.AcOnLine = true;
            assert_eq!(battery_watts(&state), None);
            state.AcOnLine = false;
            state.Charging = true;
            assert_eq!(battery_watts(&state), None);
            state.Charging = false;
            for rate in [0, 18_250, u32::MAX, i32::MIN as u32] {
                state.Rate = rate;
                assert_eq!(battery_watts(&state), None);
            }
            state.Rate = (-18_250_i32) as u32;
            state.BatteryPresent = false;
            assert_eq!(battery_watts(&state), None);
        }

        #[test]
        fn energy_delta_is_watts_and_preserves_64_bit_counters() {
            let previous = EnergyCounter {
                energy: 15_000_000_000,
                timestamp: 3_000_000_000,
            };
            let current = EnergyCounter {
                energy: previous.energy + 6_400_000,
                timestamp: previous.timestamp + 2_000_000,
            };
            assert_eq!(counter_watts(previous, current), Some(3.2));
            assert_eq!(
                counter_watts(
                    previous,
                    EnergyCounter {
                        energy: previous.energy,
                        ..current
                    }
                ),
                Some(0.0)
            );
        }

        #[test]
        fn counter_resets_missing_time_and_long_gaps_are_not_power_spikes() {
            let previous = EnergyCounter {
                energy: 1_000,
                timestamp: 1_000,
            };
            for current in [
                EnergyCounter {
                    energy: 999,
                    timestamp: 2_000,
                },
                EnergyCounter {
                    energy: 2_000,
                    timestamp: 999,
                },
                EnergyCounter {
                    energy: 2_000,
                    timestamp: 1_000,
                },
                EnergyCounter {
                    energy: 2_000,
                    timestamp: 31_001_000,
                },
            ] {
                assert_eq!(counter_watts(previous, current), None);
            }
            assert_eq!(counter_watts(EnergyCounter::default(), previous), None);
        }

        #[test]
        fn enumeration_rejects_unbounded_or_changed_counts_and_null_handles() {
            assert!(enumerate_handles(|count, _| {
                unsafe {
                    *count = 17;
                }
                0
            })
            .is_none());
            assert!(enumerate_handles(|count, handles| {
                unsafe {
                    *count = if handles.is_null() { 1 } else { 2 };
                }
                0
            })
            .is_none());
            assert!(enumerate_handles(|count, _| {
                unsafe {
                    *count = 1;
                }
                0
            })
            .is_none());
        }

        #[test]
        fn native_power_reading_is_available_or_explicitly_missing() {
            let mut sampler = PowerSampler::default();
            let first = sampler.sample();
            std::thread::sleep(Duration::from_millis(250));
            let second = sampler.sample();
            println!("native power samples: {first:?}, {second:?}");
            for reading in [first, second] {
                match reading.watts {
                    Some(watts) => {
                        assert!(watts.is_finite() && watts >= 0.0);
                        assert_ne!(reading.source, PowerSource::Unavailable);
                    }
                    None => assert_eq!(reading.source, PowerSource::Unavailable),
                }
            }
        }
    }
}
