// CLI mode flag for workers (no window). Set via platform init message.
let climode = false

// CLI/headless mode: Playwright exposes __nodeStorage* on globalThis; workers use setclimode.
export function isclimode(): boolean {
  const g = globalThis as any
  return (
    climode ||
    typeof g.__nodeStorageReadContent === 'function' ||
    typeof g.__nodeStorageReadPlayer === 'function'
  )
}

export function setclimode(value: boolean) {
  climode = value
}

export function getclimode(): boolean {
  return climode
}

/** Phone and tablet Safari, Firefox, and Chrome. Desktop UAs and missing navigator are false. */
export function ismobilewebbrowser(): boolean {
  const nav = globalThis.navigator
  if (!nav) {
    return false
  }
  const ua = nav.userAgent ?? ''
  if (/iPhone|iPad|iPod|CriOS|FxiOS/i.test(ua)) {
    return true
  }
  if (/Macintosh/i.test(ua) && nav.maxTouchPoints > 1) {
    return true
  }
  if (/Android|Mobile/i.test(ua) && /Chrome|Safari|Firefox/i.test(ua)) {
    return true
  }
  return false
}
