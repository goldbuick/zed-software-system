/** Leaf helper: strip query keys without pulling deeplink/znslogin into worker graphs. */
export function clearqueryparams(keys: string[]) {
  try {
    const url = new URL(location.href)
    let changed = false
    for (const key of keys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key)
        changed = true
      }
    }
    if (!changed) {
      return
    }
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {
    // no window in workers / cli
  }
}
