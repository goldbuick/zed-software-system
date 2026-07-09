/** Chunked ArrayBuffer → standard base64 (worker-safe via btoa). */
export function arraybuffertobase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

/** UTF-8 text → base64url (no padding). */
export function utf8tobase64url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** base64url → standard base64 with padding restored. */
export function base64urltobase64(base64urlstring: string): string {
  const base64 = base64urlstring.replace(/-/g, '+').replace(/_/g, '/')
  const missingpadding = '='.repeat((4 - (base64.length % 4)) % 4)
  return base64 + missingpadding
}

/** Standard base64 → base64url (no padding). */
export function base64tobase64url(base64string: string): string {
  return base64string.replace(/\+/g, '-').replace(/\//g, '_')
}
