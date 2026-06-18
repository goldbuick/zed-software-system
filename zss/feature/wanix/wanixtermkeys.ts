export function keyboardeventtobytes(event: KeyboardEvent): Uint8Array | null {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'c' || event.key === 'C') {
      return new Uint8Array([3])
    }
    if (event.key === '\\') {
      return null
    }
    return null
  }
  if (event.key === 'Enter') {
    return new Uint8Array([13])
  }
  if (event.key === 'Backspace') {
    return new Uint8Array([127])
  }
  if (event.key === 'Tab') {
    return new Uint8Array([9])
  }
  if (event.key.length === 1) {
    return new TextEncoder().encode(event.key)
  }
  return null
}

export function iswanixcliescape(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && event.key === '\\'
}
