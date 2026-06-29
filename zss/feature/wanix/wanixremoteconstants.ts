export const WANIX_REMOTE_DEFAULT_DST = 'remote'
export const WANIX_REMOTE_PROXY_PATH = '/wanix-remote-9p'
export const WANIX_BRIDGE_PROXY_PATH = '/wanix-bridge-host'

export function readwanixwsscheme(): 'wss:' | 'ws:' {
  if (typeof window === 'undefined') {
    return 'wss:'
  }
  return window.location.protocol === 'https:' ? 'wss:' : 'ws:'
}

export function readwanixproxyhost(): string {
  if (typeof window === 'undefined') {
    return 'localhost:7777'
  }
  return window.location.host
}

export function readwanixremoteproxyurl(): string {
  return `${readwanixwsscheme()}//${readwanixproxyhost()}${WANIX_REMOTE_PROXY_PATH}`
}

export function readwanixbridgeproxyhosturl(token: string): string {
  const query = new URLSearchParams({ token })
  return `${readwanixwsscheme()}//${readwanixproxyhost()}${WANIX_BRIDGE_PROXY_PATH}?${query}`
}

export function readwanixbridgeproxyimporturl(token: string): string {
  const query = new URLSearchParams({ token })
  return `${readwanixwsscheme()}//${readwanixproxyhost()}${WANIX_REMOTE_PROXY_PATH}/?${query}`
}
