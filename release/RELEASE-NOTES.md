# Process Garden 0.1.0

首个公开安装包版本：七种主题、实时进程生态图、Agent 生命周期、中英双语与主题导入导出。

## Downloads / 下载

- **Windows x64:** download the `x64-setup.exe` installer (recommended), or the `x64_en-US.msi` package.
- **macOS 11+:** download the `universal.dmg` disk image. The same app supports Apple Silicon (M1 and later) and Intel Macs. Open the disk image and drag Process Garden to Applications.
- **SHA256SUMS.txt:** SHA-256 checksums for all three installers.

## Platform support / 平台支持

Both platforms provide live CPU, memory and process monitoring, all seven themes, fullscreen presentation, Demo mode and local theme packages.

Windows additionally provides desktop wallpaper attachment, executable icon extraction, per-process thread counts, supported hardware power readings and confirmed process termination.

The macOS build is an initial preview: wallpaper attachment and native process termination are unavailable; executable icons use fallback artwork; native thread counts are not collected (displayed as zero); hardware power readings are unavailable. Demo data remains available for all visual features.

## Signing / 签名状态

The Windows installers are not publisher-signed. The macOS application has an ad-hoc signature only; it is not Developer ID-signed or Apple-notarized. Operating systems may block or warn about these downloads. This release does not claim trusted-publisher or App Store distribution.

Windows 安装包未配置发布者签名；macOS 仅做本地签名，未做 Apple 开发者签名或公证，系统可能阻止打开或显示安全提示。

## Validation / 验证范围

The release workflow runs TypeScript checks, frontend tests and native Rust tests on Windows and macOS, builds the installers, and checks that the packaged applications remain running for 15 seconds. The macOS bundle is checked for both arm64 and x86_64 slices, signature integrity and disk-image integrity. Startup checks are not a full manual installation or UI acceptance test; Intel macOS compilation does not establish an Intel runtime test.

Source and license: [Process Garden](https://github.com/lllleolin-max/Process-Garden), MIT.
