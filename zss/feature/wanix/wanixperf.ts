/** Dev/validator perf marks — console `[wanix-perf] label {json}`. */

let perfanchor = 0

export function wanixperfreset() {
  perfanchor = Date.now()
}

export function wanixperfnow(): number {
  return Date.now()
}

export function wanixperfdelta(sincems: number): { elapsedms: number } {
  return { elapsedms: Date.now() - sincems }
}

export function wanixperfmark(label: string, extra?: Record<string, unknown>) {
  const merged: Record<string, unknown> = { ...(extra ?? {}) }
  if (perfanchor > 0) {
    merged.sinceanchor = Date.now() - perfanchor
  }
  const payload =
    Object.keys(merged).length > 0 ? ` ${JSON.stringify(merged)}` : ''
  console.info(`[wanix-perf] ${label}${payload}`)
}
