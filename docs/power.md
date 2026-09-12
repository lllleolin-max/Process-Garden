# Local power readings

The sidebar and wallpaper HUD show watts, with one decimal place. The sidebar includes the last 36 uninterrupted samples from the same source. Readings follow the system sampling interval; pausing retains the displayed value with a paused label. Live readings that stop updating are replaced by a dash after three sampling intervals (at least five seconds). History remains bounded by the existing 120-snapshot limit.

## Measurement sources

1. **Battery discharge / 本机功耗**: Windows `CallNtPowerInformation(SystemBatteryState)` reports battery discharge in milliwatts. Used only when a battery is present, unplugged, discharging, and its signed rate is valid. Charging or AC-assisted discharge is not computer power, so it is rejected. The result is battery-side system draw, not wall-socket consumption.
2. **Intel package / 封装功耗**: The installed `ze_loader.dll` exposes Level Zero Sysman energy counters. The sampler accepts explicitly identified, non-subdevice `PACKAGE` domains, one per device, and divides energy change in microjoules by timestamp change in microseconds. It never adds overlapping card, GPU, memory or subdevice domains. The components measured by a package domain depend on hardware; the UI does not call this whole-computer power or CPU-only/GPU-only power. Every enumerated device must have a usable package domain, otherwise no Intel aggregate is shown.
3. **Unavailable**: Missing drivers, unsupported sensors, API errors, the first energy sample, counter resets and long sampling gaps produce `null` watts. Unavailable is never converted into 0 W. Initialization failures retry after 60 seconds. No driver installation or administrator elevation is performed.

Battery readings take priority. On AC power the app can still show a supported Intel package reading. Other GPU vendors and wall-socket meters are not supported by this implementation. The browser demo is explicitly labelled as simulated; requesting live data in a browser or falling back after a collector failure never exposes demo watts as a measurement of the computer.

## Local validation

On the development machine, an Intel Arc B390 with its existing Windows driver exposed one `PACKAGE` power domain. Read-only probes successfully measured approximately 3–4 W between energy samples. These are transient package readings, not a specification of the device or a whole-machine measurement. The plugged-in battery reported charging, which the collector correctly excludes from system draw.

## API references

- [Microsoft SYSTEM_BATTERY_STATE](https://learn.microsoft.com/windows/win32/api/winnt/ns-winnt-system_battery_state): signed charging/discharging rate and units.
- [Intel Level Zero Sysman power API](https://oneapi-src.github.io/level-zero-spec/level-zero/latest/sysman/api/apis/power.html): energy counters and timestamps.
- [Intel power property extensions](https://oneapi-src.github.io/level-zero-spec/level-zero/latest/sysman/api/extensions/power.html): explicit power domain classification.
