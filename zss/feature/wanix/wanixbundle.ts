/** Pick a single wasm entry path from wanix namespace listings. */
export function pickwanixbundleentry(
  rootentries: string[],
  bundleentries: string[] | null,
): string {
  const rootwasm = rootentries.filter((name) => name.endsWith('.wasm'))
  const bundlewasm =
    bundleentries?.filter((name) => name.endsWith('.wasm')) ?? []

  if (bundlewasm.length === 1) {
    const name = bundlewasm[0]
    return name.startsWith('bundle/') ? name : `bundle/${name}`
  }
  if (rootwasm.length === 1) {
    return rootwasm[0]
  }
  throw new Error('bundle has no single entry wasm')
}
