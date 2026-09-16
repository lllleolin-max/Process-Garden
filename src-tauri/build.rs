use std::{env, fs, path::PathBuf};
mod build_support;

fn main() {
    // GNU windres cannot read an .ico through a Unicode Windows path. Copying
    // the icon to Cargo's ASCII-only OUT_DIR keeps builds portable without
    // requiring users to move the project.
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR is set by Cargo"));
    let build_icon = out_dir.join("process-garden.ico");
    fs::copy("icons/icon.ico", &build_icon).expect("copy Windows icon to build directory");

    println!("cargo:rerun-if-changed=windows-app-manifest.xml");
    println!("cargo:rerun-if-changed=build_support.rs");
    println!("cargo:rerun-if-env-changed=RUSTC_LINKER");
    if env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows")
        && env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("gnu") {
        let linker = env::var_os("RUSTC_LINKER").unwrap_or_else(|| "gcc".into());
        if let Ok(output) = std::process::Command::new(linker).arg("-dumpspecs").output() {
            if output.status.success() {
                let specs = String::from_utf8(output.stdout).expect("GCC specs must be UTF-8");
                if let Some(override_text) = build_support::manifest_override(&specs).expect("safe GCC manifest configuration") {
                    let override_path = out_dir.join("process-garden.specs");
                    fs::write(&override_path, override_text).expect("write project-local GCC specs");
                    println!("cargo:rustc-link-arg-bin=process-garden=-specs={}", override_path.display());
                }
            }
        }
    }

    let attributes = tauri_build::Attributes::new().windows_attributes(
        tauri_build::WindowsAttributes::new().window_icon_path(&build_icon)
            .app_manifest(include_str!("windows-app-manifest.xml")),
    );
    tauri_build::try_build(attributes).expect("failed to run Process Garden build script");
}
