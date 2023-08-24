use tauri_build::{Attributes, WindowsAttributes};

const MANIFEST: &str = include_str!("manifest.xml");

fn main() {
    let mut windows = WindowsAttributes::new();
    windows = windows.app_manifest(MANIFEST);
    let attrs = Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attrs).expect("failed to run build script");
}
