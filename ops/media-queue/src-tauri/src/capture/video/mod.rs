use super::CaptureFrame;

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;
mod stub;

#[cfg(target_os = "macos")]
pub use macos::capture_browser_webview;
#[cfg(target_os = "windows")]
pub use windows::capture_browser_webview;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub use stub::capture_browser_webview;
