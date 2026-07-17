import { kickzedcafepoll } from 'zss/device/wanixclient/wanixzedcafe'

/** Iframe RESULT — guest export FS dirty; kick import cycle. */
export function handlezedcafefilechange(): void {
  kickzedcafepoll('file-change')
}
