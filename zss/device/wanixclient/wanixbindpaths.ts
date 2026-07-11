import { WANIX_INPUT_MOUNT } from 'zss/feature/wanix/wanixzedcafeconstants'

export function readwanixbinddropbasename(label: string): string {
  const normalized = label.replace(/\\/g, '/').replace(/^\/+/, '')
  const parts = normalized.split('/').filter((part) => part.length > 0)
  return parts[parts.length - 1] ?? normalized
}

export function readwanixbinddropkind(filename: string): 'file' | 'archive' {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.tgz') || lower.endsWith('.tar.gz')) {
    return 'archive'
  }
  return 'file'
}

export function readwanixbinddropperm(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.sh') || lower.endsWith('.wasm')) {
    return '0755'
  }
  return '0644'
}

export function readwanixbinddroparchivestem(filename: string): string {
  const base = readwanixbinddropbasename(filename)
  const lower = base.toLowerCase()
  if (lower.endsWith('.tar.gz')) {
    return base.slice(0, -7)
  }
  if (lower.endsWith('.tgz')) {
    return base.slice(0, -4)
  }
  return base
}

export function readwanixbinddropdst(
  label: string,
  kind: 'file' | 'archive',
): string {
  const basename = readwanixbinddropbasename(label)
  if (kind === 'archive') {
    const stem = readwanixbinddroparchivestem(label)
    return `${WANIX_INPUT_MOUNT}/${stem}`
  }
  return `${WANIX_INPUT_MOUNT}/${basename}`
}
