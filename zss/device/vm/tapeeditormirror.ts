import { MAYBE } from 'zss/mapping/types'

export type TAPE_EDITOR_MIRROR = {
  open: boolean
  book: string
  path: MAYBE<string>[]
  type: string
  title: string
}

const CLOSED: TAPE_EDITOR_MIRROR = {
  open: false,
  book: '',
  path: [],
  type: '',
  title: '',
}

const tapeeditormap: Record<string, TAPE_EDITOR_MIRROR> = {}

export function tapeeditorset(
  player: string,
  data: {
    open: boolean
    book: string
    path: MAYBE<string>[]
    type: string
    title: string
  },
): void {
  tapeeditormap[player] = {
    open: data.open,
    book: data.book,
    path: [...data.path],
    type: data.type,
    title: data.title,
  }
}

export function tapeeditorget(player: string): TAPE_EDITOR_MIRROR {
  return tapeeditormap[player] ?? CLOSED
}

export function tapeeditorclear(player: string): void {
  delete tapeeditormap[player]
}

/** Test helper: remove all mirrored entries. */
export function tapeeditormirrorreset(): void {
  for (const key of Object.keys(tapeeditormap)) {
    delete tapeeditormap[key]
  }
}
