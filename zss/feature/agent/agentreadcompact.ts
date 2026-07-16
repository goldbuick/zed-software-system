import { BOARD_HEIGHT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'

const PAGE_CODE_MAX = 2000
const OTHER_JSON_MAX = 8000
const TERRAIN_SAMPLE = 60

export type TERRAIN_KIND_HISTOGRAM = Record<string, number>

export function readterrainkindhistogram(
  terrain: unknown[],
): TERRAIN_KIND_HISTOGRAM {
  const kinds: TERRAIN_KIND_HISTOGRAM = {}
  for (let i = 0; i < terrain.length; ++i) {
    const cell = terrain[i]
    let key = '(empty)'
    if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
      const kind = (cell as { kind?: unknown }).kind
      if (typeof kind === 'string' && kind.length > 0) {
        key = kind
      } else if (Object.keys(cell as object).length > 0) {
        key = '(override)'
      }
    }
    kinds[key] = (kinds[key] ?? 0) + 1
  }
  return kinds
}

export function compactagentreadresult(
  path: string,
  text: string,
  json: unknown,
  bytes: number,
): Record<string, unknown> {
  const isterrain =
    path.endsWith('/board/terrain.json') || path === 'board/terrain.json'
  if (isterrain && Array.isArray(json)) {
    return {
      path,
      bytes,
      length: json.length,
      expected: BOARD_SIZE,
      kinds: readterrainkindhistogram(json),
      sample: json.slice(0, TERRAIN_SAMPLE),
      note: `terrain summarized; array length ${json.length}. Use fill_terrain / replace_kind to edit.`,
    }
  }

  if (
    json &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    path.endsWith('/stats.json')
  ) {
    const record = { ...(json as Record<string, unknown>) }
    if (typeof record.code === 'string' && record.code.length > PAGE_CODE_MAX) {
      record.code = `${record.code.slice(0, PAGE_CODE_MAX)}…`
      record.truncated = true
    }
    return { path, bytes, json: record }
  }

  if (json !== undefined) {
    const encoded = JSON.stringify(json)
    if (encoded.length > OTHER_JSON_MAX) {
      return {
        path,
        bytes,
        truncated: true,
        preview: encoded.slice(0, OTHER_JSON_MAX),
        note: `json capped at ${OTHER_JSON_MAX} chars`,
      }
    }
    return { path, bytes, json }
  }

  const capped =
    text.length > OTHER_JSON_MAX
      ? `${text.slice(0, OTHER_JSON_MAX)}…`
      : text
  return {
    path,
    bytes,
    text: capped,
    truncated: text.length > OTHER_JSON_MAX,
  }
}

export function truncateagenttoolhistorycontent(
  value: unknown,
  maxchars = 5000,
): string {
  const raw = JSON.stringify(value)
  if (raw.length <= maxchars) {
    return raw
  }
  return JSON.stringify({
    truncated: true,
    preview: raw.slice(0, maxchars),
  })
}

export function boardcellindex(x: number, y: number): number {
  return y * BOARD_WIDTH + x
}

export function fillterrainrect(
  terrain: unknown[],
  kind: string,
  rect?: { x: number; y: number; w: number; h: number },
): unknown[] {
  const next = terrain.slice()
  const cell = { kind }
  if (!rect) {
    for (let i = 0; i < BOARD_SIZE; ++i) {
      next[i] = cell
    }
    return next
  }
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(BOARD_WIDTH, x0 + Math.max(0, Math.floor(rect.w)))
  const y1 = Math.min(BOARD_HEIGHT, y0 + Math.max(0, Math.floor(rect.h)))
  for (let y = y0; y < y1; ++y) {
    for (let x = x0; x < x1; ++x) {
      next[boardcellindex(x, y)] = cell
    }
  }
  return next
}

export function replaceterrainkind(
  terrain: unknown[],
  fromkind: string,
  tokind: string,
): { terrain: unknown[]; replaced: number } {
  const next = terrain.slice()
  let replaced = 0
  for (let i = 0; i < next.length; ++i) {
    const cell = next[i]
    if (
      cell &&
      typeof cell === 'object' &&
      !Array.isArray(cell) &&
      (cell as { kind?: unknown }).kind === fromkind
    ) {
      next[i] = { kind: tokind }
      replaced += 1
    }
  }
  return { terrain: next, replaced }
}

const ASCII_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function summarizeterrainboard(terrain: unknown[]): {
  kinds: TERRAIN_KIND_HISTOGRAM
  ascii: string
  legend: Record<string, string>
} {
  const kinds = readterrainkindhistogram(terrain)
  const legend: Record<string, string> = {
    '.': '(empty)',
    '#': 'solid',
  }
  const kindtochar = new Map<string, string>()
  kindtochar.set('(empty)', '.')
  kindtochar.set('solid', '#')
  let letter = 0
  const sorted = Object.keys(kinds).sort(
    (a, b) => (kinds[b] ?? 0) - (kinds[a] ?? 0),
  )
  for (let i = 0; i < sorted.length; ++i) {
    const name = sorted[i]!
    if (kindtochar.has(name)) {
      continue
    }
    const ch =
      letter < ASCII_LETTERS.length ? ASCII_LETTERS[letter]! : '?'
    letter += 1
    kindtochar.set(name, ch)
    legend[ch] = name
  }
  const rows: string[] = []
  for (let y = 0; y < BOARD_HEIGHT; ++y) {
    let row = ''
    for (let x = 0; x < BOARD_WIDTH; ++x) {
      const cell = terrain[boardcellindex(x, y)]
      let key = '(empty)'
      if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
        const kind = (cell as { kind?: unknown }).kind
        if (typeof kind === 'string' && kind.length > 0) {
          key = kind
        } else if (Object.keys(cell as object).length > 0) {
          key = '(override)'
        }
      }
      row += kindtochar.get(key) ?? '?'
    }
    rows.push(row)
  }
  return { kinds, ascii: rows.join('\n'), legend }
}
