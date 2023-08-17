use std::{net::TcpListener, thread::spawn};

use file_serve::ServerBuilder;
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[command]
fn check_server_available(hostname: String, port: u16) -> bool {
    TcpListener::bind((hostname, port)).is_ok()
}

#[command]
fn serve(dir: String, hostname: Option<String>, port: Option<u16>) {
    let mut builder = ServerBuilder::new(dir);
    if let Some(hostname) = hostname {
        builder.hostname(hostname);
    }
    if let Some(port) = port {
        builder.port(port);
    }

    spawn(move || {
        builder
            .serve()
            .unwrap_or_else(|e| panic!("failed to serve files: {}", e));
    });
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-serve-file")
        .invoke_handler(tauri::generate_handler![check_server_available, serve])
        .build()
}
