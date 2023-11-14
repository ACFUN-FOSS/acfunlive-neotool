use std::collections::HashMap;

use once_cell::sync::Lazy;
use tokio::sync::Mutex;

pub type AudioSourceId = u32;

pub type AudioSource = Vec<u8>;

static ID: Lazy<Mutex<AudioSourceId>> = Lazy::new(|| Mutex::new(0));

#[inline]
async fn new_id() -> AudioSourceId {
    let mut id = ID.lock().await;
    *id += 1;

    *id
}

#[derive(Debug, Default)]
pub struct AudioSourceManager(Mutex<HashMap<AudioSourceId, AudioSource>>);

impl AudioSourceManager {
    #[inline]
    pub async fn add(&self, source: AudioSource) -> AudioSourceId {
        let id = new_id().await;
        let mut map = self.0.lock().await;
        map.insert(id, source);

        id
    }

    #[inline]
    pub async fn get_and_remove(&self, id: AudioSourceId) -> Option<AudioSource> {
        let mut map = self.0.lock().await;

        map.remove(&id)
    }
}
