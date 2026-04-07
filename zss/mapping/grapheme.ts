import './intl-segmenter.d.ts'

const graphemesegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
})

export function graphemelength(source: string): number {
  return [...graphemesegmenter.segment(source)].length
}

export function* graphemes(str: string): Generator<string> {
  for (const { segment } of graphemesegmenter.segment(str)) {
    yield segment
  }
}

/**
 * Map a code-unit offset (e.g. from lexer startColumn/endColumn) to cell (grapheme) index
 * so token-based positions align with the grapheme-per-cell buffer.
 */
export function codeunitoffsettocellindex(
  line: string,
  codeunitoffset: number,
): number {
  let cell = 0
  let offset = 0
  for (const { segment } of graphemesegmenter.segment(line)) {
    if (offset >= codeunitoffset) {
      return cell
    }
    offset += segment.length
    cell++
  }
  return cell
}
