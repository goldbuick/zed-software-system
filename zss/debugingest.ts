import { LOG_DEBUG } from 'zss/config'

const DEBUG_INGEST =
  'http://127.0.0.1:7474/ingest/f2bfd0d8-5208-447d-9aef-a3f39f2dbf4e'
const DEBUG_SESSION = '5cf1ca'

export function debugingest(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisid: string,
) {
  if (!LOG_DEBUG) {
    return
  }
  const payload = {
    sessionId: DEBUG_SESSION,
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId: hypothesisid,
  }
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
      ;(globalThis as unknown as Worker).postMessage({
        target: 'debug',
        data: payload,
      })
    }
  } catch {
    /* ignore */
  }
}
