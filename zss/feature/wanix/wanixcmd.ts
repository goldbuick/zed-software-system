/** Normalize a #wanix run argument to a Wanix namespace executable path. */
export function normalizewanixcmd(cmd: string): string {
  let trimmed = (cmd || '').trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim()
  }
  if (!trimmed) {
    return ''
  }
  if (trimmed.startsWith('#')) {
    return trimmed
  }
  if (trimmed.startsWith('bundle/')) {
    return trimmed
  }
  const bare = trimmed.replace(/^\/+/, '')
  if (bare === 'hello.wasm') {
    return bare
  }
  return `bundle/${bare}`
}
