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

/** Derive a wanix task id from a dropped label (hello.wasm → hello-wasm). */
export function makewanixtaskid(label: string): string {
  const base = (label || 'task')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'task'
}

/** Pick a unique task id given labels already in use. */
export function uniquewanixtaskid(
  label: string,
  existing: Iterable<string>,
): string {
  const base = makewanixtaskid(label)
  const used = new Set(existing)
  let candidate = base
  let seq = 2
  while (used.has(candidate)) {
    candidate = `${base}-${seq}`
    seq += 1
  }
  return candidate
}
