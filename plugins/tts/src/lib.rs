mod data;

pub use data::*;

use std::future::Future;

use acfunlive_neotool_audio::AudioSourceManager;
use acfunlive_neotool_xunfei::authorization;
use base64::engine::{general_purpose::STANDARD, Engine};
use futures_util::{SinkExt, StreamExt};
use serde::{Serialize, Serializer};
use tauri::{
    api::ipc::{format_callback, CallbackFn},
    command,
    plugin::{Builder, TauriPlugin},
    Manager, Runtime, Window,
};
use time::OffsetDateTime;
use tokio_tungstenite::{connect_async, tungstenite::Message};

const URL: &str = "wss://tts-api.xfyun.cn/v2/tts";

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    SerdeJsonError(#[from] serde_json::Error),
    #[error(transparent)]
    TungsteniteError(#[from] tokio_tungstenite::tungstenite::error::Error),
    #[error(transparent)]
    Base64DecodeError(#[from] base64::DecodeError),
    #[error(transparent)]
    XunFeiError(#[from] acfunlive_neotool_xunfei::Error),
    #[error("TTS request error: {0}")]
    TtsRequestError(String),
    #[error("TTS API error: {0}")]
    TtsApiError(String),
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

pub async fn tts_request<F: FnMut(Vec<u8>) -> Fut, Fut: Future<Output = ()>>(
    request: TtsRequest,
    mut callback: F,
) -> Result<()> {
    let get_all_once = request.get_all_once;
    let url = authorization(
        URL,
        &request.api_secret,
        &request.api_key,
        OffsetDateTime::now_utc(),
    )?;
    let request = serde_json::to_string(&Request::try_from(request)?)?;

    let (mut client, _) = connect_async(url).await?;
    client.send(Message::Text(request)).await?;
    let mut source = Vec::new();

    loop {
        match client.next().await {
            Some(Ok(Message::Text(resp))) => {
                let response: Response = serde_json::from_str(&resp)?;

                if response.code != 0 {
                    return Err(Error::TtsApiError(format!(
                        "TTS API response error code: {} , message: {}",
                        response.code, response.message
                    )));
                }

                if let Some(data) = response.data {
                    let mut audio = STANDARD.decode(data.audio)?;
                    if get_all_once {
                        source.append(&mut audio);
                    } else {
                        callback(audio).await;
                    }

                    if data.status == Status::End {
                        break;
                    }
                }
            }
            Some(Ok(Message::Close(_))) | None => break,
            Some(Ok(Message::Binary(_))) => {
                return Err(Error::TtsApiError(String::from(
                    "TTS API response is not a string",
                )))
            }
            Some(Err(e)) => return Err(e.into()),
            _ => continue,
        }
    }

    if get_all_once && !source.is_empty() {
        callback(source).await;
    }

    Ok(())
}

#[command]
#[inline]
async fn tts<R: Runtime>(window: Window<R>, request: TtsRequest, cb: CallbackFn) -> Result<()> {
    let manager = window.state::<AudioSourceManager>();

    tts_request(request, |source| async {
        let id = manager.add(source).await;
        let js = format_callback(cb, &id).expect("unable to serialize audio source ID");
        let _ = window.eval(&js);
    })
    .await
}

/// Initializes the plugin.
#[inline]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-tts")
        .invoke_handler(tauri::generate_handler![tts])
        .setup(|app| {
            app.manage(AudioSourceManager::default());

            Ok(())
        })
        .build()
}

/* #[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tts_request() {
        tts_request(
            TtsRequest {
                app_id: String::from(""),
                api_secret: String::from(""),
                api_key: String::from(""),
                aue: Aue::Lame,
                auf: None,
                vcn: String::from("xiaoyan"),
                speed: None,
                volume: None,
                pitch: None,
                bgs: None,
                reg: None,
                rdn: None,
                text: String::from("汉皇重色思倾国，御宇多年求不得。杨家有女初长成，养在深闺人未识。天生丽质难自弃，一朝选在君王侧。回眸一笑百媚生，六宫粉黛无颜色。"),
            },
            |data| println!("{:?}", data),
        )
        .await
        .unwrap();
    }
} */
