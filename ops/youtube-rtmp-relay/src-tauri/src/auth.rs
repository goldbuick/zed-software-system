use std::sync::{Arc, Mutex};
use std::thread;

use tiny_http::{Response, Server};

use crate::constants::AUTH_PORT;

pub struct AuthServer {
  inner: Arc<Mutex<AuthInner>>,
}

struct AuthInner {
  expected_bearer: String,
  stop: bool,
}

impl AuthServer {
  pub fn new() -> Self {
    Self {
      inner: Arc::new(Mutex::new(AuthInner {
        expected_bearer: String::new(),
        stop: false,
      })),
    }
  }

  pub fn set_expected_bearer(&self, bearer: &str) {
    if let Ok(mut g) = self.inner.lock() {
      g.expected_bearer = bearer.to_string();
    }
  }

  pub fn start(&self) -> Result<(), String> {
    let inner = Arc::clone(&self.inner);
    {
      let mut g = inner.lock().map_err(|e| e.to_string())?;
      g.stop = false;
    }
    let server = Server::http(format!("127.0.0.1:{AUTH_PORT}"))
      .map_err(|e| format!("auth server bind failed: {e}"))?;
    thread::spawn(move || {
      for request in server.incoming_requests() {
        let stop = inner.lock().map(|g| g.stop).unwrap_or(true);
        if stop {
          break;
        }
        let url = request.url().to_string();
        let expected = inner
          .lock()
          .map(|g| g.expected_bearer.clone())
          .unwrap_or_default();
        let ok = authorize(&url, &expected);
        let response = if ok {
          Response::from_string("ok").with_status_code(200)
        } else if url.contains("action=read") || url.contains("action=playback") {
          Response::from_string("ok").with_status_code(200)
        } else {
          Response::from_string("denied").with_status_code(401)
        };
        let _ = request.respond(response);
      }
    });
    Ok(())
  }

  pub fn stop(&self) {
    if let Ok(mut g) = self.inner.lock() {
      g.stop = true;
    }
    // Nudge the listener so the thread can exit.
    let _ = std::net::TcpStream::connect(format!("127.0.0.1:{AUTH_PORT}"));
  }
}

fn authorize(url: &str, expected: &str) -> bool {
  if expected.is_empty() {
    return false;
  }
  for key in ["token=", "pass=", "user="] {
    if let Some(idx) = url.find(key) {
      let rest = &url[idx + key.len()..];
      let value = rest.split('&').next().unwrap_or("");
      if value == expected {
        return true;
      }
    }
  }
  false
}
