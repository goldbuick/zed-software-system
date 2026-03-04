// simple abstraction

function isCliClipboardAvailable(): boolean {
  try {
    const w =
      typeof globalThis !== 'undefined' && (globalThis as any).window
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
