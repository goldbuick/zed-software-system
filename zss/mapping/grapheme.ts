import './intl-segmenter.d.ts'

const graphemesegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
})

/**
 * ASCII code units are one cell each. CR+LF is one grapheme, so any CR
 * stays on the Segmenter path. Lone LF is one cell.
 */
function issinglecellascii(str: string): boolean {
  for (let i = 0; i < str.length; ++i) {
    const code = str.charCodeAt(i)
    if (code === 13 || code > 127) {
      return false
    }
  }
  return true
}

function cellindexforsinglecell(
  codeunitoffset: number,
  length: number,
): number {
  if (codeunitoffset <= 0) {
    return 0
  }
  return codeunitoffset >= length ? length : codeunitoffset
}

export function graphemelength(source: string): number {
  if (issinglecellascii(source)) {
    return source.length
  }
  return [...graphemesegmenter.segment(source)].length
}

export function* graphemes(str: string): Generator<string> {
  if (issinglecellascii(str)) {
    for (let i = 0; i < str.length; ++i) {
      yield str[i]
    }
    return
  }
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
  if (issinglecellascii(line)) {
    return cellindexforsinglecell(codeunitoffset, line.length)
  }
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

/**
 * One grapheme walk for every code-unit offset on a line.
 * An offset that is not a grapheme start maps to the next cell.
 */
export function graphemecellindex(
  line: string,
): (codeunitoffset: number) => number {
  if (issinglecellascii(line)) {
    const length = line.length
    return (codeunitoffset) => cellindexforsinglecell(codeunitoffset, length)
  }

  const length = line.length
  const map = new Uint32Array(length + 1)
  let cell = 0
  let offset = 0
  for (const { segment } of graphemesegmenter.segment(line)) {
    const next = offset + segment.length
    map[offset] = cell
    for (let i = offset + 1; i < next; ++i) {
      map[i] = cell + 1
    }
    offset = next
    ++cell
  }
  map[length] = cell

  return (codeunitoffset) => {
    if (codeunitoffset <= 0) {
      return 0
    }
    if (codeunitoffset >= length) {
      return map[length]
    }
    return map[codeunitoffset]
  }
}
