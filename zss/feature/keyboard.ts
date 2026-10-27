// simple abstraction

function isCliClipboardAvailable(): boolean {
  try {
    const w = typeof globalThis !== 'undefined' && (globalThis as any).window
    return !!(w && typeof w.__nodeClipboardRead === 'function')
  } catch {
    return false
  }
}

export function withclipboard(): Clipboard | undefined {
  if (isCliClipboardAvailable()) {
    const w = (globalThis as any).window
    return {
      writeText: (text: string) => w.__nodeClipboardWrite(text),
      readText: () => w.__nodeClipboardRead() as Promise<string>,
    } as Clipboard
  }
  return navigator.clipboard
}

export type ARMED_CLIPBOARD = {
  settle: (text: string) => void
  written: Promise<void>
}

/** Start a clipboard write during a user gesture. Settle later with the text. */
export function armclipboardtext(): ARMED_CLIPBOARD | undefined {
  const clipboard = withclipboard()
  if (
    !clipboard ||
    typeof clipboard.write !== 'function' ||
    typeof ClipboardItem !== 'function'
  ) {
    return undefined
  }
  let resolvetext: (text: string) => void = () => {}
  const pending = new Promise<string>((resolve) => {
    resolvetext = resolve
  })
  const item = new ClipboardItem({
    'text/plain': pending.then(
      (text) => new Blob([text], { type: 'text/plain' }),
    ),
  })
  return {
    settle: resolvetext,
    written: clipboard.write([item]),
  }
}
