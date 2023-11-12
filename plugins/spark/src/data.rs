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
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
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
pub struct SparkResponse {
    pub content: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

impl TryFrom<SparkRequest> for Request {
    type Error = Error;

    fn try_from(request: SparkRequest) -> Result<Self> {
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

impl TryFrom<Vec<Response>> for SparkResponse {
    type Error = Error;

    fn try_from(mut responses: Vec<Response>) -> Result<Self> {
        if responses.iter().any(|resp| resp.payload.is_none()) {
            return Err(Error::SparkResponseError("missing payload in response"));
        }
        // `unwrap` is safe here.
        responses.sort_unstable_by_key(|resp| resp.payload.as_ref().unwrap().choices.seq);

        let (prompt_tokens, completion_tokens, total_tokens) = match responses.last() {
            Some(
                resp @ Response {
                    payload:
                        Some(ResponsePayload {
                            usage: Some(usage), ..
                        }),
                    ..
                },
            ) => {
                if resp.is_end() {
                    (
                        usage.text.prompt_tokens,
                        usage.text.completion_tokens,
                        usage.text.total_tokens,
                    )
                } else {
                    return Err(Error::SparkResponseError(
                        "the last response in list is not the end of responses",
                    ));
                }
            }
            None => return Err(Error::SparkResponseError("the response list is empty")),
            _ => {
                return Err(Error::SparkResponseError(
                    "failed to find token usage in response list",
                ))
            }
        };

        Ok(SparkResponse {
            content: responses.iter().fold(String::new(), |mut s, resp| {
                // `unwrap` is safe here.
                s.push_str(&resp.payload.as_ref().unwrap().choices.text.iter().fold(
                    String::new(),
                    |mut s, text| {
                        s.push_str(&text.content);

                        s
                    },
                ));

                s
            }),
            prompt_tokens,
            completion_tokens,
            total_tokens,
        })
    }
}

impl TryFrom<Response> for SparkResponse {
    type Error = Error;

    #[inline]
    fn try_from(response: Response) -> Result<Self> {
        if response.is_end() {
            match response.payload {
                Some(ResponsePayload {
                    choices,
                    usage: Some(usage),
                }) => Ok(SparkResponse {
                    content: choices.text.iter().fold(String::new(), |mut s, t| {
                        s.push_str(&t.content);

                        s
                    }),
                    prompt_tokens: usage.text.prompt_tokens,
                    completion_tokens: usage.text.completion_tokens,
                    total_tokens: usage.text.total_tokens,
                }),
                None => Err(Error::SparkResponseError("missing payload in response")),
                _ => Err(Error::SparkResponseError(
                    "failed to find token usage in response",
                )),
            }
        } else {
            Err(Error::SparkResponseError(
                "the response is not the end response",
            ))
        }
    }
}
