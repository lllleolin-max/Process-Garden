#[path = "../build_support.rs"]
mod build_support;

#[test]
fn removes_only_default_manifest_and_preserves_runtime_objects() {
    let source = "*link:\nkeep-link\n\n*endfile:\ncrtfastmath.o%s %{!shared:%:if-exists(default-manifest.o%s)} crtend.o%s\n\n*lib:\nkeep-lib\n\n";
    let expected = "*endfile:\ncrtfastmath.o%s  crtend.o%s\n\n";
    assert_eq!(build_support::manifest_override(source).unwrap().unwrap(), expected);
    assert_eq!(build_support::manifest_override(&source.replace('\n', "\r\n")).unwrap().unwrap(), expected);
}

#[test]
fn leaves_unaffected_compilers_alone_and_rejects_unknown_forms() {
    assert_eq!(build_support::manifest_override("*endfile:\ncrtend.o%s\n\n").unwrap(), None);
    assert_eq!(build_support::manifest_override("not GCC specs").unwrap(), None);
    assert!(build_support::manifest_override("*endfile:\ndefault-manifest.o crtend.o%s\n\n").is_err());
    assert!(build_support::manifest_override("*endfile:\n%{!shared:%:if-exists(default-manifest.o%s)}\n\n").is_err());
}
