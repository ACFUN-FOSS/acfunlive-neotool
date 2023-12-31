use serde::{ser::Serializer, Deserialize, Serialize};
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Runtime,
};
use tokio::fs::{read_dir, read_to_string, remove_dir_all, remove_file, symlink_metadata};

type Result<T> = std::result::Result<T, Error>;

const CONFIG_FILE: &str = "neotool.app.json";

#[allow(clippy::enum_variant_names)]
#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    IoError(#[from] std::io::Error),
    #[error(transparent)]
    SerdeJsonError(#[from] serde_json::Error),
    #[error(transparent)]
    KeyringError(#[from] keyring::Error),
}

impl Serialize for Error {
    #[inline]
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
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
            if !config.id.is_empty()
                && !config.name.is_empty()
                && !config.entry.is_empty()
                && !config.css.as_deref().unwrap_or(" ").is_empty()
            {
                config.path = dir;
                configs.push(config);
            }
        }
    }

    Ok(configs)
}

#[command]
#[inline]
async fn canonicalize(path: String) -> Result<String> {
    Ok(dunce::simplified(&tokio::fs::canonicalize(path).await?)
        .to_string_lossy()
        .into_owned())
}

#[command]
#[inline]
async fn hash_file_sha256(path: String) -> Result<String> {
    Ok(sha256::try_async_digest(path).await?)
}

#[command]
#[inline]
async fn symlink_dir(source: String, destination: String) -> Result<()> {
    if let Ok(data) = symlink_metadata(&destination).await {
        let src = tokio::fs::canonicalize(&source).await?;
        let dst = tokio::fs::canonicalize(&destination).await?;
        if src == dst {
            return Ok(());
        }

        if data.is_dir() {
            remove_dir_all(&destination).await?;
        } else {
            remove_file(&destination).await?;
        }
    }

    #[cfg(unix)]
    tokio::fs::symlink(source, destination).await?;

    #[cfg(windows)]
    tokio::fs::symlink_dir(source, destination).await?;

    Ok(())
}

#[derive(Clone, Debug, Deserialize)]
struct SecretKey {
    service: String,
    user: String,
    target: Option<String>,
}

impl SecretKey {
    #[inline]
    fn entry(&self) -> Result<keyring::Entry> {
        Ok(match &self.target {
            Some(target) => keyring::Entry::new_with_target(target, &self.service, &self.user)?,
            None => keyring::Entry::new(&self.service, &self.user)?,
        })
    }
}

#[command]
#[inline]
fn get_secret_key(key: SecretKey) -> Result<Option<String>> {
    match key.entry()?.get_password() {
        Ok(s) => Ok(Some(s)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(Error::from(e)),
    }
}

#[command]
#[inline]
fn set_secret_key(key: SecretKey, content: String) -> Result<()> {
    Ok(key.entry()?.set_password(&content)?)
}

#[command]
#[inline]
fn delete_secret_key(key: SecretKey) -> Result<()> {
    Ok(key.entry()?.delete_password()?)
}

/// Initializes the plugin.
#[inline]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-base")
        .invoke_handler(tauri::generate_handler![
            load_apps_config,
            canonicalize,
            hash_file_sha256,
            symlink_dir,
            get_secret_key,
            set_secret_key,
            delete_secret_key
        ])
        .build()
}
