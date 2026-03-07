// CLI/headless mode: Playwright exposes __nodeStorageReadContent (or __nodeStorageReadPlayer)
export function isclimode(): boolean {
  return (
    typeof (window as any).__nodeStorageReadContent === 'function' ||
    typeof (window as any).__nodeStorageReadPlayer === 'function'
  )
}

// CLI mode flag for workers (no window). Set via platform init message.
let climode = false

export function setclimode(value: boolean) {
  climode = value
}

export function getclimode(): boolean {
  return climode
}
