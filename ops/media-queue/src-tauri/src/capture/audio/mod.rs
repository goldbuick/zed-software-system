use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;

use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

static SESSION_COUNTER: AtomicU32 = AtomicU32::new(1);

pub struct AudioCaptureSession {
  pub session_id: u32,
  stop: Arc<AtomicBool>,
  thread: Option<JoinHandle<()>>,
}

impl AudioCaptureSession {
  pub fn stop(&mut self) {
    self.stop.store(true, Ordering::SeqCst);
    if let Some(thread) = self.thread.take() {
      let _ = thread.join();
    }
  }
}

impl Drop for AudioCaptureSession {
  fn drop(&mut self) {
    self.stop();
  }
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioPcmPayload {
  session: u32,
  sample_rate: u32,
  channels: u16,
  format: &'static str,
  data: String,
}

pub fn start_browser_audio_capture(app: AppHandle) -> Result<AudioCaptureSession, String> {
  let session_id = SESSION_COUNTER.fetch_add(1, Ordering::SeqCst);
  let stop = Arc::new(AtomicBool::new(false));
  let stop_thread = Arc::clone(&stop);
  let app_thread = app.clone();

  let thread = std::thread::spawn(move || {
    #[cfg(target_os = "macos")]
    {
      if let Err(err) = macos::run_audio_loopback(app_thread, session_id, stop_thread) {
        let _ = app.emit(
          "mq-audio-error",
          serde_json::json!({ "session": session_id, "detail": err }),
        );
      }
      return;
    }
    #[cfg(target_os = "windows")]
    {
      if let Err(err) = windows::run_audio_loopback(app_thread, session_id, stop_thread) {
        let _ = app.emit(
          "mq-audio-error",
          serde_json::json!({ "session": session_id, "detail": err }),
        );
      }
      return;
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
      let _ = app.emit(
        "mq-audio-error",
        serde_json::json!({
          "session": session_id,
          "detail": "audio capture unsupported on this platform",
        }),
      );
    }
  });

  Ok(AudioCaptureSession {
    session_id,
    stop,
    thread: Some(thread),
  })
}

pub fn emit_pcm_chunk(
  app: &AppHandle,
  session_id: u32,
  sample_rate: u32,
  channels: u16,
  pcm: &[u8],
) {
  let payload = AudioPcmPayload {
    session: session_id,
    sample_rate,
    channels,
    format: "f32le",
    data: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, pcm),
  };
  let _ = app.emit("mq-audio-pcm", payload);
}

pub type SharedAudioSession = Arc<Mutex<Option<AudioCaptureSession>>>;

pub fn stop_shared_audio(session: &SharedAudioSession) {
  let mut guard = session.lock();
  if let Some(mut active) = guard.take() {
    active.stop();
  }
}
