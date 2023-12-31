use serde::{Deserialize, Serialize};
use serde_repr::Deserialize_repr;

use crate::{Error, Result};

const GENERAL: &str = "generalv3";

#[derive(Clone, Debug, Serialize)]
pub(crate) struct RequestHeader {
    pub(crate) app_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) uid: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct RequestChatConfig {
    pub(crate) domain: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) top_k: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) chat_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct RequestParameter {
    pub(crate) chat: RequestChatConfig,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub enum Role {
    #[serde(rename = "user")]
    User,
    #[serde(rename = "assistant")]
    Assistant,
}

#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub struct RequestText {
    pub role: Role,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct RequestMessage {
    pub(crate) text: Vec<RequestText>,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct RequestPayload {
    pub(crate) message: RequestMessage,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct Request {
    pub(crate) header: RequestHeader,
    pub(crate) parameter: RequestParameter,
    pub(crate) payload: RequestPayload,
}

#[derive(Clone, Copy, Debug, Deserialize_repr, Eq, PartialEq)]
#[repr(u8)]
pub(crate) enum ResponseStatus {
    Start = 0,
    Middle = 1,
    End = 2,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct ResponseHeader {
    pub(crate) code: i32,
    pub(crate) message: String,
    #[allow(dead_code)]
    pub(crate) sid: String,
    pub(crate) status: ResponseStatus,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct ResponseText {
    pub(crate) content: String,
    #[allow(dead_code)]
    pub(crate) role: Role,
    #[allow(dead_code)]
    pub(crate) index: i32,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct ResponseChoices {
    pub(crate) status: ResponseStatus,
    #[allow(dead_code)]
    pub(crate) seq: u32,
    pub(crate) text: Vec<ResponseText>,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct ResponseTokenStatistics {
    #[allow(dead_code)]
    pub(crate) question_tokens: i32,
    pub(crate) prompt_tokens: u32,
    pub(crate) completion_tokens: u32,
    pub(crate) total_tokens: u32,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct ResponseUsage {
    pub(crate) text: ResponseTokenStatistics,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct ResponsePayload {
    pub(crate) choices: ResponseChoices,
    pub(crate) usage: Option<ResponseUsage>,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct Response {
    pub(crate) header: ResponseHeader,
    pub(crate) payload: Option<ResponsePayload>,
}

impl Response {
    #[inline]
    pub(crate) fn is_end(&self) -> bool {
        self.header.status == ResponseStatus::End
            && self
                .payload
                .as_ref()
                .map_or(false, |p| p.choices.status == ResponseStatus::End)
    }

    #[inline]
    pub(crate) fn content(&self) -> Option<String> {
        self.payload.as_ref().map(|payload| {
            payload.choices.text.iter().fold(String::new(), |mut s, t| {
                s.push_str(&t.content);

                s
            })
        })
    }

    #[inline]
    pub(crate) fn token_statistics(&self) -> Option<TokenStatistics> {
        self.payload.as_ref().and_then(|payload| {
            payload.usage.as_ref().map(|usage| TokenStatistics {
                prompt_tokens: usage.text.prompt_tokens,
                completion_tokens: usage.text.completion_tokens,
                total_tokens: usage.text.total_tokens,
            })
        })
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SparkRequest {
    pub app_id: String,
    pub api_secret: String,
    pub api_key: String,
    pub uid: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub top_k: Option<u8>,
    pub chat_id: Option<String>,
    pub history: Option<Vec<RequestText>>,
    pub content: String,
}

#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenStatistics {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SparkResponse {
    pub content: String,
    pub tokens: TokenStatistics,
}

impl TryFrom<SparkRequest> for Request {
    type Error = Error;

    fn try_from(request: SparkRequest) -> Result<Self> {
        if request.app_id.is_empty() || request.api_secret.is_empty() || request.api_key.is_empty()
        {
            return Err(Error::SparkRequestError(String::from(
                "app_id, api_secret or api_key is empty",
            )));
        }

        if let Some(uid) = &request.uid {
            if uid.len() > 32 {
                return Err(Error::SparkRequestError(format!(
                    "the length of uid {uid} is greater than 32: {}",
                    uid.len()
                )));
            }
        }

        if let Some(temperature) = request.temperature {
            if !(0.0..=1.0).contains(&temperature) {
                return Err(Error::SparkRequestError(format!(
                    "the temperature {temperature} is less than 0 or greater than 1"
                )));
            }
        }

        if let Some(max_tokens) = request.max_tokens {
            if !(1..=8192).contains(&max_tokens) {
                return Err(Error::SparkRequestError(format!(
                    "the max tokens {max_tokens} is less than 1 or greater than 8192"
                )));
            }
        }

        if let Some(top_k) = request.top_k {
            if !(1..=6).contains(&top_k) {
                return Err(Error::SparkRequestError(format!(
                    "the top_k {top_k} is less than 1 or greater than 6"
                )));
            }
        }

        let len = match &request.history {
            Some(history) => history.iter().fold(0, |tokens, h| tokens + h.content.len()),
            None => 0,
        } + request.content.len();
        if len > 10_000 {
            return Err(Error::SparkRequestError(format!(
                "the length of contents is too great: {len}"
            )));
        }

        let mut text = request.history.unwrap_or_default();
        text.push(RequestText {
            role: Role::User,
            content: request.content,
        });

        Ok(Request {
            header: RequestHeader {
                app_id: request.app_id,
                uid: request.uid,
            },
            parameter: RequestParameter {
                chat: RequestChatConfig {
                    domain: GENERAL,
                    temperature: request.temperature,
                    max_tokens: request.max_tokens,
                    top_k: request.top_k,
                    chat_id: request.chat_id,
                },
            },
            payload: RequestPayload {
                message: RequestMessage { text },
            },
        })
    }
}
