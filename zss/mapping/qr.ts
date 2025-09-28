import { renderUnicodeCompact } from 'uqr'

export function qrlines(content: string): string[] {
  const lines: string[] = []
  const ascii = renderUnicodeCompact(content).split('\n')
  const rendermap: Record<number, number> = {
    [32]: 32, // space
    [9600]: 223, // top half
    [9604]: 220, // bottom half
    [9608]: 219, // full
  }

  for (let i = 0; i < ascii.length; i++) {
    const lineascii = [...ascii[i]]
      .map((c) => {
        const chr = rendermap[c.charCodeAt(0)]
        return `$${chr}`
      })
      .join('')
    lines.push(lineascii)
  }
  return lines
}
