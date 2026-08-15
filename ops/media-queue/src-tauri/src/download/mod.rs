mod bins;

use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use std::time::Duration;

use bins::{ffmpeg_dir, resolve_deno, resolve_ffmpeg, resolve_ytdlp};

const MAX_DOWNLOAD_ATTEMPTS: u32 = 3;
const YTDLP_FORMAT: &str = "best[height<=720][vcodec^=avc][ext=mp4][acodec^=mp4a]/bestvideo[vcodec^=avc1][height<=720][ext=mp4]+bestaudio[acodec^=mp4a][ext=m4a]/bestvideo[vcodec^=avc][height<=720]+bestaudio/best[height<=720]";
const FFMPEG_POST_ARGS_COPY: &str =
  "ffmpeg:-c:v copy -c:a copy -movflags +faststart";
const FFMPEG_POST_ARGS_TRANSCODE: &str =
  "ffmpeg:-c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DownloadPhase {
  Idle,
  Downloading,
  Ready,
  Error,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressPayload {
  pub percent: f64,
  pub eta: String,
  pub status: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadReadyPayload {
  pub path: String,
  pub title: String,
  pub duration: f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadErrorPayload {
  pub message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadState {
  pub phase: DownloadPhase,
  pub percent: f64,
  pub path: String,
  pub error: String,
  pub cache_bytes: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearDownloadsResult {
  pub deleted_count: u32,
  pub freed_bytes: u64,
}

struct ActiveJob {
  cancel: Arc<AtomicBool>,
  thread: JoinHandle<()>,
  child: Arc<Mutex<Option<Child>>>,
}

struct DownloadInner {
  resource_root: PathBuf,
  cache_dir: PathBuf,
  ytdlp_home: PathBuf,
  phase: Mutex<DownloadPhase>,
  percent: Mutex<f64>,
  path: Mutex<String>,
  error: Mutex<String>,
  job: Mutex<Option<ActiveJob>>,
}

pub struct DownloadManager {
  inner: Arc<DownloadInner>,
}

impl DownloadManager {
  pub fn new(resource_root: PathBuf, cache_dir: PathBuf) -> Self {
    fs::create_dir_all(&cache_dir).ok();
    let ytdlp_home = cache_dir.join("ytdlp-home");
    fs::create_dir_all(&ytdlp_home).ok();
    Self {
      inner: Arc::new(DownloadInner {
        resource_root,
        cache_dir,
        ytdlp_home,
        phase: Mutex::new(DownloadPhase::Idle),
        percent: Mutex::new(0.0),
        path: Mutex::new(String::new()),
        error: Mutex::new(String::new()),
        job: Mutex::new(None),
      }),
    }
  }

  pub fn warm_ejs_cache(&self) {
    let inner = self.inner.clone();
    thread::spawn(move || {
      let ytdlp = resolve_ytdlp(&inner.resource_root);
      let deno = resolve_deno(&inner.resource_root);
      if !ytdlp.exists() || !deno.exists() {
        return;
      }
      let deno = fs::canonicalize(&deno).unwrap_or(deno);
      ytdlp_warm(
        &ytdlp,
        &deno,
        &inner.ytdlp_home,
        "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      );
    });
  }

  fn set_phase(inner: &DownloadInner, phase: DownloadPhase) {
    if let Ok(mut g) = inner.phase.lock() {
      *g = phase;
    }
  }

  fn set_percent(inner: &DownloadInner, percent: f64) {
    if let Ok(mut g) = inner.percent.lock() {
      *g = percent;
    }
  }

  fn set_path(inner: &DownloadInner, path: String) {
    if let Ok(mut g) = inner.path.lock() {
      *g = path;
    }
  }

  fn set_error(inner: &DownloadInner, message: String) {
    if let Ok(mut g) = inner.error.lock() {
      *g = message;
    }
  }

  pub fn cache_bytes(&self) -> u64 {
    media_file_bytes(&self.inner.cache_dir)
  }

  pub fn read_state(&self) -> DownloadState {
    let inner = &self.inner;
    DownloadState {
      phase: *inner.phase.lock().unwrap_or_else(|e| e.into_inner()),
      percent: *inner.percent.lock().unwrap_or_else(|e| e.into_inner()),
      path: inner.path.lock().map(|g| g.clone()).unwrap_or_default(),
      error: inner.error.lock().map(|g| g.clone()).unwrap_or_default(),
      cache_bytes: self.cache_bytes(),
    }
  }

  fn cancel_job(inner: &DownloadInner) {
    let job = inner.job.lock().ok().and_then(|mut g| g.take());
    if let Some(job) = job {
      job.cancel.store(true, Ordering::SeqCst);
      if let Ok(mut child) = job.child.lock() {
        if let Some(mut c) = child.take() {
          let _ = c.kill();
        }
      }
      let _ = job.thread.join();
    }
  }

  fn remove_partial_files(inner: &DownloadInner) {
    remove_mq_media_files(&inner.cache_dir, true);
  }

  pub fn cancel_download(&self) {
    let inner = &self.inner;
    Self::cancel_job(inner);
    Self::remove_partial_files(inner);
    if self.read_state().phase == DownloadPhase::Downloading {
      Self::set_phase(inner, DownloadPhase::Idle);
      Self::set_percent(inner, 0.0);
    }
  }

  pub fn clear_downloads(&self) -> Result<ClearDownloadsResult, String> {
    let inner = &self.inner;
    self.cancel_download();
    Self::set_path(inner, String::new());
    Self::set_error(inner, String::new());
    Self::set_percent(inner, 0.0);
    Self::set_phase(inner, DownloadPhase::Idle);

    let before = media_file_bytes(&inner.cache_dir);
    let mut deleted = 0u32;
    deleted += remove_mq_media_files(&inner.cache_dir, false);
    fs::create_dir_all(&inner.cache_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&inner.ytdlp_home).ok();
    let after = media_file_bytes(&inner.cache_dir);
    let freed = before.saturating_sub(after);
    Ok(ClearDownloadsResult {
      deleted_count: deleted,
      freed_bytes: freed,
    })
  }

  pub fn start_download(&self, app: AppHandle, url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
      return Err("url required".into());
    }

    let inner = self.inner.clone();
    self.cancel_download();
    Self::set_error(&inner, String::new());
    Self::set_path(&inner, String::new());
    Self::set_percent(&inner, 0.0);
    Self::set_phase(&inner, DownloadPhase::Downloading);

    let ytdlp = resolve_ytdlp(&inner.resource_root);
    let ffmpeg = resolve_ffmpeg(&inner.resource_root);
    let deno = resolve_deno(&inner.resource_root);
    if !ytdlp.exists() {
      return Err(format!(
        "yt-dlp binary missing: {}. Run yarn fetch-binaries in ops/media-queue.",
        ytdlp.display()
      ));
    }
    if !ffmpeg.exists() {
      return Err(format!(
        "ffmpeg binary missing: {}. Run yarn fetch-binaries in ops/media-queue.",
        ffmpeg.display()
      ));
    }
    if !deno.exists() {
      return Err(format!(
        "deno binary missing: {}. Run yarn fetch-binaries in ops/media-queue.",
        deno.display()
      ));
    }
    let deno = fs::canonicalize(&deno).unwrap_or(deno);
    let jspath = format!("deno:{}", deno.to_string_lossy());
    let ffdir = ffmpeg_dir(&ffmpeg);
    let ytdlp_path = ytdlp.clone();
    let deno_path = deno.clone();
    let url = trimmed.to_string();

    let cancel = Arc::new(AtomicBool::new(false));
    let cancel_thread = cancel.clone();
    let child_slot = Arc::new(Mutex::new(None::<Child>));
    let child_cancel = child_slot.clone();
    let app_emit = app.clone();

    let thread = thread::spawn(move || {
      let mut last_message = String::new();

      for attempt in 1..=MAX_DOWNLOAD_ATTEMPTS {
        if cancel_thread.load(Ordering::SeqCst) {
          DownloadManager::set_phase(&inner, DownloadPhase::Idle);
          return;
        }

        if attempt > 1 {
          remove_mq_media_files(&inner.cache_dir, true);
          thread::sleep(Duration::from_millis(1500));
        }

        ytdlp_warm(&ytdlp_path, &deno_path, &inner.ytdlp_home, &url);
        DownloadManager::set_percent(&inner, 0.0);

        let post_args = if attempt == 1 {
          FFMPEG_POST_ARGS_COPY
        } else {
          FFMPEG_POST_ARGS_TRANSCODE
        };

        let mut cmd = Command::new(&ytdlp_path);
        apply_ytdlp_base_args(&mut cmd, &jspath, &inner.ytdlp_home);
        cmd.current_dir(&inner.cache_dir)
          .arg("-f")
          .arg(YTDLP_FORMAT)
          .arg("--merge-output-format")
          .arg("mp4")
          .arg("--force-overwrites")
          .arg("--postprocessor-args")
          .arg(post_args)
          .arg("--no-playlist")
          .arg("--progress")
          .arg("--newline")
          .arg("--ffmpeg-location")
          .arg(&ffdir)
          .arg("-o")
          .arg("mq-%(id)s.%(ext)s")
          .arg("--print")
          .arg("after_move:filepath")
          .arg(&url)
          .stdout(Stdio::piped())
          .stderr(Stdio::piped());

        let child = match cmd.spawn() {
          Ok(child) => child,
          Err(err) => {
            last_message = format!("spawn yt-dlp: {err}");
            continue;
          }
        };

        if let Ok(mut guard) = child_cancel.lock() {
          *guard = Some(child);
        }

        let stdout = {
          let mut guard = child_cancel.lock().ok();
          guard
            .as_mut()
            .and_then(|slot| slot.as_mut())
            .and_then(|c| c.stdout.take())
        };
        let stderr = {
          let mut guard = child_cancel.lock().ok();
          guard
            .as_mut()
            .and_then(|slot| slot.as_mut())
            .and_then(|c| c.stderr.take())
        };
        let Some(stdout) = stdout else {
          last_message = "yt-dlp stdout missing".into();
          continue;
        };
        let Some(stderr) = stderr else {
          last_message = "yt-dlp stderr missing".into();
          continue;
        };

        let outpath = Arc::new(Mutex::new(String::new()));
        let errlines = Arc::new(Mutex::new(Vec::<String>::new()));

        let stdout_thread = {
          let cancel = cancel_thread.clone();
          let outpath = outpath.clone();
          thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
              if cancel.load(Ordering::SeqCst) {
                break;
              }
              let trimmed = line.trim();
              if !trimmed.is_empty()
                && !trimmed.starts_with('[')
                && (trimmed.contains('/') || trimmed.contains('\\'))
              {
                if let Ok(mut guard) = outpath.lock() {
                  *guard = trimmed.to_string();
                }
              }
            }
          })
        };

        let stderr_thread = {
          let cancel = cancel_thread.clone();
          let inner = inner.clone();
          let app = app_emit.clone();
          let errlines = errlines.clone();
          thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
              if cancel.load(Ordering::SeqCst) {
                break;
              }
              if line.contains("[download]") {
                if let Some(pct) = parse_percent(&line) {
                  DownloadManager::set_percent(&inner, pct);
                  let payload = DownloadProgressPayload {
                    percent: pct,
                    eta: parse_eta(&line),
                    status: "downloading".into(),
                  };
                  let _ = app.emit("mq-download-progress", payload);
                }
              } else if !line.trim().is_empty() {
                if let Ok(mut guard) = errlines.lock() {
                  guard.push(line);
                }
              }
            }
          })
        };

        let _ = stdout_thread.join();
        let _ = stderr_thread.join();

        let outpath = outpath.lock().map(|g| g.clone()).unwrap_or_default();
        let errlines = errlines
          .lock()
          .map(|g| g.clone())
          .unwrap_or_default();

        let status = {
          let mut guard = child_cancel.lock().ok();
          guard
            .as_mut()
            .and_then(|slot| slot.as_mut())
            .and_then(|c| c.wait().ok())
        };

        if cancel_thread.load(Ordering::SeqCst) {
          DownloadManager::set_phase(&inner, DownloadPhase::Idle);
          return;
        }

        let success = status.map(|s| s.success()).unwrap_or(false);
        if success && !outpath.is_empty() && Path::new(&outpath).exists() {
          DownloadManager::set_path(&inner, outpath.clone());
          DownloadManager::set_phase(&inner, DownloadPhase::Ready);
          DownloadManager::set_percent(&inner, 100.0);
          let payload = DownloadReadyPayload {
            path: outpath,
            title: String::new(),
            duration: 0.0,
          };
          let _ = app_emit.emit("mq-download-ready", payload);
          return;
        }

        last_message = if !errlines.is_empty() {
          format_ytdlp_error(&errlines, status)
        } else {
          format!(
            "yt-dlp exited with status {}",
            status.map(|s| s.code().unwrap_or(-1)).unwrap_or(-1)
          )
        };
      }

      DownloadManager::set_error(&inner, last_message.clone());
      DownloadManager::set_phase(&inner, DownloadPhase::Error);
      let _ = app_emit.emit("mq-download-error", DownloadErrorPayload {
        message: last_message,
      });
    });

    if let Ok(mut guard) = self.inner.job.lock() {
      *guard = Some(ActiveJob {
        cancel,
        thread,
        child: child_slot,
      });
    }

    Ok(())
  }
}

