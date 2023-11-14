// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_acfunlive_neotool_base::init())
        .plugin(tauri_plugin_acfunlive_neotool_keyboard::init())
        .plugin(tauri_plugin_acfunlive_neotool_serve_files::init())
        .plugin(tauri_plugin_acfunlive_neotool_spark::init())
        .plugin(tauri_plugin_acfunlive_neotool_tts::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
