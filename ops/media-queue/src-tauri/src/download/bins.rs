use std::path::{Path, PathBuf};

pub fn platform_dir() -> String {
  #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
  {
    return "darwin-arm64".into();
  }
  #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
  {
    return "darwin-x64".into();
  }
  #[cfg(target_os = "windows")]
  {
    return "win32-x64".into();
  }
  #[cfg(not(any(target_os = "windows", target_os = "macos")))]
  {
    return "linux-x64".into();
  }
}

fn bin_path(resource_root: &Path, name: &str) -> PathBuf {
  let packaged = resource_root.join("bin").join(name);
  if packaged.exists() {
    return packaged;
  }
  let plat = platform_dir();
  resource_root
    .join("vendor")
    .join(plat)
    .join(name)
}

pub fn resolve_ytdlp(resource_root: &Path) -> PathBuf {
  #[cfg(windows)]
  let name = "yt-dlp.exe";
  #[cfg(not(windows))]
  let name = "yt-dlp";
  bin_path(resource_root, name)
}

pub fn resolve_ffmpeg(resource_root: &Path) -> PathBuf {
  #[cfg(windows)]
  let name = "ffmpeg.exe";
  #[cfg(not(windows))]
  let name = "ffmpeg";
  bin_path(resource_root, name)
}

pub fn resolve_deno(resource_root: &Path) -> PathBuf {
  #[cfg(windows)]
  let name = "deno.exe";
  #[cfg(not(windows))]
  let name = "deno";
  bin_path(resource_root, name)
}

pub fn ffmpeg_dir(ffmpeg: &Path) -> PathBuf {
  ffmpeg
    .parent()
    .map(Path::to_path_buf)
    .unwrap_or_else(|| PathBuf::from("."))
}
