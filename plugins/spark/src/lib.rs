mod data;

pub use data::*;

use acfunlive_neotool_xunfei::authorization;
use futures_util::{SinkExt, StreamExt};
use serde::{Serialize, Serializer};
use tauri::{
    api::ipc::{format_callback, CallbackFn},
    command,
    plugin::{Builder, TauriPlugin},
    Runtime, Window,
};
use time::OffsetDateTime;
use tokio_tungstenite::{connect_async, tungstenite::Message};

const URL: &str = "wss://spark-api.xf-yun.com/v3.1/chat";

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    SerdeJsonError(#[from] serde_json::Error),
    #[error(transparent)]
    TungsteniteError(#[from] tokio_tungstenite::tungstenite::error::Error),
    #[error(transparent)]
    XunFeiError(#[from] acfunlive_neotool_xunfei::Error),
    #[error("spark request error: {0}")]
    SparkRequestError(String),
    #[error("spark API error: {0}")]
    SparkApiError(String),
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

pub async fn spark_request<F: FnMut(String)>(
    request: SparkRequest,
    mut callback: F,
) -> Result<TokenStatistics> {
    let url = authorization(
        URL,
        &request.api_secret,
        &request.api_key,
        OffsetDateTime::now_utc(),
    )?;
    let request = serde_json::to_string(&Request::try_from(request)?)?;

    let (mut client, _) = connect_async(url).await?;
    client.send(Message::Text(request)).await?;
    let mut tokens = None;

    loop {
        match client.next().await {
            Some(Ok(Message::Text(resp))) => {
                let response: Response = serde_json::from_str(&resp)?;

                if response.header.code != 0 {
                    return Err(Error::SparkApiError(format!(
                        "spark API response error code: {} , message: {}",
                        response.header.code, response.header.message
                    )));
                }

                if response.is_end() {
                    callback(response.content().ok_or(Error::SparkApiError(String::from(
                        "missing content in last response",
                    )))?);
                    tokens = Some(response.token_statistics().ok_or(Error::SparkApiError(
                        String::from("missing usage in last response"),
                    ))?);

                    break;
                } else {
                    callback(response.content().ok_or(Error::SparkApiError(String::from(
                        "missing content in response",
                    )))?);

                    continue;
                }
            }
            Some(Ok(Message::Close(_))) | None => break,
            Some(Ok(Message::Binary(_))) => {
                return Err(Error::SparkApiError(String::from(
                    "spark API response is not a string",
                )))
            }
            Some(Err(e)) => return Err(e.into()),
            _ => continue,
        }
    }

    tokens.ok_or(Error::SparkApiError(String::from(
        "missing usage in responses",
    )))
}

#[inline]
pub async fn spark_request_full(request: SparkRequest) -> Result<SparkResponse> {
    let mut content = String::new();
    let tokens = spark_request(request, |c| content.push_str(&c)).await?;

    Ok(SparkResponse { content, tokens })
}

#[command]
#[inline]
async fn spark_chat<R: Runtime>(
    window: Window<R>,
    request: SparkRequest,
    cb: CallbackFn,
) -> Result<TokenStatistics> {
    spark_request(request, |content| {
        let js = format_callback(cb, &content).expect("unable to serialize spark response content");
        let _ = window.eval(&js);
    })
    .await
}

#[command]
#[inline]
async fn spark_chat_full(request: SparkRequest) -> Result<SparkResponse> {
    spark_request_full(request).await
}

/// Initializes the plugin.
#[inline]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-spark")
        .invoke_handler(tauri::generate_handler![spark_chat, spark_chat_full])
        .build()
}

/* #[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_spark_request_all() {
        let response = spark_request_full(SparkRequest {
            app_id: String::from(""),
            api_secret: String::from(""),
            api_key: String::from(""),
            uid: None,
            temperature: None,
            max_tokens: None,
            top_k: None,
            chat_id: None,
            history: None,
            content: String::from("你好，你是谁？"),
        })
        .await
        .unwrap();

        println!("resp: {:?}", response);
    }
} */
