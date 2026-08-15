use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use core_media_rs::cm_sample_buffer::CMSampleBuffer;
use screencapturekit::{
  shareable_content::SCShareableContent,
  stream::{
    configuration::SCStreamConfiguration, content_filter::SCContentFilter,
    output_trait::SCStreamOutputTrait, output_type::SCStreamOutputType, SCStream,
  },
};
use tauri::AppHandle;

use crate::capture::audio::emit_pcm_chunk;
use crate::capture::BROWSER_WINDOW_TITLE;

struct AudioOutput {
  app: AppHandle,
  session_id: u32,
}

impl SCStreamOutputTrait for AudioOutput {
  fn did_output_sample_buffer(
    &self,
    sample_buffer: CMSampleBuffer,
    of_type: SCStreamOutputType,
  ) {
    if of_type != SCStreamOutputType::Audio {
      return;
    }
    let list = match sample_buffer.get_audio_buffer_list() {
      Ok(list) => list,
      Err(_) => return,
    };
    if list.num_buffers() == 0 {
      return;
    }
    let buffer = match list.get(0) {
      Some(buffer) => buffer,
      None => return,
    };
    let channels = buffer.number_channels.max(1) as u16;
    let bytes = buffer.data();
    if bytes.is_empty() {
      return;
    }
    emit_pcm_chunk(&self.app, self.session_id, 48_000, channels, bytes);
  }
}

pub fn run_audio_loopback(
  app: AppHandle,
  session_id: u32,
  stop: Arc<AtomicBool>,
) -> Result<(), String> {
  let content = SCShareableContent::get().map_err(|err| format!("shareable content: {err}"))?;
  let window = content
    .windows()
    .into_iter()
    .find(|window| window.title().contains(BROWSER_WINDOW_TITLE))
    .ok_or_else(|| format!("browser window not found ({BROWSER_WINDOW_TITLE})"))?;

  let filter = SCContentFilter::new().with_desktop_independent_window(&window);

  let config = SCStreamConfiguration::new()
    .set_captures_audio(true)
    .map_err(|err| format!("audio config: {err}"))?
    .set_sample_rate(48_000)
    .map_err(|err| format!("sample rate: {err}"))?
    .set_channel_count(2)
    .map_err(|err| format!("channel count: {err}"))?
    .set_width(16)
    .map_err(|err| format!("width: {err}"))?
    .set_height(16)
    .map_err(|err| format!("height: {err}"))?;

  let mut stream = SCStream::new(&filter, &config);
  stream.add_output_handler(
    AudioOutput { app, session_id },
    SCStreamOutputType::Audio,
  );
  stream
    .start_capture()
    .map_err(|err| format!("start audio capture: {err}"))?;

  while !stop.load(Ordering::SeqCst) {
    std::thread::sleep(std::time::Duration::from_millis(20));
  }
  stream.stop_capture().ok();
  Ok(())
}
