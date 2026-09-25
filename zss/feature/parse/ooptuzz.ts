/**
 * Best-effort inverse of zztoop: ZSS object code → ZZT-OOP-ish text for export.
 * Lossy: label casing, reserved-word escapes, label renames, etc. are not fully restored.
 */

/** Reverse zztoop’s #fgplay → #play mapping (and similar). */
export function ooptuzz(content: string): string {
  const lines = content.replaceAll(/\r?\n|\r/g, '\n').split('\n')
  return lines
    .map((line) => {
      // drop import / authoring force-quote after leading whitespace
      let mapped = line.replace(/^(\s*)"/, '$1')
      const trimmed = mapped.trimStart()
      if (trimmed.startsWith('#play')) {
        mapped = mapped.replace(/^(\s*)#play\b/, '$1#fgplay')
      }
      return mapped
    })
    .join('\n')
}
