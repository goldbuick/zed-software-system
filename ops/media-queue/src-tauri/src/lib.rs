use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

const BROWSER_LABEL: &str = "browser";
const CONFIG_FILE: &str = "media-queue.json";

#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Config {
  cafe_peer_id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiState {
  cafe_peer_id: String,
  browser_url: String,
  browser_open: bool,
}

pub struct AppState {
  userdata: PathBuf,
  browser_url: Mutex<String>,
}

fn config_path(userdata: &PathBuf) -> PathBuf {
  userdata.join(CONFIG_FILE)
}

fn read_config(userdata: &PathBuf) -> Config {
  let path = config_path(userdata);
  match std::fs::read_to_string(&path) {
    Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
    Err(_) => Config::default(),
  }
}

fn write_config(userdata: &PathBuf, cfg: &Config) -> Result<(), String> {
  std::fs::create_dir_all(userdata).map_err(|e| e.to_string())?;
  let raw = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
  std::fs::write(config_path(userdata), raw).map_err(|e| e.to_string())
}

fn build_ui_state(app: &AppHandle) -> UiState {
  let st = app.state::<AppState>();
  let cfg = read_config(&st.userdata);
  let browser_url = st
    .browser_url
    .lock()
    .map(|g| g.clone())
    .unwrap_or_default();
  let browser_open = app.get_webview_window(BROWSER_LABEL).is_some();
  UiState {
    cafe_peer_id: cfg.cafe_peer_id,
    browser_url,
    browser_open,
  }
}

fn emit_state(app: &AppHandle) {
  let _ = app.emit("mq-state", build_ui_state(app));
}

#[tauri::command]
fn get_state(app: AppHandle) -> UiState {
  build_ui_state(&app)
}

#[tauri::command]
fn set_cafe_peer_id(app: AppHandle, peer_id: String) -> Result<UiState, String> {
  let st = app.state::<AppState>();
  let mut cfg = read_config(&st.userdata);
  cfg.cafe_peer_id = peer_id.trim().to_string();
  write_config(&st.userdata, &cfg)?;
  Ok(build_ui_state(&app))
}

#[tauri::command]
fn open_browser(app: AppHandle, url: String) -> Result<UiState, String> {
  let trimmed = url.trim().to_string();
  if trimmed.is_empty() {
    return Err("url required".into());
  }
  let parsed = trimmed
    .parse::<url::Url>()
    .or_else(|_| format!("https://{trimmed}").parse::<url::Url>())
    .map_err(|e| e.to_string())?;

  {
    let st = app.state::<AppState>();
    if let Ok(mut g) = st.browser_url.lock() {
      *g = parsed.as_str().to_string();
    }
  }

  if let Some(existing) = app.get_webview_window(BROWSER_LABEL) {
    existing
      .navigate(parsed.clone())
      .map_err(|e| e.to_string())?;
    let _ = existing.show();
    let _ = existing.set_focus();
    emit_state(&app);
    return Ok(build_ui_state(&app));
  }

  WebviewWindowBuilder::new(&app, BROWSER_LABEL, WebviewUrl::External(parsed))
    .title("Media Queue Browser")
    .inner_size(1024.0, 720.0)
    .resizable(true)
    .on_navigation(|_url| true)
    .build()
    .map_err(|e| e.to_string())?;

  emit_state(&app);
  Ok(build_ui_state(&app))
}

#[tauri::command]
fn close_browser(app: AppHandle) -> Result<UiState, String> {
  if let Some(w) = app.get_webview_window(BROWSER_LABEL) {
    w.close().map_err(|e| e.to_string())?;
  }
  emit_state(&app);
  Ok(build_ui_state(&app))
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .setup(|app| {
      let userdata = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
      let _ = std::fs::create_dir_all(&userdata);
      app.manage(AppState {
        userdata,
        browser_url: Mutex::new(String::new()),
      });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_state,
      set_cafe_peer_id,
      open_browser,
      close_browser
    ])
    .run(tauri::generate_context!())
    .expect("error while running media-queue");
}
