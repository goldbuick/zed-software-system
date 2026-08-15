use std::ffi::c_void;
use std::sync::mpsc;
use std::time::Duration;

use webview2_com::Microsoft::Web::WebView2::Win32::{
  ICoreWebView2, COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
};
use webview2_com::CapturePreviewCompletedHandler;
use windows::Win32::System::Com::{CreateStreamOnHGlobal, IStream, STREAM_SEEK_SET};
use windows_core::Interface;

use super::super::CaptureFrame;

pub fn capture_browser_webview(webview_ptr: *mut c_void) -> Result<CaptureFrame, String> {
  if webview_ptr.is_null() {
    return Err("browser webview missing".into());
  }
  unsafe {
    let webview: ICoreWebView2 = Interface::from_raw(webview_ptr.cast());
    let stream: IStream =
      CreateStreamOnHGlobal(None, true).map_err(|err| err.to_string())?;
    let (tx, rx) = mpsc::sync_channel(1);
    let handler = CapturePreviewCompletedHandler::create(Box::new(move |result| {
      let _ = tx.send(result.map_err(|err| err.to_string()));
      Ok(())
    }))
    .map_err(|err| err.to_string())?;

    webview
      .CapturePreview(
        COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
        &stream,
        &handler,
      )
      .map_err(|err| err.to_string())?;

    rx.recv_timeout(Duration::from_secs(5))
      .map_err(|_| "capturepreview timeout".to_string())??;

    let mut pngbytes = Vec::new();
    let mut buffer = [0u8; 8192];
    loop {
      let read = stream
        .Read(&mut buffer, None)
        .map_err(|err| err.to_string())?;
      if read == 0 {
        break;
      }
      pngbytes.extend_from_slice(&buffer[..read as usize]);
    }
    stream
      .Seek(0, STREAM_SEEK_SET, None)
      .map_err(|err| err.to_string())?;

    if pngbytes.is_empty() {
      return Err("capturepreview empty".into());
    }
    let decoded = image::load_from_memory(&pngbytes).map_err(|err| err.to_string())?;
    let rgba = decoded.to_rgba8();
    Ok(CaptureFrame {
      width: rgba.width(),
      height: rgba.height(),
      rgba: rgba.into_raw(),
    })
  }
}
