use std::fs;
use std::path::{Path, PathBuf};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
  pub youtube_stream_key: String,
  pub local_bearer: String,
  pub tls_trusted: bool,
}

impl Default for Config {
  fn default() -> Self {
    Self {
      youtube_stream_key: String::new(),
      local_bearer: String::new(),
      tls_trusted: false,
    }
  }
}

fn config_path(userdata: &Path) -> PathBuf {
  userdata.join("config.json")
}

fn read_raw(userdata: &Path) -> Config {
  let path = config_path(userdata);
  match fs::read_to_string(&path) {
    Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
    Err(_) => Config::default(),
  }
}

fn write_raw(userdata: &Path, data: &Config) -> Result<(), String> {
  fs::create_dir_all(userdata).map_err(|e| e.to_string())?;
  let path = config_path(userdata);
  let body = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
  fs::write(path, body).map_err(|e| e.to_string())
}

fn new_bearer() -> String {
  let mut bytes = [0u8; 24];
  rand::thread_rng().fill_bytes(&mut bytes);
  URL_SAFE_NO_PAD.encode(bytes)
}

pub fn ensure_bearer(userdata: &Path) -> Result<String, String> {
  let mut data = read_raw(userdata);
  if data.local_bearer.len() >= 16 {
    return Ok(data.local_bearer);
  }
  data.local_bearer = new_bearer();
  write_raw(userdata, &data)?;
  Ok(data.local_bearer)
}

pub fn get_config(userdata: &Path) -> Result<Config, String> {
  let mut data = read_raw(userdata);
  if data.local_bearer.len() < 16 {
    data.local_bearer = new_bearer();
    write_raw(userdata, &data)?;
  }
  Ok(data)
}

pub fn set_youtube_key(userdata: &Path, key: &str) -> Result<(), String> {
  let mut data = read_raw(userdata);
  data.youtube_stream_key = key.trim().to_string();
  write_raw(userdata, &data)
}

pub fn regenerate_bearer(userdata: &Path) -> Result<String, String> {
  let mut data = read_raw(userdata);
  data.local_bearer = new_bearer();
  write_raw(userdata, &data)?;
  Ok(data.local_bearer)
}

pub fn set_tls_trusted(userdata: &Path, value: bool) -> Result<(), String> {
  let mut data = read_raw(userdata);
  data.tls_trusted = value;
  write_raw(userdata, &data)
}
