use std::{env, fs, path::PathBuf};

fn main() {
    // GNU windres cannot read an .ico through a Unicode Windows path. Copying
    // the icon to Cargo's ASCII-only OUT_DIR keeps builds portable without
    // requiring users to move the project.
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR is set by Cargo"));
    let build_icon = out_dir.join("process-garden.ico");
    fs::copy("icons/icon.ico", &build_icon).expect("copy Windows icon to build directory");

    let attributes = tauri_build::Attributes::new().windows_attributes(
        tauri_build::WindowsAttributes::new().window_icon_path(&build_icon),
    );
    tauri_build::try_build(attributes).expect("failed to run Process Garden build script");
}
