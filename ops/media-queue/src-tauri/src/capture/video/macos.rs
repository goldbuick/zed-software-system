use std::ffi::c_void;
use std::sync::mpsc;
use std::time::Duration;

use block2::RcBlock;
use objc2_app_kit::NSImage;
use objc2_foundation::NSError;
use objc2_web_kit::WKWebView;

use super::super::CaptureFrame;

pub fn capture_browser_webview(webview_ptr: *mut c_void) -> Result<CaptureFrame, String> {
  if webview_ptr.is_null() {
    return Err("browser webview missing".into());
  }
  let (tx, rx) = mpsc::sync_channel(1);
  let handler = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
    let result = if !error.is_null() {
      Err("wkwebview snapshot failed".into())
    } else if image.is_null() {
      Err("wkwebview snapshot empty".into())
    } else {
      nsimage_to_frame(unsafe { &*image })
    };
    let _ = tx.send(result);
  });
  let wk = unsafe { &*(webview_ptr.cast::<WKWebView>()) };
  unsafe {
    wk.takeSnapshotWithConfiguration_completionHandler(None, &handler);
  }
  rx.recv_timeout(Duration::from_secs(5))
    .map_err(|_| "wkwebview snapshot timeout".to_string())?
}

fn nsimage_to_frame(image: &NSImage) -> Result<CaptureFrame, String> {
  let tiff = image
    .TIFFRepresentation()
    .ok_or_else(|| "snapshot tiff missing".to_string())?;
  let bytes: Vec<u8> = tiff.iter().collect();
  let decoded = image::load_from_memory(&bytes).map_err(|err| err.to_string())?;
  let rgba = decoded.to_rgba8();
  let width = rgba.width();
  let height = rgba.height();
  Ok(CaptureFrame {
    width,
    height,
    rgba: rgba.into_raw(),
  })
}