fn apply_ytdlp_base_args(cmd: &mut Command, jspath: &str, ytdlp_home: &Path) {
  cmd.arg("--no-update")
    .arg("--js-runtimes")
    .arg(jspath)
    .arg("--remote-components")
    .arg("ejs:github")
    .arg("--extractor-args")
    .arg("youtube:player_client=default,-android_sdkless")
    .env("XDG_CACHE_HOME", ytdlp_home);
}

fn ytdlp_warm(ytdlp: &Path, deno: &Path, ytdlp_home: &Path, url: &str) {
  let jspath = format!("deno:{}", deno.to_string_lossy());
  let mut cmd = Command::new(ytdlp);
  apply_ytdlp_base_args(&mut cmd, &jspath, ytdlp_home);
  cmd.arg("--skip-download")
    .arg("--print")
    .arg("id")
    .arg(url)
    .stdout(Stdio::null())
    .stderr(Stdio::null());
  let _ = cmd.status();
  thread::sleep(Duration::from_millis(500));
}

fn remove_mq_media_files(cache_dir: &Path, include_partials: bool) -> u32 {
  let Ok(entries) = fs::read_dir(cache_dir) else {
    return 0;
  };
  let mut deleted = 0u32;
  for entry in entries.flatten() {
    let path = entry.path();
    if !path.is_file() {
      continue;
    }
    let name = path
      .file_name()
      .and_then(|n| n.to_str())
      .unwrap_or_default();
    if !name.starts_with("mq-") {
      if !(include_partials
        && (name.ends_with(".part") || name.ends_with(".ytdl") || name.ends_with(".temp")))
      {
        continue;
      }
    }
    if fs::remove_file(&path).is_ok() {
      deleted += 1;
    }
  }
  deleted
}

