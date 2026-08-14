use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub struct CertPaths {
  pub key: PathBuf,
  pub cert: PathBuf,
}

pub fn cert_paths(userdata: &Path) -> Result<CertPaths, String> {
  let dir = userdata.join("tls");
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(CertPaths {
    key: dir.join("server.key"),
    cert: dir.join("server.crt"),
  })
}

pub fn ensure_server_certs(userdata: &Path) -> Result<CertPaths, String> {
  let paths = cert_paths(userdata)?;
  if paths.key.exists() && paths.cert.exists() {
    return Ok(paths);
  }
  let status = Command::new("openssl")
    .args([
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-sha256",
      "-days",
      "3650",
      "-nodes",
      "-keyout",
      paths.key.to_str().ok_or("key path")?,
      "-out",
      paths.cert.to_str().ok_or("cert path")?,
      "-subj",
      "/CN=127.0.0.1",
      "-addext",
      "subjectAltName=IP:127.0.0.1,DNS:localhost",
    ])
    .status()
    .map_err(|e| format!("openssl missing or failed: {e}"))?;
  if !status.success() {
    return Err("openssl cert generation failed".into());
  }
  Ok(paths)
}

pub fn install_trust(cert: &Path) -> bool {
  #[cfg(target_os = "macos")]
  {
    let home = std::env::var("HOME").unwrap_or_default();
    let keychain = format!("{home}/Library/Keychains/login.keychain-db");
    Command::new("security")
      .args([
        "add-trusted-cert",
        "-d",
        "-r",
        "trustRoot",
        "-k",
        &keychain,
        cert.to_str().unwrap_or(""),
      ])
      .status()
      .map(|s| s.success())
      .unwrap_or(false)
  }
  #[cfg(target_os = "windows")]
  {
    Command::new("certutil")
      .args(["-addstore", "-user", "Root", cert.to_str().unwrap_or("")])
      .status()
      .map(|s| s.success())
      .unwrap_or(false)
  }
  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  {
    let _ = cert;
    false
  }
}
