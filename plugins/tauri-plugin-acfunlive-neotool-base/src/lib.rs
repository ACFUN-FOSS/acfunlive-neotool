use serde::{ser::Serializer, Deserialize, Serialize};
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Runtime,
};
use tokio::fs::{read_dir, read_to_string};

type Result<T> = std::result::Result<T, Error>;

const CONFIG_FILE: &str = "neotool.app.json";

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    IoError(#[from] std::io::Error),
    #[error(transparent)]
    SerdeJsonError(#[from] serde_json::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct AppConfig {
    id: String,
    name: String,
    #[serde(default)]
    path: String,
    description: Option<String>,
    entry: String,
    css: Option<String>,
}

#[command]
async fn load_apps_config(apps_dir: String) -> Result<Vec<AppConfig>> {
    let mut read_dir = read_dir(&apps_dir).await?;
    let mut configs = Vec::new();
    while let Ok(Some(entry)) = read_dir.next_entry().await {
        if entry.file_type().await?.is_dir() {
            let mut path = entry.path();
            let dir = tokio::fs::canonicalize(&path)
                .await?
                .to_string_lossy()
                .into_owned();
            path.push(CONFIG_FILE);
            let data = read_to_string(&path).await?;
            let mut config: AppConfig = serde_json::from_str(&data)?;
            config.path = dir;
            configs.push(config);
        }
    }

    Ok(configs)
}

#[command]
async fn canonicalize(path: String) -> Result<String> {
    Ok(dunce::simplified(&tokio::fs::canonicalize(path).await?)
        .to_string_lossy()
        .into_owned())
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-base")
        .invoke_handler(tauri::generate_handler![load_apps_config, canonicalize])
        .build()
}
