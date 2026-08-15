use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_clipboard_manager::ClipboardExt;

const BROWSER_LABEL: &str = "browser";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiState {
  browser_url: String,
  browser_open: bool,
}

pub struct AppState {
  browser_url: Mutex<String>,
}

fn build_ui_state(app: &AppHandle) -> UiState {
  let st = app.state::<AppState>();
  let browser_url = st
    .browser_url
    .lock()
    .map(|g| g.clone())
    .unwrap_or_default();
  let browser_open = app.get_webview_window(BROWSER_LABEL).is_some();
  UiState {
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
fn copy_text(app: AppHandle, text: String) -> Result<bool, String> {
  let trimmed = text.trim();
  if trimmed.is_empty() {
    return Err("nothing to copy".into());
  }
  app
    .clipboard()
    .write_text(trimmed)
    .map_err(|e| e.to_string())?;
  Ok(true)
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
    let urlstr = parsed.as_str().to_string();
    if let Ok(mut g) = st.browser_url.lock() {
      *g = urlstr;
    };
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
      app.manage(AppState {
        browser_url: Mutex::new(String::new()),
      });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_state,
      copy_text,
      open_browser,
      close_browser
    ])
    .run(tauri::generate_context!())
    .expect("error while running media-queue");
}
