/** Temporary NDJSON probe for boardrunner vs VM movement investigation (Cursor debug ingest). */
const MOVEMENT_DEBUG_INGEST =
  'http://127.0.0.1:7799/ingest/cd0f7a39-d6ec-46e6-844e-03e2070cbab0'
const MOVEMENT_DEBUG_SESSION = '72d212'

export function movementevidencelog(
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  fetch(MOVEMENT_DEBUG_INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': MOVEMENT_DEBUG_SESSION,
    },
    body: JSON.stringify({
      sessionId: MOVEMENT_DEBUG_SESSION,
      location: 'movementevidence',
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
    }),
  }).catch(() => {})
}
