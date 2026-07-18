/** Sanitize a dropped folder name into a wanix bind dst (no leading `/`). */
export function sanitizewanixfsadst(name: string): string | undefined {
  const trimmed = name.trim()
  if (!trimmed) {
    return undefined
  }
  const base = trimmed.replace(/\\/g, '/').replace(/^\/+/, '')
  const parts = base.split('/').filter((part) => part.length > 0)
  const leaf = parts[parts.length - 1] ?? ''
  if (!leaf || leaf === '.' || leaf === '..') {
    return undefined
  }
  if (leaf.includes('#') || /\s/.test(leaf)) {
    return undefined
  }
  return leaf
}

export type WanixFsaHandleKind = 'directory' | 'file' | 'unsupported'

/** Classify a File System Access handle (or missing API result). */
export function readwanixfsahandlekind(
  handle: { kind?: string } | null | undefined,
): WanixFsaHandleKind {
  if (!handle || typeof handle !== 'object') {
    return 'unsupported'
  }
  if (handle.kind === 'directory') {
    return 'directory'
  }
  if (handle.kind === 'file') {
    return 'file'
  }
  return 'unsupported'
}

export const WANIX_FSA_BIND_REQUEST = 'wanix-fsa-bind'
export const WANIX_FSA_HANDLE_GLOBAL = '__wanixFsaHandle'
