use super::CaptureFrame;

#[allow(dead_code)]
pub fn capture_browser_webview(_webview_ptr: *mut std::ffi::c_void) -> Result<CaptureFrame, String> {
  Err("native webview capture is unsupported on this platform".into())
}
