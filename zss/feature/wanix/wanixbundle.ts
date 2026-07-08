export type WanixExtractedFileRef = {
  path: string
  bytes: Uint8Array
}

/** Flatten bundle-relative paths for #ramfs writes (no nested dirs). */
export function readbundleflatpath(prefix: string, relpath: string): string {
  const trimmedprefix = prefix.replace(/\/+$/, '')
  const normalized = relpath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (
    normalized !== trimmedprefix &&
    !normalized.startsWith(`${trimmedprefix}/`)
  ) {
    return normalized.includes('/')
      ? normalized.replace(/\//g, '-')
      : normalized
  }
  const tail =
    normalized === trimmedprefix
      ? ''
      : normalized.slice(trimmedprefix.length + 1)
  if (!tail) {
    return trimmedprefix
  }
  if (!tail.includes('/')) {
    return `${trimmedprefix}-${tail}`
  }
  return `${trimmedprefix}-${tail.replace(/\//g, '-')}`
}

/** Collect all .wasm paths from extracted bundle files. */
export function listwanixwasmentries(
  files: WanixExtractedFileRef[],
  prefix: string,
): string[] {
  const trimmedprefix = prefix.replace(/\/+$/, '')
  const paths: string[] = []
  for (const file of files) {
    if (!file.path.toLowerCase().endsWith('.wasm')) {
      continue
    }
    const normalized = file.path.replace(/\\/g, '/').replace(/^\/+/, '')
    if (
      normalized === `${trimmedprefix}.wasm` ||
      normalized.startsWith(`${trimmedprefix}/`)
    ) {
      paths.push(normalized)
      continue
    }
    if (!normalized.includes('/')) {
      paths.push(`${trimmedprefix}/${normalized}`)
    }
  }
  return paths.sort()
}
