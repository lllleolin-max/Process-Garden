pub(crate) fn valid_value(status: u32, value: f64) -> Option<f64> {
    // PDH_CSTATUS_VALID_DATA (0) or PDH_CSTATUS_NEW_DATA (1).
    ((status == 0 || status == 1) && value.is_finite() && value >= 0.0).then_some(value)
}

#[cfg(windows)]
pub(crate) use windows::read_values;

#[cfg(windows)]
mod windows {
    use super::valid_value;
    use std::{
        collections::BTreeMap,
        mem::{align_of, size_of},
        ptr,
    };
    use windows_sys::Win32::System::Performance::*;
    const MAX_BUFFER: usize = 4 * 1024 * 1024;
    // Checked against installed SDK pdh.h; missing in windows-sys 0.61.
    const FMT_NOCAP100: u32 = 0x0000_8000;

    pub(crate) fn read_values(counter: PDH_HCOUNTER) -> Result<BTreeMap<String, Option<f64>>, u32> {
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
                return Err(if status == 0 {
                    PDH_INVALID_DATA
                } else {
                    status
                });
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
    }
}
