/// Override only the known WinLibs default-manifest insertion, preserving all
/// CRT/other endfile specs. Unknown forms fail closed rather than guessing.
pub fn manifest_override(specs: &str) -> Result<Option<String>, &'static str> {
    const INSERTION: &str = "%{!shared:%:if-exists(default-manifest.o%s)}";
    let normalized = specs.replace("\r\n", "\n");
    let Some(endfile) = normalized.split("\n\n").find_map(|block| block.strip_prefix("*endfile:\n")) else {
        return Ok(None);
    };
    if !endfile.contains("default-manifest.o") { return Ok(None); }
    if endfile.matches(INSERTION).count() != 1 { return Err("unrecognized GCC default manifest spec; inspect toolchain before building"); }
    let filtered = endfile.replacen(INSERTION, "", 1);
    if filtered.contains("default-manifest.o") || filtered.trim().is_empty() {
        return Err("GCC manifest override would remove an unexpected endfile specification");
    }
    Ok(Some(format!("*endfile:\n{}\n\n", filtered.trim())))
}
