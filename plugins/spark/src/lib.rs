mod data;

pub use data::*;

use base64::engine::{general_purpose::STANDARD, Engine};
use futures_util::{SinkExt, StreamExt};
use hmac_sha256::HMAC;
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Runtime,
};
use time::{format_description::well_known::Rfc2822, OffsetDateTime};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use url::Url;

const URL: &str = "wss://spark-api.xf-yun.com/v3.1/chat";
const HOST: &str = "spark-api.xf-yun.com";
const PATH: &str = "/v3.1/chat";

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("time format error: {0}")]
    TimeFormatError(#[from] time::error::Format),
    #[error("URL parsed error: {0}")]
    UrlParseError(#[from] url::ParseError),
    #[error("serde json error: {0}")]
    SerdeJsonError(#[from] serde_json::Error),
    #[error("tungstenite WebSocket error: {0}")]
    TungsteniteError(#[from] tokio_tungstenite::tungstenite::error::Error),
    #[error("spark request error: {0}")]
    SparkRequestError(String),
    #[error("spark response error: {0}")]
    SparkResponseError(&'static str),
    #[error("spark API error: {0}")]
    SparkApiError(String),
}

/// 鉴权，返回URL
fn authorization(api_secret: &str, api_key: &str, time: OffsetDateTime) -> Result<Url> {
    let date = time.format(&Rfc2822)?;
    let header = format!("host: {HOST}\ndate: {date}\nGET {PATH} HTTP/1.1");
    let hmac = HMAC::mac(header, api_secret);
    let signature = STANDARD.encode(hmac);
    let authorization_origin = format!("api_key=\"{api_key}\", algorithm=\"hmac-sha256\", headers=\"host date request-line\", signature=\"{signature}\"");
    let authorization = STANDARD.encode(authorization_origin);

    Ok(Url::parse_with_params(
        URL,
        [
            ("authorization", authorization.as_str()),
            ("date", date.as_str()),
            ("host", HOST),
        ],
    )?)
}

pub async fn spark_request(request: SparkRequest) -> Result<SparkResponse> {
    let url = authorization(
        &request.api_secret,
        &request.api_key,
        OffsetDateTime::now_utc(),
    )?;
    let request = serde_json::to_string(&Request::try_from(request)?)?;

    let (mut client, _) = connect_async(url).await?;
    client.send(Message::Text(request)).await?;

    let mut responses = Vec::new();
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

                if responses.is_empty() && response.is_end() {
                    return SparkResponse::try_from(response);
                } else {
                    responses.push(response);
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

    SparkResponse::try_from(responses)
}

#[command]
async fn spark_chat(request: SparkRequest) -> std::result::Result<SparkResponse, String> {
    spark_request(request).await.map_err(|e| e.to_string())
}

/// Initializes the plugin.
#[inline]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-spark")
        .invoke_handler(tauri::generate_handler![spark_chat])
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::OffsetDateTime;
    use url::Url;

    #[test]
    fn test_authorization() {
        let url = authorization(
            "MjlmNzkzNmZkMDQ2OTc0ZDdmNGE2ZTZi",
            "addd2272b6d8b7c8abdd79531420ca3b",
            OffsetDateTime::from_unix_timestamp(1683254619).unwrap(),
        )
        .unwrap();

        assert_eq!(url, Url::parse("wss://spark-api.xf-yun.com/v3.1/chat?authorization=YXBpX2tleT0iYWRkZDIyNzJiNmQ4YjdjOGFiZGQ3OTUzMTQyMGNhM2IiLCBhbGdvcml0aG09ImhtYWMtc2hhMjU2IiwgaGVhZGVycz0iaG9zdCBkYXRlIHJlcXVlc3QtbGluZSIsIHNpZ25hdHVyZT0iSm1LWFBZYmFVRjg2R0pOY0ZEaEEwaGY1WmJ5TGdib0cxTVNKYml3ZzNBVT0i&date=Fri%2C+05+May+2023+02%3A43%3A39+%2B0000&host=spark-api.xf-yun.com").unwrap());
    }

    /* #[tokio::test]
    async fn test_spark() {
        let _ = spark_request(SparkRequest {
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
    } */
}
