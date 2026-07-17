import { sanitizewanixfsadst } from 'zss/feature/wanix/wanixfsapaths'

/** Parent-side record of live FSA mounts (iframe wipes them on hard remount). */
const fsamounts = new Set<string>()

export function recordwanixfsamount(dst: string): void {
  const cleaned = sanitizewanixfsadst(dst)
  if (cleaned) {
    fsamounts.add(cleaned)
  }
}

export function haswanixfsamount(dst: string): boolean {
  const cleaned = sanitizewanixfsadst(dst) ?? dst.trim().replace(/^\/+/, '')
  return cleaned.length > 0 && fsamounts.has(cleaned)
}

export function clearwanixfsamounts(): void {
  fsamounts.clear()
}

export function readwanixfsamountsfortest(): string[] {
  return [...fsamounts]
}
