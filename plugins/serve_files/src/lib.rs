use std::{collections::HashMap, net::TcpListener, sync::Arc, thread::spawn};

use file_serve::{Server, ServerBuilder};
use once_cell::sync::Lazy;
use serde::{ser::Serializer, Serialize};
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Manager, Runtime, State,
};
use tokio::sync::Mutex;

type Id = u32;

type Result<T> = std::result::Result<T, Error>;

static ID: Lazy<Mutex<Id>> = Lazy::new(|| Mutex::new(0));

#[derive(Clone, Debug, thiserror::Error)]
pub enum Error {
    #[error("server address {0}:{1} is not available")]
    AddressNotAvailable(String, u16),
}

impl Serialize for Error {
    #[inline]
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Debug, Default)]
struct ServerManager(Mutex<HashMap<Id, Arc<Server>>>);

#[command]
#[inline]
fn is_address_available(hostname: &str, port: u16) -> bool {
    TcpListener::bind((hostname, port)).is_ok()
}

#[command]
async fn start_serve(
    manager: State<'_, ServerManager>,
    dir: String,
    hostname: String,
    port: u16,
) -> Result<Id> {
    if !is_address_available(&hostname, port) {
        return Err(Error::AddressNotAvailable(hostname, port));
    }

    let id = {
        let mut id = ID.lock().await;
        *id += 1;
        *id
    };

    let mut builder = ServerBuilder::new(dir);
    builder.hostname(hostname).port(port);
    let server = Arc::new(builder.build());

    {
        let server = Arc::clone(&server);
        spawn(move || {
            if let Err(e) = server.serve() {
                println!("server {id} error: {e}");
            }
        });
    }

    manager.0.lock().await.insert(id, server);

    Ok(id)
}

#[command]
#[inline]
async fn stop_serve(manager: State<'_, ServerManager>, id: Id) -> Result<()> {
    if let Some(server) = manager.0.lock().await.remove(&id) {
        server.close();
    }

    Ok(())
}

#[command]
#[inline]
async fn is_serving(manager: State<'_, ServerManager>, id: Id) -> Result<bool> {
    Ok(if let Some(server) = manager.0.lock().await.get(&id) {
        server.is_running()
    } else {
        false
    })
}

/// Initializes the plugin.
#[inline]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-serve-files")
        .invoke_handler(tauri::generate_handler![
            is_address_available,
            start_serve,
            stop_serve,
            is_serving
        ])
        .setup(|app| {
            app.manage(ServerManager::default());
            Ok(())
        })
        .build()
}
