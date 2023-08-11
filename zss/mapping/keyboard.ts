const platform = navigator.platform.toLowerCase() ?? ''
const useMeta =
  platform.includes('mac') ||
  platform.includes('iphone') ||
  platform.includes('ipad')

export function ctrlKeyModifier(event: KeyboardEvent) {
  return useMeta ? event.metaKey : event.ctrlKey
}

export function isMetaModifier() {
  return useMeta
}
