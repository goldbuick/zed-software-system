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
