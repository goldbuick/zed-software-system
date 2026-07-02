/** Pick a single wasm entry path from wanix namespace listings. */
export function pickwanixbundleentry(
  rootentries: string[],
  bundleentries: string[] | null,
  bundleprefix = 'bundle',
): string {
  const rootwasm = rootentries.filter((name) => name.endsWith('.wasm'))
  const bundlewasm =
    bundleentries?.filter((name) => name.endsWith('.wasm')) ?? []

  if (bundlewasm.length === 1) {
    const name = bundlewasm[0]
    const prefix = `${bundleprefix}/`
    return name.startsWith(prefix) ? name : `${prefix}${name}`
  }
  if (rootwasm.length === 1) {
    return rootwasm[0]
  }
  throw new Error('bundle has no single entry wasm')
}
