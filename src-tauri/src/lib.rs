mod collector;
mod icons;
mod models;
mod power;
pub mod process_io;
pub mod network;

#[cfg(not(test))]
use collector::SystemCollector;
#[cfg(not(test))]
use models::SystemSnapshot;
#[cfg(not(test))]
use icons::{IconRequest, IconResult, ProcessIconCache};

#[cfg(not(test))]
#[tauri::command]
async fn sample_system(collector: tauri::State<'_, SystemCollector>) -> Result<SystemSnapshot, String> {
    let collector = collector.inner().clone();
    tauri::async_runtime::spawn_blocking(move || collector::sample(&collector))
        .await
        .map_err(|error| format!("system sampling worker failed: {error}"))?
}

#[cfg(not(test))]
#[tauri::command]
async fn sample_process_io(reader: tauri::State<'_, process_io::ProcessIoReader>, pid: u32, started_at: u64, session: String) -> Result<Option<process_io::IoRates>, String> {
    let reader = reader.inner().clone();
    tauri::async_runtime::spawn_blocking(move || reader.sample(pid, started_at, session))
        .await.map_err(|error| format!("process I/O worker failed: {error}"))?
}

#[cfg(not(test))]
#[tauri::command]
fn platform_name() -> &'static str {
    std::env::consts::OS
}

#[cfg(not(test))]
#[tauri::command]
async fn process_icons(
    cache: tauri::State<'_, ProcessIconCache>,
    requests: Vec<IconRequest>,
) -> Result<Vec<IconResult>, String> {
    let cache = cache.inner().clone();
    tauri::async_runtime::spawn_blocking(move || icons::resolve(&cache, requests))
        .await
        .map_err(|error| format!("process icon worker failed: {error}"))?
}

#[cfg(not(test))]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_wallpaper::init())
        .manage(SystemCollector::default())
        .manage(ProcessIconCache::default())
        .manage(process_io::ProcessIoReader::default())
        .setup(|app| {
            use tauri::{
                menu::{Menu, MenuItem},
                tray::TrayIconBuilder,
                Emitter, Manager,
            };
            use tauri_plugin_wallpaper::{DetachRequest, WallpaperExt};

            let restore = MenuItem::with_id(app, "restore", "打开 / Open Process Garden", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出 / Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&restore, &quit])?;
            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Process Garden")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "restore" => {
                        let _ = app.wallpaper().detach(DetachRequest::new("main"));
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.set_fullscreen(false);
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("process-garden://restore-windowed", ());
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![sample_system, platform_name, process_icons, sample_process_io])
        .run(tauri::generate_context!())
        .expect("error while running Process Garden");
}
