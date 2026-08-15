mod download;

use std::fs;
use std::path::{Path, PathBuf};

use download::{
  ClearDownloadsResult, DownloadManager, DownloadState,
};
use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri::ipc::Response;
use tauri_plugin_clipboard_manager::ClipboardExt;

const MAIN_WINDOW_WIDTH: f64 = 480.0;
const MAIN_WINDOW_HEIGHT_IDLE: f64 = 464.0;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiState {
  download: DownloadState,
}

pub struct AppState {
  downloads: DownloadManager,
  media_cache_dir: PathBuf,
}

fn build_ui_state(app: &AppHandle) -> UiState {
  let st = app.state::<AppState>();
  UiState {
    download: st.downloads.read_state(),
  }
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
fn start_media_download(app: AppHandle, url: String) -> Result<DownloadState, String> {
  let st = app.state::<AppState>();
  st.downloads.start_download(app.clone(), url)?;
  Ok(st.downloads.read_state())
}

#[tauri::command]
fn cancel_media_download(app: AppHandle) -> Result<DownloadState, String> {
  let st = app.state::<AppState>();
  st.downloads.cancel_download();
  Ok(st.downloads.read_state())
}

#[tauri::command]
fn clear_media_downloads(app: AppHandle) -> Result<ClearDownloadsResult, String> {
  let st = app.state::<AppState>();
  st.downloads.clear_downloads()
}

#[tauri::command]
fn get_media_download_state(app: AppHandle) -> DownloadState {
  let st = app.state::<AppState>();
  st.downloads.read_state()
}

fn media_path_allowed(media_cache_dir: &Path, path: &str) -> Result<PathBuf, String> {
  let requested = PathBuf::from(path);
  if !requested.is_absolute() {
    return Err("path must be absolute".into());
  }
  let canonical = fs::canonicalize(&requested).map_err(|e| e.to_string())?;
  let cache_canonical =
    fs::canonicalize(media_cache_dir).map_err(|e| e.to_string())?;
  if !canonical.starts_with(&cache_canonical) {
    return Err("path outside media cache".into());
  }
  if !canonical.is_file() {
    return Err("not a file".into());
  }
  Ok(canonical)
}

#[tauri::command]
fn read_media_file(app: AppHandle, path: String) -> Result<Response, String> {
  let st = app.state::<AppState>();
  let allowed = media_path_allowed(&st.media_cache_dir, path.trim())?;
  let bytes = fs::read(&allowed).map_err(|e| e.to_string())?;
  Ok(Response::new(bytes))
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .setup(|app| {
      let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("media-queue");
      std::fs::create_dir_all(&cache_dir).ok();

      let resource_root = if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
      } else {
        app
          .path()
          .resource_dir()
          .unwrap_or_else(|_| PathBuf::from("."))
      };

      app.manage(AppState {
        downloads: DownloadManager::new(resource_root, cache_dir.clone()),
        media_cache_dir: cache_dir,
      });

      {
        let st = app.state::<AppState>();
        st.downloads.warm_ejs_cache();
      }

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
      resize_main_window,
      start_media_download,
      cancel_media_download,
      clear_media_downloads,
      get_media_download_state,
      read_media_file,
    ])
    .run(tauri::generate_context!())
    .expect("error while running media-queue");
}
