pub mod audio;
pub mod video;

pub const BROWSER_LABEL: &str = "browser";
pub const BROWSER_WINDOW_TITLE: &str = "Media Queue Browser";
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureFrame {
  pub width: u32,
  pub height: u32,
  pub rgba: Vec<u8>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserReadyPayload {
  pub url: String,
  pub process_id: u32,
}
