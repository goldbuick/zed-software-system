import { kebabcasezedcafedirname } from 'zss/feature/wanix/zedcafetreeschema'

export type AGENT_KIND_REF = {
  type: string
  name: string
  pageDir: string
}

export type AGENT_SESSION_CONTEXT = {
  bookDir?: string
  boardPageDir?: string
  boardTerrainPath?: string
  playerX?: number
  playerY?: number
  boardId?: string
  kinds: AGENT_KIND_REF[]
  promptblock: string
}

type ExportFile = { path: string; data: number[] | Uint8Array }

const decoder = new TextDecoder()

function decodefile(files: ExportFile[], path: string): unknown | undefined {
  const hit = files.find((file) => file.path === path)
  if (!hit) {
    return undefined
  }
  const u8 =
    hit.data instanceof Uint8Array ? hit.data : new Uint8Array(hit.data)
  try {
    return JSON.parse(decoder.decode(u8))
  } catch {
    return undefined
  }
}

export function buildkindcatalogfrombookstats(
  bookDir: string,
  bookstats: unknown,
): AGENT_KIND_REF[] {
  if (!bookstats || typeof bookstats !== 'object') {
    return []
  }
  const pages = (bookstats as { pages?: unknown }).pages
  if (!Array.isArray(pages)) {
    return []
  }
  const kinds: AGENT_KIND_REF[] = []
  for (let i = 0; i < pages.length; ++i) {
    const page = pages[i]
    if (!page || typeof page !== 'object') {
      continue
    }
    const type = String((page as { type?: unknown }).type ?? '')
    const name = String((page as { name?: unknown }).name ?? '')
    const id = String((page as { id?: unknown }).id ?? '')
    if ((type !== 'object' && type !== 'terrain') || !name || !id) {
      continue
    }
    kinds.push({
      type,
      name,
      pageDir: `${bookDir}/${kebabcasezedcafedirname(name, id)}`,
    })
  }
  return kinds
}

export function findboardpagedir(
  bookDir: string,
  bookstats: unknown,
  boardId: string,
): string | undefined {
  if (!bookstats || typeof bookstats !== 'object') {
    return undefined
  }
  const pages = (bookstats as { pages?: unknown }).pages
  if (!Array.isArray(pages)) {
    return undefined
  }
  for (let i = 0; i < pages.length; ++i) {
    const page = pages[i]
    if (!page || typeof page !== 'object') {
      continue
    }
    const id = String((page as { id?: unknown }).id ?? '')
    const type = String((page as { type?: unknown }).type ?? '')
    const name = String((page as { name?: unknown }).name ?? '')
    if (id === boardId && type === 'board') {
      return `${bookDir}/${kebabcasezedcafedirname(name || id, id)}`
    }
  }
  // board id may match page id even if type missing in older exports
  for (let i = 0; i < pages.length; ++i) {
    const page = pages[i]
    if (!page || typeof page !== 'object') {
      continue
    }
    const id = String((page as { id?: unknown }).id ?? '')
    const name = String((page as { name?: unknown }).name ?? '')
    if (id === boardId) {
      return `${bookDir}/${kebabcasezedcafedirname(name || id, id)}`
    }
  }
  return undefined
}

export function buildagentsessioncontextfromfiles(
  player: string,
  files: ExportFile[],
  last?: {
    bookDir?: string
    boardPath?: string
    kinds?: AGENT_KIND_REF[]
  },
): AGENT_SESSION_CONTEXT {
  const root = decodefile(files, 'stats.json') as
    | { books?: { id: string; name?: string }[] }
    | undefined
  const books = root?.books ?? []
  let bookDir: string | undefined
  if (last?.bookDir && files.some((f) => f.path.startsWith(`${last.bookDir}/`))) {
    bookDir = last.bookDir
  } else if (books.length > 0) {
    const book = books[0]!
    bookDir = kebabcasezedcafedirname(book.name, book.id)
  }

  const kinds: AGENT_KIND_REF[] = []
  let boardPageDir: string | undefined
  let boardId: string | undefined
  let playerX: number | undefined
  let playerY: number | undefined

  if (bookDir) {
    const bookstats = decodefile(files, `${bookDir}/stats.json`)
    kinds.push(...buildkindcatalogfrombookstats(bookDir, bookstats))
    const flags = decodefile(files, `${bookDir}/flags/${player}.json`) as
      | { board?: unknown; x?: unknown; y?: unknown }
      | undefined
    if (flags && typeof flags.board === 'string' && flags.board) {
      boardId = flags.board
      boardPageDir = findboardpagedir(bookDir, bookstats, boardId)
    }
    if (boardPageDir) {
      const obj = decodefile(
        files,
        `${boardPageDir}/board/objects/${player}.json`,
      ) as { x?: unknown; y?: unknown } | undefined
      if (obj) {
        if (typeof obj.x === 'number') {
          playerX = obj.x
        }
        if (typeof obj.y === 'number') {
          playerY = obj.y
        }
      }
    }
  }

  const boardTerrainPath = boardPageDir
    ? `${boardPageDir}/board/terrain.json`
    : last?.boardPath

  const kindlines = kinds
    .slice(0, 40)
    .map((k) => `- ${k.type} ${k.name}`)
    .join('\n')
  const lines = [
    '## Current session',
    bookDir ? `bookDir: ${bookDir}` : 'bookDir: (unknown)',
    boardTerrainPath
      ? `board terrain: ${boardTerrainPath}`
      : 'board terrain: (unknown)',
    boardId ? `player board id: ${boardId}` : '',
    playerX !== undefined && playerY !== undefined
      ? `player xy: ${playerX},${playerY}`
      : '',
    last?.bookDir && last.bookDir !== bookDir
      ? `Last focus bookDir: ${last.bookDir}`
      : '',
    'kinds (object|terrain):',
    kindlines || '- (none found — list_zedcafe mode=kinds after reading book stats)',
  ].filter((line) => line.length > 0)

  return {
    bookDir,
    boardPageDir,
    boardTerrainPath,
    playerX,
    playerY,
    boardId,
    kinds,
    promptblock: lines.join('\n'),
  }
}
