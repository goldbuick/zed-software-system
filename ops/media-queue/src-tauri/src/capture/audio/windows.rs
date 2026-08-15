use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tauri::AppHandle;

pub fn run_audio_loopback(
  app: AppHandle,
  session_id: u32,
  stop: Arc<AtomicBool>,
) -> Result<(), String> {
  let _ = app.emit(
    "mq-audio-error",
    serde_json::json!({
      "session": session_id,
      "detail": "windows process audio loopback is not implemented yet",
    }),
  );
  while !stop.load(Ordering::SeqCst) {
    std::thread::sleep(std::time::Duration::from_millis(200));
  }
  Ok(())
}
