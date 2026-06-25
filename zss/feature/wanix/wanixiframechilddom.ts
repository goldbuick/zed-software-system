import type { WanixRoot } from 'zss/feature/wanix/wanixiframechildtypes'

/** Logical path for #wanix bind — host opens popup; no Wanix vfs write. */
export const WANIX_DOM_POPUP_PATH = '#web/dom/popup'

export const DEFAULT_WANIX_DOM_SCROLL = 'wanixdom'

export function iswanixdompopuppath(path: string): boolean {
  return path === WANIX_DOM_POPUP_PATH
}

/** Strip scroll prose until the first HTML document line (not an HTML comment). */
export function scrollbodytodomhtml(body: string): string {
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed.startsWith('<')) {
      continue
    }
    if (trimmed.startsWith('<!--')) {
      continue
    }
    return lines.slice(i).join('\n')
  }
  return body.trim()
}

/** @deprecated Wanix UnionFS does not support #web/dom/popup — host opens popup from scroll. */
export async function mountwanixdompopup(_root: WanixRoot) {
  // no-op: popup is host-owned via wanixdompopup.ts + @scroll body
}
