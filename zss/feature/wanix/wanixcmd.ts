/** Normalize a wanix run path (bare root-relative executable). */
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
  return trimmed.replace(/^\/+/, '')
}
