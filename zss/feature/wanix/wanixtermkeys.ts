/** Map keyboard events to xterm onData strings (wanix-term raw mode). */
import { ismac } from 'zss/words/system'

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

export function iswanixpasteevent(event: KeyboardEvent): boolean {
  const ctrl = ismac ? event.metaKey : event.ctrlKey
  return ctrl && event.key.toLowerCase() === 'v'
}

export function pastetexttovmserial(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r')
}

export function pastetexttolinebuffer(text: string): string {
  return text.replace(/\r\n|\r|\n/g, ' ')
}
