use std::{collections::HashMap, io::Cursor, mem::ManuallyDrop};

use acfunlive_neotool_audio::{AudioSourceId, AudioSourceManager};
use once_cell::sync::{Lazy, OnceCell};
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink};
use serde::{Deserialize, Serialize};
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Manager, Runtime, State,
};
use tokio::sync::Mutex;

type AudioId = u32;

static ID: Lazy<Mutex<AudioId>> = Lazy::new(|| Mutex::new(0));

static HANDLE: OnceCell<OutputStreamHandle> = OnceCell::new();

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Deserialize, Serialize, thiserror::Error)]
enum Error {
    #[error("rodio error: {0}")]
    RodioErr(String),
    #[error("no stream handle")]
    NoStreamHanlde,
    #[error("no audio")]
    NoAudio,
    #[error("no audio source")]
    NoAudioSource,
}

#[inline]
async fn new_id() -> AudioId {
    let mut id = ID.lock().await;
    *id += 1;

    *id
}

#[derive(Default)]
struct AudioManager(Mutex<HashMap<AudioId, Sink>>);

#[command]
async fn new_audio(manager: State<'_, AudioManager>) -> Result<AudioId> {
    let id = new_id().await;
    let sink = Sink::try_new(HANDLE.get().ok_or(Error::NoStreamHanlde)?)
        .map_err(|e| Error::RodioErr(e.to_string()))?;

    manager.0.lock().await.insert(id, sink);

    Ok(id)
}

#[command]
async fn delete_audio(manager: State<'_, AudioManager>, audio_id: AudioId) -> Result<()> {
    manager.0.lock().await.remove(&audio_id);

    Ok(())
}

#[command]
async fn is_audio_queue_empty(manager: State<'_, AudioManager>, audio_id: AudioId) -> Result<bool> {
    let map = manager.0.lock().await;

    Ok(map.get(&audio_id).ok_or(Error::NoAudio)?.empty())
}

#[command]
async fn add_audio(
    audio_manager: State<'_, AudioManager>,
    audio_source_manager: State<'_, AudioSourceManager>,
    audio_id: AudioId,
    audio_source_id: AudioSourceId,
) -> Result<()> {
    let source = {
        audio_source_manager
            .get_and_remove(audio_source_id)
            .await
            .ok_or(Error::NoAudioSource)?
    };

    let map = audio_manager.0.lock().await;
    map.get(&audio_id)
        .ok_or(Error::NoAudio)?
        .append(Decoder::new(Cursor::new(source)).map_err(|e| Error::RodioErr(e.to_string()))?);

    Ok(())
}

#[command]
async fn get_volume(manager: State<'_, AudioManager>, audio_id: AudioId) -> Result<f32> {
    let map = manager.0.lock().await;

    Ok(map.get(&audio_id).ok_or(Error::NoAudio)?.volume())
}

#[command]
async fn set_volume(
    manager: State<'_, AudioManager>,
    audio_id: AudioId,
    volume: f32,
) -> Result<()> {
    let map = manager.0.lock().await;
    map.get(&audio_id).ok_or(Error::NoAudio)?.set_volume(volume);

    Ok(())
}

#[command]
async fn play_audio(manager: State<'_, AudioManager>, audio_id: AudioId) -> Result<()> {
    let map = manager.0.lock().await;
    map.get(&audio_id).ok_or(Error::NoAudio)?.play();

    Ok(())
}

#[command]
async fn pause_audio(manager: State<'_, AudioManager>, audio_id: AudioId) -> Result<()> {
    let map = manager.0.lock().await;
    map.get(&audio_id).ok_or(Error::NoAudio)?.pause();

    Ok(())
}

#[command]
async fn stop_audio(manager: State<'_, AudioManager>, audio_id: AudioId) -> Result<()> {
    let map = manager.0.lock().await;
    map.get(&audio_id).ok_or(Error::NoAudio)?.stop();

    Ok(())
}

#[command]
async fn clear_audio(manager: State<'_, AudioManager>, audio_id: AudioId) -> Result<()> {
    let map = manager.0.lock().await;
    map.get(&audio_id).ok_or(Error::NoAudio)?.clear();

    Ok(())
}

/// Initializes the plugin.
#[inline]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-audio")
        .invoke_handler(tauri::generate_handler![
            new_audio,
            delete_audio,
            is_audio_queue_empty,
            add_audio,
            get_volume,
            set_volume,
            play_audio,
            pause_audio,
            stop_audio,
            clear_audio
        ])
        .setup(|app| {
            app.manage(AudioSourceManager::default());
            app.manage(AudioManager::default());

            let (stream, handle) = OutputStream::try_default()?;
            if HANDLE.set(handle).is_ok() {
                let _ = ManuallyDrop::new(stream);
            }

            Ok(())
        })
        .build()
}
