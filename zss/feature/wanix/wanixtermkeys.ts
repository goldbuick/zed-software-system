/** Map keyboard events to xterm onData strings (wanix-term raw mode). */
export function keyboardeventtoxtermdata(event: KeyboardEvent): string | null {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'c' || event.key === 'C') {
      return '\x03'
    }
    return null
  }
  if (event.key === 'Enter') {
    return '\r'
  }
  if (event.key === 'Backspace') {
    return '\x7f'
  }
  if (event.key === 'Tab') {
    return '\t'
  }
  if (event.key.length === 1) {
    return event.key
  }
  return null
}

export function iswanixcliescape(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && event.key === '\\'
}
