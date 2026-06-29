export const WANIX_REMOTE_DEFAULT_DST = 'remote'
export const WANIX_REMOTE_PROXY_PATH = '/wanix-remote-9p'

export function readwanixremoteproxyurl(): string {
  if (typeof window === 'undefined') {
    return `wss://localhost:7777${WANIX_REMOTE_PROXY_PATH}`
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${WANIX_REMOTE_PROXY_PATH}`
}