fn media_file_bytes(cache_dir: &Path) -> u64 {
  let Ok(entries) = fs::read_dir(cache_dir) else {
    return 0;
  };
  let mut total = 0u64;
  for entry in entries.flatten() {
    let path = entry.path();
    if !path.is_file() {
      continue;
    }
    let name = path
      .file_name()
      .and_then(|n| n.to_str())
      .unwrap_or_default();
    if !name.starts_with("mq-") || !name.ends_with(".mp4") {
      continue;
    }
    if let Ok(meta) = fs::metadata(&path) {
      total += meta.len();
    }
  }
  total
}

fn format_ytdlp_error(
  errlines: &[String],
  status: Option<std::process::ExitStatus>,
) -> String {
  let mut picked: Vec<String> = errlines
    .iter()
    .filter(|line| {
      if line.contains("WARNING: --paths is ignored") {
        return false;
      }
      let lower = line.to_lowercase();
      line.contains("ERROR:")
        || line.contains("WARNING:")
        || lower.contains("[jsc")
        || lower.contains("ejs")
        || lower.contains("deno")
        || lower.contains("403")
    })
    .cloned()
    .collect();
  if picked.is_empty() {
    if let Some(last) = errlines.iter().rev().find(|l| !l.trim().is_empty()) {
      picked.push(last.clone());
    }
  }
  if picked.is_empty() {
    return format!(
      "yt-dlp exited with status {}",
      status.map(|s| s.code().unwrap_or(-1)).unwrap_or(-1)
    );
  }
  picked.join(" | ")
}

fn parse_percent(line: &str) -> Option<f64> {
  let idx = line.find('%')?;
  let before = &line[..idx];
  let token = before.split_whitespace().last()?;
  token.parse::<f64>().ok()
}

fn parse_eta(line: &str) -> String {
  if let Some(pos) = line.find("ETA ") {
    return line[pos + 4..].trim().to_string();
  }
  String::new()
}
