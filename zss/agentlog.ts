const DEBUG_INGEST =
  'http://127.0.0.1:7474/ingest/f2bfd0d8-5208-447d-9aef-a3f39f2dbf4e'
const DEBUG_SESSION = '5cf1ca'

export function agentlog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisid: string,
) {
  const payload = {
    sessionId: DEBUG_SESSION,
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId: hypothesisid,
  }
  // #region agent log
  fetch(DEBUG_INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION,
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
  try {
    if (
      typeof globalThis !== 'undefined' &&
      'postMessage' in globalThis &&
      typeof importScripts === 'function'
    ) {
      ;(globalThis as Worker).postMessage({ target: 'debug', data: payload })
    }
  } catch {
    /* ignore */
  }
  // #endregion
}
