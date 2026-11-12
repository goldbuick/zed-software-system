// simple abstraction

/** In-tab clipboard when OS Clipboard API denies or is missing. */
let memoryclipboardtext = ''

function isCliClipboardAvailable(): boolean {
  try {
    const w = typeof globalThis !== 'undefined' && (globalThis as any).window
    return !!(w && typeof w.__nodeClipboardRead === 'function')
  } catch {
    return false
  }
}

function oclipboard(): Clipboard | undefined {
  try {
    return typeof navigator !== 'undefined' ? navigator.clipboard : undefined
  } catch {
    return undefined
  }
}

function memorywritetext(text: string): Promise<void> {
  memoryclipboardtext = text
  const os = oclipboard()
  if (!os || typeof os.writeText !== 'function') {
    return Promise.resolve()
  }
  return os.writeText(text).then(
    () => undefined,
    () => undefined,
  )
}

function memoryreadtext(): Promise<string> {
  const os = oclipboard()
  if (!os || typeof os.readText !== 'function') {
    return Promise.resolve(memoryclipboardtext)
  }
  return os.readText().then(
    (text) => text,
    () => memoryclipboardtext,
  )
}

/** Test-only: clear the in-memory clipboard buffer. */
export function resetmemoryclipboardfortest() {
  memoryclipboardtext = ''
}

export function withclipboard(): Clipboard | undefined {
  if (isCliClipboardAvailable()) {
    const w = (globalThis as any).window
    return {
      writeText: (text: string) => w.__nodeClipboardWrite(text),
      readText: () => w.__nodeClipboardRead() as Promise<string>,
    } as Clipboard
  }
  return {
    writeText: memorywritetext,
    readText: memoryreadtext,
  } as Clipboard
}

export type ARMED_CLIPBOARD = {
  settle: (text: string) => void
  written: Promise<void>
}

/** Start a clipboard write during a user gesture. Settle later with the text. */
export function armclipboardtext(): ARMED_CLIPBOARD | undefined {
  const clipboard = oclipboard()
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
    settle: (text: string) => {
      memoryclipboardtext = text
      resolvetext(text)
    },
    written: clipboard.write([item]),
  }
}
