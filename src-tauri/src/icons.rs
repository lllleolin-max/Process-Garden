#![cfg_attr(test, allow(dead_code))]

use std::{collections::HashMap, sync::{Arc, Mutex}};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconRequest {
    pub key: String,
    pub executable_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IconResult {
    pub key: String,
    pub data_url: Option<String>,
}

#[derive(Clone, Default)]
pub struct ProcessIconCache(pub Arc<Mutex<HashMap<String, Option<String>>>>);

pub fn resolve(
    cache: &ProcessIconCache,
    requests: Vec<IconRequest>,
) -> Result<Vec<IconResult>, String> {
    let mut cache = cache
        .0
        .lock()
        .map_err(|_| "process icon cache lock poisoned".to_string())?;

    let results = requests
        .into_iter()
        .take(96)
        .map(|request| {
            let cache_key = request.executable_path.to_lowercase();
            let data_url = cache
                .entry(cache_key)
                .or_insert_with(|| extract_data_url(&request.executable_path))
                .clone();
            IconResult {
                key: request.key,
                data_url,
            }
        })
        .collect::<Vec<_>>();
    Ok(results)
}

#[cfg(windows)]
fn extract_data_url(path: &str) -> Option<String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    extract_icon_png(path).map(|png| format!("data:image/png;base64,{}", STANDARD.encode(png)))
}

#[cfg(not(windows))]
fn extract_data_url(_path: &str) -> Option<String> {
    None
}

#[cfg(windows)]
fn extract_icon_png(path: &str) -> Option<Vec<u8>> {
    use std::{ffi::c_void, io::Cursor, mem::size_of, ptr};
    use windows_sys::Win32::{
        Foundation::HINSTANCE,
        Graphics::Gdi::{
            CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject, SelectObject,
            BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        },
        UI::{
            Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON},
            WindowsAndMessaging::{DestroyIcon, DrawIconEx, DI_NORMAL},
        },
    };

    if path.is_empty() || path.len() > 32_767 || !std::path::Path::new(path).is_file() {
        return None;
    }

    let wide = path.encode_utf16().chain(std::iter::once(0)).collect::<Vec<_>>();
    let mut file_info: SHFILEINFOW = unsafe { std::mem::zeroed() };
    let result = unsafe {
        SHGetFileInfoW(
            wide.as_ptr(),
            0,
            &mut file_info,
            size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        )
    };
    if result == 0 || file_info.hIcon.is_null() {
        return None;
    }

    const SIZE: i32 = 48;
    let dc = unsafe { CreateCompatibleDC(ptr::null_mut()) };
    if dc.is_null() {
        unsafe { DestroyIcon(file_info.hIcon) };
        return None;
    }

    let mut bitmap_info: BITMAPINFO = unsafe { std::mem::zeroed() };
    bitmap_info.bmiHeader = BITMAPINFOHEADER {
        biSize: size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: SIZE,
        biHeight: -SIZE,
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB,
        ..unsafe { std::mem::zeroed() }
    };
    let mut bits: *mut c_void = ptr::null_mut();
    let bitmap = unsafe {
        CreateDIBSection(
            dc,
            &bitmap_info,
            DIB_RGB_COLORS,
            &mut bits,
            ptr::null_mut::<c_void>() as HINSTANCE,
            0,
        )
    };
    if bitmap.is_null() || bits.is_null() {
        unsafe {
            DeleteDC(dc);
            DestroyIcon(file_info.hIcon);
        }
        return None;
    }

    let previous = unsafe { SelectObject(dc, bitmap) };
    let byte_len = (SIZE * SIZE * 4) as usize;
    unsafe { ptr::write_bytes(bits, 0, byte_len) };
    let drawn = unsafe {
        DrawIconEx(
            dc,
            0,
            0,
            file_info.hIcon,
            SIZE,
            SIZE,
            0,
            ptr::null_mut(),
            DI_NORMAL,
        )
    } != 0;

    let mut rgba = if drawn {
        unsafe { std::slice::from_raw_parts(bits.cast::<u8>(), byte_len) }.to_vec()
    } else {
        Vec::new()
    };

    unsafe {
        if !previous.is_null() {
            SelectObject(dc, previous);
        }
        DeleteObject(bitmap);
        DeleteDC(dc);
        DestroyIcon(file_info.hIcon);
    }
    if !drawn {
        return None;
    }

    let has_alpha = rgba.chunks_exact(4).any(|pixel| pixel[3] != 0);
    for pixel in rgba.chunks_exact_mut(4) {
        pixel.swap(0, 2);
        if !has_alpha && (pixel[0] != 0 || pixel[1] != 0 || pixel[2] != 0) {
            pixel[3] = 255;
        } else if pixel[3] > 0 && pixel[3] < 255 {
            let alpha = pixel[3] as u16;
            for channel in &mut pixel[..3] {
                *channel = (((*channel as u16) * 255 / alpha).min(255)) as u8;
            }
        }
    }

    let mut output = Cursor::new(Vec::new());
    {
        let mut encoder = png::Encoder::new(&mut output, SIZE as u32, SIZE as u32);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().ok()?;
        writer.write_image_data(&rgba).ok()?;
    }
    Some(output.into_inner())
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn extracts_a_real_windows_application_icon() {
        let windows = std::env::var("WINDIR").expect("Windows directory exists");
        let explorer = std::path::Path::new(&windows).join("explorer.exe");
        let icon = extract_data_url(&explorer.to_string_lossy()).expect("Explorer icon extracts");
        assert!(icon.starts_with("data:image/png;base64,"));
    }
}
