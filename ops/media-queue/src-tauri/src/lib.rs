mod capture;

use std::sync::{Arc, Mutex};

use capture::audio::{start_browser_audio_capture, stop_shared_audio, SharedAudioSession};
use capture::video::capture_browser_webview;
use capture::{BrowserReadyPayload, BROWSER_LABEL, BROWSER_WINDOW_TITLE};
use parking_lot::Mutex as ParkingMutex;
use serde::Serialize;
use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_clipboard_manager::ClipboardExt;

const MAIN_WINDOW_WIDTH: f64 = 480.0;
const MAIN_WINDOW_HEIGHT_IDLE: f64 = 464.0;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiState {
  browser_url: String,
  browser_open: bool,
}

pub struct AppState {
  browser_url: Mutex<String>,
  browser_process_id: Mutex<u32>,
  audio_session: SharedAudioSession,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CaptureFrameResponse {
  width: u32,
  height: u32,
  rgba_b64: String,
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

fn resolve_browser_process_id() -> u32 {
  #[cfg(target_os = "macos")]
  {
    if let Ok(content) = screencapturekit::shareable_content::SCShareableContent::get() {
      for window in content.windows() {
        if window.title().contains(BROWSER_WINDOW_TITLE) {
          return window.owning_application().process_id().max(0) as u32;
        }
      }
    }
    return std::process::id();
  }
  #[cfg(not(target_os = "macos"))]
  {
    std::process::id()
  }
}

fn emit_browser_ready(app: &AppHandle, url: String) {
  let process_id = {
    let st = app.state::<AppState>();
    let mut guard = st.browser_process_id.lock().unwrap();
    if *guard == 0 {
      *guard = resolve_browser_process_id();
    }
    *guard
  };
  let payload = BrowserReadyPayload { url, process_id };
  let _ = app.emit("mq-browser-ready", payload);
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

  let app_ready = app.clone();
  WebviewWindowBuilder::new(&app, BROWSER_LABEL, WebviewUrl::External(parsed))
    .title(BROWSER_WINDOW_TITLE)
    .inner_size(1024.0, 720.0)
    .resizable(true)
    .on_navigation(|_url| true)
    .on_page_load(move |_webview, payload| {
      if payload.event() == PageLoadEvent::Finished {
        emit_browser_ready(&app_ready, payload.url().to_string());
      }
    })
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

#[tauri::command]
fn resize_main_window(app: AppHandle, height: f64) -> Result<(), String> {
  if !height.is_finite() || height < 1.0 {
    return Err("invalid window height".into());
  }
  let win = app
    .get_webview_window("main")
    .ok_or_else(|| "main window missing".to_string())?;
  use tauri::{LogicalSize, Size};
  win
    .set_size(Size::Logical(LogicalSize::new(
      MAIN_WINDOW_WIDTH,
      height,
    )))
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn capture_browser_frame(app: AppHandle) -> Result<CaptureFrameResponse, String> {
  let window = app
    .get_webview_window(BROWSER_LABEL)
    .ok_or_else(|| "browser window missing".to_string())?;
  tauri::async_runtime::spawn_blocking(move || {
    let (tx, rx) = std::sync::mpsc::sync_channel(1);
    window
      .with_webview(move |platform| {
        let frame = capture_browser_webview(platform.inner());
        let _ = tx.send(frame);
      })
      .map_err(|err| err.to_string())?;
    let frame = rx
      .recv()
      .map_err(|_| "capture did not complete".to_string())??;
    Ok(CaptureFrameResponse {
      width: frame.width,
      height: frame.height,
      rgba_b64: base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        frame.rgba,
      ),
    })
  })
  .await
  .map_err(|err| err.to_string())?
}

#[tauri::command]
fn start_browser_audio(app: AppHandle, state: tauri::State<'_, AppState>) -> Result<u32, String> {
  stop_shared_audio(&state.audio_session);
  let session = start_browser_audio_capture(app)?;
  let session_id = session.session_id;
  *state.audio_session.lock() = Some(session);
  Ok(session_id)
}

#[tauri::command]
fn stop_browser_audio(state: tauri::State<'_, AppState>) {
  stop_shared_audio(&state.audio_session);
}

#[tauri::command]
fn get_browser_process_id(state: tauri::State<'_, AppState>) -> u32 {
  let mut guard = state.browser_process_id.lock().unwrap();
  if *guard == 0 {
    *guard = resolve_browser_process_id();
  }
  *guard
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .setup(|app| {
      app.manage(AppState {
        browser_url: Mutex::new(String::new()),
        browser_process_id: Mutex::new(0),
        audio_session: Arc::new(ParkingMutex::new(None)),
      });
      if let Some(win) = app.get_webview_window("main") {
        use tauri::{LogicalSize, Size};
        let _ = win.set_resizable(false);
        let _ = win.set_size(Size::Logical(LogicalSize::new(
          MAIN_WINDOW_WIDTH,
          MAIN_WINDOW_HEIGHT_IDLE,
        )));
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_state,
      copy_text,
      open_browser,
      close_browser,
      resize_main_window,
      capture_browser_frame,
      start_browser_audio,
      stop_browser_audio,
      get_browser_process_id,
    ])
    .run(tauri::generate_context!())
    .expect("error while running media-queue");
}
