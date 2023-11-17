use base64::engine::{general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};

use crate::{Error, Result};

#[derive(Clone, Debug, Serialize)]
pub(crate) struct RequestCommon {
    pub(crate) app_id: String,
}

// TODO: support speex
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub enum Aue {
    #[serde(rename = "raw")]
    Raw,
    #[serde(rename = "lame")]
    Lame,
}

#[derive(Clone, Copy, Debug, Serialize_repr)]
#[repr(u8)]
pub(crate) enum Sfl {
    Stream = 1,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub enum Auf {
    #[serde(rename(serialize = "audio/L16;rate=8000", deserialize = "audio8kRate"))]
    Audio8kRate,
    #[serde(rename(serialize = "audio/L16;rate=16000", deserialize = "audio16kRate"))]
    Audio16kRate,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize_repr)]
#[repr(u8)]
pub enum Bgs {
    #[serde(rename(deserialize = "noBackgroundSound"))]
    NoBackgroundSound = 0,
    #[serde(rename(deserialize = "hasBackgroundSound"))]
    HasBackgroundSound = 1,
}

// 只支持UTF-8
#[derive(Clone, Copy, Debug, Serialize)]
pub(crate) enum Tte {
    #[serde(rename(serialize = "UTF8"))]
    Utf8,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize_repr)]
#[repr(u8)]
pub enum Reg {
    #[serde(rename(deserialize = "autoWord"))]
    AutoWord = 0,
    #[serde(rename(deserialize = "alphabet"))]
    Alphabet = 1,
    #[serde(rename(deserialize = "autoAlphabet"))]
    AutoAlphabet = 2,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize_repr)]
#[repr(u8)]
pub enum Rdn {
    #[serde(rename(deserialize = "auto"))]
    Auto = 0,
    #[serde(rename(deserialize = "number"))]
    Number = 1,
    #[serde(rename(deserialize = "string"))]
    String = 2,
    #[serde(rename(deserialize = "stringPriority"))]
    StringPriority = 3,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct RequestBusiness {
    pub(crate) aue: Aue,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) sfl: Option<Sfl>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) auf: Option<Auf>,
    pub(crate) vcn: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) speed: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) volume: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) pitch: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) bgs: Option<Bgs>,
    pub(crate) tte: Tte,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) reg: Option<Reg>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) rdn: Option<Rdn>,
}

#[derive(Clone, Copy, Debug, Deserialize_repr, Eq, PartialEq, Serialize_repr)]
#[repr(u8)]
pub(crate) enum Status {
    Synthesis = 1,
    End = 2,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct RequestData {
    pub(crate) text: String,
    pub(crate) status: Status,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct Request {
    pub(crate) common: RequestCommon,
    pub(crate) business: RequestBusiness,
    pub(crate) data: RequestData,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct ResponseData {
    pub(crate) audio: String,
    pub(crate) status: Status,
    #[allow(dead_code)]
    pub(crate) ced: String,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct Response {
    pub(crate) code: i32,
    pub(crate) message: String,
    pub(crate) data: Option<ResponseData>,
    #[allow(dead_code)]
    pub(crate) sid: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsRequest {
    pub app_id: String,
    pub api_secret: String,
    pub api_key: String,
    pub aue: Aue,
    pub auf: Option<Auf>,
    pub vcn: String,
    pub speed: Option<u8>,
    pub volume: Option<u8>,
    pub pitch: Option<u8>,
    pub bgs: Option<Bgs>,
    pub reg: Option<Reg>,
    pub rdn: Option<Rdn>,
    pub text: String,
    pub get_all_once: bool,
}

impl TryFrom<TtsRequest> for Request {
    type Error = Error;

    fn try_from(request: TtsRequest) -> Result<Self> {
        if request.app_id.is_empty() || request.api_secret.is_empty() || request.api_key.is_empty()
        {
            return Err(Error::TtsRequestError(String::from(
                "app_id, api_secret or api_key is empty",
            )));
        }

        if request.vcn.is_empty() {
            return Err(Error::TtsRequestError(String::from("vcn is empty")));
        }

        #[inline]
        fn check_sound_property(name: &str, property: Option<u8>) -> Result<()> {
            match property {
                Some(0..=100) | None => Ok(()),
                Some(p) => Err(Error::TtsRequestError(format!(
                    "{} is less than 0 or greater than 100: {}",
                    name, p
                ))),
            }
        }

        check_sound_property("speed", request.speed)?;
        check_sound_property("volume", request.volume)?;
        check_sound_property("pitch", request.pitch)?;

        if request.text.len() > 8000 {
            return Err(Error::TtsRequestError(format!(
                "the text's length (in bytes) is greater than 8000: {}",
                request.text.len()
            )));
        }

        Ok(Request {
            common: RequestCommon {
                app_id: request.app_id,
            },
            business: RequestBusiness {
                aue: request.aue,
                sfl: if request.aue == Aue::Lame {
                    Some(Sfl::Stream)
                } else {
                    None
                },
                auf: request.auf,
                vcn: request.vcn,
                speed: request.speed,
                volume: request.volume,
                pitch: request.pitch,
                bgs: request.bgs,
                tte: Tte::Utf8,
                reg: request.reg,
                rdn: request.rdn,
            },
            data: RequestData {
                text: STANDARD.encode(request.text),
                status: Status::End,
            },
        })
    }
}
