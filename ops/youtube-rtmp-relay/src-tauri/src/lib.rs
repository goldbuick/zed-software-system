mod auth;
mod config;
mod constants;
mod mediamtx;
mod tls;

use std::path::PathBuf;
use std::sync::Mutex;

use auth::AuthServer;
use mediamtx::MediaMtx;
use serde::Serialize;
use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Emitter, Manager,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_shell::ShellExt;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiState {
  status: String,
  status_detail: String,
  youtube_stream_key: String,
  local_bearer: String,
  whip_url: String,
  tls_trusted: bool,
  running: bool,
  logs: Vec<String>,
  releases_url: String,
}

pub struct AppState {
  userdata: PathBuf,
  resource_root: PathBuf,
  status: Mutex<String>,
  status_detail: Mutex<String>,
  auth: AuthServer,
  mediamtx: MediaMtx,
}

fn emit_state(app: &AppHandle) {
  if let Ok(state) = build_ui_state(app) {
    let _ = app.emit("relay-state", state);
  }
}

fn build_ui_state(app: &AppHandle) -> Result<UiState, String> {
  let st = app.state::<AppState>();
  let cfg = config::get_config(&st.userdata)?;
  let status = st.status.lock().map_err(|e| e.to_string())?.clone();
  let status_detail = st
    .status_detail
    .lock()
    .map_err(|e| e.to_string())?
    .clone();
  let running = st.mediamtx.is_running();
  let logs = st.mediamtx.logs();
  Ok(UiState {
    status,
    status_detail,
    youtube_stream_key: cfg.youtube_stream_key,
    local_bearer: cfg.local_bearer,
    whip_url: constants::WHIP_URL.to_string(),
    tls_trusted: cfg.tls_trusted,
    running,
    logs,
    releases_url: constants::RELEASES_URL.to_string(),
  })
}

fn set_status(app: &AppHandle, status: &str, detail: &str) {
  let st = app.state::<AppState>();
  if let Ok(mut s) = st.status.lock() {
    *s = status.to_string();
  }
  if let Ok(mut d) = st.status_detail.lock() {
    *d = detail.to_string();
  }
  emit_state(app);
}

#[tauri::command]
fn get_state(app: AppHandle) -> Result<UiState, String> {
  build_ui_state(&app)
}

#[tauri::command]
fn set_youtube_key(app: AppHandle, key: String) -> Result<UiState, String> {
  let st = app.state::<AppState>();
  config::set_youtube_key(&st.userdata, &key)?;
  build_ui_state(&app)
}

#[tauri::command]
fn regenerate_bearer(app: AppHandle) -> Result<UiState, String> {
  let st = app.state::<AppState>();
  let bearer = config::regenerate_bearer(&st.userdata)?;
  st.auth.set_expected_bearer(&bearer);
  build_ui_state(&app)
}

#[tauri::command]
fn start_relay(app: AppHandle) -> Result<UiState, String> {
  let st = app.state::<AppState>();
  let cfg = config::get_config(&st.userdata)?;
  let _ = config::ensure_bearer(&st.userdata)?;
  st.auth.set_expected_bearer(&cfg.local_bearer);
  st.auth.start()?;
  let certs = tls::ensure_server_certs(&st.userdata)?;
  if !cfg.tls_trusted {
    let ok = tls::install_trust(&certs.cert);
    config::set_tls_trusted(&st.userdata, ok)?;
    if !ok {
      set_status(
        &app,
        "error",
        "Could not auto-trust TLS cert. Trust server.crt manually, then retry.",
      );
    }
  }
  match st.mediamtx.start(&certs, &cfg.youtube_stream_key) {
    Ok(()) => {
      set_status(&app, "listening", "Waiting for cafe WHIP publish");
      build_ui_state(&app)
    }
    Err(err) => {
      set_status(&app, "error", &err);
      Err(err)
    }
  }
}

#[tauri::command]
fn stop_relay(app: AppHandle) -> Result<UiState, String> {
  let st = app.state::<AppState>();
  st.mediamtx.stop()?;
  set_status(&app, "idle", "");
  build_ui_state(&app)
}

#[tauri::command]
fn copy_bearer(app: AppHandle) -> Result<bool, String> {
  let st = app.state::<AppState>();
  let cfg = config::get_config(&st.userdata)?;
  app
    .clipboard()
    .write_text(cfg.local_bearer)
    .map_err(|e| e.to_string())?;
  Ok(true)
}

#[tauri::command]
fn open_releases(app: AppHandle) -> Result<bool, String> {
  app
    .shell()
    .open(constants::RELEASES_URL, None)
    .map_err(|e| e.to_string())?;
  Ok(true)
}

#[tauri::command]
fn refresh_logs(app: AppHandle) -> Result<UiState, String> {
  let st = app.state::<AppState>();
  if st.mediamtx.is_running() {
    let status = st.status.lock().map_err(|e| e.to_string())?.clone();
    if status == "listening" {
      let logs = st.mediamtx.logs().join("\n");
      if logs.to_lowercase().contains("runonready command started") {
        set_status(&app, "pushing", "Pushing to YouTube");
      }
    }
  } else {
    let status = st.status.lock().map_err(|e| e.to_string())?.clone();
    if status == "listening" || status == "pushing" {
      set_status(&app, "idle", "MediaMTX stopped");
    }
  }
  build_ui_state(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let userdata = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
      std::fs::create_dir_all(&userdata).ok();

      // Dev: repo youtube-rtmp-relay folder; packaged: resource dir.
      let resource_root = if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
      } else {
        app
          .path()
          .resource_dir()
          .unwrap_or_else(|_| PathBuf::from("."))
      };

      let mediamtx = MediaMtx::new(resource_root.clone(), userdata.clone());
      let auth = AuthServer::new();
      let _ = config::ensure_bearer(&userdata);
      if let Ok(cfg) = config::get_config(&userdata) {
        auth.set_expected_bearer(&cfg.local_bearer);
      }

      app.manage(AppState {
        userdata,
        resource_root,
        status: Mutex::new("idle".into()),
        status_detail: Mutex::new(String::new()),
        auth,
        mediamtx,
      });

      let show = MenuItem::with_id(app, "show", "Open settings", true, None::<&str>)?;
      let start = MenuItem::with_id(app, "start", "Start relay", true, None::<&str>)?;
      let stop = MenuItem::with_id(app, "stop", "Stop relay", true, None::<&str>)?;
      let copy = MenuItem::with_id(app, "copy", "Copy local bearer", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show, &start, &stop, &copy, &quit])?;

      let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => {
            if let Some(w) = app.get_webview_window("main") {
              let _ = w.show();
              let _ = w.set_focus();
            }
          }
          "start" => {
            let _ = start_relay(app.clone());
          }
          "stop" => {
            let _ = stop_relay(app.clone());
          }
          "copy" => {
            let _ = copy_bearer(app.clone());
          }
          "quit" => {
            let _ = stop_relay(app.clone());
            app.state::<AppState>().auth.stop();
            app.exit(0);
          }
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let app = tray.app_handle();
            if let Some(w) = app.get_webview_window("main") {
              let _ = w.show();
              let _ = w.set_focus();
            }
          }
        })
        .build(app)?;

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_state,
      set_youtube_key,
      regenerate_bearer,
      start_relay,
      stop_relay,
      copy_bearer,
      open_releases,
      refresh_logs
    ])
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        // Keep tray alive; hide settings instead of quitting.
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri youtube relay");
}
