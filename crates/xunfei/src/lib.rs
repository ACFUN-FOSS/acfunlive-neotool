use base64::engine::{general_purpose::STANDARD, Engine};
use hmac_sha256::HMAC;
use time::{format_description::well_known::Rfc2822, OffsetDateTime};
use url::Url;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    TimeFormatError(#[from] time::error::Format),
    #[error(transparent)]
    UrlParseError(#[from] url::ParseError),
}

/// 鉴权，返回URL
pub fn authorization(
    url: &str,
    api_secret: &str,
    api_key: &str,
    time: OffsetDateTime,
) -> Result<Url> {
    let url = Url::parse(url)?;
    let host = url.host_str().ok_or(url::ParseError::EmptyHost)?;
    let path = url.path();

    let date = time.format(&Rfc2822)?;
    let header = format!("host: {host}\ndate: {date}\nGET {path} HTTP/1.1");
    let hmac = HMAC::mac(header, api_secret);
    let signature = STANDARD.encode(hmac);
    let authorization_origin = format!("api_key=\"{api_key}\", algorithm=\"hmac-sha256\", headers=\"host date request-line\", signature=\"{signature}\"");
    let authorization = STANDARD.encode(authorization_origin);

    Ok(Url::parse_with_params(
        url.as_str(),
        [
            ("authorization", authorization.as_str()),
            ("date", date.as_str()),
            ("host", host),
        ],
    )?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_authorization() {
        let url = authorization(
            "wss://spark-api.xf-yun.com/v3.1/chat",
            "MjlmNzkzNmZkMDQ2OTc0ZDdmNGE2ZTZi",
            "addd2272b6d8b7c8abdd79531420ca3b",
            OffsetDateTime::from_unix_timestamp(1683254619).unwrap(),
        )
        .unwrap();

        assert_eq!(url, Url::parse("wss://spark-api.xf-yun.com/v3.1/chat?authorization=YXBpX2tleT0iYWRkZDIyNzJiNmQ4YjdjOGFiZGQ3OTUzMTQyMGNhM2IiLCBhbGdvcml0aG09ImhtYWMtc2hhMjU2IiwgaGVhZGVycz0iaG9zdCBkYXRlIHJlcXVlc3QtbGluZSIsIHNpZ25hdHVyZT0iSm1LWFBZYmFVRjg2R0pOY0ZEaEEwaGY1WmJ5TGdib0cxTVNKYml3ZzNBVT0i&date=Fri%2C+05+May+2023+02%3A43%3A39+%2B0000&host=spark-api.xf-yun.com").unwrap());
    }
}
